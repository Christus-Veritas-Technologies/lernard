---
name: code-quality
description: "Lernard code quality standards — clean code principles, reusability patterns, package extraction rules, hook conventions, naming, type safety, testing. Use when writing new code, refactoring, reviewing, or structuring features in the Lernard monorepo."
---

# Lernard Code Quality Standards

## Core Principles

### 1. Single Responsibility

Every unit does one thing. One function, one purpose. One hook, one concern. One component, one visual element.

```typescript
// ✅ Single responsibility
function calculateStreak(sessions: Session[]): number { ... }
function formatStreakDisplay(streak: number): string { ... }

// ❌ Mixed responsibilities
function getAndFormatStreak(sessions: Session[]): string { ... }
```

### 2. DRY — With Judgment

Extract on the **third** use, not the first. Premature abstraction creates worse problems than duplication.

- **1st use:** Write it inline
- **2nd use:** Note the duplication, leave it unless it's complex
- **3rd use:** Extract to a shared function, hook, or component

Exception: types and validation schemas are always shared from day one (via `@lernard/shared-types` and `@lernard/validation`).

### 3. Type Safety

- **Never use `any`** — use `unknown` and type guards at system boundaries
- **Infer when possible** — let TypeScript infer return types, map types, and generics
- **Assert at boundaries** — parse external data (API responses, user input) with Zod, then trust the types downstream

```typescript
// ✅ Parse at boundary, trust downstream
const payload = pagePayloadSchema.parse(response.data)
// payload is now fully typed — no further checks needed

// ❌ Sprinkling type assertions throughout
const user = response.data as User  // unsafe
```

### 4. Pure Functions Preferred

Functions without side effects are easier to test, compose, and reason about. Isolate side effects in hooks (frontend) or services (backend).

```typescript
// ✅ Pure — testable, predictable
function calculateScore(answers: Answer[], rubric: Rubric): number {
  return answers.reduce((score, a) => score + rubric[a.questionId].weight * (a.correct ? 1 : 0), 0)
}

// ❌ Impure — side effect mixed with logic
function calculateAndSaveScore(answers: Answer[]) {
  const score = /* calculation */
  await db.scores.insert({ score })  // side effect
  return score
}
```

### 5. Error Handling at Boundaries Only

Handle errors where they enter the system. Don't sprinkle try/catch through business logic.

**Boundaries:**
- API response parsing (in hooks or API client)
- User input validation (in form handlers or DTOs)
- External service calls (in NestJS services calling Claude, Redis, etc.)

```typescript
// ✅ Error boundary in the hook
function usePagePayload<T>(endpoint: string) {
  try {
    const data = await apiClient.get(endpoint)
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ❌ Error handling inside pure business logic
function calculateStrength(scores: number[]) {
  try {  // unnecessary — scores come pre-validated
    return scores.reduce((sum, s) => sum + s, 0) / scores.length
  } catch { return 0 }
}
```

### 6. Composition Over Prop Drilling

When data needs to pass through 3+ levels, use React Context instead of threading props.

```typescript
// ✅ Context for deep data
const PagePayloadContext = createContext<PagePayload<HomeContent> | null>(null)

function HomeScreen() {
  const payload = usePagePayload<HomeContent>(ROUTES.HOME)
  return (
    <PagePayloadContext.Provider value={payload}>
      <GreetingHeader />
      <SubjectGrid />
      <RecentSessions />
    </PagePayloadContext.Provider>
  )
}

// ❌ Prop drilling through 4 levels
function HomeScreen() {
  return <GreetingHeader payload={payload} /> // payload passed 3 more levels down
}
```

### 7. Named Exports Only

No default exports. Named exports improve refactoring, auto-imports, and discoverability.

```typescript
// ✅ Named export
export function LessonCard() { ... }
export function useAuth() { ... }

// ❌ Default export
export default function LessonCard() { ... }
```

### 8. File Organisation

- **One concern per file** — one component, one hook, one service, one schema
- **Co-locate related files** — a feature's components, hooks, and types live together
- **Flat over nested** — prefer `hooks/useAuth.ts` over `hooks/auth/useAuth/index.ts`
- **Descriptive filenames** — `LessonCard.tsx`, not `Card.tsx` or `index.tsx`

## Testing

### What to Test

| Layer | Test | Don't Test |
|---|---|---|
| Pure functions | Input → output | — |
| Hooks | State transitions, side effects | Internal implementation |
| NestJS services | Business logic, edge cases | Framework wiring |
| NestJS guards | Allow/deny decisions | Decorator metadata |
| Components | Critical user flows | Styling, layout |

### What NOT to Test

- That a component renders without crashing (too shallow)
- That props are passed correctly (TypeScript handles this)
- Implementation details (state variable names, internal methods)
- Third-party library behavior

### Test Naming

```typescript
describe('calculateStrength', () => {
  it('returns "confident" when score is above 80', () => { ... })
  it('returns "needs_work" when score is below 40', () => { ... })
  it('decays baseline weight over sessions', () => { ... })
})
```

Pattern: `it('[action] when [condition]')` — reads as a specification.

## Reusability Patterns

See [full reusability reference](./references/reusability-patterns.md) for detailed package extraction rules, hook conventions, naming patterns, barrel exports, and state management guidelines.

**Quick rules:**
- Used in 2+ apps → extract to `packages/@lernard/*`
- Business logic out of components → custom hooks
- Verb-first functions (`fetchUser`), noun-first components (`LessonCard`)
- One `index.ts` per package, explicit named exports
- Never `export * from`, never `export default`
- Zustand for client state, API client for server state — never mix
