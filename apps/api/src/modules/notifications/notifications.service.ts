import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush, { PushSubscription } from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  type?: string;
  [key: string]: unknown;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject =
      this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:support@lernard.com';

    this.enabled = Boolean(publicKey && privateKey);
    if (this.enabled) {
      webpush.setVapidDetails(subject, publicKey!, privateKey!);
    } else {
      this.logger.warn(
        'Web push is disabled because VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are not configured.',
      );
    }
  }

  async upsertSubscription(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  }): Promise<void> {
    await (this.prisma as any).pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: {
        userId: input.userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      },
      create: {
        userId: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await (this.prisma as any).pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    if (!this.enabled) return;

    const subscriptions = await (this.prisma as any).pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
      },
    });

    if (subscriptions.length === 0) return;

    const body = JSON.stringify(payload);
    await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        const pushSub: PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSub, body);
          await (this.prisma as any).pushSubscription.update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() },
          });
        } catch (error: any) {
          const statusCode = error?.statusCode as number | undefined;
          if (statusCode === 404 || statusCode === 410) {
            await (this.prisma as any).pushSubscription.delete({
              where: { id: sub.id },
            });
            return;
          }
          this.logger.warn(
            `Push send failed for subscription ${sub.id}: ${String(error?.message ?? error)}`,
          );
        }
      }),
    );
  }
}
