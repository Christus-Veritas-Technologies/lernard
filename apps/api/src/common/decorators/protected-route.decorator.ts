import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@lernard/shared-types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ChildOwnershipGuard } from '../guards/child-ownership.guard';
import { SettingsLockGuard } from '../guards/settings-lock.guard';
import { Roles } from './roles.decorator';

interface ProtectedRouteOptions {
  roles?: Role[];
  ownershipCheck?: boolean;
  settingsLock?: boolean;
}

export function ProtectedRoute(options: ProtectedRouteOptions = {}) {
  const guards: any[] = [JwtAuthGuard, RolesGuard];

  if (options.ownershipCheck) {
    guards.push(ChildOwnershipGuard);
  }

  if (options.settingsLock) {
    guards.push(SettingsLockGuard);
  }

  const decorators: MethodDecorator[] = [];

  if (options.roles?.length) {
    decorators.push(Roles(...options.roles));
  }

  decorators.push(UseGuards(...guards));

  return applyDecorators(...decorators);
}
