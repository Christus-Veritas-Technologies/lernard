import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentOrder,
  PaymentSession,
  PaymentSessionStatus as PrismaPaymentSessionStatus,
  PaymentStatus,
  Plan,
  Role,
} from '@prisma/client';
import {
  PaymentSessionStatus as SharedPaymentSessionStatus,
  Plan as SharedPlan,
} from '@lernard/shared-types';
import type {
  PaymentInitResponse,
  PaymentSessionResponse,
  PaymentStatusResponse,
} from '@lernard/shared-types';
import { ROUTES } from '@lernard/routes';
import { toSharedPlan } from '../../common/utils/shared-model-mappers';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

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

const RATE_LIMIT = 3;
const RATE_WINDOW_SECONDS = 300;
const PAYMENT_TERMINAL_STATES = new Set<PrismaPaymentSessionStatus>([
  PrismaPaymentSessionStatus.FAILED,
  PrismaPaymentSessionStatus.CLAIMED,
]);

function toSharedPaymentSessionStatus(
  status: PrismaPaymentSessionStatus,
): SharedPaymentSessionStatus {
  switch (status) {
    case PrismaPaymentSessionStatus.COMPLETED:
      return SharedPaymentSessionStatus.COMPLETED;
    case PrismaPaymentSessionStatus.CLAIMED:
      return SharedPaymentSessionStatus.CLAIMED;
    case PrismaPaymentSessionStatus.FAILED:
      return SharedPaymentSessionStatus.FAILED;
    case PrismaPaymentSessionStatus.PENDING:
    default:
      return SharedPaymentSessionStatus.PENDING;
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
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

    if (STUDENT_PLANS.has(plan) && user.role !== Role.STUDENT) {
      throw new BadRequestException('Student plans are only available to student accounts.');
    }

    if (GUARDIAN_PLANS.has(plan) && user.role !== Role.GUARDIAN) {
      throw new BadRequestException('Guardian plans are only available to guardian accounts.');
    }

    const rateKey = `payment:initiate:${userId}`;
    const count = await this.redis.checkAndIncrement(rateKey, RATE_LIMIT, RATE_WINDOW_SECONDS);
    if (count === -1) {
      throw new HttpException(
        'Too many payment requests. Please wait a few minutes before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const session = await this.prisma.paymentSession.create({
      data: {
        userId,
        plan,
        amountUsd: amount,
        status: PrismaPaymentSessionStatus.PENDING,
      },
    });

    const reference = `lernard-${session.id.slice(-8)}-${Date.now()}`;

    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        reference,
        plan,
        amountUsd: amount,
        status: PaymentStatus.PENDING,
      },
    });

    await this.prisma.paymentSession.update({
      where: { id: session.id },
      data: { paymentOrderId: order.id },
    });

    const apiBaseUrl = this.config.get<string>('API_BASE_URL') ?? '';
    const webAppUrl = this.config.get<string>('WEB_APP_URL') ?? '';
    const integrationId = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_ID');
    const integrationKey = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_KEY');

    const paynow = new Paynow(integrationId, integrationKey);
    paynow.resultUrl = `${apiBaseUrl}${ROUTES.PAYMENTS.PAYNOW_CALLBACK}`;
    paynow.returnUrl = `${webAppUrl}/payments/return?sessionId=${encodeURIComponent(session.id)}`;

    const payment = paynow.createPayment(reference, user.email ?? '');
    payment.add(PLAN_DISPLAY_NAMES[plan] ?? 'Lernard Plan', amount);

    let response: any;
    try {
      response = await paynow.send(payment);
    } catch (error) {
      this.logger.error('Paynow send failed', error);
      await this.markSessionFailed(session.id, order.id, 'Payment gateway is unavailable.');
      throw new ServiceUnavailableException(
        'Payment gateway is unavailable. Please try again shortly.',
      );
    }

    if (!response.success) {
      this.logger.warn('Paynow returned unsuccessful response', { reference, sessionId: session.id });
      await this.markSessionFailed(session.id, order.id, 'Payment gateway returned an unsuccessful response.');
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

    return {
      redirectUrl: response.redirectUrl as string,
      sessionId: session.id,
      reference,
    };
  }

  async handlePaynowCallback(body: Record<string, string>): Promise<void> {
    const integrationId = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_ID');
    const integrationKey = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_KEY');
    const paynow = new Paynow(integrationId, integrationKey);

    let status: any;
    try {
      status = paynow.parseStatusUpdate(body);
    } catch (error) {
      this.logger.warn('Paynow callback hash verification failed', error);
      return;
    }

    const reference = typeof status?.reference === 'string' ? status.reference : null;
    if (!reference) {
      this.logger.warn('Paynow callback missing reference');
      return;
    }

    const order = await this.prisma.paymentOrder.findUnique({
      where: { reference },
    });

    if (!order) {
      this.logger.warn('Paynow callback: unknown reference', { reference });
      return;
    }

    if (order.status === PaymentStatus.PAID || order.status === PaymentStatus.FAILED) {
      return;
    }

    const session = await this.prisma.paymentSession.findFirst({
      where: { paymentOrderId: order.id },
    });

    if (status.paid === true) {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentOrder.update({
          where: { id: order.id },
          data: { status: PaymentStatus.PAID, paidAt: new Date() },
        });

        if (session) {
          await tx.paymentSession.update({
            where: { id: session.id },
            data: {
              status: PrismaPaymentSessionStatus.COMPLETED,
              validationErrors: [],
            },
          });
        }
      });
      return;
    }

    if (['Cancelled', 'Failed', 'Disputed'].includes(String(status.status))) {
      await this.markSessionFailed(session?.id, order.id, `Paynow reported ${String(status.status).toLowerCase()}.`);
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

    const session = await this.prisma.paymentSession.findFirst({
      where: { paymentOrderId: order.id, userId },
    });

    if (!session) {
      throw new NotFoundException('Payment session not found.');
    }

    await this.refreshSessionFromGateway(session.id);

    return this.buildSessionResponse(userId, session.id);
  }

  async getPaymentSession(userId: string, sessionId: string): Promise<PaymentSessionResponse> {
    await this.assertSessionOwnership(userId, sessionId);
    await this.refreshSessionFromGateway(sessionId);
    return this.buildSessionResponse(userId, sessionId);
  }

  async claimPaymentSession(userId: string, sessionId: string): Promise<PaymentSessionResponse> {
    const session = await this.assertSessionOwnership(userId, sessionId);
    await this.refreshSessionFromGateway(session.id);

    const current = await this.prisma.paymentSession.findUnique({
      where: { id: session.id },
    });

    if (!current) {
      throw new NotFoundException('Payment session not found.');
    }

    if (current.status === PrismaPaymentSessionStatus.CLAIMED) {
      return this.buildSessionResponse(userId, sessionId);
    }

    if (current.status === PrismaPaymentSessionStatus.FAILED) {
      throw new ConflictException('Payment failed. Please start a new payment.');
    }

    if (current.status !== PrismaPaymentSessionStatus.COMPLETED) {
      throw new ConflictException('Payment is not confirmed yet. Please wait a moment and try again.');
    }

    const claimedAt = new Date();
    const claimResult = await this.prisma.$transaction(async (tx) => {
      const result = await tx.paymentSession.updateMany({
        where: {
          id: current.id,
          userId,
          status: PrismaPaymentSessionStatus.COMPLETED,
          claimedAt: null,
        },
        data: {
          status: PrismaPaymentSessionStatus.CLAIMED,
          claimedAt,
        },
      });

      if (result.count === 0) {
        return null;
      }

      const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await tx.user.update({
        where: { id: userId },
        data: { plan: current.plan, planExpiresAt },
      });

      if (GUARDIAN_PLANS.has(current.plan)) {
        const guardian = await tx.guardian.findUnique({
          where: { userId },
          select: { children: { select: { id: true } } },
        });

        if (guardian?.children.length) {
          await tx.user.updateMany({
            where: { id: { in: guardian.children.map((child) => child.id) } },
            data: { plan: current.plan, planExpiresAt },
          });
        }
      }

      if (current.paymentOrderId) {
        await tx.paymentOrder.update({
          where: { id: current.paymentOrderId },
          data: { status: PaymentStatus.PAID, paidAt: claimedAt },
        });
      }

      return true;
    });

    if (!claimResult) {
      const latest = await this.prisma.paymentSession.findUnique({ where: { id: current.id } });
      if (latest?.status === PrismaPaymentSessionStatus.CLAIMED) {
        return this.buildSessionResponse(userId, sessionId);
      }

      throw new ConflictException('Payment was already claimed or is no longer available.');
    }

    return this.buildSessionResponse(userId, sessionId);
  }

  private async assertSessionOwnership(userId: string, sessionId: string) {
    const session = await this.prisma.paymentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Payment session not found.');
    }

    return session;
  }

  private async buildSessionResponse(
    userId: string,
    sessionId: string,
  ): Promise<PaymentSessionResponse> {
    const session = await this.assertSessionOwnership(userId, sessionId);
    const order = session.paymentOrderId
      ? await this.prisma.paymentOrder.findUnique({ where: { id: session.paymentOrderId } })
      : null;

    return {
      sessionId: session.id,
      status: toSharedPaymentSessionStatus(session.status),
      plan: toSharedPlan(session.plan) as SharedPlan,
      amountUsd: session.amountUsd,
      paidAt: order?.paidAt?.toISOString() ?? null,
      claimedAt: session.claimedAt?.toISOString() ?? null,
      validationErrors: toStringArray(session.validationErrors),
      canClaim: session.status === PrismaPaymentSessionStatus.COMPLETED,
    };
  }

  private async refreshSessionFromGateway(sessionId: string): Promise<void> {
    const session = await this.prisma.paymentSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== PrismaPaymentSessionStatus.PENDING || !session.paymentOrderId) {
      return;
    }

    const order = await this.prisma.paymentOrder.findUnique({
      where: { id: session.paymentOrderId },
    });

    if (!order || !order.paynowPollUrl) {
      return;
    }

    const integrationId = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_ID');
    const integrationKey = this.config.getOrThrow<string>('PAYNOW_INTEGRATION_KEY');
    const paynow = new Paynow(integrationId, integrationKey);

    try {
      const pollResult: any = await paynow.pollTransaction(order.paynowPollUrl);
      if (pollResult?.paid === true) {
        await this.prisma.$transaction(async (tx) => {
          await tx.paymentOrder.update({
            where: { id: order.id },
            data: { status: PaymentStatus.PAID, paidAt: new Date() },
          });
          await tx.paymentSession.update({
            where: { id: session.id },
            data: {
              status: PrismaPaymentSessionStatus.COMPLETED,
              validationErrors: [],
            },
          });
        });
        return;
      }

      if (['Cancelled', 'Failed', 'Disputed'].includes(String(pollResult?.status))) {
        await this.markSessionFailed(session.id, order.id, `Paynow reported ${String(pollResult.status).toLowerCase()}.`);
      }
    } catch (error) {
      this.logger.warn('Paynow poll failed', error);
    }
  }

  private async markSessionFailed(
    sessionId: string | undefined,
    orderId: string,
    message: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { id: orderId },
        data: { status: PaymentStatus.FAILED },
      });

      if (sessionId) {
        await tx.paymentSession.update({
          where: { id: sessionId },
          data: {
            status: PrismaPaymentSessionStatus.FAILED,
            validationErrors: [message],
          },
        });
      }
    });
  }
}
