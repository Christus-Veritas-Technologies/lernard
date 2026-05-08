import {
  IsString,
  MaxLength,
  IsOptional,
  IsEmail,
  MinLength,
  IsIn,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InviteChildDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  childName?: string;
}

export class AcceptInviteDto {
  @IsString()
  @MaxLength(10)
  code: string;
}

export class DeclineInviteDto {
  @IsString()
  @MaxLength(10)
  code: string;
}

export class UpdateChildCompanionControlsDto {
  @IsIn(['guide', 'companion'])
  learningMode: 'guide' | 'companion';

  @IsIn(['after_quiz', 'immediate'])
  answerRevealTiming: 'after_quiz' | 'immediate';

  @IsNumber()
  @Min(0.5)
  @Max(1.0)
  quizPassThreshold: number;

  @IsArray()
  @IsString({ each: true })
  lockedSettings: string[];
}

export class UpdateChildSettingsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}

export class UpdateGuardianProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @IsIn(['email', 'push', 'both'])
  @IsOptional()
  contactPreference?: 'email' | 'push' | 'both';

  @IsIn(['overview', 'last_viewed', 'most_recent'])
  @IsOptional()
  dashboardDefault?: 'overview' | 'last_viewed' | 'most_recent';
}

export class PerChildAlertDto {
  @IsString()
  childId: string;

  @IsBoolean()
  enabled: boolean;

  @IsIn(['every_session', 'daily_summary', 'weekly_summary'])
  @IsOptional()
  frequency?: 'every_session' | 'daily_summary' | 'weekly_summary';

  @IsBoolean()
  @IsOptional()
  streakAlert?: boolean;
}

export class UpdateGuardianNotificationsDto {
  @IsBoolean()
  @IsOptional()
  weeklyFamilySummary?: boolean;

  @IsBoolean()
  @IsOptional()
  unsubscribeAll?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerChildAlertDto)
  @IsOptional()
  perChildAlerts?: PerChildAlertDto[];
}
