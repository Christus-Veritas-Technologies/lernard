# Lernard Claude/Mastra Integration

## Overview

Lernard uses Anthropic's Claude API for AI-powered content generation:
- **Claude Sonnet 4.6** (`claude-sonnet-4-5-20250929`) - Lesson and quiz generation
- **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) - Validation and slot content

## Setup

### 1. Install Dependencies
Anthropic SDK is included in `apps/api/package.json`:
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

The `MastraService` is available in any NestJS controller/service:

```typescript
// Inject the service
constructor(private mastraService: MastraService) {}

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

// Validate content
const { valid, reason } = await this.mastraService.validateContent(
  lessonContent,
  'lesson'
);

// Generate UI slot content
const slotContent = await this.mastraService.generateSlotContent({
  slotType: 'encouragement',
  context: { streakDays: 5, topicName: 'Algebra' }
});
```

## Important Rules

1. **Always use `completeWithRetry()`** - Wrap Claude calls in the retry wrapper:
   ```typescript
   const content = await completeWithRetry(() =>
     this.mastraService.generateLesson({ ... })
   );
   ```

2. **Validate generated content** before storing:
   ```typescript
   const { valid, reason } = await this.mastraService.validateContent(content, 'lesson');
   if (!valid) throw new Error(`Validation failed: ${reason}`);
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
- Rate limit errors (429) - `completeWithRetry()` handles exponential backoff
- Token limit errors - use shorter prompts or lower `max_tokens`

## Testing

Set `ANTHROPIC_API_KEY` in test environment:
```bash
ANTHROPIC_API_KEY=test-key npm test
```

(Actual requests won't be made without a valid API key, but the service will initialize)

## Future Enhancements

- [ ] Implement Mastra full framework for memory/agent orchestration
- [ ] Add prompt caching for repeated content types
- [ ] Add batch processing for bulk generation
- [ ] Add custom prompt templates per content type
