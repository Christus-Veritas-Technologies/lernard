import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { R2Service } from '../../r2/r2.service';

export type QuizUploadKind = 'image' | 'pdf';

const MIME_KIND_MAP: Record<string, QuizUploadKind> = {
  'application/pdf': 'pdf',
  'image/gif': 'image',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};

export const MAX_QUIZ_UPLOAD_SIZE = 15 * 1024 * 1024; // 15 MB

export interface QuizUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface StoredQuizUpload {
  uploadId: string;
  kind: QuizUploadKind;
  fileName: string;
  mimeType: string;
  size: number;
}

export async function storeQuizUpload(
  r2: R2Service,
  userId: string,
  file: QuizUploadFile | undefined,
): Promise<StoredQuizUpload> {
  if (!file) {
    throw new BadRequestException('Attach an image or PDF before uploading.');
  }

  const kind = MIME_KIND_MAP[file.mimetype];
  if (!kind) {
    throw new BadRequestException(
      'Only PDF, PNG, JPG, GIF, and WEBP files are supported.',
    );
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new BadRequestException('The uploaded file was empty.');
  }

  const ext = getStoredExtension(file.originalname, file.mimetype);
  const uploadId = `${randomUUID()}${ext}`;
  await r2.upload(
    `quiz-uploads/${userId}/${uploadId}`,
    file.buffer,
    file.mimetype,
  );

  return {
    uploadId,
    kind,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

export async function readQuizUpload(
  r2: R2Service,
  userId: string,
  uploadId: string,
): Promise<{ buffer: Buffer; mimeType: string; kind: QuizUploadKind } | null> {
  const ext = extname(uploadId).toLowerCase();
  const mimeType = extToMime(ext);
  const kind = mimeType ? MIME_KIND_MAP[mimeType] : undefined;

  if (!mimeType || !kind) return null;

  const buffer = await r2.getBuffer(`quiz-uploads/${userId}/${uploadId}`);
  if (!buffer) return null;

  return { buffer, mimeType, kind };
}

export async function deleteQuizUpload(
  r2: R2Service,
  userId: string,
  uploadId: string,
): Promise<void> {
  await r2.delete(`quiz-uploads/${userId}/${uploadId}`);
}

function getStoredExtension(originalname: string, mimetype: string): string {
  const ext = extname(originalname).toLowerCase();
  if (ext) return ext;
  const fallbacks: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return fallbacks[mimetype] ?? '';
}

function extToMime(ext: string): string | undefined {
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return map[ext];
}
