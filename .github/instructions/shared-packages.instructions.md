---
description: "Use when creating or editing shared packages in the Lernard monorepo. Covers package boundaries, naming conventions, barrel exports, what belongs in packages vs apps, and the role of each @lernard/* package."
applyTo: "packages/**"
---

# Shared Packages

## The Boundary Rule

> **Used in 2+ apps → extract to `packages/`. Used in 1 app → stays in the app.**

Packages are consumed by apps. Packages never import from apps. Packages never import from other packages' internals — only from their barrel export.

## Package Inventory

| Package | Contains | Imported By |
|---|---|---|
| `@lernard/shared-types` | ALL entity types, enums, payload interfaces, permission types | native, web, api |
| `@lernard/routes` | API route string constants, URL builder functions | native, web, api |
| `@lernard/validation` | Zod schemas for all DTOs, shared between frontend forms and backend | native, web, api |
| `@lernard/auth-core` | `can()` permission checker, token utilities | native, web |
| `@lernard/api-client` | Typed fetch wrappers per API endpoint | native, web |
| `@lernard/ui-slots` | Slot type definitions, variant registry, null-state contracts | native, web |
| `@lernard/skill-map` | Pure scoring functions, strength calculations | native, web, api |
| `@lernard/config` | Shared ESLint, TypeScript, Tailwind base configs | all |

## Package Structure

Every package follows the same layout:

```
packages/<name>/
  package.json        ← name: "@lernard/<name>"
  tsconfig.json       ← extends @lernard/config
  src/
    index.ts          ← barrel export — the ONLY entry point
    <domain>/
      <file>.ts
```

## Barrel Exports

One `index.ts` per package. Explicit named exports only.

```typescript
// packages/shared-types/src/index.ts
export type { User, Student, Guardian } from './entities/user'
export type { Lesson, LessonSection } from './entities/lesson'
export type { Quiz, QuizQuestion } from './entities/quiz'
export type { PagePayload, ScopedPermission } from './contracts/page-payload'
export type { SlotAssignments } from './contracts/slots'
export { Role, Plan, LearningMode, AgeGroup, StrengthLevel } from './enums'
```

**Rules:**
- Named exports only — never `export default`
- Explicit re-exports — never `export * from`
- Types use `export type` for proper tree-shaking

## What Does NOT Belong in Packages

| Item | Where It Goes | Why |
|---|---|---|
| React components | `apps/native/components/` or `apps/web/components/` | Platform-specific rendering |
| NestJS modules, guards, services | `apps/api/src/` | Backend-only logic |
| AI system prompts | `services/ai-prompts/` | API-only, isolated from frontends |
| App-specific hooks | `apps/<app>/hooks/` | Tied to specific app's patterns |
| Environment config | `apps/<app>/.env` | App-specific secrets |

## Creating a New Package

```bash
mkdir -p packages/<name>/src
```

**package.json:**
```json
{
  "name": "@lernard/<name>",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "check-types": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**tsconfig.json:**
```json
{
  "extends": "@lernard/config/typescript/react-library.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

## Consuming Packages

In consuming app's `package.json`:
```json
{
  "dependencies": {
    "@lernard/shared-types": "workspace:*",
    "@lernard/routes": "workspace:*"
  }
}
```

Import from the barrel:
```typescript
import type { User, PagePayload } from '@lernard/shared-types'
import { ROUTES } from '@lernard/routes'
import { registerSchema } from '@lernard/validation'
import { can } from '@lernard/auth-core'
```

## Forbidden Imports

ESLint enforces these boundaries:

- **Frontends cannot import** `services/ai-prompts` or `@lernard/ai-prompts`
- **Packages cannot import** from `apps/*`
- **Packages cannot import** from other packages' `src/` internals — only from their barrel export
