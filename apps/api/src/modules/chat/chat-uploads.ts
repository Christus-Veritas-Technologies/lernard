import { BadRequestException } from '@nestjs/common'
import type { ChatAttachmentInput, ChatUploadKind } from '@lernard/shared-types'
import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const CHAT_UPLOAD_DIRECTORY = join(process.cwd(), '.storage', 'chat-attachments')
const MIME_KIND_MAP = {
  'application/pdf': 'pdf',
  'image/gif': 'image',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
} as const satisfies Record<string, ChatUploadKind>

export const MAX_CHAT_UPLOAD_SIZE = 15 * 1024 * 1024

type UploadedChatAttachmentInput = Extract<ChatAttachmentInput, { type: 'upload' }>

export interface ChatUploadFile {
  buffer: Buffer
  mimetype: string
  originalname: string
  size: number
}

export interface ChatPromptUpload {
  kind: ChatUploadKind
  mimeType: string
  data: string
  fileName: string
}

export async function storeChatUpload(
  userId: string,
  file: ChatUploadFile | undefined,
): Promise<UploadedChatAttachmentInput> {
  if (!file) {
    throw new BadRequestException('Attach a PDF or image before sending.')
  }

  const kind = getChatUploadKind(file.mimetype)
  if (!kind) {
    throw new BadRequestException('Only PDF, PNG, JPG, GIF, and WEBP files are supported.')
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new BadRequestException('The uploaded file was empty.')
  }

  await mkdir(resolveChatUploadDirectory(userId), { recursive: true })

  const uploadId = `${randomUUID()}${getStoredExtension(file.originalname, file.mimetype)}`
  await writeFile(resolveChatUploadPath(userId, uploadId), file.buffer)

  return {
    type: 'upload',
    uploadId,
    kind,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }
}

export async function chatUploadExists(userId: string, uploadId: string): Promise<boolean> {
  try {
    await access(resolveChatUploadPath(userId, uploadId))
    return true
  } catch {
    return false
  }
}

export async function readChatPromptUpload(
  userId: string,
  attachment: UploadedChatAttachmentInput,
): Promise<ChatPromptUpload | null> {
  if (!(await chatUploadExists(userId, attachment.uploadId))) {
    return null
  }

  const bytes = await readFile(resolveChatUploadPath(userId, attachment.uploadId))
  return {
    kind: attachment.kind,
    mimeType: attachment.mimeType,
    data: bytes.toString('base64'),
    fileName: attachment.fileName,
  }
}

function getChatUploadKind(mimeType: string): ChatUploadKind | null {
  return MIME_KIND_MAP[mimeType as keyof typeof MIME_KIND_MAP] ?? null
}

function getStoredExtension(originalName: string, mimeType: string): string {
  const originalExtension = extname(originalName).toLowerCase()
  if (originalExtension) {
    return originalExtension
  }

  switch (mimeType) {
    case 'application/pdf':
      return '.pdf'
    case 'image/gif':
      return '.gif'
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    default:
      return '.bin'
  }
}

function resolveChatUploadDirectory(userId: string): string {
  return join(CHAT_UPLOAD_DIRECTORY, userId)
}

function resolveChatUploadPath(userId: string, uploadId: string): string {
  return join(resolveChatUploadDirectory(userId), uploadId)
}
