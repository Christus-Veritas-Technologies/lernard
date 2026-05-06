export const ROUTES = {
  HOME: {
    PAYLOAD: '/v1/home/payload',
  },

  AUTH: {
    MAGIC_LINK_REQUEST: '/v1/auth/magic-link/request',
    MAGIC_LINK_VERIFY: '/v1/auth/magic-link/verify',
    GOOGLE: '/v1/auth/google',
    GOOGLE_CODE: '/v1/auth/google/code',
    GOOGLE_CALLBACK: '/v1/auth/google/callback',
    GOOGLE_SESSION: '/v1/auth/google/session',
    APPLE: '/v1/auth/apple',
    LOGOUT: '/v1/auth/logout',
    REFRESH: '/v1/auth/refresh',
    GUARDIAN_VERIFY_PASSWORD: '/v1/auth/guardian/verify-password',
    ME: '/v1/auth/me',
    MIGRATE_GUEST: '/v1/auth/migrate-guest',
    CSRF_TOKEN: '/csrf-token',
  },

  ONBOARDING: {
    ACCOUNT_TYPE: '/v1/onboarding/account-type',
    PROFILE: '/v1/onboarding/profile',
    SUBJECTS: '/v1/onboarding/subjects',
    FIRST_LOOK: {
      START: '/v1/onboarding/first-look/start',
      SUBMIT: '/v1/onboarding/first-look/submit',
      SKIP: '/v1/onboarding/first-look/skip',
    },
  },

  SUBJECTS: {
    LIST: '/v1/subjects',
    MINE: '/v1/subjects/mine',
    ADD: '/v1/subjects/mine',
    REMOVE: (subjectId: string) => `/v1/subjects/mine/${subjectId}` as const,
    REORDER: '/v1/subjects/mine/reorder',
  },

  PROGRESS: {
    OVERVIEW: '/v1/progress/overview',
    SUBJECTS: '/v1/progress/subjects',
    SUBJECT: (subjectId: string) => `/v1/progress/subjects/${subjectId}` as const,
    GROWTH_AREAS: '/v1/progress/growth-areas',
    HISTORY: '/v1/progress/history',
  },

  LESSONS: {
    GENERATE: '/v1/lessons/generate',
    GET: (lessonId: string) => `/v1/lessons/${lessonId}` as const,
    SECTION_CHECK: (lessonId: string) => `/v1/lessons/${lessonId}/section-check` as const,
    COMPLETE: (lessonId: string) => `/v1/lessons/${lessonId}/complete` as const,
  },

  QUIZZES: {
    GENERATE: '/v1/quizzes/generate',
    GET: (quizId: string) => `/v1/quizzes/${quizId}` as const,
    ANSWER: (quizId: string) => `/v1/quizzes/${quizId}/answer` as const,
    COMPLETE: (quizId: string) => `/v1/quizzes/${quizId}/complete` as const,
  },

  CHAT: {
    CONVERSATIONS: '/v1/chat/conversations',
    CONVERSATION: (conversationId: string) => `/v1/chat/conversations/${conversationId}` as const,
    ATTACHMENTS_UPLOAD: '/v1/chat/attachments/upload',
    ATTACHABLE_LESSONS: '/v1/chat/attachments/lessons',
    MESSAGE: '/v1/chat/message',
    MESSAGE_STREAM: '/v1/chat/message/stream',
  },

  SETTINGS: {
    GET: '/v1/settings',
    PAYLOAD: '/v1/settings/payload',
    MODE: '/v1/settings/mode',
    COMPANION_CONTROLS: '/v1/settings/companion-controls',
    APPEARANCE: '/v1/settings/appearance',
    DAILY_GOAL: '/v1/settings/daily-goal',
  },

  GUARDIAN: {
    CHILDREN: '/v1/guardian/children',
    DASHBOARD_PAYLOAD: '/v1/guardian/children/payload',
    INVITE: '/v1/guardian/children/invite',
    ACCEPT_INVITE: '/v1/guardian/children/accept-invite',
    PENDING: '/v1/guardian/children/pending',
    CANCEL_INVITE: (token: string) => `/v1/guardian/children/invite/${token}` as const,
    RESEND_INVITE: (token: string) => `/v1/guardian/children/invite/${token}/resend` as const,
    CHILD: (childId: string) => `/v1/guardian/children/${childId}` as const,
    CHILD_PAYLOAD: (childId: string) => `/v1/guardian/children/${childId}/payload` as const,
    REMOVE_CHILD: (childId: string) => `/v1/guardian/children/${childId}` as const,
    CHILD_PROGRESS: (childId: string) => `/v1/guardian/children/${childId}/progress` as const,
    CHILD_SUBJECTS: (childId: string) => `/v1/guardian/children/${childId}/subjects` as const,
    CHILD_COMPANION_CONTROLS: (childId: string) => `/v1/guardian/children/${childId}/companion-controls` as const,
    CHILD_COMPANION_PAYLOAD: (childId: string) => `/v1/guardian/children/${childId}/companion-controls/payload` as const,
  },

  WEBHOOKS: {
    BILLING: '/webhooks/billing',
  },
} as const
