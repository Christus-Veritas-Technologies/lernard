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
} from 'class-validator';

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
