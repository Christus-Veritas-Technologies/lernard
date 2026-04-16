export const ROUTES = {
  AUTH: {
    REGISTER: '/v1/auth/register',
    LOGIN: '/v1/auth/login',
    GOOGLE: '/v1/auth/google',
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

  LESSONS: {
    GENERATE: '/v1/lessons/generate',
    GET: (id: string) => `/v1/lessons/${id}` as const,
    SECTION_CHECK: (id: string) => `/v1/lessons/${id}/section-check` as const,
    COMPLETE: (id: string) => `/v1/lessons/${id}/complete` as const,
    HISTORY: '/v1/lessons/history',
  },

  QUIZZES: {
    GENERATE: '/v1/quizzes/generate',
    GET: (id: string) => `/v1/quizzes/${id}` as const,
    ANSWER: (id: string) => `/v1/quizzes/${id}/answer` as const,
    COMPLETE: (id: string) => `/v1/quizzes/${id}/complete` as const,
    HISTORY: '/v1/quizzes/history',
  },

  CHAT: {
    MESSAGE: '/v1/chat/message',
    CONVERSATIONS: '/v1/chat/conversations',
    CONVERSATION: (id: string) => `/v1/chat/conversations/${id}` as const,
    DELETE_CONVERSATION: (id: string) => `/v1/chat/conversations/${id}` as const,
    TO_LESSON: (id: string) => `/v1/chat/conversations/${id}/to-lesson` as const,
    TO_QUIZ: (id: string) => `/v1/chat/conversations/${id}/to-quiz` as const,
  },

  PROGRESS: {
    OVERVIEW: '/v1/progress/overview',
    SUBJECTS: '/v1/progress/subjects',
    SUBJECT: (subjectId: string) => `/v1/progress/subjects/${subjectId}` as const,
    HISTORY: '/v1/progress/history',
    GROWTH_AREAS: '/v1/progress/growth-areas',
  },

  SETTINGS: {
    GET: '/v1/settings',
    MODE: '/v1/settings/mode',
    COMPANION_CONTROLS: '/v1/settings/companion-controls',
    APPEARANCE: '/v1/settings/appearance',
    DAILY_GOAL: '/v1/settings/daily-goal',
  },

  GUARDIAN: {
    CHILDREN: '/v1/guardian/children',
    INVITE: '/v1/guardian/children/invite',
    ACCEPT_INVITE: '/v1/guardian/children/accept-invite',
    PENDING: '/v1/guardian/children/pending',
    CANCEL_INVITE: (token: string) => `/v1/guardian/children/invite/${token}` as const,
    CHILD: (childId: string) => `/v1/guardian/children/${childId}` as const,
    REMOVE_CHILD: (childId: string) => `/v1/guardian/children/${childId}` as const,
    CHILD_PROGRESS: (childId: string) => `/v1/guardian/children/${childId}/progress` as const,
    CHILD_SUBJECTS: (childId: string) => `/v1/guardian/children/${childId}/subjects` as const,
    CHILD_HISTORY: (childId: string) => `/v1/guardian/children/${childId}/history` as const,
    CHILD_COMPANION_CONTROLS: (childId: string) => `/v1/guardian/children/${childId}/companion-controls` as const,
  },

  WEBHOOKS: {
    BILLING: '/webhooks/billing',
  },
} as const
