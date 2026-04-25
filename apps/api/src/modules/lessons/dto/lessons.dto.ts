import { IsString, IsOptional, MaxLength, IsUUID, IsIn, IsNumberString } from 'class-validator';

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
  @IsNumberString()
  sectionId: string;

  @IsIn(['got_it', 'not_sure', 'confused'])
  response: string;
}
