import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class LessonRemediationMisconceptionDto {
  @IsString()
  @MaxLength(120)
  subtopic!: string;

  @IsString()
  @MaxLength(300)
  studentBelievedX!: string;

  @IsString()
  @MaxLength(300)
  correctAnswerIsY!: string;

  @IsString()
  @MaxLength(400)
  implication!: string;
}

class LessonRemediationContextDto {
  @IsString()
  @MaxLength(64)
  quizId!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  percentageScore!: number;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  weakSubtopics!: string[];

  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  strongSubtopics!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonRemediationMisconceptionDto)
  misconceptions!: LessonRemediationMisconceptionDto[];

  @IsArray()
  @IsString({ each: true })
  @MaxLength(240, { each: true })
  failedQuestionPrompts!: string[];
}

class LessonRetryContextDto {
  @IsIn(['quiz_remediation', 'manual_retry', 'chat_follow_up'])
  source!: 'quiz_remediation' | 'manual_retry' | 'chat_follow_up';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  quizId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trigger?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  previousScore?: number;
}

export class GenerateLessonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subject?: string;

  @IsOptional()
  @IsIn(['quick', 'standard', 'deep'])
  depth: 'quick' | 'standard' | 'deep' = 'standard';

  @IsOptional()
  @ValidateNested()
  @Type(() => LessonRemediationContextDto)
  remediationContext?: LessonRemediationContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LessonRetryContextDto)
  retryContext?: LessonRetryContextDto;

  @IsUUID()
  idempotencyKey!: string;
}

export class SectionCheckDto {
  @IsIn(['got_it', 'not_sure', 'confused'])
  response!: 'got_it' | 'not_sure' | 'confused';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CompleteLessonDto {
  @IsIn([1, 2, 3, 4, 5])
  confidenceRating!: 1 | 2 | 3 | 4 | 5;
}
