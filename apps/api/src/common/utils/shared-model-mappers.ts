import { StrengthLevel as PrismaStrengthLevel } from '@prisma/client';
import {
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