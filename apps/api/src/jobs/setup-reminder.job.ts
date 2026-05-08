import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../modules/auth/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SetupReminderJob {
  private readonly logger = new Logger(SetupReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 * * * *')
  async run() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const pendingUsers = await (this.prisma.user as any).findMany({
      where: {
        accountStatus: 'PENDING_SETUP',
        setupTokenExpiresAt: { gt: now, lte: in24h },
        setupReminderSentAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        setupToken: true,
        setupTokenExpiresAt: true,
      },
    });

    if (!pendingUsers.length) return;

    const webUrl = this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:4000';

    await Promise.allSettled(
      pendingUsers.map(async (user: any) => {
        if (!user.email || !user.setupToken) return;
        try {
          await this.mailService.sendSetupReminder(user.email, {
            childName: user.name ?? 'Student',
            setupLink: `${webUrl}/setup?token=${encodeURIComponent(user.setupToken)}`,
            expiresAt: user.setupTokenExpiresAt,
          });
          await (this.prisma.user as any).update({
            where: { id: user.id },
            data: { setupReminderSentAt: new Date() },
          });
        } catch (err) {
          this.logger.error(`Setup reminder failed for user ${user.id}`, err);
        }
      }),
    );

    this.logger.log(`Setup reminder sent to ${pendingUsers.length} pending user(s)`);
  }
}
