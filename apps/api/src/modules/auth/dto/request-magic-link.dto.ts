import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';

export class RequestMagicLinkDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsIn(['web', 'native', 'whatsapp'])
  platform?: 'web' | 'native' | 'whatsapp';
}
