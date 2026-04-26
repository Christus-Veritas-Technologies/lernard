import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ChatMessage,
  Conversation,
  ConversationContent,
} from '@lernard/shared-types';
import type { Prisma } from '@prisma/client';
import { validateGeneratedContent } from '../../common/utils/validate-generated-content';
import { MastraService } from '../../mastra/mastra.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LessonsService } from '../lessons/lessons.service';
import { QuizzesService } from '../quizzes/quizzes.service';
import type { SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mastra: MastraService,
    private readonly lessonsService: LessonsService,
    private readonly quizzesService: QuizzesService,
  ) {}

  async sendMessage(userId: string, dto: SendMessageDto): Promise<ConversationContent> {
    const key = `chat:${userId}:${dto.idempotencyKey}`;
    const cached = await this.prisma.idempotencyRecord.findUnique({ where: { key } });
    if (cached) {
      const cachedResponse = parseCachedConversationContent(cached.response);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    const conversation =
      (await this.prisma.conversation.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      })) ??
      (await this.prisma.conversation.create({
        data: {
          userId,
          title: buildConversationTitle(dto.message),
        },
      }));

    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 12,
    });

    const assistantReply = await this.mastra.generateChatReply({
      message: dto.message,
      history: recentMessages.map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: getMessageText(message.content),
      })),
      studentId: userId,
    });

    await validateGeneratedContent(assistantReply, this.mastra);

    await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: { text: dto.message },
        },
      }),
      this.prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: { text: assistantReply, slotType: 'text' },
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          title: conversation.title ?? buildConversationTitle(dto.message),
          summary: summarizeConversation(dto.message, assistantReply),
        },
      }),
    ]);

    const response = await this.getConversation(userId, conversation.id);

    await this.prisma.idempotencyRecord.upsert({
      where: { key },
      create: {
        key,
        response: response as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      update: {
        response: response as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return response;
  }

  async getConversations(userId: string, cursor?: string, limit = 20) {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    const hasMore = conversations.length > limit;
    const visible = conversations.slice(0, limit);

    return {
      conversations: visible.map((conversation) => mapConversation(conversation)),
      cursor: hasMore ? visible[visible.length - 1]?.id ?? null : null,
      hasMore,
    };
  }

  async getConversation(userId: string, id: string): Promise<ConversationContent> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      conversation: mapConversation(conversation),
      messages: messages.map(mapChatMessage),
      hasMore: false,
    };
  }

  async deleteConversation(userId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  async toLesson(userId: string, conversationId: string) {
    const topic = await this.resolveConversationTopic(userId, conversationId);
    return this.lessonsService.generate(userId, {
      topic,
      idempotencyKey: `chat-lesson:${conversationId}`,
    });
  }

  async toQuiz(userId: string, conversationId: string) {
    const topic = await this.resolveConversationTopic(userId, conversationId);
    return this.quizzesService.generate(userId, {
      topic,
      idempotencyKey: `chat-quiz:${conversationId}`,
    });
  }

  private async resolveConversationTopic(userId: string, conversationId: string): Promise<string> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId, deletedAt: null },
      select: { id: true, title: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.title) {
      return conversation.title;
    }

    const latestUserMessage = await this.prisma.chatMessage.findFirst({
      where: {
        conversationId,
        role: 'user',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestUserMessage) {
      return 'General study support';
    }

    return buildConversationTitle(getMessageText(latestUserMessage.content));
  }
}

function parseCachedConversationContent(value: unknown): ConversationContent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const parsed = value as ConversationContent;
  if (!parsed.conversation || !Array.isArray(parsed.messages)) {
    return null;
  }

  return parsed;
}

function mapConversation(conversation: {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { messages: number };
}): Conversation {
  return {
    id: conversation.id,
    ownerId: conversation.userId,
    title: conversation.title,
    lastMessageAt: conversation.updatedAt.toISOString(),
    messageCount: conversation._count.messages,
    createdAt: conversation.createdAt.toISOString(),
  };
}

function mapChatMessage(message: {
  id: string;
  conversationId: string;
  role: string;
  content: unknown;
  createdAt: Date;
}): ChatMessage {
  const content = parseMessageContent(message.content);

  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: content.text,
    slotType: content.slotType,
    slotData: content.slotData,
    createdAt: message.createdAt.toISOString(),
  };
}

function parseMessageContent(content: unknown): {
  text: string;
  slotType: ChatMessage['slotType'];
  slotData: Record<string, unknown> | null;
} {
  if (typeof content === 'string') {
    return {
      text: content,
      slotType: null,
      slotData: null,
    };
  }

  if (content && typeof content === 'object' && !Array.isArray(content)) {
    const source = content as Record<string, unknown>;
    return {
      text: typeof source.text === 'string' ? source.text : JSON.stringify(source),
      slotType: isChatSlotType(source.slotType) ? source.slotType : null,
      slotData:
        source.slotData && typeof source.slotData === 'object' && !Array.isArray(source.slotData)
          ? (source.slotData as Record<string, unknown>)
          : null,
    };
  }

  return {
    text: String(content ?? ''),
    slotType: null,
    slotData: null,
  };
}

function isChatSlotType(value: unknown): value is ChatMessage['slotType'] {
  return (
    value === 'text' ||
    value === 'quiz_card' ||
    value === 'concept_breakdown' ||
    value === 'progress_nudge'
  );
}

function getMessageText(content: unknown): string {
  return parseMessageContent(content).text;
}

function buildConversationTitle(message: string): string {
  const collapsed = message.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return 'General study support';
  }

  const sentence = collapsed.split(/[.!?]/, 1)[0] ?? collapsed;
  return sentence.slice(0, 72);
}

function summarizeConversation(studentMessage: string, assistantReply: string): string {
  const compactStudentMessage = studentMessage.replace(/\s+/g, ' ').trim();
  const compactAssistantReply = assistantReply.replace(/\s+/g, ' ').trim();

  return `${compactStudentMessage.slice(0, 120)} | ${compactAssistantReply.slice(0, 120)}`;
}
