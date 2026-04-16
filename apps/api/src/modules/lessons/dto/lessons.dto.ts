import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class GenerateLessonDto {
  @IsString()
  @MaxLength(300)
  topic: string;

  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsOptional()
  depth?: 'quick' | 'standard' | 'deep';

  @IsUUID()
  idempotencyKey: string;
}

export class SectionCheckDto {
  @IsString()
  sectionId: string;

  @IsString()
  @MaxLength(2000)
  response: string;
}
