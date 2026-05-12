import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlanExpiryJob {
  private readonly logger = new Logger(PlanExpiryJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Runs daily at 02:00 UTC — downgrades users whose plans have expired */
  @Cron('0 2 * * *')
  async run(): Promise<void> {
    const now = new Date();

    const expired = await this.prisma.user.findMany({
      where: {
        planExpiresAt: { lt: now },
        plan: { not: Plan.EXPLORER },
      },
      select: { id: true, role: true },
    });

    if (!expired.length) return;

    this.logger.log(`Downgrading ${expired.length} expired plan(s) to Explorer`);

    const guardianUserIds = expired
      .filter((u) => u.role === 'GUARDIAN')
      .map((u) => u.id);

    // Downgrade all expired users to Explorer
    await this.prisma.user.updateMany({
      where: { id: { in: expired.map((u) => u.id) } },
      data: { plan: Plan.EXPLORER, planExpiresAt: null },
    });

    // Cascade downgrade to children of expired guardians
    if (guardianUserIds.length) {
      const guardians = await this.prisma.guardian.findMany({
        where: { userId: { in: guardianUserIds } },
        select: { children: { select: { id: true } } },
      });

      const childIds = guardians.flatMap((g) => g.children.map((c) => c.id));

      if (childIds.length) {
        await this.prisma.user.updateMany({
          where: { id: { in: childIds } },
          data: { plan: Plan.EXPLORER, planExpiresAt: null },
        });
      }
    }
  }
}
