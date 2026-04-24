import { MastraService } from '../../mastra/mastra.service';

export async function validateGeneratedContent(
  content: unknown,
  validator: MastraService,
): Promise<void> {
  if (!content) {
    throw new Error('Generated content is empty');
  }

  const result = await validator.validate(content);

  if (!result.safe) {
    throw new Error(
      result.reasons[0] ?? 'Generated content failed Haiku validation.',
    );
  }
}
