export enum Role {
  GUEST = 'guest',
  STUDENT = 'student',
  GUARDIAN = 'guardian',
  TEACHER = 'teacher',
  SCHOOL_ADMIN = 'school_admin',
}

export enum Plan {
  EXPLORER = 'explorer',
  /** Legacy student plan — kept for migration safety */
  SCHOLAR = 'scholar',
  /** Legacy guardian/family plan — kept for migration safety */
  HOUSEHOLD = 'household',
  STUDENT_SCHOLAR = 'student_scholar',
  STUDENT_PRO = 'student_pro',
  GUARDIAN_FAMILY_STARTER = 'guardian_family_starter',
  GUARDIAN_FAMILY_STANDARD = 'guardian_family_standard',
  GUARDIAN_FAMILY_PREMIUM = 'guardian_family_premium',
}

export enum LearningMode {
  GUIDE = 'guide',
  COMPANION = 'companion',
}

export enum AgeGroup {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  UNIVERSITY = 'university',
  PROFESSIONAL = 'professional',
}

export enum StrengthLevel {
  STRONG = 'strong',
  DEVELOPING = 'developing',
  NEEDS_WORK = 'needs_work',
}

export enum LearningGoal {
  EXAM_PREP = 'exam_prep',
  KEEP_UP = 'keep_up',
  LEARN_NEW = 'learn_new',
  FILL_GAPS = 'fill_gaps',
}

export enum SessionDepth {
  QUICK = 'quick',
  STANDARD = 'standard',
  DEEP = 'deep',
}

export enum Appearance {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}
