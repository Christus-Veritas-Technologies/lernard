import { StrengthLevel as PrismaStrengthLevel } from '@prisma/client';
import {
  Appearance,
  LearningMode,
  SessionDepth,
  StrengthLevel,
} from '@lernard/shared-types';

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