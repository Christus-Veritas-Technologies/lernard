# Lernard Mastra Service

## Overview

Lernard's NestJS backend exposes a dedicated Mastra service layer in `src/mastra/` for AI-powered content generation:
- **Claude Sonnet 4.6** (`claude-sonnet-4-5-20250929`) - Lesson and quiz generation
- **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) - Validation and slot content

Current structure:

```text
src/
  mastra/
    mastra.module.ts
    mastra.service.ts
  common/utils/
    complete-with-retry.ts
    validate-generated-content.ts
```

## Setup

### 1. Install Dependencies
The Claude client dependency is included in `apps/api/package.json`:
```bash
bun install
```

### 2. Environment Variables
Required in your `.env` file:
```env
ANTHROPIC_API_KEY=sk-ant-...your-api-key...
```

Get your API key from [console.anthropic.com](https://console.anthropic.com)

### 3. Usage

The `MastraService` is available to any NestJS service through dependency injection:

```typescript
constructor(private readonly mastraService: MastraService) {}

// Generate a lesson
const lesson = await this.mastraService.generateLesson({
  topic: 'Photosynthesis',
  depth: 'beginner',
  studentLevel: 42
});

// Generate a quiz
const quiz = await this.mastraService.generateQuiz({
  topic: 'Photosynthesis',
  level: 'intermediate',
  questionCount: 5
});

// Validate generated content before storage
await validateGeneratedContent(lesson, this.mastraService);

// Generate UI slot content
const slotContent = await this.mastraService.generateSlotContent({
  slotType: 'encouragement',
  context: { streakDays: 5, topicName: 'Algebra' }
});
```

## Important Rules

1. **All Claude calls already route through `completeWithRetry()`** inside `MastraService`.
  Never call the Claude client directly from feature services or controllers.

2. **Validate generated content** before storing:
   ```typescript
  const content = await this.mastraService.generateLesson({ ... });
  await validateGeneratedContent(content, this.mastraService);
   ```

3. **Use the right model**:
   - Lessons, quizzes: Claude Sonnet (higher quality)
   - Validation, slots: Claude Haiku (faster, cheaper)

## API Specifications

### Models
- **Claude Sonnet 4.5**: High quality, 4096 token output limit
- **Claude Haiku 4.5**: Fast, cost-effective, 1024 token output limit

### Model IDs (Latest)
- `claude-sonnet-4-5-20250929`
- `claude-haiku-4-5-20251001`

### Pricing (as of Jan 2025)
- **Sonnet**: $3/1M input, $15/1M output
- **Haiku**: $1/1M input, $5/1M output

## Monitoring

Watch for:
- `ANTHROPIC_API_KEY` missing warnings in logs
- Rate limit errors (429) - `completeWithRetry()` applies exponential backoff
- Token limit errors - use shorter prompts or lower `max_tokens`

## Testing

Set `ANTHROPIC_API_KEY` in test environment:
```bash
ANTHROPIC_API_KEY=test-key npm test
```

(Actual requests won't be made without a valid API key, but the service will initialize)

## Notes

- `validateGeneratedContent()` now delegates to `MastraService.validate()` and throws when Haiku marks content unsafe.
- Feature services such as lessons, quizzes, and chat should stay thin at the controller layer and delegate AI work into service methods that depend on `MastraService`.
