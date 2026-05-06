import {
  IsString,
  MaxLength,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';

export class InviteChildDto {
  @IsString()
  @MaxLength(254)
  @IsOptional()
  childEmail?: string;
}

export class AcceptInviteDto {
  @IsString()
  @MaxLength(10)
  code: string;
}

export class UpdateChildCompanionControlsDto {
  @IsBoolean()
  showCorrectAnswers: boolean;

  @IsBoolean()
  allowHints: boolean;

  @IsBoolean()
  allowSkip: boolean;
}

export class UpdateChildSettingsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}
