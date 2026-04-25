import {
  Plan as PrismaPlan,
  Role as PrismaRole,
  StrengthLevel as PrismaStrengthLevel,
} from '@prisma/client';
import {
  Appearance,
  LearningMode,
  Plan,
  Role,
  SessionDepth,
  StrengthLevel,
} from '@lernard/shared-types';

export function toSharedRole(role: PrismaRole | null | undefined): Role {
  switch (role) {
    case PrismaRole.GUEST:
      return Role.GUEST;
    case PrismaRole.GUARDIAN:
      return Role.GUARDIAN;
    case PrismaRole.TEACHER:
      return Role.TEACHER;
    case PrismaRole.SCHOOL_ADMIN:
      return Role.SCHOOL_ADMIN;
    case PrismaRole.STUDENT:
    default:
      return Role.STUDENT;
  }
}

export function toSharedPlan(plan: PrismaPlan | null | undefined): Plan {
  switch (plan) {
    case PrismaPlan.SCHOLAR:
      return Plan.SCHOLAR;
    case PrismaPlan.HOUSEHOLD:
      return Plan.HOUSEHOLD;
    case PrismaPlan.CAMPUS:
      return Plan.CAMPUS;
    case PrismaPlan.EXPLORER:
    default:
      return Plan.EXPLORER;
  }
}

export function toSharedStrengthLevel(
  strengthLevel: PrismaStrengthLevel | null | undefined,
): StrengthLevel {
  switch (strengthLevel) {
    case PrismaStrengthLevel.STRONG:
      return StrengthLevel.STRONG;
    case PrismaStrengthLevel.NEEDS_WORK:
      return StrengthLevel.NEEDS_WORK;
    case PrismaStrengthLevel.DEVELOPING:
    default:
      return StrengthLevel.DEVELOPING;
  }
}

export function toSharedSessionDepth(value: string | null | undefined): SessionDepth {
  switch (value) {
    case SessionDepth.QUICK:
      return SessionDepth.QUICK;
    case SessionDepth.DEEP:
      return SessionDepth.DEEP;
    case SessionDepth.STANDARD:
    default:
      return SessionDepth.STANDARD;
  }
}

export function toSharedLearningMode(value: string | null | undefined): LearningMode {
  switch (value?.toLowerCase()) {
    case LearningMode.COMPANION:
      return LearningMode.COMPANION;
    case LearningMode.GUIDE:
    default:
      return LearningMode.GUIDE;
  }
}

export function toPrismaLearningMode(
  value: LearningMode | 'guide' | 'companion',
): 'GUIDE' | 'COMPANION' {
  return value === LearningMode.COMPANION ? 'COMPANION' : 'GUIDE';
}

export function toSharedAppearance(value: string | null | undefined): Appearance {
  switch (value?.toLowerCase()) {
    case Appearance.DARK:
      return Appearance.DARK;
    case Appearance.LIGHT:
      return Appearance.LIGHT;
    case Appearance.SYSTEM:
    default:
      return Appearance.SYSTEM;
  }
}