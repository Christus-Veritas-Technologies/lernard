import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateModeDto {
  @IsEnum(['guide', 'companion'])
  mode: 'guide' | 'companion';
}

export class CompanionControlsDto {
  @IsBoolean()
  @IsOptional()
  showCorrectAnswers?: boolean;

  @IsBoolean()
  @IsOptional()
  allowHints?: boolean;

  @IsBoolean()
  @IsOptional()
  allowSkip?: boolean;
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
