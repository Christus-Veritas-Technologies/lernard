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
    SETUP: '/v1/auth/setup',
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
    DISMISS_GROWTH_AREA: (subjectId: string, topic: string) =>
      `/v1/progress/growth-areas/${encodeURIComponent(subjectId)}/${encodeURIComponent(topic)}` as const,
    HISTORY: '/v1/progress/history',
    SUMMARY: '/v1/progress/summary',
    RESET: '/v1/progress/reset',
  },

  LESSONS: {
    LIST: '/v1/lessons',
    GENERATE: '/v1/lessons/generate',
    ATTACHMENTS_UPLOAD: '/v1/lessons/attachments/upload',
    GET: (lessonId: string) => `/v1/lessons/${lessonId}` as const,
    STREAM: (lessonId: string) => `/v1/lessons/${lessonId}/stream` as const,
    SECTION_CHECK: (lessonId: string) => `/v1/lessons/${lessonId}/section-check` as const,
    REEXPLAIN: (lessonId: string) => `/v1/lessons/${lessonId}/reexplain` as const,
    COMPLETE: (lessonId: string) => `/v1/lessons/${lessonId}/complete` as const,
  },

  QUIZZES: {
    GENERATE: '/v1/quizzes/generate',
    ATTACHMENTS_UPLOAD: '/v1/quizzes/attachments/upload',
    DASHBOARD_STATS: '/v1/quizzes/dashboard-stats',
    HISTORY: '/v1/quizzes/history',
    GET: (quizId: string) => `/v1/quizzes/${quizId}` as const,
    STREAM: (quizId: string) => `/v1/quizzes/${quizId}/stream` as const,
    STATUS: (quizId: string) => `/v1/quizzes/${quizId}/status` as const,
    REMEDIATION_CONTEXT: (quizId: string) =>
      `/v1/quizzes/${quizId}/remediation-context` as const,
    ANSWER: (quizId: string) => `/v1/quizzes/${quizId}/answer` as const,
    COMPLETE: (quizId: string) => `/v1/quizzes/${quizId}/complete` as const,
    EVALUATE_SHORT_ANSWER: (quizId: string) => `/v1/quizzes/${quizId}/evaluate-short-answer` as const,
    ANSWER_PART: (quizId: string) => `/v1/quizzes/${quizId}/answer-part` as const,
  },

  PROJECTS: {
    PAYLOAD: '/v1/projects/payload',
    TEMPLATES: '/v1/projects/templates',
    CREATE_DRAFT: '/v1/projects/drafts',
    UPDATE_DRAFT: (draftId: string) => `/v1/projects/drafts/${draftId}` as const,
    GET_DRAFT: (draftId: string) => `/v1/projects/drafts/${draftId}` as const,
    GENERATE: '/v1/projects/generate',
    GET: (projectId: string) => `/v1/projects/${projectId}` as const,
    STATUS: (projectId: string) => `/v1/projects/${projectId}/status` as const,
    DOWNLOAD_PDF: (projectId: string) => `/v1/projects/${projectId}/download` as const,
    EDIT_PDF: (projectId: string) => `/v1/projects/${projectId}/edit-pdf` as const,
  },

  CHAT: {
    CONVERSATIONS: '/v1/chat/conversations',
    CONVERSATION: (conversationId: string) => `/v1/chat/conversations/${conversationId}` as const,
    ATTACHMENTS_UPLOAD: '/v1/chat/attachments/upload',
    ATTACHABLE_LESSONS: '/v1/chat/attachments/lessons',
    ATTACHABLE_QUIZZES: '/v1/chat/attachments/quizzes',
    MESSAGE: '/v1/chat/message',
    MESSAGE_STREAM: '/v1/chat/message/stream',
  },

  NOTIFICATIONS: {
    SUBSCRIPTIONS: '/v1/notifications/subscriptions',
    TEST: '/v1/notifications/test',
  },

  SETTINGS: {
    GET: '/v1/settings',
    PAYLOAD: '/v1/settings/payload',
    MODE: '/v1/settings/mode',
    COMPANION_CONTROLS: '/v1/settings/companion-controls',
    APPEARANCE: '/v1/settings/appearance',
    DAILY_GOAL: '/v1/settings/daily-goal',
    AVATAR_UPLOAD: '/v1/settings/avatar',
    PROFILE: '/v1/settings/profile',
    STUDY: '/v1/settings/study',
    NOTIFICATIONS: '/v1/settings/notifications',
    UNLINK_GUARDIAN: '/v1/settings/unlink-guardian',
    DELETE_ACCOUNT: '/v1/settings/account',
  },

  GUARDIAN: {
    CHILDREN: '/v1/guardian/children',
    DASHBOARD_PAYLOAD: '/v1/guardian/children/payload',
    SETTINGS_PROFILE: '/v1/guardian/settings/profile',
    SETTINGS_NOTIFICATIONS: '/v1/guardian/settings/notifications',
    INVITE: '/v1/guardian/children/invite',
    ACCEPT_INVITE: '/v1/guardian/children/accept-invite',
    DECLINE_INVITE: '/v1/guardian/children/decline-invite',
    PENDING_INVITE_FOR_ME: '/v1/guardian/children/pending-invite-for-me',
    PENDING: '/v1/guardian/children/pending',
    CANCEL_INVITE: (token: string) => `/v1/guardian/children/invite/${token}` as const,
    RESEND_INVITE: (token: string) => `/v1/guardian/children/invite/${token}/resend` as const,
    CHILD: (childId: string) => `/v1/guardian/children/${childId}` as const,
    CHILD_PAYLOAD: (childId: string) => `/v1/guardian/children/${childId}/payload` as const,
    REMOVE_CHILD: (childId: string) => `/v1/guardian/children/${childId}` as const,
    CHILD_RESEND_SETUP: (childId: string) => `/v1/guardian/children/${childId}/resend-setup` as const,
    CHILD_PROGRESS: (childId: string) => `/v1/guardian/children/${childId}/progress` as const,
    CHILD_SUBJECTS: (childId: string) => `/v1/guardian/children/${childId}/subjects` as const,
    CHILD_COMPANION_CONTROLS: (childId: string) => `/v1/guardian/children/${childId}/companion-controls` as const,
    CHILD_COMPANION_PAYLOAD: (childId: string) => `/v1/guardian/children/${childId}/companion-controls/payload` as const,
  },

  WEBHOOKS: {
    BILLING: '/webhooks/billing',
  },

  PAYMENTS: {
    INITIATE: '/v1/payments/initiate',
    STATUS: (reference: string) => `/v1/payments/status/${reference}` as const,
    PAYNOW_CALLBACK: '/v1/payments/paynow/callback',
  },
} as const
