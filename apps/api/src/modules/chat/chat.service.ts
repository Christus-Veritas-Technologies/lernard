import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ChatAttachment,
  ChatAttachmentInput,
  ChatConversationDetail,
  ChatLessonAttachmentOption,
  ChatQuizAttachmentOption,
  ChatMessageBlock,
  ConversationListItem,
  LessonRefCardProps,
  QuizRefCardProps,
} from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MastraService,
  type ChatToolExecutor,
} from '../../mastra/mastra.service';
import { StudentContextBuilder } from '../../mastra/student-context.builder';
import { R2Service } from '../../r2/r2.service';
import { LessonsService } from '../lessons/lessons.service';
import { QuizzesService } from '../quizzes/quizzes.service';
import {
  storeChatUpload,
  chatUploadExists,
  readChatPromptUpload,
} from './chat-uploads';
import type { ChatPromptUpload, ChatUploadFile } from './chat-uploads';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mastraService: MastraService,
    private readonly studentContextBuilder: StudentContextBuilder,
    private readonly r2: R2Service,
    private readonly lessonsService: LessonsService,
    private readonly quizzesService: QuizzesService,
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
    return storeChatUpload(this.r2, user.id, file);
  }

  async getConversation(
    user: User,
    conversationId: string,
  ): Promise<ChatConversationDetail> {
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
        blocks: Array.isArray(message.blocks)
          ? (message.blocks as ChatMessageBlock[])
          : [],
        createdAt: message.createdAt.toISOString(),
      })),
    };
  }

  async getAttachableLessons(
    user: User,
  ): Promise<ChatLessonAttachmentOption[]> {
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

  async getAttachableQuizzes(
    user: User,
  ): Promise<ChatQuizAttachmentOption[]> {
    const quizzes = await (this.prisma as any).quiz.findMany({
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
        totalQuestions: true,
        score: true,
        completedAt: true,
        updatedAt: true,
      },
    });

    return quizzes.map((quiz: any) => ({
      quizId: quiz.id,
      title: quiz.topic,
      subjectName: quiz.subjectName ?? 'General',
      totalQuestions: quiz.totalQuestions,
      score: quiz.completedAt ? quiz.score : undefined,
      updatedAt: quiz.updatedAt.toISOString(),
    }));
  }

  async sendMessage(
    user: User,
    dto: SendMessageDto,
  ): Promise<{ conversationId: string; blocks: ChatMessageBlock[] }> {
    const conversation = await this.findOrCreateConversation(
      user,
      dto.conversationId,
    );
    const attachments = await this.resolveAttachments(
      user,
      normalizeAttachmentInputs(dto.attachments ?? []),
    );
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
    const memoryMessage = await this.buildCrossConversationMemoryMessage(
      user.id,
      conversation.id,
    );
    const historyWithMemory = memoryMessage
      ? [memoryMessage, ...historyMessages]
      : historyMessages;
    const assistantBlocks: ChatMessageBlock[] = [];
    const studentContext = await this.studentContextBuilder.buildForUser(
      user.id,
    );

    for await (const block of this.mastraService.streamChat({
      message: buildPromptMessage(dto.message, attachments),
      history: historyWithMemory,
      attachments: promptUploads,
      toolExecutor: this.buildToolExecutor(user, conversation.id),
      studentContext,
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

    const lastPreview = extractMessagePreview(assistantBlocks);

    await (this.prisma as any).conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: lastPreview ? lastPreview.slice(0, 140) : dto.message,
        title:
          conversation.title === 'New Chat'
            ? buildConversationTitle(dto.message)
            : conversation.title,
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
    const conversation = await this.findOrCreateConversation(
      user,
      dto.conversationId,
    );
    const attachments = await this.resolveAttachments(
      user,
      normalizeAttachmentInputs(dto.attachments ?? []),
    );
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
    const memoryMessage = await this.buildCrossConversationMemoryMessage(
      user.id,
      conversation.id,
    );
    const historyWithMemory = memoryMessage
      ? [memoryMessage, ...historyMessages]
      : historyMessages;
    const assistantBlocks: ChatMessageBlock[] = [];
    const studentContext = await this.studentContextBuilder.buildForUser(
      user.id,
    );

    for await (const block of this.mastraService.streamChat({
      message: buildPromptMessage(dto.message, attachments),
      history: historyWithMemory,
      attachments: promptUploads,
      toolExecutor: this.buildToolExecutor(user, conversation.id),
      studentContext,
    })) {
      assistantBlocks.push(block);
      subscriber.next(
        new MessageEvent('message', { data: JSON.stringify(block) }),
      );
    }

    await (this.prisma as any).message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        blocks: assistantBlocks,
      },
    });

    const lastPreview = extractMessagePreview(assistantBlocks);

    await (this.prisma as any).conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: lastPreview ? lastPreview.slice(0, 140) : dto.message,
        title:
          conversation.title === 'New Chat'
            ? buildConversationTitle(dto.message)
            : conversation.title,
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

  private async resolveAttachments(
    user: User,
    attachments: ChatAttachmentInput[],
  ): Promise<ChatAttachment[]> {
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

      if (attachment.type === 'quiz') {
        const quiz = await (this.prisma as any).quiz.findFirst({
          where: {
            id: attachment.quizId,
            userId: user.id,
          },
          select: {
            id: true,
            topic: true,
            subjectName: true,
            totalQuestions: true,
            score: true,
            weakTopics: true,
            completedAt: true,
          },
        });

        if (!quiz) {
          continue;
        }

        const weakTopics = Array.isArray(quiz.weakTopics)
          ? quiz.weakTopics
              .filter((topic: unknown): topic is string => typeof topic === 'string')
              .map((topic: string) => topic.trim())
              .filter(Boolean)
              .slice(0, 4)
          : [];

        resolved.push({
          type: 'quiz',
          quizId: quiz.id,
          title: quiz.topic,
          subjectName: quiz.subjectName ?? undefined,
          totalQuestions: quiz.totalQuestions,
          score: quiz.completedAt ? quiz.score : undefined,
          weakTopics,
        });
        continue;
      }

      if (!(await chatUploadExists(this.r2, user.id, attachment.uploadId))) {
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

  private async loadPromptUploads(
    user: User,
    attachments: ChatAttachment[],
  ): Promise<ChatPromptUpload[]> {
    const uploads = attachments.filter(
      (attachment): attachment is Extract<ChatAttachment, { type: 'upload' }> =>
        attachment.type === 'upload',
    );

    const promptUploads = await Promise.all(
      uploads.map((attachment) =>
        readChatPromptUpload(this.r2, user.id, attachment),
      ),
    );

    return promptUploads.filter(
      (attachment): attachment is ChatPromptUpload => attachment !== null,
    );
  }

  private async buildCrossConversationMemoryMessage(
    _userId: string,
    _currentConversationId: string,
  ): Promise<{ role: 'user' | 'assistant'; content: string } | null> {
    return null;
  }

  private buildToolExecutor(
    user: User,
    conversationId: string,
  ): ChatToolExecutor {
    return {
      createLesson: async ({ topic, depth = 'standard', subject }) => {
        const { lessonId } = await this.lessonsService.generate(user, {
          topic,
          depth,
          subject,
          idempotencyKey: randomUUID(),
        });

        const lesson = await (this.prisma as any).lesson.findUnique({
          where: { id: lessonId },
        });

        const card: LessonRefCardProps = {
          lessonId,
          title: lesson?.topic ?? topic,
          subjectName: lesson?.subjectName ?? undefined,
          depth: normalizeDepth(lesson?.depth ?? depth),
          estimatedMinutes: lesson?.estimatedMinutes ?? 12,
        };

        return card;
      },
      createQuiz: async ({ topic, questionCount = 5, subject }) => {
        const { quizId } = await this.quizzesService.generate(user, {
          topic,
          questionCount,
          questionType: 'multiple_choice',
          subject,
          idempotencyKey: randomUUID(),
          fromConversationId: conversationId,
        });

        const quiz = await (this.prisma as any).quiz.findUnique({
          where: { id: quizId },
        });

        const card: QuizRefCardProps = {
          quizId,
          title: quiz?.topic ?? topic,
          subjectName: quiz?.subjectName ?? undefined,
          totalQuestions: quiz?.totalQuestions ?? questionCount,
        };

        return card;
      },
    };
  }
}

function normalizeAttachmentInputs(
  attachments: Array<{
    type: 'upload' | 'lesson' | 'quiz';
    uploadId?: string;
    kind?: 'image' | 'pdf';
    fileName?: string;
    mimeType?: string;
    size?: number;
    lessonId?: string;
    quizId?: string;
  }>,
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

    if (attachment.type === 'quiz' && attachment.quizId) {
      normalized.push({
        type: 'quiz',
        quizId: attachment.quizId,
      });
      continue;
    }

    if (
      attachment.type === 'upload' &&
      attachment.uploadId &&
      attachment.kind &&
      attachment.fileName &&
      attachment.mimeType &&
      typeof attachment.size === 'number'
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

function buildUserBlocks(
  message: string,
  attachments: ChatAttachment[],
): ChatMessageBlock[] {
  const blocks: ChatMessageBlock[] = [{ type: 'text', content: message }];

  if (attachments.length > 0) {
    blocks.push({
      type: 'attachments',
      items: attachments,
    });
  }

  return blocks;
}

function buildHistoryMessages(
  history: Array<{ role: string; blocks: unknown }>,
): Array<{ role: 'assistant' | 'user'; content: string }> {
  return history
    .filter((message) => Array.isArray(message.blocks))
    .flatMap((message) => {
      const content = buildPromptFromBlocks(
        message.blocks as ChatMessageBlock[],
      );
      if (!content) {
        return [];
      }

      return [
        {
          role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
          content,
        },
      ];
    });
}

function buildPromptFromBlocks(blocks: ChatMessageBlock[]): string {
  const parts = blocks.flatMap((block) => {
    if (block.type === 'text') {
      return [block.content.trim()];
    }

    if (block.type === 'markdown') {
      return [block.content.trim()];
    }

    if (block.type === 'attachments') {
      const summary = summarizeAttachments(block.items);
      return summary ? [summary] : [];
    }

    if (block.type === 'LessonRefCard') {
      const subject = block.props.subjectName
        ? ` (${block.props.subjectName})`
        : '';
      return [
        `[lesson created: "${block.props.title}"${subject} — id ${block.props.lessonId}]`,
      ];
    }

    if (block.type === 'QuizRefCard') {
      const subject = block.props.subjectName
        ? ` (${block.props.subjectName})`
        : '';
      return [
        `[quiz created: "${block.props.title}"${subject} — id ${block.props.quizId}, ${block.props.totalQuestions} questions]`,
      ];
    }

    return [];
  });

  return parts.filter(Boolean).join('\n\n').trim();
}

function normalizeDepth(
  depth: string | undefined | null,
): 'quick' | 'standard' | 'deep' {
  if (depth === 'quick' || depth === 'standard' || depth === 'deep') {
    return depth;
  }
  return 'standard';
}

function buildPromptMessage(
  message: string,
  attachments: ChatAttachment[],
): string {
  if (attachments.length === 0) {
    return message;
  }

  return [message, summarizeAttachments(attachments)]
    .filter(Boolean)
    .join('\n\n');
}

function summarizeAttachments(attachments: ChatAttachment[]): string {
  if (attachments.length === 0) {
    return '';
  }

  const summaryLines = attachments.map((attachment) => {
    if (attachment.type === 'lesson') {
      return `- Attached lesson: ${attachment.title}${attachment.subjectName ? ` (${attachment.subjectName})` : ''}`;
    }

    if (attachment.type === 'quiz') {
      const scoreLine =
        typeof attachment.score === 'number'
          ? `, score ${attachment.score}/${attachment.totalQuestions}`
          : ', not completed yet';
      const weakLine = attachment.weakTopics?.length
        ? `, growth areas: ${attachment.weakTopics.join(', ')}`
        : '';
      return `- Attached quiz: ${attachment.title}${attachment.subjectName ? ` (${attachment.subjectName})` : ''}${scoreLine}${weakLine}`;
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

function extractMessagePreview(blocks: ChatMessageBlock[]): string | null {
  for (const block of blocks) {
    if (block.type === 'text' || block.type === 'markdown') {
      const content = block.content.trim();
      if (content) return content;
    }
  }
  return null;
}
