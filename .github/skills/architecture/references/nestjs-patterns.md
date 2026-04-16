# NestJS Architecture Patterns

## Module Structure

One module per domain. Each module contains these files:

```
apps/api/src/
  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      auth.guard.ts
      dto/
        register.dto.ts
        login.dto.ts
      schemas/
        user.schema.ts
        refresh-token.schema.ts
    lessons/
      lessons.module.ts
      lessons.controller.ts
      lessons.service.ts
      dto/
        generate-lesson.dto.ts
      schemas/
        lesson.schema.ts
    quizzes/
    chat/
    progress/
    settings/
    guardian/
    onboarding/
  common/
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
      child-ownership.guard.ts
      settings-lock.guard.ts
      plan-limits.guard.ts
      quiz-ownership.guard.ts
      guardian-password.guard.ts
    decorators/
      protected-route.decorator.ts
      current-user.decorator.ts
    interceptors/
      permissions-invalidation.interceptor.ts
    pipes/
      zod-validation.pipe.ts
    utils/
      complete-with-retry.ts
      validate-generated-content.ts
      build-cursor.ts
  mastra/
    mastra.module.ts
    mastra.service.ts
    agents/
      chat.agent.ts
      lesson.agent.ts
      quiz.agent.ts
      slot.agent.ts
      progress.agent.ts
      compression.agent.ts
```

## Guard Chain

Guards execute in a fixed order. NEVER rearrange.

```
JwtAuthGuard → RolesGuard → ChildOwnershipGuard → SettingsLockGuard
```

The `@ProtectedRoute()` decorator enforces this:

```typescript
// decorators/protected-route.decorator.ts
export function ProtectedRoute(options: {
  roles?: Role[]
  ownershipCheck?: boolean
  settingsLock?: boolean
}) {
  const guards: Type<CanActivate>[] = [JwtAuthGuard]

  if (options.roles) guards.push(RolesGuard)
  if (options.ownershipCheck) guards.push(ChildOwnershipGuard)
  if (options.settingsLock) guards.push(SettingsLockGuard)

  return applyDecorators(
    UseGuards(...guards),
    options.roles ? SetMetadata('roles', options.roles) : () => {},
  )
}
```

### Usage

```typescript
// Any authenticated user
@ProtectedRoute({})
@Get('me')
getMe(@CurrentUser() user: User) { ... }

// Guardian + child ownership check
@ProtectedRoute({ roles: [Role.GUARDIAN], ownershipCheck: true })
@Get('children/:childId')
getChild(@Param('childId') childId: string) { ... }

// Settings with lock check
@ProtectedRoute({ roles: [Role.STUDENT], settingsLock: true })
@Patch('settings/mode')
updateMode(@Body() dto: UpdateModeDto) { ... }
```

### Additional Guards (applied separately)

- **`PlanLimitsGuard`** — on generation endpoints only, uses Redis Lua atomic check-and-increment
- **`QuizOwnershipGuard`** — on all quiz interaction routes, verifies `quiz.ownerId === user.id`
- **`GuardianPasswordGuard`** — on Companion Controls routes, verifies password in request body

## Controller Pattern

Controllers are THIN. They parse the request, call the service, and return the response. No business logic.

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

  @ProtectedRoute({})
  @Get(':id')
  async getLesson(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<Lesson> {
    return this.lessonsService.findById(user, id)
  }

  @ProtectedRoute({})
  @Post(':id/complete')
  async complete(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CompleteLessonDto,
  ): Promise<PostLessonSummary> {
    return this.lessonsService.complete(user, id, dto)
  }
}
```

**Rules:**
- Never inject `@Req()` unless absolutely necessary (prefer `@CurrentUser()`, `@Param()`, `@Body()`)
- Return typed responses — never `any` or `object`
- One controller per REST resource
- Route prefix set in `@Controller()`, not repeated on each method

## Service Pattern

Services contain ALL business logic. They never access the Request object.

```typescript
@Injectable()
export class LessonsService {
  constructor(
    @InjectModel(Lesson.name) private readonly lessonModel: Model<LessonDocument>,
    private readonly mastraService: MastraService,
    private readonly skillMapService: SkillMapService,
  ) {}

  async generate(user: User, dto: GenerateLessonDto): Promise<Lesson> {
    // 1. Build context for AI
    const memory = await this.mastraService.readMemory(user.id)
    const skillMap = await this.skillMapService.getForSubject(user.id, dto.subjectId)

    // 2. Generate via Mastra (always through completeWithRetry)
    const content = await this.mastraService.generateLesson({
      topic: dto.topic,
      depth: dto.depth,
      memory,
      skillMap,
    })

    // 3. Validate AI output (always before storage)
    await validateGeneratedContent(content)

    // 4. Store
    const lesson = await this.lessonModel.create({
      ownerId: user.id,
      topic: dto.topic,
      subjectId: dto.subjectId,
      content,
      idempotencyKey: dto.idempotencyKey,
    })

    return lesson
  }
}
```

**Rules:**
- Inject dependencies via constructor
- Never access `Request` or `Response` objects
- Business logic lives here — validation, AI calls, data transformation, storage
- Use MongoDB transactions for operations that touch multiple collections

## Mastra Integration

### `completeWithRetry()`

ALL Claude calls go through this wrapper. Never call Claude/Mastra directly.

```typescript
// common/utils/complete-with-retry.ts
export async function completeWithRetry<T>(
  fn: () => Promise<T>,
  options = { maxRetries: 3, baseDelay: 1000, maxDelay: 8000 },
): Promise<T> {
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (!isRetryable(error) || attempt === options.maxRetries) throw error
      const delay = Math.min(options.baseDelay * 2 ** attempt, options.maxDelay)
      await sleep(delay)
    }
  }
  throw new Error('Unreachable')
}

function isRetryable(error: unknown): boolean {
  if (error instanceof HttpException) {
    return [429, 500, 529].includes(error.getStatus())
  }
  return false
}
```

### `validateGeneratedContent()`

ALL AI-generated content passes through Haiku validation before storage.

```typescript
// common/utils/validate-generated-content.ts
export async function validateGeneratedContent(
  content: unknown,
  mastra: MastraService,
): Promise<void> {
  const result = await completeWithRetry(() =>
    mastra.validate(content)  // Haiku call
  )
  if (!result.safe) {
    throw new ContentValidationError(result.reasons)
  }
}
```

## PagePayload Builder Pattern

Every page endpoint returns a single `PagePayload<T>`. Content + permissions resolve first, slots resolve after with an 800ms timeout.

```typescript
// In the service
async getHomePayload(user: User): Promise<PagePayload<HomeContent>> {
  // These are non-negotiable — no timeout, must succeed
  const [content, permissions] = await Promise.all([
    this.buildHomeContent(user),
    this.buildPermissions(user),
  ])

  // Slots are best-effort — 800ms timeout, null fallback
  const slots = await this.resolveSlots(user, 'home')

  return {
    version: 1,
    content,
    permissions,
    slots,
    permissionsTTL: 60,
    issuedAt: Date.now(),
  }
}

private async resolveSlots(user: User, page: string): Promise<SlotAssignments> {
  try {
    return await Promise.race([
      this.mastraService.resolveSlots(user, page),
      timeoutWithDefault(800, this.defaultSlots(page)),
    ])
  } catch {
    return this.defaultSlots(page)
  }
}
```

## Rate Limiting

Redis Lua atomic script for plan limit checks. No race conditions.

```typescript
// PlanLimitsGuard calls this
async checkAndIncrement(userId: string, resource: 'lesson' | 'quiz'): Promise<boolean> {
  const result = await this.redis.eval(
    LUA_CHECK_AND_INCREMENT,
    2, // number of keys
    `rate:${userId}:${resource}:day:${today}`,
    `rate:${userId}:${resource}:month:${billingPeriod}`,
    dailyLimit, monthlyLimit, dailyTTL, monthlyTTL,
  )
  return result === 1 // 1 = allowed, 0 = limit reached
}
```

## Idempotency

Generation endpoints require an `idempotencyKey` UUID in the request body. Redis caches the result for 24 hours. Retries return the cached result.

```typescript
async generate(user: User, dto: GenerateLessonDto): Promise<Lesson> {
  // Check cache first
  const cached = await this.redis.get(`idempotency:${dto.idempotencyKey}`)
  if (cached) return JSON.parse(cached)

  // Generate
  const lesson = await this.doGenerate(user, dto)

  // Cache for 24h
  await this.redis.set(`idempotency:${dto.idempotencyKey}`, JSON.stringify(lesson), 'EX', 86400)

  return lesson
}
```

## MongoDB Schemas

Indexes defined in the schema file. TTL indexes for auto-cleanup.

```typescript
@Schema({ timestamps: true })
export class Lesson {
  @Prop({ required: true, index: true })
  ownerId: string

  @Prop({ required: true })
  topic: string

  @Prop({ type: String, index: true })
  subjectId: string

  @Prop({ type: Date, default: null })
  deletedAt: Date | null

  @Prop({ unique: true })
  idempotencyKey: string
}

// Compound indexes for common queries
LessonSchema.index({ ownerId: 1, deletedAt: 1, createdAt: -1 })
LessonSchema.index({ ownerId: 1, subjectId: 1, deletedAt: 1 })
```

## Cursor-Based Pagination

All list endpoints use cursor-based pagination. Never offset-based.

```typescript
async findHistory(userId: string, cursor?: string, limit = 20): Promise<PaginatedResult<Lesson>> {
  const query: FilterQuery<Lesson> = { ownerId: userId, deletedAt: null }

  if (cursor) {
    query._id = { $lt: new Types.ObjectId(cursor) }
  }

  const items = await this.lessonModel
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)  // fetch one extra to determine hasMore
    .exec()

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  return {
    items,
    cursor: hasMore ? items[items.length - 1]._id.toString() : null,
    hasMore,
  }
}
```
