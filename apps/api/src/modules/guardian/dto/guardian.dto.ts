import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

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
