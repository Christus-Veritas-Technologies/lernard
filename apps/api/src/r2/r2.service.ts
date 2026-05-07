import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

@Injectable()
export class R2Service {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly publicUrl: string

  constructor(private readonly config: ConfigService) {
    const accountId = config.getOrThrow<string>('R2_ACCOUNT_ID')
    this.bucket = config.getOrThrow<string>('R2_BUCKET_NAME')
    this.publicUrl = config.getOrThrow<string>('R2_PUBLIC_URL').replace(/\/$/, '')

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    })
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    )
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      if (!response.Body) return null

      const chunks: Uint8Array[] = []
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk)
      }
      return Buffer.concat(chunks)
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`
  }
}
