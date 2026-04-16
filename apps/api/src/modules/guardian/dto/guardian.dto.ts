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
  @IsOptional()
  showCorrectAnswers?: boolean;

  @IsBoolean()
  @IsOptional()
  allowHints?: boolean;

  @IsBoolean()
  @IsOptional()
  allowSkip?: boolean;
}
