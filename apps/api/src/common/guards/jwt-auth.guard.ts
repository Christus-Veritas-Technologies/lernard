import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Plan, Role, type User } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      method?: string;
      originalUrl?: string;
      user?: User;
    }>();

    if (this.shouldBypassForDevQuizGenerate(request)) {
      request.user = await this.loadDevQuizUser(request.headers?.['x-dev-user-id']);
      return true;
    }

    return Boolean(await super.canActivate(context));
  }

  private shouldBypassForDevQuizGenerate(request: {
    method?: string;
    originalUrl?: string;
  }): boolean {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }

    return (
      request.method === 'POST' &&
      /\/v1\/quizzes\/generate(?:\?|$)/.test(String(request.originalUrl ?? ''))
    );
  }

  private async loadDevQuizUser(
    requestedUserId: string | string[] | undefined,
  ): Promise<User> {
    const userId = Array.isArray(requestedUserId)
      ? requestedUserId[0]
      : requestedUserId;

    if (userId) {
      const requestedUser = await this.prisma.user.findFirst({
        where: {
          id: userId,
          deletedAt: null,
        },
      });

      if (requestedUser) {
        return requestedUser;
      }
    }

    const preferredUser = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        role: Role.STUDENT,
        plan: { not: Plan.EXPLORER },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (preferredUser) {
      return preferredUser;
    }

    const fallbackUser = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!fallbackUser) {
      throw new UnauthorizedException(
        'No development user is available for quiz generation testing',
      );
    }

    return fallbackUser;
  }
}
