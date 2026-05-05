import { Injectable } from '@nestjs/common';
import type { ConversationListItem } from '@lernard/shared-types';
import type { User } from '@prisma/client';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { MastraService } from '../../mastra/mastra.service';
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

  async sendMessage(user: User, dto: SendMessageDto): Promise<{ conversationId: string; blocks: Array<Record<string, unknown>> }> {
    const conversation = await this.findOrCreateConversation(user, dto.conversationId);

    await (this.prisma as any).message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        blocks: [{ type: 'text', content: dto.message }],
      },
    });

    const history = await (this.prisma as any).message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });

    const historyMessages = history
      .filter((message: any) => Array.isArray(message.blocks))
      .flatMap((message: any) => {
        const textBlock = message.blocks.find((block: any) => block?.type === 'text');
        if (!textBlock || typeof textBlock.content !== 'string') {
          return [];
        }

        return [{
          role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
          content: textBlock.content,
        }] as Array<{ role: 'assistant' | 'user'; content: string }>;
      });

    const assistantBlocks: Array<Record<string, unknown>> = [];
    for await (const block of this.mastraService.streamChat({
      message: dto.message,
      history: historyMessages,
    })) {
      assistantBlocks.push(block as unknown as Record<string, unknown>);
    }

    await (this.prisma as any).message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        blocks: assistantBlocks,
      },
    });

    const lastText = assistantBlocks.find(
      (block) => block.type === 'text' && typeof block.content === 'string',
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

    await (this.prisma as any).message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        blocks: [{ type: 'text', content: dto.message }],
      },
    });

    const history = await (this.prisma as any).message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });

    const historyMessages = history
      .filter((message: any) => Array.isArray(message.blocks))
      .flatMap((message: any) => {
        const textBlock = message.blocks.find((block: any) => block?.type === 'text');
        if (!textBlock || typeof textBlock.content !== 'string') {
          return [];
        }

        return [{
          role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
          content: textBlock.content,
        }] as Array<{ role: 'assistant' | 'user'; content: string }>;
      });

    const assistantBlocks: Array<{ type: string; content?: string; props?: Record<string, unknown> }> = [];

    for await (const block of this.mastraService.streamChat({
      message: dto.message,
      history: historyMessages,
    })) {
      assistantBlocks.push(block as never);
      subscriber.next(new MessageEvent('message', { data: JSON.stringify(block) }));
    }

    await (this.prisma as any).message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        blocks: assistantBlocks,
      },
    });

    const lastText = assistantBlocks.find((block) => block.type === 'text' && typeof block.content === 'string');

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
}

function buildConversationTitle(message: string): string {
  const cleaned = message.trim();
  if (!cleaned) return 'New Chat';
  return cleaned.length > 42 ? `${cleaned.slice(0, 39)}...` : cleaned;
}
