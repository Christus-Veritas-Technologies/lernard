import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChildOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const childId = request.params.childId;

    if (!childId) {
      return true;
    }

    const guardian = await this.prisma.guardian.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    const child = await this.prisma.user.findUnique({ where: { id: childId } });

    if (!guardian || !child || child.controlledByGuardianId !== guardian.id) {
      throw new ForbiddenException(
        'You do not have access to this child account',
      );
    }

    return true;
  }
}
