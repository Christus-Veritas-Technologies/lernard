import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Client, LocalAuth, MessageMedia, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { MessageHandlerService } from '../handler/message-handler.service';

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private client: Client;

  constructor(private readonly handler: MessageHandlerService) {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: process.env.WHATSAPP_SESSION_PATH ?? './.wwebjs_auth',
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });
  }

  async onModuleInit() {
    this.client.on('qr', (qr) => {
      this.logger.log('WhatsApp QR code generated — scan with your phone:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.logger.log('WhatsApp client ready ✓');
    });

    this.client.on('auth_failure', (msg) => {
      this.logger.error(`WhatsApp auth failure: ${msg}`);
    });

    this.client.on('disconnected', (reason) => {
      this.logger.warn(`WhatsApp disconnected: ${reason}`);
    });

    this.client.on('message', async (msg: Message) => {
      try {
        await this.handler.handle(msg, this);
      } catch (err) {
        this.logger.error(
          `Unhandled error in message handler: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    await this.client.initialize();
  }

  async onModuleDestroy() {
    try {
      await this.client.destroy();
    } catch {
      // ignore — may already be disconnected
    }
  }

  // ─── Public API used by flows ──────────────────────────────────────────────

  async sendText(chatId: string, text: string): Promise<void> {
    try {
      await this.client.sendMessage(chatId, text);
    } catch (err) {
      this.logger.error(`Failed to send text to ${chatId}: ${(err as Error).message}`);
    }
  }

  /** Send multiple messages with a delay between them to avoid spam detection */
  async sendSequential(
    chatId: string,
    messages: string[],
    delayMs = 500,
  ): Promise<void> {
    for (const text of messages) {
      await this.sendText(chatId, text);
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async sendDocument(
    chatId: string,
    buffer: Buffer,
    filename: string,
    caption?: string,
  ): Promise<void> {
    try {
      const media = new MessageMedia(
        'application/pdf',
        buffer.toString('base64'),
        filename,
      );
      await this.client.sendMessage(chatId, media, {
        sendMediaAsDocument: true,
        caption,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send document to ${chatId}: ${(err as Error).message}`,
      );
    }
  }
}
