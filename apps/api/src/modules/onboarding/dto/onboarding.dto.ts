import { Type } from 'class-transformer';
import {
  AgeGroup,
  LearningGoal,
  SessionDepth,
} from '@lernard/shared-types';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  MinLength,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const ACCOUNT_TYPES = ['student', 'guardian'] as const;

export class AccountTypeDto {
  @IsEnum(ACCOUNT_TYPES)
  accountType: 'student' | 'guardian';
}

export class ProfileSetupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsEnum(AgeGroup)
  ageGroup: AgeGroup;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  grade?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  subjects: string[];

  @IsEnum(LearningGoal)
  @IsOptional()
  learningGoal?: LearningGoal;

  @IsInt()
  @IsOptional()
  @Min(5)
  @Max(120)
  preferredSessionLength?: number;

  @IsEnum(SessionDepth)
  @IsOptional()
  preferredDepth?: SessionDepth;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(10)
  dailyGoal?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  timezone?: string;
}

class FirstLookAnswerDto {
  @IsInt()
  @Min(0)
  index: number;

  @IsString()
  @MaxLength(500)
  answer: string;
}

export class FirstLookSubmitDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FirstLookAnswerDto)
  answers: FirstLookAnswerDto[];
}
