import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

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
