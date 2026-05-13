import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@lernard/shared-types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ChildOwnershipGuard } from '../guards/child-ownership.guard';
import { SettingsLockGuard } from '../guards/settings-lock.guard';
import { CheckPlanLimit, LimitResource, PlanLimitsGuard } from '../guards/plan-limits.guard';
import { Roles } from './roles.decorator';

interface ProtectedRouteOptions {
  roles?: Role[];
  ownershipCheck?: boolean;
  settingsLock?: boolean;
  /** Include PlanLimitsGuard for this resource. Guard order: JwtAuthGuard → RolesGuard → [optional: ChildOwnership, SettingsLock] → PlanLimitsGuard */
  planLimit?: LimitResource;
}

export function ProtectedRoute(options: ProtectedRouteOptions = {}) {
  const guards: any[] = [JwtAuthGuard, RolesGuard];

  if (options.ownershipCheck) {
    guards.push(ChildOwnershipGuard);
  }

  if (options.settingsLock) {
    guards.push(SettingsLockGuard);
  }

  if (options.planLimit) {
    guards.push(PlanLimitsGuard);
  }

  const decorators: MethodDecorator[] = [];

  if (options.roles?.length) {
    decorators.push(Roles(...options.roles));
  }

  if (options.planLimit) {
    decorators.push(CheckPlanLimit(options.planLimit));
  }

  decorators.push(UseGuards(...guards));

  return applyDecorators(...decorators);
}
