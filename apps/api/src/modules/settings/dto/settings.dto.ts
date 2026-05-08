import { IsEnum, IsNumber, Min, Max } from 'class-validator';

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
