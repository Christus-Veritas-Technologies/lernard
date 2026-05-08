import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Plan } from '@prisma/client';
import type { User } from '@prisma/client';
import { RedisService } from '../../redis/redis.service';

export type LimitResource = 'lessons' | 'quizzes';

export const PLAN_LIMIT_RESOURCE = 'planLimitResource';
/** Decorate a controller method with the resource type being limited */
export const CheckPlanLimit = (resource: LimitResource) =>
  SetMetadata(PLAN_LIMIT_RESOURCE, resource);

interface PlanConfig {
  window: 'daily' | 'monthly';
  lessonsLimit: number;
  quizzesLimit: number;
}

const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  [Plan.EXPLORER]: { window: 'daily', lessonsLimit: 2, quizzesLimit: 0 },
  [Plan.SCHOLAR]: { window: 'monthly', lessonsLimit: 80, quizzesLimit: 80 },
  [Plan.HOUSEHOLD]: { window: 'monthly', lessonsLimit: 100, quizzesLimit: 100 },
  [Plan.CAMPUS]: { window: 'monthly', lessonsLimit: 200, quizzesLimit: 200 },
};

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<LimitResource>(
      PLAN_LIMIT_RESOURCE,
      context.getHandler(),
    );

    if (!resource) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: User }>();
    const user = request.user;

    if (!user) {
      return true;
    }

    const config = PLAN_CONFIG[user.plan] ?? PLAN_CONFIG[Plan.EXPLORER];
    const limit =
      resource === 'lessons' ? config.lessonsLimit : config.quizzesLimit;
    const limitType =
      config.window === 'daily'
        ? (`${resource}_daily` as const)
        : (`${resource}_monthly` as const);

    if (limit === 0) {
      this.throwLimitError({
        limitType,
        plan: user.plan,
        used: 0,
        limit: 0,
        resetAt: tomorrowMidnightIso(),
        message: `${capitalise(resource)} are not available on the ${formatPlan(user.plan)} plan.`,
      });
    }

    const key = this.buildRedisKey(
      user.id,
      resource,
      config.window,
      user.billingAnchorDay,
    );
    const ttlSeconds = this.computeTtl(config.window, user.billingAnchorDay);

    const newCount = await this.redis.checkAndIncrement(key, limit, ttlSeconds);

    if (newCount === -1) {
      const used = await this.redis.getCount(key);
      this.throwLimitError({
        limitType,
        plan: user.plan,
        used,
        limit,
        resetAt: this.computeResetAt(config.window, user.billingAnchorDay),
        message: this.buildLimitMessage(
          resource,
          config.window,
          user.plan,
          limit,
        ),
      });
    }

    return true;
  }

  private buildRedisKey(
    userId: string,
    resource: LimitResource,
    window: 'daily' | 'monthly',
    billingAnchorDay: number | null,
  ): string {
    if (window === 'daily') {
      const today = new Date().toISOString().slice(0, 10);
      return `rate:${userId}:${resource}:day:${today}`;
    }
    const periodKey = getBillingPeriodKey(billingAnchorDay ?? 1);
    return `rate:${userId}:${resource}:month:${periodKey}`;
  }

  private computeTtl(
    window: 'daily' | 'monthly',
    billingAnchorDay: number | null,
  ): number {
    if (window === 'daily') {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCDate(midnight.getUTCDate() + 1);
      midnight.setUTCHours(0, 0, 0, 0);
      return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
    }
    const anchor = billingAnchorDay ?? 1;
    const nextAnchor = getNextBillingAnchor(anchor);
    return Math.ceil((nextAnchor.getTime() - Date.now()) / 1000);
  }

  private computeResetAt(
    window: 'daily' | 'monthly',
    billingAnchorDay: number | null,
  ): string {
    if (window === 'daily') return tomorrowMidnightIso();
    return getNextBillingAnchor(billingAnchorDay ?? 1).toISOString();
  }

  private buildLimitMessage(
    resource: LimitResource,
    window: 'daily' | 'monthly',
    plan: Plan,
    limit: number,
  ): string {
    if (window === 'daily') {
      return `You've used both ${resource} for today. Come back tomorrow.`;
    }
    return `You've used all ${limit} ${resource} for this billing cycle on the ${formatPlan(plan)} plan.`;
  }

  private throwLimitError(args: {
    limitType: string;
    plan: Plan;
    used: number;
    limit: number;
    resetAt: string;
    message: string;
  }): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'plan_limit_reached',
        limitType: args.limitType,
        plan: args.plan.toLowerCase(),
        used: args.used,
        limit: args.limit,
        resetAt: args.resetAt,
        hasTopUp: false,
        topUpRemaining: 0,
        message: args.message,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBillingPeriodKey(anchorDay: number): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  let periodYear = year;
  let periodMonth = month;

  if (day < anchorDay) {
    periodMonth = month - 1;
    if (periodMonth < 0) {
      periodMonth = 11;
      periodYear = year - 1;
    }
  }

  const mm = String(periodMonth + 1).padStart(2, '0');
  const dd = String(anchorDay).padStart(2, '0');
  return `${periodYear}-${mm}-${dd}`;
}

function getNextBillingAnchor(anchorDay: number): Date {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  let nextYear = year;
  let nextMonth = month;

  if (day < anchorDay) {
    nextMonth = month;
  } else {
    nextMonth = month + 1;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear = year + 1;
    }
  }

  return new Date(Date.UTC(nextYear, nextMonth, anchorDay, 0, 0, 0, 0));
}

function tomorrowMidnightIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatPlan(plan: Plan): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
}

