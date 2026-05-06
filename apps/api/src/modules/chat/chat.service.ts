import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ChatAttachment,
  ChatAttachmentInput,
  ChatConversationDetail,
  ChatLessonAttachmentOption,
  ChatMessageBlock,
  ConversationListItem,
} from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { MastraService } from '../../mastra/mastra.service';
import { storeChatUpload, chatUploadExists, readChatPromptUpload } from './chat-uploads';
import type { ChatPromptUpload, ChatUploadFile } from './chat-uploads';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mastraService: MastraService,
  ) {}

  async getConversations(user: User): Promise<ConversationListItem[]> {
    const conversations = await (this.prisma as any).conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    return conversations.map((conversation: any) => ({
      id: conversation.id,
      title: conversation.title,
      lastMessage: conversation.lastMessage,
      updatedAt: conversation.updatedAt.toISOString(),
    }));
  }

  async uploadAttachment(user: User, file: ChatUploadFile | undefined) {
    return storeChatUpload(user.id, file);
  }

  async getConversation(user: User, conversationId: string): Promise<ChatConversationDetail> {
    const conversation = await (this.prisma as any).conversation.findFirst({
      where: { id: conversationId, userId: user.id },
      select: { id: true, title: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await (this.prisma as any).message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      conversationId: conversation.id,
      title: conversation.title,
      messages: messages.map((message: any) => ({
        id: message.id,
        role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
        blocks: Array.isArray(message.blocks) ? (message.blocks as ChatMessageBlock[]) : [],
        createdAt: message.createdAt.toISOString(),
      })),
    };
  }

  async getAttachableLessons(user: User): Promise<ChatLessonAttachmentOption[]> {
    const lessons = await (this.prisma as any).lesson.findMany({
      where: {
        userId: user.id,
        status: 'READY',
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        topic: true,
        subjectName: true,
        updatedAt: true,
      },
    });

    return lessons.map((lesson: any) => ({
      lessonId: lesson.id,
      title: lesson.topic,
      subjectName: lesson.subjectName ?? 'General',
      updatedAt: lesson.updatedAt.toISOString(),
    }));
  }

  async sendMessage(user: User, dto: SendMessageDto): Promise<{ conversationId: string; blocks: ChatMessageBlock[] }> {
    const conversation = await this.findOrCreateConversation(user, dto.conversationId);
    const attachments = await this.resolveAttachments(user, normalizeAttachmentInputs(dto.attachments ?? []));
    const promptUploads = await this.loadPromptUploads(user, attachments);
    const userBlocks = buildUserBlocks(dto.message, attachments);

    await (this.prisma as any).message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        blocks: userBlocks,
      },
    });

    const history = await (this.prisma as any).message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });

    const historyMessages = buildHistoryMessages(history);
    const assistantBlocks: ChatMessageBlock[] = [];

    for await (const block of this.mastraService.streamChat({
      message: buildPromptMessage(dto.message, attachments),
      history: historyMessages,
      attachments: promptUploads,
    })) {
      assistantBlocks.push(block);
    }

    await (this.prisma as any).message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        blocks: assistantBlocks,
      },
    });

    const lastText = assistantBlocks.find(
      (block): block is Extract<ChatMessageBlock, { type: 'text' }> => block.type === 'text',
    );

    await (this.prisma as any).conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage:
          typeof lastText?.content === 'string' ? lastText.content.slice(0, 140) : dto.message,
        title: conversation.title === 'New Chat' ? buildConversationTitle(dto.message) : conversation.title,
      },
    });

    return {
      conversationId: conversation.id,
      blocks: assistantBlocks,
    };
  }

  streamMessage(user: User, dto: SendMessageDto): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      void this.runStream(user, dto, subscriber)
        .then(() => subscriber.complete())
        .catch((error) => subscriber.error(error));
    });
  }

  private async runStream(
    user: User,
    dto: SendMessageDto,
    subscriber: { next: (value: MessageEvent) => void },
  ): Promise<void> {
    const conversation = await this.findOrCreateConversation(user, dto.conversationId);
    const attachments = await this.resolveAttachments(user, normalizeAttachmentInputs(dto.attachments ?? []));
    const promptUploads = await this.loadPromptUploads(user, attachments);
    const userBlocks = buildUserBlocks(dto.message, attachments);

    await (this.prisma as any).message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        blocks: userBlocks,
      },
    });

    const history = await (this.prisma as any).message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });

    const historyMessages = buildHistoryMessages(history);
    const assistantBlocks: ChatMessageBlock[] = [];

    for await (const block of this.mastraService.streamChat({
      message: buildPromptMessage(dto.message, attachments),
      history: historyMessages,
      attachments: promptUploads,
    })) {
      assistantBlocks.push(block);
      subscriber.next(new MessageEvent('message', { data: JSON.stringify(block) }));
    }

    await (this.prisma as any).message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        blocks: assistantBlocks,
      },
    });

    const lastText = assistantBlocks.find(
      (block): block is Extract<ChatMessageBlock, { type: 'text' }> => block.type === 'text',
    );

    await (this.prisma as any).conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: typeof lastText?.content === 'string' ? lastText.content.slice(0, 140) : dto.message,
        title: conversation.title === 'New Chat' ? buildConversationTitle(dto.message) : conversation.title,
      },
    });
  }

  private async findOrCreateConversation(user: User, conversationId?: string) {
    if (conversationId) {
      const existing = await (this.prisma as any).conversation.findFirst({
        where: { id: conversationId, userId: user.id },
      });
      if (existing) {
        return existing;
      }
    }

    return (this.prisma as any).conversation.create({
      data: {
        userId: user.id,
        title: 'New Chat',
        lastMessage: '',
      },
    });
  }

  private async resolveAttachments(user: User, attachments: ChatAttachmentInput[]): Promise<ChatAttachment[]> {
    const resolved: ChatAttachment[] = [];

    for (const attachment of attachments) {
      if (attachment.type === 'lesson') {
        const lesson = await (this.prisma as any).lesson.findFirst({
          where: {
            id: attachment.lessonId,
            userId: user.id,
          },
          select: {
            id: true,
            topic: true,
            subjectName: true,
          },
        });

        if (!lesson) {
          continue;
        }

        resolved.push({
          type: 'lesson',
          lessonId: lesson.id,
          title: lesson.topic,
          subjectName: lesson.subjectName ?? undefined,
        });
        continue;
      }

      if (!(await chatUploadExists(user.id, attachment.uploadId))) {
        continue;
      }

      resolved.push({
        type: 'upload',
        uploadId: attachment.uploadId,
        kind: attachment.kind,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        size: attachment.size,
      });
    }

    return resolved;
  }

  private async loadPromptUploads(user: User, attachments: ChatAttachment[]): Promise<ChatPromptUpload[]> {
    const uploads = attachments.filter(
      (attachment): attachment is Extract<ChatAttachment, { type: 'upload' }> => attachment.type === 'upload',
    );

    const promptUploads = await Promise.all(
      uploads.map((attachment) => readChatPromptUpload(user.id, attachment)),
    );

    return promptUploads.filter((attachment): attachment is ChatPromptUpload => attachment !== null);
  }
}

function normalizeAttachmentInputs(
  attachments: Array<{ type: 'upload' | 'lesson'; uploadId?: string; kind?: 'image' | 'pdf'; fileName?: string; mimeType?: string; size?: number; lessonId?: string }>,
): ChatAttachmentInput[] {
  const normalized: ChatAttachmentInput[] = [];

  for (const attachment of attachments) {
    if (attachment.type === 'lesson' && attachment.lessonId) {
      normalized.push({
        type: 'lesson',
        lessonId: attachment.lessonId,
      });
      continue;
    }

    if (
      attachment.type === 'upload'
      && attachment.uploadId
      && attachment.kind
      && attachment.fileName
      && attachment.mimeType
      && typeof attachment.size === 'number'
    ) {
      normalized.push({
        type: 'upload',
        uploadId: attachment.uploadId,
        kind: attachment.kind,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        size: attachment.size,
      });
    }
  }

  return normalized;
}

function buildConversationTitle(message: string): string {
  const cleaned = message.trim();
  if (!cleaned) return 'New Chat';
  return cleaned.length > 42 ? `${cleaned.slice(0, 39)}...` : cleaned;
}

function buildUserBlocks(message: string, attachments: ChatAttachment[]): ChatMessageBlock[] {
  const blocks: ChatMessageBlock[] = [{ type: 'text', content: message }];

  if (attachments.length > 0) {
    blocks.push({
      type: 'attachments',
      items: attachments,
    });
  }

  return blocks;
}

function buildHistoryMessages(history: Array<{ role: string; blocks: unknown }>): Array<{ role: 'assistant' | 'user'; content: string }> {
  return history
    .filter((message) => Array.isArray(message.blocks))
    .flatMap((message) => {
      const content = buildPromptFromBlocks(message.blocks as ChatMessageBlock[]);
      if (!content) {
        return [];
      }

      return [{
        role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
        content,
      }];
    });
}

function buildPromptFromBlocks(blocks: ChatMessageBlock[]): string {
  const parts = blocks.flatMap((block) => {
    if (block.type === 'text') {
      return [block.content.trim()];
    }

    if (block.type === 'attachments') {
      const summary = summarizeAttachments(block.items);
      return summary ? [summary] : [];
    }

    return [];
  });

  return parts.filter(Boolean).join('\n\n').trim();
}

function buildPromptMessage(message: string, attachments: ChatAttachment[]): string {
  if (attachments.length === 0) {
    return message;
  }

  return [message, summarizeAttachments(attachments)].filter(Boolean).join('\n\n');
}

function summarizeAttachments(attachments: ChatAttachment[]): string {
  if (attachments.length === 0) {
    return '';
  }

  const summaryLines = attachments.map((attachment) => {
    if (attachment.type === 'lesson') {
      return `- Attached lesson: ${attachment.title}${attachment.subjectName ? ` (${attachment.subjectName})` : ''}`;
    }

    return `- Attached ${attachment.kind}: ${attachment.fileName} (${attachment.mimeType}, ${formatFileSize(attachment.size)})`;
  });

  return ['Use these attachments as context:', ...summaryLines].join('\n');
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
