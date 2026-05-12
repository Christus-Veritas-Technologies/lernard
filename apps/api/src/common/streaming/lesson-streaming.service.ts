import { EventEmitter } from 'events';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { LessonStreamEvent } from '@lernard/shared-types';

interface LessonChannel {
  emitter: EventEmitter;
  buffer: LessonStreamEvent[];
  closedAt?: number;
}

@Injectable()
export class LessonStreamingService implements OnModuleDestroy {
  private readonly channels = new Map<string, LessonChannel>();
  private gcInterval: ReturnType<typeof setInterval>;

  constructor() {
    // GC stale channels every 5 minutes
    this.gcInterval = setInterval(() => this.gc(), 5 * 60 * 1000);
  }

  onModuleDestroy(): void {
    clearInterval(this.gcInterval);
  }

  open(lessonId: string): void {
    if (!this.channels.has(lessonId)) {
      const emitter = new EventEmitter();
      emitter.setMaxListeners(50);
      this.channels.set(lessonId, { emitter, buffer: [] });
    }
  }

  emit(lessonId: string, event: LessonStreamEvent): void {
    const ch = this.channels.get(lessonId);
    if (!ch || ch.closedAt !== undefined) return;
    ch.buffer.push(event);
    ch.emitter.emit('event', event);
  }

  close(lessonId: string): void {
    const ch = this.channels.get(lessonId);
    if (!ch || ch.closedAt !== undefined) return;
    const doneEvent: LessonStreamEvent = { type: 'done' };
    ch.buffer.push(doneEvent);
    ch.closedAt = Date.now();
    ch.emitter.emit('event', doneEvent);
  }

  emitError(lessonId: string, message: string): void {
    const ch = this.channels.get(lessonId);
    if (!ch || ch.closedAt !== undefined) return;
    const errEvent: LessonStreamEvent = { type: 'error', message };
    ch.buffer.push(errEvent);
    ch.closedAt = Date.now();
    ch.emitter.emit('event', errEvent);
  }

  getBuffer(lessonId: string): LessonStreamEvent[] {
    return this.channels.get(lessonId)?.buffer ?? [];
  }

  isClosed(lessonId: string): boolean {
    const ch = this.channels.get(lessonId);
    return !ch || ch.closedAt !== undefined;
  }

  subscribe(lessonId: string, listener: (event: LessonStreamEvent) => void): () => void {
    const ch = this.channels.get(lessonId);
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
