import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GenerateQuizDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subject?: string;

  @IsInt()
  @Min(5)
  @Max(15)
  questionCount = 10;

  @IsUUID()
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  fromLessonId?: string;

  @IsOptional()
  @IsString()
  fromConversationId?: string;
}

export class SubmitAnswerDto {
  @IsInt()
  @Min(0)
  questionIndex!: number;

  @IsString()
  @MaxLength(2000)
  answer!: string;
}
