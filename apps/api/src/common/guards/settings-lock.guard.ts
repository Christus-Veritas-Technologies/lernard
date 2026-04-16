import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsLockGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user.controlledByGuardianId) {
      return true;
    }

    const student = await this.prisma.user.findUnique({ where: { id: user.id } });
    const lockedSettings: string[] = student?.lockedSettings ?? [];
    const settingKey = request.params.setting ?? request.path.split('/').pop();

    if (lockedSettings.includes(settingKey)) {
      throw new ForbiddenException(
        'This setting has been locked by your Guardian',
      );
    }

    return true;
  }
}
