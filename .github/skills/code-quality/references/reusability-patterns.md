# Reusability Patterns

## The Extraction Rule

> **If code is used in 2+ apps → extract to `packages/`. If used in 1 app → it stays in the app.**

This is the single decision framework. Don't extract prematurely. Don't duplicate unnecessarily.

## Package Inventory

Each package has a clear boundary. Never blur these lines.

### `@lernard/shared-types`
**Contains:** ALL TypeScript interfaces, types, and enums for entities, payloads, and permissions.
**Rule:** Never define an entity type, enum, or payload interface in an app. Always import from here.

```typescript
// ✅ Correct
import type { User, PagePayload, Permission } from '@lernard/shared-types'

// ❌ Wrong — defining a type locally
interface User { id: string; name: string; role: string }
```

**What goes here:**
- Entity types: `User`, `Student`, `Guardian`, `Lesson`, `Quiz`, `ChatMessage`, `Subject`, `Progress`
- Payload types: `PagePayload<T>`, `ScopedPermission`, `SlotAssignments`
- Enums: `Role`, `Plan`, `LearningMode`, `AgeGroup`, `StrengthLevel`, `QuestionType`
- Memory types: `LernardMemory`

### `@lernard/routes`
**Contains:** All API route constants as typed string templates.
**Rule:** Never write a route string literal in frontend or backend code.

```typescript
// ✅ Correct
import { ROUTES } from '@lernard/routes'
const response = await fetch(ROUTES.LESSONS.GENERATE)

// ❌ Wrong — hardcoded route
const response = await fetch('/v1/lessons/generate')
```

**Pattern:**
```typescript
export const ROUTES = {
  AUTH: {
    REGISTER: '/v1/auth/register',
    LOGIN: '/v1/auth/login',
    ME: '/v1/auth/me',
    REFRESH: '/v1/auth/refresh',
    // ...
  },
  LESSONS: {
    GENERATE: '/v1/lessons/generate',
    GET: (id: string) => `/v1/lessons/${id}` as const,
    SECTION_CHECK: (id: string) => `/v1/lessons/${id}/section-check` as const,
    COMPLETE: (id: string) => `/v1/lessons/${id}/complete` as const,
    HISTORY: '/v1/lessons/history',
  },
  // ...
} as const
```

### `@lernard/validation`
**Contains:** Zod schemas for all DTOs, shared between frontend form validation and backend request validation.
**Rule:** One schema per DTO. Frontend and backend import the same schema.

```typescript
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(50),
})

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
})

export const topicSchema = z.object({
  topic: z.string().min(1).max(300),
  depth: z.enum(['quick', 'standard', 'deep']),
})
```

### `@lernard/auth-core`
**Contains:** Permission checking logic and token utilities.
**Rule:** Frontend code NEVER checks `user.role`. Always use `can()`.

```typescript
import { can } from '@lernard/auth-core'

// ✅ Correct
if (can(permissions, 'can_start_lesson')) { ... }
if (can(permissions, 'can_change_companion_controls', child.id)) { ... }

// ❌ Wrong — checking role directly
if (user.role === 'guardian') { ... }
```

### `@lernard/api-client`
**Contains:** Typed fetch wrappers per API endpoint.
**Rule:** Frontends never call `fetch()` directly for API requests. Always use the client.

```typescript
import { apiClient } from '@lernard/api-client'

const { content, permissions, slots } = await apiClient.home.getPayload()
const lesson = await apiClient.lessons.generate({ topic, depth })
```

### `@lernard/ui-slots`
**Contains:** Slot type definitions, variant registry, and null-state contracts.
**Rule:** New slot types require a frontend component FIRST, then slot type definition.

### `@lernard/skill-map`
**Contains:** Pure functions for skill scoring and strength calculations.
**Rule:** No side effects. Pure input→output. Used by both frontend (display) and backend (calculation).

### `@lernard/config`
**Contains:** Shared ESLint, TypeScript, and Tailwind base configurations.
**Rule:** App-level configs extend from here.</p>

## Custom Hook Patterns

Extract business logic from components into hooks. Keep components focused on rendering.

### When to Extract a Hook

1. Component has >15 lines of non-JSX logic (state, effects, calculations)
2. The same state + logic pattern appears in 2+ components
3. A component manages both data fetching AND rendering

### Naming

- Prefix with `use`: `usePagePayload`, `useLessonProgress`, `useAuth`
- Verb describes the action: `useFetchSubjects`, `useCalculateStrength`
- Domain-scoped: `useQuizTimer`, `useChatMessages`, `useStreakCounter`

### Location

```
apps/native/
  hooks/
    useAuth.ts           ← auth state management
    usePagePayload.ts    ← generic page data fetcher
  app/
    (tabs)/
      hooks/
        useHomeData.ts   ← home screen specific
```

Co-locate with the feature when hook is feature-specific. Elevate to app-level `hooks/` when shared across features.

### Pattern

```typescript
// hooks/usePagePayload.ts
export function usePagePayload<T>(endpoint: string) {
  const [data, setData] = useState<PagePayload<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    apiClient.get<PagePayload<T>>(endpoint)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [endpoint])

  return { data, loading, error }
}
```

## Function Naming Conventions

| Pattern | Convention | Examples |
|---|---|---|
| Data fetching | `fetch` + noun | `fetchUser`, `fetchLessons`, `fetchProgress` |
| Data mutation | `create/update/delete` + noun | `createLesson`, `updateSettings`, `deleteConversation` |
| Calculation | `calculate` + noun | `calculateStrength`, `calculateStreak` |
| Validation | `validate` + noun | `validateContent`, `validateInput` |
| Transformation | `transform/format/parse` + noun | `formatDate`, `parseQuizResults` |
| Boolean check | `is/has/can` + adjective/noun | `isExpired`, `hasPermission`, `canStartLesson` |
| Components | PascalCase noun | `LessonCard`, `QuizProgress`, `SubjectChip` |

## Barrel Exports

Every package has ONE `index.ts` with explicit named exports:

```typescript
// packages/shared-types/src/index.ts
export type { User } from './entities/user'
export type { Lesson } from './entities/lesson'
export type { PagePayload } from './contracts/page-payload'
export type { Permission, ScopedPermission } from './contracts/permissions'
export { Role, Plan, LearningMode } from './enums'
```

**Rules:**
- Named exports only — never `export default`
- Explicit re-exports — never `export * from`
- One export per entity/type — keep imports discoverable

## State Management

| State Type | Solution | Example |
|---|---|---|
| Server state | API calls via `@lernard/api-client` | Lessons, quizzes, user profile |
| Client-only state | Zustand (one store per domain) | Theme preference, onboarding wizard step |
| Form state | React Hook Form + Zod | Registration form, topic entry |
| URL state | Expo Router / Next.js router | Active tab, selected subject ID |

**Rule:** Never duplicate server state in client stores. Fetch from API, display from response. If caching is needed, use the API client's built-in cache or React Query.

## Utility Extraction

> **If a helper function is >10 lines and used in 2+ places, extract it.**

Small, repeated helpers go in a `utils/` directory within the app or package:

```
apps/native/utils/
  formatDate.ts
  truncateText.ts
apps/api/utils/
  buildCursor.ts
  hashPassword.ts
```

If a utility is needed across 2+ apps, move it to the appropriate package (e.g., date formatting → shared util, cursor building → `@lernard/api-client`).
