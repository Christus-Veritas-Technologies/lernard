/**
 * Static message constants for the Lernard WhatsApp client.
 *
 * IMPORTANT: Messages in this file must NEVER call Mastra/Claude.
 * They are purely static strings to minimise cost and latency.
 */

export const APP_URL = 'https://app.lernard.com';
export const SUPPORT_EMAIL = 'support@lernard.com';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const WELCOME_MESSAGE =
  `👋 *Welcome to Lernard on WhatsApp!*\n\n` +
  `Lernard brings lessons, quizzes, and projects right here in your chat — ` +
  `no internet bundle needed, just WhatsApp.\n\n` +
  `To get started, reply with your *email address* and I'll send you a sign-in code.`;

export const REQUEST_EMAIL_MESSAGE =
  `What's your *email address*? I'll send you a quick 6-digit code to sign in.`;

export const INVALID_EMAIL_MESSAGE =
  `That doesn't look like a valid email address. Please try again.\n\n` +
  `Example: _student@example.com_`;

export const OTP_SENT_MESSAGE = (email: string) =>
  `📩 A 6-digit code has been sent to *${email}*.\n\nEnter it here to sign in. ` +
  `_(It expires in 15 minutes.)_`;

export const OTP_INVALID_MESSAGE =
  `That code doesn't match or has expired. Please try again, or type *BACK* to re-enter your email.`;

export const SIGNUP_CONFIRM_MESSAGE = (email: string) =>
  `🔍 We couldn't find an account with *${email}*.\n\n` +
  `Would you like us to create one? Reply *YES* or *NO*.`;

export const SIGNUP_DECLINED_MESSAGE =
  `No problem! Message us again whenever you're ready to sign in. 👋`;

export const ONBOARDING_NAME_MESSAGE =
  `✅ *Account created!*\n\nWelcome to Lernard! What should I call you?`;

export const ONBOARDING_NAME_SAVED_MESSAGE = (name: string) =>
  `Nice to meet you, *${name}*! 🎉\n\n` +
  `What subjects are you studying? You can list a few, for example:\n` +
  `_Mathematics, Physics, History_\n\n` +
  `(Or reply *SKIP* to set this up later in the app.)`;

export const ONBOARDING_COMPLETE_MESSAGE = (name: string) =>
  `🎓 You're all set, *${name}*!\n\nReply *MENU* to see what Lernard can do for you.`;

export const SIGNIN_COMPLETE_MESSAGE = (name: string) =>
  `✅ *Signed in!* Welcome back, *${name}*.\n\nReply *MENU* to see your options.`;

export const AUTH_ERROR_MESSAGE =
  `Something went wrong during sign-in. Please try again by sending your email address.`;

// ─── Menu ────────────────────────────────────────────────────────────────────

export const MENU_MESSAGE =
  `📋 *Lernard Menu*\n\n` +
  `📖 *LESSON* [topic] — Start a lesson on any topic\n` +
  `   _Example: LESSON photosynthesis_\n\n` +
  `📝 *QUIZ* [topic] — Test your knowledge\n` +
  `   _Example: QUIZ algebra_\n\n` +
  `📄 *PROJECT* — Create a school project (PDF)\n\n` +
  `📊 *PROGRESS* — View your stats and streak\n\n` +
  `💳 *PLAN* — Check your current plan\n\n` +
  `❓ *HELP* — Get support\n\n` +
  `Or just ask me anything in plain English and I'll do my best to help! 😊`;

export const HELP_MESSAGE =
  `🆘 *Lernard Help*\n\n` +
  `You can talk to Lernard in natural language — just type what you need.\n\n` +
  `• _"Teach me about the water cycle"_\n` +
  `• _"Quiz me on fractions"_\n` +
  `• _"I need a project on climate change"_\n\n` +
  `Reply *MENU* for the full command list.\n\n` +
  `For account help, visit *${APP_URL}* or email *${SUPPORT_EMAIL}*.`;

// ─── Flow messages ────────────────────────────────────────────────────────────

export const GENERATING_LESSON_MESSAGE = (topic: string) =>
  `⏳ Generating your lesson on *${topic}*...\n_(This usually takes 20–30 seconds.)_`;

export const GENERATING_QUIZ_MESSAGE = (topic: string) =>
  `⏳ Generating a quiz on *${topic}*...\n_(This usually takes 15–20 seconds.)_`;

export const GENERATION_FAILED_MESSAGE =
  `😞 Something went wrong while generating your content. Please try again.\n\nReply *MENU* for options.`;

export const GENERATION_TIMEOUT_MESSAGE =
  `⏱️ Content generation is taking longer than expected. Please try again in a moment.\n\nReply *MENU* for options.`;

export const CANCEL_MESSAGE =
  `Cancelled. Reply *MENU* to start something new.`;

// ─── Project wizard ───────────────────────────────────────────────────────────

export const PROJECT_WIZARD_STEPS = [
  { key: 'subject', message: `📚 What *subject* is this project for?\n_Example: Biology, Geography, History_` },
  {
    key: 'level',
    message:
      `📏 What *academic level* is this for?\n\n` +
      `Reply with:\n` +
      `• *GRADE7* — Grade 7\n` +
      `• *OLEVEL* — O Level\n` +
      `• *ALEVEL* — A Level`,
  },
  { key: 'topicHint', message: `💡 What topic or title should the project focus on? _(Or reply SKIP to let Lernard choose)_` },
  { key: 'studentName', message: `👤 What is the *student's full name*?` },
  { key: 'schoolName', message: `🏫 What is the *school name*?` },
  { key: 'className', message: `🏷️ What is the *class name or form*? _Example: 4A, Lower Sixth_` },
  {
    key: 'community',
    message: `🌍 Describe your *community or local area* briefly.\n_Example: A farming community near Harare_`,
  },
  {
    key: 'problemStatement',
    message: `🔬 What *problem or challenge* will the project investigate? _(max 300 characters)_`,
  },
  {
    key: 'availableResources',
    message:
      `🛠️ What *resources are available* for this project?\n_Example: Internet access, local library, basic lab equipment_`,
  },
];

export const PROJECT_GENERATING_MESSAGE =
  `⏳ *Generating your project...*\n\nThis typically takes 1–2 minutes. I'll send you the PDF when it's ready.\n` +
  `You can keep chatting in the meantime!`;

export const PROJECT_READY_MESSAGE =
  `📄 *Your project is ready!* The PDF has been sent above.\n\n` +
  `Good luck with your work! 🎓\n\nReply *MENU* for more options.`;

export const PROJECT_FAILED_MESSAGE =
  `😞 Your project could not be generated. Please try again.\n\nReply *PROJECT* to start a new one or *MENU* for options.`;

// ─── Plan limits ──────────────────────────────────────────────────────────────

/**
 * Static plan-limit message. NEVER calls Mastra.
 */
export function PLAN_LIMIT_MESSAGE(
  resource: 'lessons' | 'quizzes' | 'projects' | 'chatMessages',
  resetAt: string | null,
  appUrl: string = APP_URL,
): string {
  const resourceLabel: Record<string, string> = {
    lessons: 'lessons',
    quizzes: 'quizzes',
    projects: 'projects',
    chatMessages: 'chat messages',
  };
  const label = resourceLabel[resource] ?? resource;

  const resetNote = resetAt
    ? `\n⏰ Your limit resets on *${new Date(resetAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}*.`
    : '';

  return (
    `📵 *Daily limit reached*\n\n` +
    `You've used all your ${label} for this period.${resetNote}\n\n` +
    `To keep learning without interruption, upgrade your plan in the app:\n` +
    `👉 *${appUrl}/plans*\n\n` +
    `_(Explorer plan: 2 lessons & 2 quizzes per day. Paid plans offer much more!)_`
  );
}

// ─── Progress / plan ──────────────────────────────────────────────────────────

export const VIEW_PLAN_MESSAGE = (plan: string, appUrl: string = APP_URL) =>
  `💳 You're currently on the *${plan}* plan.\n\nTo upgrade, visit:\n👉 *${appUrl}/plans*`;

export const PROGRESS_UNAVAILABLE_MESSAGE =
  `📊 Progress details are best viewed in the Lernard app.\n` +
  `👉 *${APP_URL}*\n\nReply *MENU* for other options.`;

// ─── Errors ───────────────────────────────────────────────────────────────────

export const GENERIC_ERROR_MESSAGE =
  `😔 Something went wrong. Please try again, or reply *MENU* to start fresh.`;

export const SESSION_EXPIRED_MESSAGE =
  `🔐 Your session has expired. Please reply with your *email address* to sign in again.`;

export const NOT_AUTHENTICATED_MESSAGE =
  `🔐 You need to sign in first. Reply with your *email address* to get started.`;
