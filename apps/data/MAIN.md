# Lernard — Complete Project Plan

---

## 1. What Lernard Is

Lernard is an AI-powered adaptive learning mobile and web app. It generates lessons and quizzes on the fly — no pre-built content library. Every lesson and quiz is generated fresh by Claude, tailored to the specific student's level, subject, and current weak areas. Lernard remembers every student across sessions via Mastra's memory system.

The app is NOT a chatbot with a lesson library bolted on. The AI IS the product.

---

## 2. Brand Identity

**Name:** Lernard (from "Learn")
**Tagline:** *Your personal tutor. Always ready.*
**Personality:** Lernard is the brilliant friend who happens to know everything — warm, encouraging, never condescending. He meets you where you are and takes you further. He remembers what you struggled with last week and quietly adjusts. He doesn't lecture; he explains.
**Voice:** Conversational, confident, occasionally witty. Never robotic. Never formal. Uses "you" constantly. Short sentences. Direct.
**Core promise:** No two students learn the same way. Lernard doesn't treat them the same way.

---

## 3. Target Audience

- Primary school students
- Secondary school students
- University / college students
- Working professionals

All ages, all levels. Any subject — fully open-ended. No pre-defined curriculum.

---

## 4. Terminology & Naming

| Generic Name | Lernard Name |
|---|---|
| Free plan | Explorer |
| Student plan | Scholar |
| Family plan | Household |
| School plan | Lernard Campus |
| Admin dashboard | The Staffroom |
| Teacher dashboard | The Classroom |
| School class / group | Squad |
| Teacher-assigned topic | Set Work |
| Parent account | Guardian |
| Weak areas | Growth areas |
| Strength map | Lernard's Read on You |
| Baseline quiz | First Look |
| Student (school) | Enrolled |

---

## 5. Roles

```
guest        — unauthenticated, device-local progress only
student      — core learner account
guardian     — controls one or more student accounts
teacher      — post-MVP, Campus plan
school_admin — post-MVP, Campus plan
```

**Rule:** Role is ALWAYS read from the database. Never trust JWT role claims.

---

## 6. Learning Modes

### Guide Mode (default)
When a student asks a question in chat, Lernard does NOT answer directly.

1. Give 1–2 non-related analogous examples that illustrate the same concept
2. Ask the student to answer those examples
3. Guide them to answer the original question themselves
4. Only confirm or correct once they've genuinely attempted it

**Example:** Student asks "What is ¼ as a percentage?"
- WRONG: "¼ as a percentage is 25%."
- RIGHT: "Let's think about it differently. If you cut a pizza into 2 equal slices and take 1, what fraction is that? And if I told you that's 50%, what does the 50 represent? Now try the same logic with ¼ — what do you think the answer might be?"

### Companion Mode
When a student asks a question:

1. Give a concept breakdown of the topic
2. Generate and run a quiz on the topic
3. Reveal the answer to the original question ONLY AFTER the quiz is passed (or at the start, depending on `CompanionControls` set by Guardian)

**Example reveal:** "You did great with that 8/10 ranking on the quiz, the answer to your original question of 'What is ¼' is 25%. Do you get it now?"

**Default mode:** Guide
**Mode toggle:** Available in settings
**Guardian control:** Guardian can lock mode via `lockedSettings`. Changing Companion Controls requires guardian password (server-enforced).

---

## 7. Pricing Plans

### Explorer — Free
- 2 lessons/day (60/month max)
- 0 quizzes
- Unlimited chat
- No voice, no images
- No top-ups — upgrade to Scholar

### Scholar — $9.99/month
- 80 lessons/month
- 80 quizzes/month
- Unlimited chat
- Full progress tracking
- Top-up: **$2.99 for 20 lessons + 20 quizzes** (expires end of billing cycle)

### Household — $29.99/month
- Up to 3 children
- 100 lessons + 100 quizzes per child/month
- Unlimited chat per child
- Parent (Guardian) dashboard
- All Scholar features per child
- Top-up: **$1.99 per child for 20 lessons + 20 quizzes**

### Lernard Campus — Custom pricing (post-MVP)
- Per-student/month pricing, negotiated at volume (~$3–5/student/month)
- Teacher dashboard (The Classroom)
- School admin dashboard (The Staffroom)
- Class-wide progress reports
- Topic assignment (Set Work)
- Parent linking per student

**Top-up design notes:**
- Top-ups expire at end of current billing cycle — no rollover
- Household top-up cheaper per child than Scholar top-up (rewards higher tier)
- Explorer gets no top-up — upgrade is the only exit

---

## 8. API Stack

| API | Role |
|---|---|
| **Mastra** | AI Agent orchestration — memory, tool use, agent delegation |
| **Claude Sonnet 4.6** | Lesson generation, quiz generation, chat responses |
| **Claude Haiku 4.5** | UI slot decisions, content validation, compression, subject inference |

**Removed from MVP (post-MVP only):**
- ElevenLabs (voice narration)
- Nano Banana Pro (image/diagram generation)

---

## 9. Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | Expo (React Native) |
| Web app | Next.js (App Router) |
| Backend API | NestJS |
| Monorepo | Turborepo + pnpm |
| Database | MongoDB (Mongoose) |
| Cache / Rate limiting | Redis |
| AI Agent | Mastra |
| Lesson & Quiz AI | Claude Sonnet 4.6 (`claude-sonnet-4-20250514`) |
| UI Slot AI | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) |
| Auth | JWT + Refresh Token Rotation |
| Mastra memory store | LibSQL (separate from MongoDB) |

---

## 10. App Pages & Navigation

### Mobile (Expo) — Navigation Structure

```
RootNavigator (Stack)
│
├── OnboardingNavigator (Stack) — shown if no session
│   ├── WelcomeScreen
│   ├── AuthScreen (Login / Sign Up)
│   ├── AccountTypeScreen ("I'm a Student" / "I'm a Guardian")
│   ├── ProfileSetupScreen (3-step wizard)
│   └── FirstLookScreen (baseline quiz, skippable)
│
└── AppNavigator (Stack)
    │
    ├── MainTabs (Bottom Tab Navigator — 5 tabs)
    │   ├── HomeTab → HomeScreen
    │   ├── LearnTab → TopicEntryScreen
    │   ├── QuizTab → QuizEntryScreen
    │   ├── ProgressTab → ProgressScreen
    │   └── ChatTab → ChatScreen
    │
    ├── LessonStack
    │   ├── LessonLoadingScreen
    │   ├── LessonReaderScreen
    │   └── PostLessonScreen
    │
    ├── QuizStack
    │   ├── QuizLoadingScreen
    │   ├── QuizScreen
    │   └── QuizResultsScreen
    │
    ├── ProgressStack
    │   ├── SubjectDetailScreen
    │   └── SessionHistoryScreen
    │
    ├── SettingsStack
    │   ├── SettingsScreen
    │   ├── ProfileEditScreen
    │   ├── SubjectManagerScreen
    │   ├── LearningPreferencesScreen
    │   ├── ModeSettingsScreen
    │   └── CompanionControlsScreen (Guardian-gated)
    │
    └── GuardianStack
        ├── GuardianDashboardScreen
        ├── ChildProfileScreen
        └── GuardianCompanionSettingsScreen
```

### Web (Next.js) — File Structure

```
app/
├── (auth)/
│   ├── welcome/page.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── account-type/page.tsx
├── (onboarding)/
│   ├── profile-setup/page.tsx
│   └── first-look/page.tsx
└── (app)/
    ├── layout.tsx              ← sidebar nav (desktop) / bottom bar (mobile web)
    ├── home/page.tsx
    ├── learn/
    │   ├── page.tsx
    │   └── [lessonId]/
    │       ├── loading/page.tsx
    │       ├── page.tsx
    │       └── complete/page.tsx
    ├── quiz/
    │   ├── page.tsx
    │   └── [quizId]/
    │       ├── loading/page.tsx
    │       ├── page.tsx
    │       └── results/page.tsx
    ├── chat/
    │   ├── page.tsx
    │   └── [conversationId]/page.tsx
    ├── progress/
    │   ├── page.tsx
    │   ├── [subjectId]/page.tsx
    │   └── history/page.tsx
    ├── settings/
    │   ├── page.tsx
    │   ├── profile/page.tsx
    │   ├── subjects/page.tsx
    │   ├── preferences/page.tsx
    │   ├── mode/page.tsx
    │   └── companion-controls/page.tsx
    └── guardian/
        ├── page.tsx
        ├── [childId]/page.tsx
        └── [childId]/companion/page.tsx
```

**Total: 25 screens (mobile), 25 pages (web). 1-to-1 mapping throughout.**

---

## 11. Page-by-Page Feature Detail

### Onboarding

**WelcomeScreen**
- App name, tagline, value proposition
- "Let's Go" CTA + "I already have an account" link

**AuthScreen**
- Email + password
- Google / Apple social login
- "Continue without an account" — guest mode with nudge that progress won't be saved
- Copy uses Lernard's voice: "Create your account — Lernard needs to know who he's tutoring."

**AccountTypeScreen**
- "I'm a Student" / "I'm a Guardian"
- Determines account type and subsequent onboarding flow

**ProfileSetupScreen (3-step wizard)**
- Step 1: Name, age group (Primary / Secondary / University / Professional), grade or year
- Step 2: Subject input (free text + quick-add tags), learning goal (Exam prep / Keep up / Learn something new / Fill gaps)
- Step 3: Preferred session length, starting difficulty, daily target

**FirstLookScreen**
- 5–10 AI-generated questions per subject
- Framed as: "No grades. No pressure. Just helping Lernard figure out where to begin."
- Results feed AI silently — no score shown
- Skippable: "Skip for now — Lernard will figure it out as we go."

---

### HomeScreen

- Personalised Lernard greeting (Claude-generated): "Good morning, Kin. Ready to pick up where we left off?"
- Daily streak + XP level badge
- "Continue Learning" card — resumes last session or Lernard's pick for today
- Daily goal ring with Lernard micro-commentary
- Subject cards — strength indicator, last active date
- Weak area nudge banner: "You've had a few slip-ups with Algebra lately. Want Lernard to run a quick session on it?"
- "Ask Lernard anything" persistent CTA
- Recent sessions (last 3)

**Dynamic slots:** `urgent_action`, `streak_nudge`, `primary_cta`

---

### TopicEntryScreen

- Single large free-text field: "What do you want to learn today?"
- Subject auto-detected (editable)
- Depth picker: Quick look / Full lesson / Go deep
- "Lernard's choice" — AI picks based on growth areas and history

---

### LessonLoadingScreen

- Loading state with Lernard's voice: "Building your lesson on [topic] — pitched at [Grade X] level, just for you…"

---

### LessonReaderScreen

Lesson structure:
1. **Hook** — why this topic matters, plain language
2. **Concept** — numbered sections, one idea at a time (max 4)
3. **Examples** — step-by-step worked examples
4. **Recap** — 3–5 bullet takeaways

Features:
- "Got it?" micro-check after each section (feeds AI silently, no judgment shown)
- Tap any term → Lernard plain-English popup explanation
- Progress bar across top
- Estimated read time upfront
- Font size control + Light / Dark / Sepia theme

**Dynamic slots:** `confidence_check`, `worked_example`

---

### PostLessonScreen

- Lernard recap message
- 3-bullet lesson summary
- Confidence self-rating 1–5 stars (feeds AI)
- XP earned animation
- CTAs: "Quiz me on this" / "What's next?"

---

### QuizEntryScreen

- Topic input (same as lesson entry) if standalone
- Length: 5 / 10 / 15 questions
- Framed as: "Lernard will tailor the difficulty to where you are right now."

---

### QuizScreen

- One question at a time
- Question types: Multiple choice, True/False, Fill in the blank, Short written answer, Ordering/matching
- No visible timer unless opted in
- "I'm not sure" option (prevents guessing from polluting skill tracker)
- Per-question immediate feedback (Guide mode) or withheld until complete (Companion mode)

**Dynamic slots:** `hint_card` (Guide), `concept_recap` (Companion)

---

### QuizResultsScreen

- Not a grade — a debrief
- Topics broken into: Strong / Needs work / Revisit soon
- XP earned
- CTAs: "Drill the weak spots" / "Back to Dashboard"

---

### ChatScreen

- Full Mastra agent conversational interface
- Lernard knows who the student is, what they've studied, where they struggle
- Guide or Companion mode applied to all responses
- Google Search available for current events / factual grounding
- File upload → Lernard reads and responds to it (exam papers, textbook chapters)
- Chat history maintained per session, older history compressed to memory
- "Build a lesson on this" CTA from any response
- "Quiz me on this" CTA from any response

**Dynamic slots:** Each message block — `text`, `QuizCard`, `ConceptBreakdown`, `ProgressNudge`

---

### ProgressScreen

- Overall streak and XP level
- Per-subject strength view
- Claude-generated Lernard summary card (natural language)
- Total lessons / total quizzes
- Average session length

**Dynamic slots:** `lernard_summary_card`, `growth_area_nudge`

---

### SubjectDetailScreen

- Per-subject topic breakdown in three tiers: Confident / Getting there / Needs work
- Tap any weak topic → one-tap to start a Lernard session on it

---

### SessionHistoryScreen

- Full session log: date, subject, topic, type (lesson or quiz), duration
- Filterable by subject and date range
- Cursor-based pagination (default 20 per page)

---

### SettingsScreen

- Profile editing
- Subject manager
- Learning preferences (session length, difficulty, daily goal)
- Guide / Companion mode toggle
- Companion Controls (Guardian-gated with password)
- Appearance (light/dark/system)
- Notification preferences
- Account management

---

### GuardianDashboardScreen

- Overview of all linked child accounts
- Per-child: subject strength, last active, streak

### ChildProfileScreen

- Individual child's progress, subject strength, session history (read-only)

### GuardianCompanionSettingsScreen

- Companion Controls per child
- Answer reveal timing: immediate / after quiz
- Password required to change any setting
- Audit log of all setting changes

---

## 12. NestJS API Routes

All routes prefixed `/v1/`. Webhooks not versioned.

### Auth
```
POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/google
POST   /v1/auth/apple
POST   /v1/auth/logout
POST   /v1/auth/refresh
POST   /v1/auth/guardian/verify-password
GET    /v1/auth/me
POST   /v1/auth/migrate-guest
GET    /csrf-token
```

### Onboarding
```
POST   /v1/onboarding/account-type
POST   /v1/onboarding/profile
POST   /v1/onboarding/subjects
POST   /v1/onboarding/first-look/start
POST   /v1/onboarding/first-look/submit
POST   /v1/onboarding/first-look/skip
```

### Subjects
```
GET    /v1/subjects
GET    /v1/subjects/mine
POST   /v1/subjects/mine
DELETE /v1/subjects/mine/:subjectId
PATCH  /v1/subjects/mine/reorder
```

### Lessons
```
POST   /v1/lessons/generate
GET    /v1/lessons/:id
POST   /v1/lessons/:id/section-check
POST   /v1/lessons/:id/complete
GET    /v1/lessons/history
```

### Quizzes
```
POST   /v1/quizzes/generate
GET    /v1/quizzes/:id
POST   /v1/quizzes/:id/answer
POST   /v1/quizzes/:id/complete
GET    /v1/quizzes/history
```

### Chat
```
POST   /v1/chat/message
GET    /v1/chat/conversations
GET    /v1/chat/conversations/:id
DELETE /v1/chat/conversations/:id
POST   /v1/chat/conversations/:id/to-lesson
POST   /v1/chat/conversations/:id/to-quiz
```

### Progress
```
GET    /v1/progress/overview
GET    /v1/progress/subjects
GET    /v1/progress/subjects/:subjectId
GET    /v1/progress/history
GET    /v1/progress/growth-areas
```

### Settings
```
GET    /v1/settings
PATCH  /v1/settings/mode
PATCH  /v1/settings/companion-controls
PATCH  /v1/settings/appearance
PATCH  /v1/settings/daily-goal
```

### Guardian
```
GET    /v1/guardian/children
POST   /v1/guardian/children/invite
POST   /v1/guardian/children/accept-invite
GET    /v1/guardian/children/pending
DELETE /v1/guardian/children/invite/:token
GET    /v1/guardian/children/:childId
DELETE /v1/guardian/children/:childId
GET    /v1/guardian/children/:childId/progress
GET    /v1/guardian/children/:childId/subjects
GET    /v1/guardian/children/:childId/history
PATCH  /v1/guardian/children/:childId/companion-controls
```

### Webhooks
```
POST   /webhooks/billing
```

**Total: 52 API routes**

---

## 13. Turborepo Monorepo Structure

```
lernard/
├── apps/
│   ├── mobile/          Expo
│   ├── web/             Next.js
│   └── api/             NestJS
├── packages/            Frontend-safe shared packages
│   ├── shared-types/    All TypeScript interfaces
│   ├── api-client/      Pre-built fetch wrappers
│   ├── routes/          API route constants
│   ├── ui-slots/        Slot contract types + validation
│   ├── skill-map/       Pure skill scoring functions
│   ├── auth-core/       Token helpers, permission checking
│   ├── validation/      Zod schemas + DTOs
│   └── config/          ESLint, TypeScript, Tailwind base configs
└── services/
    └── ai-prompts/      API-only — never import in frontends
```

**Package manager:** pnpm
**Package naming:** `@lernard/shared-types`, `@lernard/api-client`, etc.

---

## 14. Page Contracts

### The Core Rule

**Role logic lives in NestJS. Frontends never check `user.role`.**

Every page makes ONE API call returning a `PagePayload<T>`:

```typescript
interface PagePayload<T> {
  version: number
  content: T
  permissions: ScopedPermission[]
  slots: SlotAssignments
  permissionsTTL: number       // always 60 seconds
  issuedAt: number
  forcePermissionsRefresh?: boolean
}

interface ScopedPermission {
  action: Permission
  resourceId?: string
  resourceType?: 'child' | 'subject' | 'lesson'
}
```

### Permission Types
```typescript
type Permission =
  | 'can_start_lesson'
  | 'can_take_quiz'
  | 'can_edit_mode'
  | 'can_view_child_progress'
  | 'can_change_companion_controls'
  | 'can_assign_topics'           // post-MVP teacher
  | 'can_view_class_progress'     // post-MVP teacher
  | 'can_export_reports'          // post-MVP teacher
  | 'can_manage_teachers'         // post-MVP school admin
  | 'can_manage_school_settings'  // post-MVP school admin
  | 'can_view_school_reports'     // post-MVP school admin
```

### How NestJS Builds Payloads

```typescript
async getHomePayload(user: User): Promise<PagePayload<HomeContent>> {
  // Content and permissions — non-negotiable, no timeout
  const [content, permissions] = await Promise.all([
    this.buildHomeContent(user),
    this.buildPermissions(user),
  ])

  // Slots — best-effort, 800ms timeout, null fallback
  const slots = await this.resolveHomeSlots(user)

  return { version: 1, content, permissions, slots, permissionsTTL: 60, issuedAt: Date.now() }
}
```

**Critical:** Slots always resolve AFTER content and permissions. Slots never block page load.

### Dynamic UI Slots Per Page

| Page | Slots |
|---|---|
| Home | `urgent_action`, `streak_nudge`, `primary_cta` |
| Lesson Reader | `confidence_check`, `worked_example` |
| Quiz | `hint_card` (Guide), `concept_recap` (Companion) |
| Chat | Each message block — text or component |
| Progress | `lernard_summary_card`, `growth_area_nudge` |

### Slot Rules

1. AI owns content, frontend owns presentation — AI never dictates color, layout, or spacing
2. Every slot has a null state — null slot collapses cleanly
3. Variants are finite and pre-approved — new slot types require a frontend component first
4. Haiku has an 800ms timeout — on timeout, return null slots and render anyway
5. Zero-state students always get `first_lesson_nudge` for `urgent_action`

### Frontend Permission Check

```typescript
import { can } from '@lernard/auth-core'

can(permissions, 'can_start_lesson')
can(permissions, 'can_change_companion_controls', child.id)
```

Never check `user.role` in frontend code. Ever.

---

## 15. Mastra Agent Configuration

### Agent Roster

| Agent | Model | Responsibility |
|---|---|---|
| `ChatAgent` | Sonnet 4.6 | Main tutor — Guide/Companion mode, all tools |
| `LessonAgent` | Sonnet 4.6 | Generates full tailored lessons |
| `QuizAgent` | Sonnet 4.6 | Generates quizzes, evaluates written answers |
| `SlotAgent` | Haiku 4.5 | Decides dynamic UI slot content |
| `ProgressAgent` | Haiku 4.5 | Generates progress summaries |
| `CompressionAgent` | Haiku 4.5 | Compresses chat history into memory |

### Tool Registry

| Tool | Description |
|---|---|
| `web_search` | Google Search — current events, factual grounding |
| `file_search` | Read uploaded student documents |
| `memory_read` | Read student's Mastra memory store |
| `memory_write` | Write new facts to student memory |
| `generate_lesson` | Delegates to LessonAgent |
| `generate_quiz` | Delegates to QuizAgent |
| `skill_map_read` | Read skill strength scores from MongoDB |

### Agent Tool Access Matrix

| Agent | memory_read | memory_write | web_search | file_search | generate_lesson | generate_quiz | skill_map_read |
|---|---|---|---|---|---|---|---|
| ChatAgent | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| LessonAgent | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| QuizAgent | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| SlotAgent | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| ProgressAgent | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| CompressionAgent | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Memory Architecture (per student)

```typescript
interface LernardMemory {
  // Identity — always injected, never evicted
  studentId: string
  name: string
  role: 'student' | 'guest'
  ageGroup: 'primary' | 'secondary' | 'university' | 'professional'
  grade: string | null
  timezone: string
  learningMode: 'guide' | 'companion'
  preferredDepth: 'quick' | 'standard' | 'deep'
  plan: 'explorer' | 'scholar' | 'household'

  // Subjects — always injected, max 10
  subjects: Array<{
    subjectId: string
    name: string
    priorityIndex: number
    strengthLevel: 'strong' | 'developing' | 'needs_work'
  }>

  // Rolling context — evicted at limits
  recentLessonTopics: Array<{...}>   // max 20, FIFO
  growthAreas: Array<{...}>          // max 15, replaced by score
  recentChatFacts: string[]          // max 30 plain-language facts, LRU
  chatSummaries: Array<{...}>        // max 10 conversation summaries
}
```

### Chat History Management

- Max messages sent to Mastra per call: last 20 + compressed summary
- Compression triggers when conversation exceeds 40 messages
- CompressionAgent runs before ChatAgent on next call, compresses old messages via Haiku
- Compressed summary stored in `chatSummaries` memory key

### Agent Call Flow

```
Student sends chat message
          │
          ▼
   ChatService (NestJS)
          │
          ├─ Compression check (>40 messages?) → CompressionAgent if yes
          ├─ Build rolling context (last 20 + summaries)
          ▼
      ChatAgent
          ├─ memory_read (always, on new session)
          ├─ Applies Guide or Companion mode logic
          ├─ web_search? (factual grounding)
          ├─ file_search? (student uploaded document)
          ├─ generate_lesson? → LessonAgent
          │   └─ memory_read → skill_map_read → generates lesson
          ├─ generate_quiz? → QuizAgent
          │   └─ memory_read → skill_map_read → generates quiz → memory_write
          ├─ memory_write? (student revealed important context)
          └─ Returns response
                    │
                    ▼
           ContentGuard validates
                    │
                    ▼
            Stored in MongoDB
                    │
                    ▼
           Streamed to frontend
```

### Startup Validation

App refuses to start if registered tools don't match tools mentioned in system prompt.

```typescript
async onModuleInit() {
  this.validateAgentToolRegistration()
  // Throws if mismatch detected — prevents silent tool hallucination
}
```

---

## 16. Security — All 46 Issues Found and Fixed

### Critical (🔴)

1. **Guardian password gate client-side only** → `GuardianPasswordGuard` NestJS guard on route, 403 without correct password regardless of UI
2. **No child ownership validation** → `ChildOwnershipGuard` on every child route, queries `guardian.children.studentId === childId`
3. **Stale permissions after guardian changes settings** → `invalidatePermissionsAt` timestamp on student record, `PermissionsInvalidationInterceptor` on every response, `forcePermissionsRefresh` flag triggers client re-fetch
4. **Student account has no ownership model** → `controlledBy: guardianId | null` and `lockedSettings[]` on student document, `SettingsLockGuard` checks before any settings change
5. **JWT role trusted without DB verify** → JWT contains only `sub`, `iat`, `exp`. `JwtStrategy.validate()` always re-fetches user from MongoDB
6. **Child linking has no consent handshake** → Two-step invite flow: Guardian generates 6-digit code (15min TTL) → child accepts with code → link created. No direct linking.
7. **Skill map poisoned by cross-user quiz submission** → `QuizOwnershipGuard` verifies `quiz.ownerId === request.user.id` on all quiz interaction routes
8. **Guest migration not idempotent** → `migrationId` UUID on guest session, `$setOnInsert` prevents overwrites on retry, MongoDB transaction with status tracking
9. **No refresh token rotation** → Every refresh invalidates old token, issues new. Token reuse detection revokes ALL user tokens. Redis blacklist: `token_revoked:{userId}`
10. **No CSRF protection on web frontend** → `csrf-csrf` double-submit cookie, applied only when `x-client-type: web`, skipped for `x-client-type: mobile`
11. **Lesson content not validated before storage** → Every generated lesson/quiz/chat response passes `validateGeneratedContent()` via Haiku before MongoDB write
12. **Correct answer exposed in quiz answer response** → `correctAnswer` field is `undefined` until `POST /quizzes/:id/complete`, gated by mode and CompanionControls
13. **Guard execution order undefined** → Always: `JwtAuthGuard → RolesGuard → ChildOwnershipGuard → SettingsLockGuard`. `@ProtectedRoute()` decorator enforces order
14. **Plan limit TOCTOU race condition** → Atomic Lua script in Redis: check-and-increment in single operation, no race window
15. **No security headers** → Helmet applied at bootstrap with CSP, HSTS, COEP

### Significant (🟡)

16. **Two API calls per page load** → Slots resolved inside page payload builder via `Promise.all`, single HTTP call returns content + permissions + slots
17. **Permissions are global not scoped** → `ScopedPermission { action, resourceId?, resourceType? }` — permissions scoped to specific children, subjects, etc.
18. **Guest mode breaks contract system** → `guest` is first-class role with own payload builders and fixed permission set
19. **ai-prompts can leak into client bundles** → Moved to `services/` outside `packages/`, ESLint `no-restricted-paths` rule, CI fails on violation
20. **Haiku timeout can block page load** → 800ms timeout via `Promise.race`, null fallback per slot, content and permissions never in same `Promise.all` as slots
21. **No rate limiting on generation endpoints** → Redis `PlanLimitsGuard` with Lua atomic script, runs before Claude is called
22. **Companion Controls race condition on quiz submit** → CompanionControls read fresh from MongoDB inside the quiz completion transaction, never cached from session start
23. **Baseline quiz results never reweighted** → Baseline data points decay linearly from weight 1 → 0 over 20 sessions
24. **Chat history has no size cap** → Last 20 messages sent to Mastra + Haiku-compressed summary, CompressionAgent triggers at 40 messages
25. **No idempotency on generation endpoints** → `idempotencyKey` (UUID v4) required in request body, Redis caches result for 24h, retries return cached result
26. **Removed APIs still in Mastra agent config** → System prompt scoped to MVP tools only, startup validation checks prompt vs registry
27. **No API versioning** → Global prefix `/v1/`, future breaking changes add `/v2/` alongside
28. **Mastra memory grows unbounded** → Max counts per key type with LRU/FIFO eviction
29. **No retry strategy for Claude failures** → `completeWithRetry()` with exponential backoff: 1s, 2s, 4s, max 8s, max 3 retries. Retryable: 429, 500, 529
30. **Skill map update blocks results screen** → Quiz results shown immediately from quiz record, skill impact loaded as secondary async call with skeleton
31. **Plan limits daily not monthly** → Two Redis keys: daily (`rate:{userId}:lessons:day:{date}`) and monthly (`rate:{userId}:lessons:month:{billingPeriod}`), monthly keyed to billing anchor day

### Low Urgency (🟢)

32. **No MongoDB index strategy** → Indexes defined in schema files on all filtered/sorted fields, TTL indexes for auto-cleanup
33. **No input length limits** → `@MaxLength` on all DTOs: topic 300, chat message 2000, name 50
34. **Expired invites never cleaned up** → MongoDB TTL index on `expiresAt`: `{ expireAfterSeconds: 0 }`
35. **Chat-derived lessons have no subject tag** → Haiku infers subject from conversation, maps to student's tracked subjects, fallback to `uncategorised`
36. **No pagination on session history** → Cursor-based pagination on all list endpoints, default 20, max 50
37. **Guardian deletion leaves dangling child references** → Blocked if active Household subscription. On deletion: clears `controlledBy` and `lockedSettings` on all linked students, sends push notification
38. **Streak calculation is timezone-naive** → `date-fns-tz` with student's stored timezone (`Africa/Harare` default), stored at profile setup
39. **Subject priority not passed to slot resolver** → `priorityIndex` included in Haiku context, Haiku instructed to weight lower index in slot decisions
40. **No soft delete on lessons/quizzes** → `deletedAt: Date | null` field, queries filter `deletedAt: null`, hard delete background job after 30 days
41. **Chat conversations have no title** → Haiku generates 4–6 word title from first message on conversation creation
42. **No billing webhook handler** → `/webhooks/billing` endpoint updates `user.billing.plan` and `billingAnchorDay` on subscription events, signature verified
43. **No audit log for guardian setting changes** → `settings_audit` collection: guardianId, childId, setting, old/new value, timestamp, IP, user agent. Read-only.
44. **No zero-state contracts** → Every payload builder checks `sessionCount === 0`, returns `first_lesson_nudge` slot. Haiku instructed to return null for slots it cannot populate from real data.
45. **No contract versioning** → `version: number` field on every payload, frontend shows "Please update" prompt on version mismatch, never crashes
46. **Future role permissions undefined** → All post-MVP permission types (`can_assign_topics`, `can_manage_teachers`, etc.) pre-defined in union type for TypeScript exhaustiveness

---

## 17. Token Costs & Profitability

### Model Pricing (Confirmed April 2026)

| Model | Input per 1M tokens | Output per 1M tokens |
|---|---|---|
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Haiku 4.5 | $1.00 | $5.00 |

### Token Estimates Per Operation (Above Average — Stress Test)

**Lesson generation (Sonnet):**
- Input: 1,550 tokens (system prompt + memory + tools + topic)
- Output: 800 tokens (standard lesson ~600 words)
- Plus Haiku content validation: 800 input + 50 output

**Quiz generation + evaluation (Sonnet):**
- Generation: 1,300 input + 1,200 output
- Written answer evaluation (3/10 questions): 900 input + 450 output
- Plus Haiku validation

**Chat message (Sonnet):**
- Input: 3,600 tokens (system + memory + last 20 messages)
- Output: 300 tokens

**Slot resolution (Haiku):** 700 input + 200 output
**Progress summary (Haiku):** 600 input + 150 output
**Compression (Haiku):** 3,000 input + 200 output

### Prompt Caching

Cache write: 1.25× base input price. Cache read: 0.10× base input price (90% cheaper).

**Cacheable content per agent call:** ~1,300 tokens (system prompt + memory context + skill map)
**TTL strategy:** System prompts → 1 hour. Memory context + skill map → 5 minutes.
**Assumption:** 30% cache writes, 70% cache reads per session.

### Cost Per Operation (With Caching)

| Operation | Cost |
|---|---|
| Lesson (Sonnet + Haiku validation) | **$0.01554** |
| Quiz (Sonnet generation + evaluation + Haiku) | **$0.02241** |
| Chat message | **$0.01177** |
| Slot resolution (Haiku) | **$0.00170** |
| Progress summary (Haiku) | **$0.00135** |
| Compression (Haiku) | **$0.00400** |

### Plan Profitability (With Caching, Above Average User)

**Explorer (Free) — 60 lessons/month, 0 quizzes, 30 chats:**

| | |
|---|---|
| API cost | $1.39/month |
| Revenue | $0 |
| Loss | **-$1.39/month** (acquisition cost, acceptable) |

**Scholar — $9.99/month (80 lessons, 80 quizzes, 100 chats):**

| Scenario | API Cost | Gross Profit | Margin |
|---|---|---|---|
| 100% limits | $4.33 | $5.66 | **57%** |
| 50% limits (average) | $2.24 | $7.75 | **78%** |

**Household — $29.99/month (3 children, 100 lessons + 100 quizzes per child):**

| Scenario | API Cost | Gross Profit | Margin |
|---|---|---|---|
| All 3 at 100% limits | $13.51 | $16.48 | **55%** |
| All 3 at 50% limits | $6.76 | $23.23 | **77%** |
| 2 active, 1 inactive | $9.01 | $20.98 | **70%** |

**Top-ups:**

| | Price | API Cost | Gross Profit | Margin |
|---|---|---|---|---|
| Scholar top-up (20L + 20Q) | $2.99 | $0.759 | $2.231 | **75%** |
| Household top-up per child | $1.99 | $0.759 | $1.231 | **62%** |

### Summary Table

| Plan | Price | API Cost (above avg) | Gross Profit | Margin |
|---|---|---|---|---|
| Explorer | $0 | $1.39 | -$1.39 | Acquisition cost |
| Scholar | $9.99 | $4.33 | $5.66 | **57%** |
| Household (3 kids) | $29.99 | $13.51 | $16.48 | **55%** |
| Scholar top-up | $2.99 | $0.76 | $2.23 | **75%** |
| Household top-up | $1.99 | $0.76 | $1.23 | **62%** |

---

## 18. School Partnership Strategy

### Seminar Approach

Host seminars on "AI in Education — why not to be afraid of it." Build trust before any sales conversation. The key message: Lernard isn't replacing teachers. It's a homework and revision tool. The teacher still leads.

### Lernard Campus Onboarding Flow

1. Seminar → interest → demo for school leadership
2. Pilot offer: 1 class (Squad) free for 30 days
3. Successful pilot → school signs term or annual contract
4. School admin creates school account in The Staffroom
5. Admin adds teachers to The Classroom
6. Teachers add students to Squads
7. Students get Enrolled accounts

### Campus Feature Set

**The Staffroom (School Admin)**
- Add/remove teachers and students
- School-wide progress overview
- Usage stats — lessons, quizzes, active students
- Billing and seat management
- Default learning mode (Guide vs Companion) set school-wide

**The Classroom (Teacher)**
- Create and manage Squads
- Assign Set Work — specific topics to a Squad
- Class-wide growth areas at a glance
- Individual student progress (no personal data access)
- Flag struggling students → triggers Lernard growth-area session

**Enrolled Student Experience**
- Same core Lernard experience — nothing feels institutional
- Set Work appears as "From your teacher" card on home screen
- Guardian linking still available alongside school account

**Auto-Generated Reports**
- Weekly class report generated by Claude in plain English
- Exportable for school records

---

## 19. MVP Scope

### Must-Have for MVP

- Auth (email + Google, Student/Guardian account types)
- Guest mode with local progress + migration on registration
- Full onboarding wizard + First Look baseline quiz
- Home dashboard with rule-based slots (not AI-driven yet)
- Lesson generation (Claude Sonnet)
- Quiz generation + evaluation (Claude Sonnet)
- Guide and Companion modes (fully functional — key differentiator)
- Guardian password gate for Companion Controls
- Chat (full Mastra agent — memory, Google Search, all tools)
- Progress screen with skill map
- Settings with all user-facing controls
- Basic Guardian account (link child, view progress, set Companion Controls)
- Prompt caching (implement before launch)
- All 46 security issues addressed

### Deliberately Deferred (Post-MVP)

| Feature | Why |
|---|---|
| ElevenLabs voice narration | Cost-heavy, not a retention driver at launch |
| Nano Banana / image generation | Unverified API, adds complexity |
| Lernard Campus school plan | Needs a sales motion, not a product sprint |
| Full Guardian dashboard | Basic Guardian account sufficient for MVP |
| Achievements/badges | Nice-to-have, not a wedge feature |
| File upload in chat | Useful but not critical |
| Teacher / The Classroom | Post-Campus launch |
| AI-driven home slots | Rule-based sufficient for MVP |
| Push notifications | Basic only |

### MVP North Star

Every session, Lernard should feel like it knows the student better than last time. Mastra + skill map updates are non-negotiable even in MVP. Everything else can wait.

---

## 20. General Development Rules

1. One HTTP call per page load — content + permissions + slots together
2. Role logic lives in NestJS only — frontends use permissions, never role
3. All free-text inputs have server-side length limits — no exceptions
4. All Claude calls go through `completeWithRetry()` — never call Claude directly
5. All generated content passes `validateGeneratedContent()` before storage
6. Never import `@lernard/ai-prompts` in web or mobile — API only
7. Never hardcode an API route string — always use `@lernard/routes`
8. Never define an entity type locally — always use `@lernard/shared-types`
9. Guard order always: `JwtAuthGuard → RolesGuard → ChildOwnershipGuard → SettingsLockGuard`
10. Slot rendering never crashes — unknown slot type = render nothing
11. Haiku for anything that doesn't need Sonnet's quality — cost and speed matter
12. Optimise for slow 4G (Zimbabwe) — minimise round trips
13. Implement prompt caching before launch — biggest single cost lever
14. Never reference ElevenLabs or Nano Banana in code, prompts, or comments (not in MVP)
15. All list endpoints use cursor-based pagination from day one

---

*Last updated: April 2026*
*Status: Planning complete, ready for development*