import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const CHAT_ATTACHMENT_TYPES = ['upload', 'lesson'] as const;
const CHAT_UPLOAD_KINDS = ['image', 'pdf'] as const;

class ChatAttachmentDto {
  @IsEnum(CHAT_ATTACHMENT_TYPES)
  type!: 'upload' | 'lesson';

  @ValidateIf((value: ChatAttachmentDto) => value.type === 'upload')
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  uploadId?: string;

  @ValidateIf((value: ChatAttachmentDto) => value.type === 'upload')
  @IsEnum(CHAT_UPLOAD_KINDS)
  kind?: 'image' | 'pdf';

  @ValidateIf((value: ChatAttachmentDto) => value.type === 'upload')
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fileName?: string;

  @ValidateIf((value: ChatAttachmentDto) => value.type === 'upload')
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  mimeType?: string;

  @ValidateIf((value: ChatAttachmentDto) => value.type === 'upload')
  @IsInt()
  @Min(1)
  @Max(15 * 1024 * 1024)
  size?: number;

  @ValidateIf((value: ChatAttachmentDto) => value.type === 'lesson')
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lessonId?: string;
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];
}
