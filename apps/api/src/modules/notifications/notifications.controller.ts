import { Body, Controller, Delete, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProtectedRoute } from '../../common/decorators/protected-route.decorator';
import {
  RemovePushSubscriptionDto,
  SendTestNotificationDto,
  UpsertPushSubscriptionDto,
} from './dto/push-subscription.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ProtectedRoute()
  @Post('subscriptions')
  async upsertSubscription(
    @CurrentUser() user: User,
    @Headers('user-agent') userAgent: string | undefined,
    @Body() dto: UpsertPushSubscriptionDto,
  ) {
    await this.notificationsService.upsertSubscription({
      userId: user.id,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      userAgent: userAgent ?? null,
    });

    return { ok: true };
  }

  @ProtectedRoute()
  @Delete('subscriptions')
  @HttpCode(HttpStatus.OK)
  async removeSubscription(
    @CurrentUser() user: User,
    @Body() dto: RemovePushSubscriptionDto,
  ) {
    await this.notificationsService.removeSubscription(user.id, dto.endpoint);
    return { ok: true };
  }

  @ProtectedRoute()
  @Post('test')
  async sendTest(
    @CurrentUser() user: User,
    @Body() dto: SendTestNotificationDto,
  ) {
    await this.notificationsService.sendToUser(user.id, {
      type: 'test',
      title: dto.title ?? 'Lernard test notification',
      body: dto.body ?? 'Push notifications are connected.',
      url: '/settings',
      issuedAt: Date.now(),
    });

    return { ok: true };
  }
}
