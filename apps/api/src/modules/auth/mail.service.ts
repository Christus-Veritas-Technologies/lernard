import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
        secure: Number(this.configService.get<string>('SMTP_PORT') ?? 587) === 465,
        auth: {
          user: this.configService.getOrThrow<string>('SMTP_USER'),
          pass: this.configService.getOrThrow<string>('SMTP_PASS'),
        },
      });
    }
  }

  async sendMagicLink(to: string, token: string, otp: string) {
    const webUrl = this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:4000';
    const link = `${webUrl}/auth/verify?token=${encodeURIComponent(token)}`;

    if (!this.transporter) {
      // Development: print to console so the link can be clicked directly.
      this.logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log(`Magic link for: ${to}`);
      this.logger.log(`Link → ${link}`);
      this.logger.log(`OTP  → ${otp}`);
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    const from = this.configService.get<string>('SMTP_FROM') ?? 'Lernard <noreply@lernard.app>';

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Your Lernard sign-in link',
      html: this.buildHtml(link, otp),
      text: `Sign in to Lernard: ${link}\n\nOr enter this code in the app: ${otp}\n\nThis link expires in 15 minutes.`,
    });
  }

  async sendAdminSignupNotification(userName: string, userEmail: string, date: Date): Promise<void> {
    const dateStr = date.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';
    if (!this.transporter) {
      this.logger.log(`[ADMIN] New signup: ${userName} <${userEmail}> at ${dateStr}`);
      return;
    }
    const from = this.configService.get<string>('SMTP_FROM') ?? 'Lernard <noreply@lernard.app>';
    await this.transporter.sendMail({
      from,
      to: 'kinzinzombe07@gmail.com',
      subject: `New Lernard signup: ${userName}`,
      text: `${userName} signed up with ${userEmail} on ${dateStr}.`,
    });
  }

  private buildHtml(link: string, otp: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;padding:40px 36px;border:1px solid #e8eaf0">

        <!-- Logo / brand -->
        <tr><td style="padding-bottom:32px">
          <span style="font-size:22px;font-weight:700;color:#1a1a2e;letter-spacing:-0.5px">Lernard</span>
        </td></tr>

        <!-- Heading -->
        <tr><td style="padding-bottom:12px">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a2e;line-height:1.3">
            Your sign-in link
          </h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding-bottom:28px">
          <p style="margin:0;font-size:15px;line-height:1.7;color:#555">
            Click the button below to sign in to Lernard. This link expires in
            <strong>15 minutes</strong> and can only be used once.
          </p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding-bottom:36px">
          <a href="${link}"
             style="display:inline-block;padding:14px 32px;background:#4f63d2;color:#fff;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.1px">
            Sign in to Lernard
          </a>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding-bottom:24px;border-top:1px solid #eef0f5"></td></tr>

        <!-- OTP section -->
        <tr><td style="padding-bottom:8px">
          <p style="margin:0;font-size:13px;color:#888;line-height:1.6">
            Using the mobile app? Enter this code instead:
          </p>
        </td></tr>
        <tr><td style="padding-bottom:32px">
          <div style="display:inline-block;padding:14px 28px;background:#f3f4f8;border-radius:14px;font-size:30px;font-weight:700;letter-spacing:0.3em;color:#1a1a2e">
            ${otp}
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td>
          <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6">
            If you didn't request this, you can safely ignore this email.
            Your account has not been accessed.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
