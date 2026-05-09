import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertPushSubscriptionDto {
  @IsString()
  @MaxLength(2000)
  endpoint!: string;

  @IsObject()
  keys!: {
    p256dh: string;
    auth: string;
  };
}

export class RemovePushSubscriptionDto {
  @IsString()
  @MaxLength(2000)
  endpoint!: string;
}

export class SendTestNotificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  body?: string;
}
