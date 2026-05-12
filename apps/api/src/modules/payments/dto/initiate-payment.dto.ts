import { IsEnum } from 'class-validator';
import { Plan } from '@lernard/shared-types';

const PAID_PLANS = [
  Plan.STUDENT_SCHOLAR,
  Plan.STUDENT_PRO,
  Plan.GUARDIAN_FAMILY_STARTER,
  Plan.GUARDIAN_FAMILY_STANDARD,
  Plan.GUARDIAN_FAMILY_PREMIUM,
] as const;

export type PaidPlan = (typeof PAID_PLANS)[number];

export class InitiatePaymentDto {
  @IsEnum(PAID_PLANS, {
    message: 'plan must be a paid plan tier',
  })
  plan: PaidPlan;
}
