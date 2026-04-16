import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  // TODO: Implement Redis Lua atomic check-and-increment
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const _user = request.user;

    // Placeholder — will use Redis Lua script for atomic check-and-increment
    // Two keys: daily (rate:{userId}:lessons:day:{date}) and monthly
    return true;
  }
}
