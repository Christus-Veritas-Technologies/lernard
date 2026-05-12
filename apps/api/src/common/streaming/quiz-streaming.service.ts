import { EventEmitter } from 'events';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { QuizStreamEvent } from '@lernard/shared-types';

interface QuizChannel {
  emitter: EventEmitter;
  buffer: QuizStreamEvent[];
  closedAt?: number;
}

@Injectable()
export class QuizStreamingService implements OnModuleDestroy {
  private readonly channels = new Map<string, QuizChannel>();
  private gcInterval: ReturnType<typeof setInterval>;

  constructor() {
    // GC stale channels every 5 minutes
    this.gcInterval = setInterval(() => this.gc(), 5 * 60 * 1000);
  }

  onModuleDestroy(): void {
    clearInterval(this.gcInterval);
  }

  open(quizId: string): void {
    if (!this.channels.has(quizId)) {
      const emitter = new EventEmitter();
      emitter.setMaxListeners(50);
      this.channels.set(quizId, { emitter, buffer: [] });
    }
  }

  emit(quizId: string, event: QuizStreamEvent): void {
    const ch = this.channels.get(quizId);
    if (!ch || ch.closedAt !== undefined) return;
    ch.buffer.push(event);
    ch.emitter.emit('event', event);
  }

  close(quizId: string): void {
    const ch = this.channels.get(quizId);
    if (!ch || ch.closedAt !== undefined) return;
    const doneEvent: QuizStreamEvent = { type: 'done' };
    ch.buffer.push(doneEvent);
    ch.closedAt = Date.now();
    ch.emitter.emit('event', doneEvent);
  }

  emitError(quizId: string, message: string): void {
    const ch = this.channels.get(quizId);
    if (!ch || ch.closedAt !== undefined) return;
    const errEvent: QuizStreamEvent = { type: 'error', message };
    ch.buffer.push(errEvent);
    ch.closedAt = Date.now();
    ch.emitter.emit('event', errEvent);
  }

  getBuffer(quizId: string): QuizStreamEvent[] {
    return this.channels.get(quizId)?.buffer ?? [];
  }

  isClosed(quizId: string): boolean {
    const ch = this.channels.get(quizId);
    return !ch || ch.closedAt !== undefined;
  }

  subscribe(quizId: string, listener: (event: QuizStreamEvent) => void): () => void {
    const ch = this.channels.get(quizId);
    if (!ch) return () => {};
    ch.emitter.on('event', listener);
    return () => ch.emitter.off('event', listener);
  }

  private gc(): void {
    const cutoff = Date.now() - 15 * 60 * 1000;
    for (const [id, ch] of this.channels) {
      if (ch.closedAt !== undefined && ch.closedAt < cutoff) {
        this.channels.delete(id);
      }
    }
  }
}
