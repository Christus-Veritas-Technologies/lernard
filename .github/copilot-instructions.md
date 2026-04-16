# Lernard — Project Instructions

## What This Is

Lernard is an AI-powered adaptive learning app (mobile + web). The AI IS the product — every lesson, quiz, and chat response is generated fresh by Claude, tailored to each student's level, subject, and growth areas. Lernard remembers every student across sessions via Mastra's memory system.

## Monorepo Structure

```
lernard/
├── apps/
│   ├── native/          Expo (React Native) — mobile app
│   ├── web/             Next.js (App Router) — web app
│   └── api/             NestJS — backend API
├── packages/            Frontend-safe shared packages
│   ├── shared-types/    All TypeScript interfaces — @lernard/shared-types
│   ├── api-client/      Typed fetch wrappers — @lernard/api-client
│   ├── routes/          API route constants — @lernard/routes
│   ├── ui-slots/        Slot contract types — @lernard/ui-slots
│   ├── skill-map/       Pure skill scoring functions — @lernard/skill-map
│   ├── auth-core/       Token helpers, permission checking — @lernard/auth-core
│   ├── validation/      Zod schemas + DTOs — @lernard/validation
│   └── config/          ESLint, TypeScript, Tailwind base configs — @lernard/config
└── services/
    └── ai-prompts/      API-only — NEVER import in frontends or packages
```

**Package manager:** pnpm
**Package naming:** `@lernard/<package-name>`

## Lernard Terminology

Always use Lernard-specific names, never generic equivalents:

| Generic | Lernard Name |
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

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo (React Native) + Expo Router + NativeWind |
| Web | Next.js (App Router) + Tailwind CSS + shadcn/ui |
| Backend | NestJS |
| Database | MongoDB (Mongoose) |
| Cache / Rate limiting | Redis |
| AI Agent | Mastra |
| Lesson & Quiz AI | Claude Sonnet 4.6 |
| UI Slot AI | Claude Haiku 4.5 |
| Auth | JWT + Refresh Token Rotation |
| Icons | HugeIcons (both platforms) |
| Native components | React Native Reusables |
| Web components | shadcn/ui |

## Development Rules

These are non-negotiable. Every PR, every file, every function.

1. **One HTTP call per page load** — content + permissions + slots returned together in a `PagePayload<T>`
2. **Role logic lives in NestJS only** — frontends use `can(permissions, action)` from `@lernard/auth-core`, never check `user.role`
3. **All free-text inputs have server-side length limits** — topic 300, chat message 2000, name 50
4. **All Claude calls go through `completeWithRetry()`** — never call Claude directly
5. **All generated content passes `validateGeneratedContent()`** before storage
6. **Never import `@lernard/ai-prompts`** in web or mobile — API only
7. **Never hardcode an API route string** — always use `@lernard/routes`
8. **Never define an entity type locally** — always use `@lernard/shared-types`
9. **Guard order always:** `JwtAuthGuard → RolesGuard → ChildOwnershipGuard → SettingsLockGuard`
10. **Slot rendering never crashes** — unknown slot type = render nothing, null slot = collapse cleanly
11. **Haiku for anything that doesn't need Sonnet's quality** — cost and speed matter
12. **Optimise for slow 4G** — minimise HTTP round trips, lazy load non-critical content
13. **Implement prompt caching before launch** — biggest single cost lever
14. **Never reference ElevenLabs or Nano Banana** in code, prompts, or comments — not in MVP
15. **All list endpoints use cursor-based pagination** from day one, default 20, max 50

## MVP Scope

**Included:** Auth, guest mode, onboarding, First Look, lessons, quizzes, chat (Mastra), Guide + Companion modes, Guardian account, progress/skill map, settings, all 46 security fixes.

**Deferred (do not build):** Voice narration, image generation, Lernard Campus, full Guardian dashboard, achievements/badges, file upload in chat, AI-driven home slots (use rule-based), push notifications beyond basic.

## Roles

```
guest        — unauthenticated, device-local progress only
student      — core learner account
guardian     — controls one or more student accounts
teacher      — post-MVP, Campus plan
school_admin — post-MVP, Campus plan
```

JWT contains only `sub`, `iat`, `exp`. Role is ALWAYS read from the database — never trust JWT claims for role.
