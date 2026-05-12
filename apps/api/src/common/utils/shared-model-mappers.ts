import {
  AgeGroup as PrismaAgeGroup,
  LearningGoal as PrismaLearningGoal,
  Plan as PrismaPlan,
  Role as PrismaRole,
  StrengthLevel as PrismaStrengthLevel,
} from '@prisma/client';
import {
  AgeGroup,
  Appearance,
  LearningGoal,
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
    case PrismaPlan.STUDENT_SCHOLAR:
      return Plan.STUDENT_SCHOLAR;
    case PrismaPlan.STUDENT_PRO:
      return Plan.STUDENT_PRO;
    case PrismaPlan.GUARDIAN_FAMILY_STARTER:
      return Plan.GUARDIAN_FAMILY_STARTER;
    case PrismaPlan.GUARDIAN_FAMILY_STANDARD:
      return Plan.GUARDIAN_FAMILY_STANDARD;
    case PrismaPlan.GUARDIAN_FAMILY_PREMIUM:
      return Plan.GUARDIAN_FAMILY_PREMIUM;
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

export function toPrismaStrengthLevel(
  value: StrengthLevel,
): PrismaStrengthLevel {
  switch (value) {
    case StrengthLevel.STRONG:
      return PrismaStrengthLevel.STRONG;
    case StrengthLevel.NEEDS_WORK:
      return PrismaStrengthLevel.NEEDS_WORK;
    case StrengthLevel.DEVELOPING:
    default:
      return PrismaStrengthLevel.DEVELOPING;
  }
}

export function toPrismaAgeGroup(value: AgeGroup): PrismaAgeGroup {
  switch (value) {
    case AgeGroup.PRIMARY:
      return PrismaAgeGroup.PRIMARY;
    case AgeGroup.UNIVERSITY:
      return PrismaAgeGroup.UNIVERSITY;
    case AgeGroup.PROFESSIONAL:
      return PrismaAgeGroup.PROFESSIONAL;
    case AgeGroup.SECONDARY:
    default:
      return PrismaAgeGroup.SECONDARY;
  }
}

export function toPrismaLearningGoal(value: LearningGoal): PrismaLearningGoal {
  switch (value) {
    case LearningGoal.EXAM_PREP:
      return PrismaLearningGoal.EXAM_PREP;
    case LearningGoal.KEEP_UP:
      return PrismaLearningGoal.KEEP_UP;
    case LearningGoal.FILL_GAPS:
      return PrismaLearningGoal.FILL_GAPS;
    case LearningGoal.LEARN_NEW:
    default:
      return PrismaLearningGoal.LEARN_NEW;
  }
}

export function toSharedSessionDepth(
  value: string | null | undefined,
): SessionDepth {
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

export function toSharedLearningMode(
  value: string | null | undefined,
): LearningMode {
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

export function toSharedAppearance(
  value: string | null | undefined,
): Appearance {
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
