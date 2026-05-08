import { BadRequestException } from '@nestjs/common';
import type {
  ChatAttachmentInput,
  ChatUploadKind,
} from '@lernard/shared-types';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { R2Service } from '../../r2/r2.service';

const MIME_KIND_MAP = {
  'application/pdf': 'pdf',
  'image/gif': 'image',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
} as const satisfies Record<string, ChatUploadKind>;

export const MAX_CHAT_UPLOAD_SIZE = 15 * 1024 * 1024;

type UploadedChatAttachmentInput = Extract<
  ChatAttachmentInput,
  { type: 'upload' }
>;

export interface ChatUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface ChatPromptUpload {
  kind: ChatUploadKind;
  mimeType: string;
  data: string;
  fileName: string;
}

export async function storeChatUpload(
  r2: R2Service,
  userId: string,
  file: ChatUploadFile | undefined,
): Promise<UploadedChatAttachmentInput> {
  if (!file) {
    throw new BadRequestException('Attach a PDF or image before sending.');
  }

  const kind = getChatUploadKind(file.mimetype);
  if (!kind) {
    throw new BadRequestException(
      'Only PDF, PNG, JPG, GIF, and WEBP files are supported.',
    );
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new BadRequestException('The uploaded file was empty.');
  }

  const uploadId = `${randomUUID()}${getStoredExtension(file.originalname, file.mimetype)}`;
  await r2.upload(
    `chat-attachments/${userId}/${uploadId}`,
    file.buffer,
    file.mimetype,
  );

  return {
    type: 'upload',
    uploadId,
    kind,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

export async function chatUploadExists(
  r2: R2Service,
  userId: string,
  uploadId: string,
): Promise<boolean> {
  return r2.exists(`chat-attachments/${userId}/${uploadId}`);
}

export async function readChatPromptUpload(
  r2: R2Service,
  userId: string,
  attachment: UploadedChatAttachmentInput,
): Promise<ChatPromptUpload | null> {
  const buffer = await r2.getBuffer(
    `chat-attachments/${userId}/${attachment.uploadId}`,
  );
  if (!buffer) return null;

  return {
    kind: attachment.kind,
    mimeType: attachment.mimeType,
    data: buffer.toString('base64'),
    fileName: attachment.fileName,
  };
}

function getChatUploadKind(mimeType: string): ChatUploadKind | null {
  return MIME_KIND_MAP[mimeType as keyof typeof MIME_KIND_MAP] ?? null;
}

function getStoredExtension(originalName: string, mimeType: string): string {
  const originalExtension = extname(originalName).toLowerCase();
  if (originalExtension) {
    return originalExtension;
  }

  switch (mimeType) {
    case 'application/pdf':
      return '.pdf';
    case 'image/gif':
      return '.gif';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '.bin';
  }
}
