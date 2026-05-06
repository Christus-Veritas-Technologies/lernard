import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyMagicLinkDto {
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6)
  otp?: string;
}
