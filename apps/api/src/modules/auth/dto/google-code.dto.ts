import { IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleCodeDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2048)
  code!: string;
}
