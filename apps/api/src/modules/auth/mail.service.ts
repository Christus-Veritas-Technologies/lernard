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
        secure:
          Number(this.configService.get<string>('SMTP_PORT') ?? 587) === 465,
        auth: {
          user: this.configService.getOrThrow<string>('SMTP_USER'),
          pass: this.configService.getOrThrow<string>('SMTP_PASS'),
        },
      });
    }
  }

  async sendMagicLink(to: string, token: string, otp: string) {
    const webUrl =
      this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:4000';
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

    const from =
      this.configService.get<string>('SMTP_FROM') ??
      'Lernard <noreply@lernard.app>';

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Your Lernard sign-in link',
      html: this.buildHtml(link, otp),
      text: `Sign in to Lernard: ${link}\n\nOr enter this code in the app: ${otp}\n\nThis link expires in 15 minutes.`,
    });
  }

  async sendInviteExistingAccount(
    to: string,
    opts: { guardianName: string; code: string; expiresAt: Date; acceptLink: string },
  ): Promise<void> {
    const { guardianName, code, expiresAt, acceptLink } = opts;
    const expiryStr = expiresAt.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';
    if (!this.transporter) {
      this.logger.log(`[INVITE] ${guardianName} → ${to} | code: ${code} | accept: ${acceptLink}`);
      return;
    }
    const from = this.configService.get<string>('SMTP_FROM') ?? 'Lernard <noreply@lernard.app>';
    await this.transporter.sendMail({
      from,
      to,
      subject: `${guardianName} wants to be your guardian on Lernard`,
      html: this.buildInviteExistingHtml(guardianName, code, expiresAt, acceptLink),
      text: `${guardianName} has sent you a guardian invitation on Lernard.\n\nYour invite code: ${code}\n\nOr accept directly: ${acceptLink}\n\nExpires: ${expiryStr}\n\nIf you don't recognise ${guardianName}, ignore this email.`,
    });
  }

  async sendInviteNewAccount(
    to: string,
    opts: { guardianName: string; childName: string; setupLink: string; childEmail: string },
  ): Promise<void> {
    const { guardianName, childName, setupLink } = opts;
    if (!this.transporter) {
      this.logger.log(`[SETUP] ${guardianName} created account for ${childName} <${to}> | setup: ${setupLink}`);
      return;
    }
    const from = this.configService.get<string>('SMTP_FROM') ?? 'Lernard <noreply@lernard.app>';
    await this.transporter.sendMail({
      from,
      to,
      subject: `${guardianName} has set up a Lernard account for you`,
      html: this.buildInviteNewHtml(guardianName, childName, setupLink),
      text: `Hi ${childName},\n\n${guardianName} has created a Lernard account for you.\n\nLernard is your personal AI tutor.\n\nSet up your account: ${setupLink}\n\nThis link expires in 48 hours.\n\nOnce you're set up, ${guardianName} will be able to see your progress.\n\n— Lernard`,
    });
  }

  async sendInviteAccepted(
    to: string,
    opts: { childName: string; profileLink: string },
  ): Promise<void> {
    const { childName, profileLink } = opts;
    if (!this.transporter) {
      this.logger.log(`[ACCEPTED] ${childName} accepted invite → guardian: ${to}`);
      return;
    }
    const from = this.configService.get<string>('SMTP_FROM') ?? 'Lernard <noreply@lernard.app>';
    await this.transporter.sendMail({
      from,
      to,
      subject: `${childName} accepted your Lernard invitation`,
      html: this.buildInviteAcceptedHtml(childName, profileLink),
      text: `${childName} has accepted your guardian invitation on Lernard.\n\nView their progress: ${profileLink}\n\n— Lernard`,
    });
  }

  async sendInviteDeclined(
    to: string,
    opts: { childEmail: string },
  ): Promise<void> {
    const { childEmail } = opts;
    if (!this.transporter) {
      this.logger.log(`[DECLINED] ${childEmail} declined invite → guardian: ${to}`);
      return;
    }
    const from = this.configService.get<string>('SMTP_FROM') ?? 'Lernard <noreply@lernard.app>';
    await this.transporter.sendMail({
      from,
      to,
      subject: `Your Lernard invitation was declined`,
      html: this.buildInviteDeclinedHtml(childEmail),
      text: `${childEmail} has declined your guardian invitation on Lernard.\n\nYou can send a new invitation at any time from your guardian dashboard.\n\n— Lernard`,
    });
  }

  async sendSetupReminder(
    to: string,
    opts: { childName: string; setupLink: string; expiresAt: Date },
  ): Promise<void> {
    const { childName, setupLink, expiresAt } = opts;
    const expiryStr = expiresAt.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';
    if (!this.transporter) {
      this.logger.log(`[REMINDER] setup link expiring for ${childName} <${to}> at ${expiryStr}`);
      return;
    }
    const from = this.configService.get<string>('SMTP_FROM') ?? 'Lernard <noreply@lernard.app>';
    await this.transporter.sendMail({
      from,
      to,
      subject: `Your Lernard account setup link is expiring soon`,
      html: this.buildSetupReminderHtml(childName, setupLink, expiryStr),
      text: `Hi ${childName},\n\nA reminder that your Lernard account setup link expires on ${expiryStr}.\n\nSet up your account: ${setupLink}\n\nIf this link has expired, ask your guardian to resend the invitation.\n\n— Lernard`,
    });
  }

  async sendAdminSignupNotification(
    userName: string,
    userEmail: string,
    date: Date,
  ): Promise<void> {
    const dateStr =
      date.toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short',
      }) + ' UTC';
    if (!this.transporter) {
      this.logger.log(
        `[ADMIN] New signup: ${userName} <${userEmail}> at ${dateStr}`,
      );
      return;
    }
    const from =
      this.configService.get<string>('SMTP_FROM') ??
      'Lernard <noreply@lernard.app>';
    await this.transporter.sendMail({
      from,
      to: 'kinzinzombe07@gmail.com',
      subject: `New Lernard signup: ${userName}`,
      text: `${userName} signed up with ${userEmail} on ${dateStr}.`,
    });
  }

  private shell(body: string): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f8f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;padding:40px 36px;border:1px solid #e8eaf0"><tr><td style="padding-bottom:32px"><span style="font-size:22px;font-weight:700;color:#1a1a2e;letter-spacing:-0.5px">Lernard</span></td></tr>${body}<tr><td><p style="margin:0;font-size:12px;color:#aaa;line-height:1.6">You're receiving this because someone used your email address on Lernard. If you didn't expect this, you can safely ignore it.</p></td></tr></table></td></tr></table></body></html>`;
  }

  private btn(label: string, href: string): string {
    return `<tr><td style="padding-bottom:28px"><a href="${href}" style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">${label}</a></td></tr>`;
  }

  private buildInviteExistingHtml(guardianName: string, code: string, expiresAt: Date, acceptLink: string): string {
    const expiryStr = expiresAt.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';
    return this.shell(`
      <tr><td style="padding-bottom:12px"><h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a2e">${guardianName} wants to be your guardian</h1></td></tr>
      <tr><td style="padding-bottom:20px"><p style="margin:0;font-size:15px;line-height:1.7;color:#555">As your guardian, <strong>${guardianName}</strong> will be able to view your lesson and quiz progress and adjust certain learning settings. They cannot read your chat conversations.</p></td></tr>
      <tr><td style="padding-bottom:24px"><p style="margin:0;font-size:14px;color:#555">To accept, open Lernard and enter this code:</p><div style="margin-top:12px;display:inline-block;padding:16px 32px;background:#f3f4f8;border-radius:14px;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#1a1a2e;font-family:monospace">${code}</div><p style="margin:8px 0 0;font-size:12px;color:#aaa">Expires ${expiryStr}</p></td></tr>
      ${this.btn('Accept Invitation', acceptLink)}
      <tr><td style="padding-bottom:20px"><p style="margin:0;font-size:13px;color:#888">If you don't recognise <strong>${guardianName}</strong>, ignore this email. Your account is safe.</p></td></tr>
    `);
  }

  private buildInviteNewHtml(guardianName: string, childName: string, setupLink: string): string {
    return this.shell(`
      <tr><td style="padding-bottom:12px"><h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a2e">${guardianName} has set up a Lernard account for you</h1></td></tr>
      <tr><td style="padding-bottom:20px"><p style="margin:0;font-size:15px;line-height:1.7;color:#555">Hi <strong>${childName}</strong>,<br><br>Lernard is your personal AI tutor. It generates lessons and quizzes tailored to exactly where you are, remembers what you've studied, and gets smarter the more you use it.</p></td></tr>
      <tr><td style="padding-bottom:8px"><p style="margin:0;font-size:14px;color:#555">To get started, set your password using the button below:</p></td></tr>
      ${this.btn('Set up my account', setupLink)}
      <tr><td style="padding-bottom:20px"><p style="margin:0;font-size:13px;color:#888">This link expires in 48 hours. Once you're set up, ${guardianName} will be able to see your progress — but you're in control of your own learning.</p></td></tr>
    `);
  }

  private buildInviteAcceptedHtml(childName: string, profileLink: string): string {
    return this.shell(`
      <tr><td style="padding-bottom:12px"><h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a2e">${childName} accepted your invitation</h1></td></tr>
      <tr><td style="padding-bottom:20px"><p style="margin:0;font-size:15px;line-height:1.7;color:#555"><strong>${childName}</strong> has accepted your guardian invitation on Lernard. You can now view their progress and adjust their learning settings.</p></td></tr>
      ${this.btn('View their progress', profileLink)}
    `);
  }

  private buildInviteDeclinedHtml(childEmail: string): string {
    return this.shell(`
      <tr><td style="padding-bottom:12px"><h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a2e">Your invitation was declined</h1></td></tr>
      <tr><td style="padding-bottom:20px"><p style="margin:0;font-size:15px;line-height:1.7;color:#555"><strong>${childEmail}</strong> has declined your guardian invitation. You can send a new invitation at any time from your guardian dashboard.</p></td></tr>
    `);
  }

  private buildSetupReminderHtml(childName: string, setupLink: string, expiryStr: string): string {
    return this.shell(`
      <tr><td style="padding-bottom:12px"><h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a2e">Your account setup link is expiring soon</h1></td></tr>
      <tr><td style="padding-bottom:20px"><p style="margin:0;font-size:15px;line-height:1.7;color:#555">Hi <strong>${childName}</strong>,<br><br>Your Lernard account setup link expires on <strong>${expiryStr}</strong>. Set up your account before it expires.</p></td></tr>
      ${this.btn('Set up my account', setupLink)}
      <tr><td style="padding-bottom:20px"><p style="margin:0;font-size:13px;color:#888">If this link has already expired, ask your guardian to resend the setup email from their dashboard.</p></td></tr>
    `);
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
