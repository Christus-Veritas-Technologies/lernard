---
name: architecture
description: "Lernard system architecture — monorepo topology, PagePayload contract, permission model, slot system, NestJS middleware-router-controller pattern, frontend page patterns, Mastra agent integration. Use when creating new modules, endpoints, pages, screens, or working on cross-cutting concerns."
---

# Lernard Architecture

## Monorepo Topology

```
apps/         → Deployable applications (consume packages, never consumed)
packages/     → Shared libraries (consumed by apps, never import from apps)
services/     → API-only service code (never imported by frontends or packages)
```

**Dependency flow:** `apps → packages` — one direction only. Packages never import from apps. Apps never import from other apps.

**`services/ai-prompts`** lives outside `packages/` specifically to prevent frontend imports. An ESLint `no-restricted-paths` rule enforces this boundary. CI fails on violation.

## The PagePayload Contract

The single most important architectural pattern in Lernard. Every frontend page makes **ONE** HTTP call that returns everything it needs.

```typescript
interface PagePayload<T> {
  version: number                    // Contract version — frontend checks for compatibility
  content: T                         // Page-specific data
  permissions: ScopedPermission[]    // What the user can do
  slots: SlotAssignments             // AI-populated dynamic UI content
  permissionsTTL: number             // Always 60 seconds
  issuedAt: number                   // Timestamp for staleness checks
  forcePermissionsRefresh?: boolean  // Guardian changed settings → force re-fetch
}
```

### Build Order

1. **Content + Permissions** — resolve via `Promise.all`. Non-negotiable, no timeout
2. **Slots** — resolve AFTER, with 800ms timeout. On timeout → null fallback for each slot

Slots NEVER block page load. If Haiku is slow or unavailable, the page renders with null slots (collapsed cleanly).

### Zero-State

When `sessionCount === 0` (brand new student), the home payload always includes `first_lesson_nudge` as the `urgent_action` slot. Haiku is NOT called for zero-state students — rule-based slots only.

## Permission Model

**Core rule:** Role logic lives in NestJS. Frontends never check `user.role`.

```typescript
interface ScopedPermission {
  action: Permission       // 'can_start_lesson', 'can_change_companion_controls', etc.
  resourceId?: string      // Specific child, subject, or lesson
  resourceType?: 'child' | 'subject' | 'lesson'
}
```

Frontend permission check:
```typescript
import { can } from '@lernard/auth-core'

// Simple permission
if (can(permissions, 'can_start_lesson')) { ... }

// Scoped to a specific child
if (can(permissions, 'can_change_companion_controls', child.id)) { ... }
```

**Why scoped?** A Guardian may control 3 children but only have permission to change Companion Controls on 2 of them. Global permissions can't express this.

### Permission Invalidation

When a Guardian changes a child's settings:
1. Backend sets `invalidatePermissionsAt` timestamp on the student record
2. `PermissionsInvalidationInterceptor` checks this on every student response
3. If stale → response includes `forcePermissionsRefresh: true`
4. Frontend detects flag → re-fetches page payload

## Slot System

Dynamic UI slots are content areas populated by AI (Haiku for MVP, rule-based fallback).

### Rules
1. **AI owns content, frontend owns presentation** — slots carry data (text, type, metadata), never styling
2. **Finite pre-approved variants** — adding a new slot type requires a frontend component first
3. **Null = collapse** — null/undefined slot collapses cleanly. No empty boxes
4. **Unknown = skip** — unrecognised slot type renders nothing. Never crash
5. **800ms timeout** — Haiku gets 800ms to resolve. After that → null for all slots

### Per-Page Slots (MVP)

| Page | Slots |
|---|---|
| Home | `urgent_action`, `streak_nudge`, `primary_cta` |
| Lesson Reader | `confidence_check`, `worked_example` |
| Quiz | `hint_card` (Guide mode), `concept_recap` (Companion mode) |
| Chat | Each message block — `text`, `QuizCard`, `ConceptBreakdown`, `ProgressNudge` |
| Progress | `lernard_summary_card`, `growth_area_nudge` |

## Frontend Page Pattern

Every screen/page follows this composition:

```
Page Component
  └─ usePagePayload(endpoint)     ← Single API call
      ├─ Content                  ← Passed to feature components
      ├─ Permissions              ← Passed to permission-aware UI
      └─ Slots                    ← Rendered by slot renderers
```

### Native (Expo)
```typescript
export function HomeScreen() {
  const { data, loading, error } = usePagePayload<HomeContent>(ROUTES.HOME.PAYLOAD)

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState retry={refetch} />
  if (!data) return null

  return (
    <ScrollView className="flex-1 bg-background px-4">
      <GreetingHeader greeting={data.content.greeting} />
      <ContinueLearningCard lesson={data.content.lastLesson} />
      <SubjectGrid subjects={data.content.subjects} permissions={data.permissions} />
      <SlotRenderer slot={data.slots.streak_nudge} />
    </ScrollView>
  )
}
```

### Web (Next.js)
```typescript
// Server component — data fetching
export default async function HomePage() {
  const payload = await serverFetch<PagePayload<HomeContent>>(ROUTES.HOME.PAYLOAD)
  return <HomeClient payload={payload} />
}

// Client component — interactivity
'use client'
function HomeClient({ payload }: { payload: PagePayload<HomeContent> }) {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <GreetingHeader greeting={payload.content.greeting} />
      <ContinueLearningCard lesson={payload.content.lastLesson} />
      <SubjectGrid subjects={payload.content.subjects} permissions={payload.permissions} />
      <SlotRenderer slot={payload.slots.streak_nudge} />
    </main>
  )
}
```

## NestJS Backend Architecture

See [full NestJS patterns reference](./references/nestjs-patterns.md) for module structure, guard chain, controller/service patterns, Mastra integration, rate limiting, idempotency, and pagination.

**Key points:**
- Middleware → Router → Controller → Service
- Controllers: thin, parse + delegate + return
- Services: all business logic, never access Request
- Guards: JwtAuthGuard → RolesGuard → ChildOwnershipGuard → SettingsLockGuard
- `completeWithRetry()` for all Claude calls
- `validateGeneratedContent()` for all AI output before storage
- Cursor-based pagination on all list endpoints

## Feature Implementation Order

Dependencies determine order. Each phase unlocks the next.

```
A. Foundation     → Monorepo scaffold, shared packages (types, routes, validation, auth-core)
B. Authentication → NestJS auth module, JWT + refresh rotation, guest mode
C. Onboarding    → Account type, profile wizard, First Look (depends on B)
D. Lessons       → Generate, read, complete (depends on B, parallel with E)
E. Quizzes       → Generate, answer, complete (depends on B, parallel with D)
F. Chat          → Mastra ChatAgent, Guide/Companion modes (depends on D+E)
G. Progress      → Skill map, session history, summaries (depends on D+E)
H. Home          → Dashboard payload, rule-based slots (depends on all above)
I. Settings      → Mode toggle, Companion Controls (parallel with H)
J. Guardian      → Child management, companion settings, audit log (depends on B+I)
K. Security      → 46 fixes from spec, applied throughout all phases
L. Polish        → Prompt caching, indexes, TTL cleanup, contract versioning
```

## Auth Architecture

- JWT contains only `sub`, `iat`, `exp` — role is ALWAYS fetched from MongoDB
- Refresh token rotation: every refresh invalidates old token + issues new
- Token reuse detection: if a revoked refresh token is used, ALL user tokens are revoked
- Redis blacklist: `token_revoked:{userId}` set
- CSRF: `csrf-csrf` double-submit cookie, applied only for `x-client-type: web`
- Guest sessions: device-local progress, idempotent migration on registration via `migrationId` UUID

## Mastra Agent Roster

| Agent | Model | Purpose |
|---|---|---|
| `ChatAgent` | Sonnet 4.6 | Main tutor — Guide/Companion mode, all tools |
| `LessonAgent` | Sonnet 4.6 | Lesson generation |
| `QuizAgent` | Sonnet 4.6 | Quiz generation + answer evaluation |
| `SlotAgent` | Haiku 4.5 | Dynamic UI slot content |
| `ProgressAgent` | Haiku 4.5 | Natural language progress summaries |
| `CompressionAgent` | Haiku 4.5 | Chat history compression |

**Rule:** Haiku for anything that doesn't need Sonnet's quality. Cost and speed matter.
