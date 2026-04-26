import { BadRequestException, Injectable } from '@nestjs/common';
import type { UserSubject as SharedUserSubject } from '@lernard/shared-types';
import { toSharedStrengthLevel } from '../../common/utils/shared-model-mappers';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async getMine(userId: string): Promise<SharedUserSubject[]> {
    const subjects = await this.prisma.userSubject.findMany({
      where: { userId },
      include: {
        subject: true,
      },
      orderBy: { priorityIndex: 'asc' },
    });

    if (!subjects.length) {
      return [];
    }

    const progress = await this.prisma.subjectProgress.findMany({
      where: {
        userId,
        subjectId: { in: subjects.map((entry) => entry.subjectId) },
      },
      select: {
        subjectId: true,
        strengthLevel: true,
        updatedAt: true,
      },
    });

    const progressBySubjectId = new Map(progress.map((entry) => [entry.subjectId, entry]));

    return subjects.map((entry) => {
      const subjectProgress = progressBySubjectId.get(entry.subjectId);

      return {
        subjectId: entry.subjectId,
        name: entry.subject.name,
        priorityIndex: entry.priorityIndex,
        strengthLevel: toSharedStrengthLevel(subjectProgress?.strengthLevel),
        lastActiveAt: subjectProgress?.updatedAt.toISOString() ?? null,
      };
    });
  }

  async addMine(userId: string, subjects: string[]) {
    const cleanedSubjectIds = Array.from(new Set(subjects.map((subject) => subject.trim()).filter(Boolean)));

    if (!cleanedSubjectIds.length) {
      throw new BadRequestException('Provide at least one valid subject id.');
    }

    const availableSubjects = await this.prisma.subject.findMany({
      where: { id: { in: cleanedSubjectIds } },
      select: { id: true },
    });

    if (availableSubjects.length !== cleanedSubjectIds.length) {
      throw new BadRequestException('One or more subjects were not found.');
    }

    const existing = await this.prisma.userSubject.findMany({
      where: { userId },
      select: {
        subjectId: true,
        priorityIndex: true,
      },
      orderBy: { priorityIndex: 'asc' },
    });

    const existingSubjectIds = new Set(existing.map((entry) => entry.subjectId));
    const toCreate = cleanedSubjectIds.filter((subjectId) => !existingSubjectIds.has(subjectId));

    if (!toCreate.length) {
      return this.getMine(userId);
    }

    const nextPriorityIndex = existing.length
      ? Math.max(...existing.map((entry) => entry.priorityIndex)) + 1
      : 0;

    await this.prisma.$transaction(
      toCreate.map((subjectId, index) =>
        this.prisma.userSubject.create({
          data: {
            userId,
            subjectId,
            priorityIndex: nextPriorityIndex + index,
          },
        }),
      ),
    );

    return this.getMine(userId);
  }

  async removeMine(userId: string, subjectId: string) {
    await this.prisma.userSubject.deleteMany({
      where: {
        userId,
        subjectId,
      },
    });

    const remaining = await this.prisma.userSubject.findMany({
      where: { userId },
      orderBy: { priorityIndex: 'asc' },
      select: {
        id: true,
      },
    });

    if (remaining.length) {
      await this.prisma.$transaction(
        remaining.map((entry, index) =>
          this.prisma.userSubject.update({
            where: { id: entry.id },
            data: { priorityIndex: index },
          }),
        ),
      );
    }

    return this.getMine(userId);
  }

  async reorder(userId: string, order: string[]) {
    const cleanedOrder = Array.from(new Set(order.map((subjectId) => subjectId.trim()).filter(Boolean)));

    const existing = await this.prisma.userSubject.findMany({
      where: { userId },
      select: {
        id: true,
        subjectId: true,
      },
      orderBy: { priorityIndex: 'asc' },
    });

    const existingIds = existing.map((entry) => entry.subjectId);

    if (cleanedOrder.length !== existingIds.length) {
      throw new BadRequestException('Order must include all assigned subject ids exactly once.');
    }

    if (!cleanedOrder.every((subjectId) => existingIds.includes(subjectId))) {
      throw new BadRequestException('Order includes unknown subject ids.');
    }

    const userSubjectBySubjectId = new Map(existing.map((entry) => [entry.subjectId, entry.id]));

    await this.prisma.$transaction(
      cleanedOrder.map((subjectId, index) =>
        this.prisma.userSubject.update({
          where: { id: userSubjectBySubjectId.get(subjectId)! },
          data: { priorityIndex: index },
        }),
      ),
    );

    return this.getMine(userId);
  }
}
