import { IsEnum, IsNumber, IsString, IsBoolean, IsOptional, Min, Max, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateModeDto {
  @IsEnum(['guide', 'companion'])
  mode: 'guide' | 'companion';
}

export class CompanionControlsDto {
  @IsEnum(['after_quiz', 'immediate'])
  answerRevealTiming: 'after_quiz' | 'immediate';

  @IsNumber()
  @Min(0.5)
  @Max(1.0)
  quizPassThreshold: number;
}

export class UpdateAppearanceDto {
  @IsEnum(['light', 'dark', 'system'])
  appearance: 'light' | 'dark' | 'system';
}

export class UpdateDailyGoalDto {
  @IsNumber()
  @Min(1)
  @Max(10)
  dailyTarget: number;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[a-zA-Z\s\-]+$/)
  name?: string;

  @IsOptional()
  @IsEnum(['PRIMARY', 'SECONDARY', 'UNIVERSITY', 'PROFESSIONAL', null])
  ageGroup?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  grade?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @IsOptional()
  @IsEnum(['EXAM_PREP', 'KEEP_UP', 'LEARN_NEW', 'FILL_GAPS', null])
  learningGoal?: string | null;
}

export class UpdateStudyDto {
  @IsOptional()
  @IsEnum(['guide', 'companion'])
  learningMode?: 'guide' | 'companion';

  @IsOptional()
  @IsEnum(['after_quiz', 'immediate'])
  answerRevealTiming?: 'after_quiz' | 'immediate';

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(1.0)
  quizPassThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  sessionLength?: number;

  @IsOptional()
  @IsEnum(['quick', 'standard', 'deep'])
  preferredDepth?: 'quick' | 'standard' | 'deep';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  dailyGoal?: number;

  @IsOptional()
  @IsEnum(['minimal', 'moderate', 'full'])
  supportLevel?: 'minimal' | 'moderate' | 'full';
}

export class UpdateNotificationsDto {
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  reminderTime?: string;

  @IsOptional()
  @IsBoolean()
  streakAlertEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  growthAreaNudgeEnabled?: boolean;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'in_app_only'])
  growthAreaNudgeFrequency?: 'daily' | 'weekly' | 'in_app_only';

  @IsOptional()
  @IsBoolean()
  planLimitAlertEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyEmailEnabled?: boolean;
}

export class UnlinkGuardianDto {
  @IsString()
  @MinLength(1)
  studentPassword: string;
}

export class DeleteAccountDto {
  @IsString()
  @MinLength(1)
  password: string;
}
