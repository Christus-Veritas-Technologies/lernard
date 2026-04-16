import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class GenerateQuizDto {
  @IsString()
  @MaxLength(300)
  topic: string;

  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsUUID()
  idempotencyKey: string;
}

export class SubmitAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  @MaxLength(2000)
  answer: string;
}
