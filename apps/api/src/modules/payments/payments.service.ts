import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan, PaymentStatus, Role } from '@prisma/client';
import type { PaymentOrder } from '@prisma/client';
import { Plan as SharedPlan, PaymentStatus as SharedPaymentStatus } from '@lernard/shared-types';
import type { PaymentInitResponse, PaymentStatusResponse } from '@lernard/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { toSharedPlan } from '../../common/utils/shared-model-mappers';
import { ROUTES } from '@lernard/routes';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Paynow } = require('paynow') as { Paynow: any };

const PLAN_PRICES: Partial<Record<Plan, number>> = {
  [Plan.STUDENT_SCHOLAR]: 4.99,
  [Plan.STUDENT_PRO]: 9.99,
  [Plan.GUARDIAN_FAMILY_STARTER]: 7.99,
  [Plan.GUARDIAN_FAMILY_STANDARD]: 14.99,
  [Plan.GUARDIAN_FAMILY_PREMIUM]: 24.99,
};

const PLAN_DISPLAY_NAMES: Partial<Record<Plan, string>> = {
  [Plan.STUDENT_SCHOLAR]: 'Lernard Scholar',
  [Plan.STUDENT_PRO]: 'Lernard Pro',
  [Plan.GUARDIAN_FAMILY_STARTER]: 'Family Starter',
  [Plan.GUARDIAN_FAMILY_STANDARD]: 'Family Standard',
  [Plan.GUARDIAN_FAMILY_PREMIUM]: 'Family Premium',
};

const STUDENT_PLANS = new Set<Plan>([Plan.STUDENT_SCHOLAR, Plan.STUDENT_PRO]);
const GUARDIAN_PLANS = new Set<Plan>([
  Plan.GUARDIAN_FAMILY_STARTER,
  Plan.GUARDIAN_FAMILY_STANDARD,
  Plan.GUARDIAN_FAMILY_PREMIUM,
]);

// Max 3 payment initiations per 5-minute window per user
const RATE_LIMIT = 3;
const RATE_WINDOW_SECONDS = 300;

function toSharedPaymentStatus(status: PaymentStatus): SharedPaymentStatus {
  switch (status) {
    case PaymentStatus.PAID:
      return SharedPaymentStatus.PAID;
    case PaymentStatus.FAILED:
      return SharedPaymentStatus.FAILED;
    case PaymentStatus.CANCELLED:
      return SharedPaymentStatus.CANCELLED;
    case PaymentStatus.PENDING:
    default:
      return SharedPaymentStatus.PENDING;
  }
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async initiatePayment(userId: string, plan: Plan): Promise<PaymentInitResponse> {
    const amount = PLAN_PRICES[plan];
    if (!amount) {
      throw new BadRequestException('Invalid plan. Must be a paid plan tier.');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    // Validate role matches plan type
    if (STUDENT_PLANS.has(plan) && user.role !== Role.STUDENT) {
      throw new BadRequestException('Student plans are only available to student accounts.');
    }
    if (GUARDIAN_PLANS.has(plan) && user.role !== Role.GUARDIAN) {
      throw new BadRequestException('Guardian plans are only available to guardian accounts.');
    }

    // Rate limit: 3 initiations per 5-minute window
    const rateKey = `payment:initiate:${userId}`;
    const count = await this.redis.checkAndIncrement(rateKey, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (count === -1) {
      throw new HttpException(
        'Too many payment requests. Please wait a few minutes before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const reference = `lernard-${userId.slice(-8)}-${Date.now()}`;

    const order = await this.prisma.paymentOrder.create({
      data: { userId, reference, plan, amountUsd: amount, status: PaymentStatus.PENDING },
    });

    const apiBaseUrl = this.config.get<string>('API_BASE_URL') ?? '';
    const webAppUrl = this.config.get<string>('WEB_APP_URL') ?? '';

    const integrationId = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_ID');
    const integrationKey = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_KEY');

    const paynow = new Paynow(integrationId, integrationKey);
    paynow.resultUrl = `${apiBaseUrl}${ROUTES.PAYMENTS.PAYNOW_CALLBACK}`;
    paynow.returnUrl = `${webAppUrl}/payments/return?ref=${encodeURIComponent(reference)}`;

    const payment = paynow.createPayment(reference, user.email ?? '');
    payment.add(PLAN_DISPLAY_NAMES[plan] ?? 'Lernard Plan', amount);

    let response: any;
    try {
      response = await paynow.send(payment);
    } catch (err) {
      this.logger.error('Paynow send failed', err);
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new ServiceUnavailableException(
        'Payment gateway is unavailable. Please try again shortly.',
      );
    }

    if (!response.success) {
      this.logger.warn('Paynow returned unsuccessful response', { reference });
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: PaymentStatus.FAILED, paynowResponse: response as object },
      });
      throw new ServiceUnavailableException(
        'Payment gateway error. Please try again shortly.',
      );
    }

    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        paynowPollUrl: response.pollUrl as string,
        paynowResponse: { redirectUrl: response.redirectUrl as string } as object,
      },
    });

    return { redirectUrl: response.redirectUrl as string, reference };
  }

  async handlePaynowCallback(body: Record<string, string>): Promise<void> {
    const integrationId = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_ID');
    const integrationKey = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_KEY');
    const paynow = new Paynow(integrationId, integrationKey);

    let status: any;
    try {
      status = paynow.parseStatusUpdate(body);
    } catch (err) {
      this.logger.warn('Paynow callback hash verification failed', err);
      return;
    }

    if (!status?.reference) {
      this.logger.warn('Paynow callback missing reference');
      return;
    }

    const order = await this.prisma.paymentOrder.findUnique({
      where: { reference: status.reference as string },
    });

    if (!order) {
      this.logger.warn('Paynow callback: unknown reference', { reference: status.reference });
      return;
    }

    // Idempotent — ignore if already in a terminal state
    if (order.status === PaymentStatus.PAID || order.status === PaymentStatus.FAILED) {
      return;
    }

    if (status.paid === true) {
      await this.upgradePlan(order);
    } else if (['Cancelled', 'Failed', 'Disputed'].includes(status.status as string)) {
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: PaymentStatus.FAILED, paynowResponse: body as object },
      });
    }
  }

  async getPaymentStatus(
    userId: string,
    reference: string,
  ): Promise<PaymentStatusResponse> {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { reference },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Payment not found.');
    }

    // If still pending, poll Paynow for a live status update
    if (order.status === PaymentStatus.PENDING && order.paynowPollUrl) {
      const integrationId = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_ID');
      const integrationKey = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_KEY');
      const paynow = new Paynow(integrationId, integrationKey);

      try {
        const pollResult: any = await paynow.pollTransaction(order.paynowPollUrl);
        if (pollResult?.paid === true) {
          await this.upgradePlan(order);
          return {
            status: SharedPaymentStatus.PAID,
            plan: toSharedPlan(order.plan) as SharedPlan,
            paidAt: new Date().toISOString(),
          };
        }
      } catch (err) {
        this.logger.warn('Paynow poll failed', err);
      }
    }

    return {
      status: toSharedPaymentStatus(order.status),
      plan: toSharedPlan(order.plan) as SharedPlan,
      paidAt: order.paidAt?.toISOString() ?? null,
    };
  }

  private async upgradePlan(order: PaymentOrder): Promise<void> {
    const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });

      await tx.user.update({
        where: { id: order.userId },
        data: { plan: order.plan, planExpiresAt },
      });

      // If guardian, cascade plan to all enrolled children
      if (GUARDIAN_PLANS.has(order.plan)) {
        const guardian = await tx.guardian.findUnique({
          where: { userId: order.userId },
          select: { children: { select: { id: true } } },
        });

        if (guardian?.children.length) {
          await tx.user.updateMany({
            where: { id: { in: guardian.children.map((c) => c.id) } },
            data: { plan: order.plan, planExpiresAt },
          });
        }
      }
    });
  }
}
