import { IsString, IsEnum, IsArray, IsOptional, MaxLength, IsNumber, Min, Max } from 'class-validator';

export class AccountTypeDto {
  @IsEnum(['student', 'guardian'])
  accountType: 'student' | 'guardian';
}

export class ProfileSetupDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsEnum(['primary', 'secondary', 'university', 'professional'])
  ageGroup: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  grade?: string;

  @IsArray()
  @IsString({ each: true })
  subjects: string[];

  @IsEnum(['exam_prep', 'keep_up', 'learn_something_new', 'fill_gaps'])
  @IsOptional()
  learningGoal?: string;

  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(60)
  preferredSessionLength?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  dailyTarget?: number;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class FirstLookSubmitDto {
  @IsString()
  subjectId: string;

  @IsArray()
  answers: Array<{ questionId: string; answer: string }>;
}
