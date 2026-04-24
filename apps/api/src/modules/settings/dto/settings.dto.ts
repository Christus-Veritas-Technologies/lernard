import { IsEnum, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export class UpdateModeDto {
  @IsEnum(['guide', 'companion'])
  mode: 'guide' | 'companion';
}

export class CompanionControlsDto {
  @IsBoolean()
  showCorrectAnswers: boolean;

  @IsBoolean()
  allowHints: boolean;

  @IsBoolean()
  allowSkip: boolean;
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
