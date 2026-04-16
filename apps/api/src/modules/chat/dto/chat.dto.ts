import { IsString, MaxLength, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsString()
  @IsUUID()
  idempotencyKey: string;
}
