import {
  IsIn,
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
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subject?: string;

  @IsIn(['paper1', 'paper2'])
  paperType!: 'paper1' | 'paper2';

  @IsInt()
  @Min(1)
  @Max(20)
  questionCount!: number;

  @IsOptional()
  @IsIn(['foundation', 'standard', 'challenging', 'extension'])
  difficulty?: 'foundation' | 'standard' | 'challenging' | 'extension';

  @IsUUID()
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  fromLessonId?: string;

  @IsOptional()
  @IsString()
  fromConversationId?: string;

  @IsOptional()
  @IsString()
  fromUploadId?: string;

  @IsOptional()
  @IsIn(['image', 'pdf'])
  fromUploadKind?: 'image' | 'pdf';
}

export class SubmitAnswerDto {
  @IsInt()
  @Min(0)
  questionIndex!: number;

  @IsString()
  @MaxLength(2000)
  answer!: string;
}

export class EvaluateShortAnswerDto {
  @IsInt()
  @Min(0)
  questionIndex!: number;

  @IsString()
  @MaxLength(2000)
  studentAnswer!: string;
}

export class AnswerPartDto {
  @IsInt()
  @Min(0)
  questionIndex!: number;

  @IsString()
  @MaxLength(50)
  partLabel!: string;

  @IsString()
  @MaxLength(2000)
  answer!: string;
}
