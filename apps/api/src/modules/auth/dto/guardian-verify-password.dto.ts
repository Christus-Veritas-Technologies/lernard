import { IsString, MaxLength } from 'class-validator';

export class GuardianVerifyPasswordDto {
  @IsString()
  @MaxLength(128)
  password: string;
}
