---
description: "Use when creating or editing NestJS modules, controllers, services, guards, DTOs, schemas, or middleware in the backend API. Covers guard chain, controller/service patterns, Mastra integration, MongoDB schemas, Redis rate limiting, pagination."
applyTo: "apps/api/**"
---

# NestJS Backend

## Architecture

```
Middleware → Router → Controller → Service → Repository/External
```

- **Controllers:** Thin. Parse request (`@Body`, `@Param`, `@CurrentUser`), call service, return typed response. No business logic.
- **Services:** All business logic. Inject dependencies via constructor. Never access `Request` or `Response` objects.
- **Guards:** Authentication, authorization, ownership, rate limiting. Fixed execution order.

## Guard Chain

Always this order. Never rearrange.

```
JwtAuthGuard → RolesGuard → ChildOwnershipGuard → SettingsLockGuard
```

Use `@ProtectedRoute()` decorator to enforce:

```typescript
@ProtectedRoute({ roles: [Role.GUARDIAN], ownershipCheck: true })
@Get('children/:childId')
getChild(@Param('childId') childId: string) { ... }
```

Additional guards applied separately: `PlanLimitsGuard`, `QuizOwnershipGuard`, `GuardianPasswordGuard`.

## Module Structure

One module per domain:

```
src/modules/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  dto/
    <action>.dto.ts          ← class-validator decorators
  schemas/
    <entity>.schema.ts       ← Mongoose schema + indexes
```

Domains: `auth`, `onboarding`, `lessons`, `quizzes`, `chat`, `progress`, `settings`, `guardian`.

## Controller Pattern

```typescript
@Controller('v1/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @ProtectedRoute({})
  @UseGuards(PlanLimitsGuard)
  @Post('generate')
  async generate(
    @CurrentUser() user: User,
    @Body() dto: GenerateLessonDto,
  ): Promise<Lesson> {
    return this.lessonsService.generate(user, dto)
  }
}
```

## Service Pattern

```typescript
@Injectable()
export class LessonsService {
  constructor(
    @InjectModel(Lesson.name) private readonly lessonModel: Model<LessonDocument>,
    private readonly mastraService: MastraService,
  ) {}

  async generate(user: User, dto: GenerateLessonDto): Promise<Lesson> {
    const content = await completeWithRetry(() =>
      this.mastraService.generateLesson({ topic: dto.topic, depth: dto.depth })
    )
    await validateGeneratedContent(content, this.mastraService)
    return this.lessonModel.create({ ownerId: user.id, content, ...dto })
  }
}
```

## AI Integration

- **All Claude calls** go through `completeWithRetry()` — exponential backoff: 1s, 2s, 4s, max 3 retries
- **All AI output** passes `validateGeneratedContent()` via Haiku before MongoDB write
- **Haiku** for slots, validation, compression, subject inference — fast + cheap
- **Sonnet** for lessons, quizzes, chat — quality matters

## PagePayload Pattern

Every page endpoint returns `PagePayload<T>`:

```typescript
async getHomePayload(user: User): Promise<PagePayload<HomeContent>> {
  const [content, permissions] = await Promise.all([
    this.buildHomeContent(user),
    this.buildPermissions(user),
  ])
  const slots = await this.resolveSlots(user, 'home') // 800ms timeout
  return { version: 1, content, permissions, slots, permissionsTTL: 60, issuedAt: Date.now() }
}
```

## Database

- MongoDB with Mongoose. Indexes defined in schema files
- `deletedAt: Date | null` for soft delete on lessons/quizzes
- TTL indexes for invite cleanup (`expiresAt`)
- Compound indexes for common query patterns

## Pagination

All list endpoints use cursor-based pagination. Default 20, max 50:

```typescript
@Get('history')
async getHistory(
  @CurrentUser() user: User,
  @Query('cursor') cursor?: string,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
) {
  return this.lessonsService.findHistory(user.id, cursor, Math.min(limit, 50))
}
```

## Idempotency

Generation endpoints require `idempotencyKey` (UUID v4) in request body. Redis caches result for 24h.

## Rate Limiting

`PlanLimitsGuard` uses Redis Lua atomic script: check-and-increment in a single operation. No race conditions. Two keys: daily + monthly (keyed to billing anchor day).

## Security

- JWT: `sub`, `iat`, `exp` only. Role ALWAYS from DB via `JwtStrategy.validate()`
- Refresh token rotation with reuse detection
- Helmet with CSP, HSTS, COEP at bootstrap
- CSRF double-submit cookie for web clients (`x-client-type: web`)
- `@MaxLength` on all DTO string fields
