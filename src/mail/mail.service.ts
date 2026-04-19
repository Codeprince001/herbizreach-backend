import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('sendgrid.apiKey')?.trim();
    if (key) {
      sgMail.setApiKey(key);
    }
  }

  private isConfigured(): boolean {
    const key = this.config.get<string>('sendgrid.apiKey')?.trim();
    const from = this.config.get<string>('sendgrid.fromEmail')?.trim();
    return Boolean(key && from);
  }

  async sendWelcomeEmail(to: string, fullName: string): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'SendGrid is not configured (SENDGRID_API_KEY / SENDGRID_FROM_EMAIL); welcome email skipped',
      );
      return;
    }
    const fromName = this.config.get<string>('sendgrid.fromName') ?? 'HerBizReach';
    const fromEmail = this.config.get<string>('sendgrid.fromEmail')!.trim();
    const subject = `Welcome to HerBizReach, ${fullName.split(' ')[0] || 'there'}!`;
    const text = [
      `Hi ${fullName},`,
      '',
      'Thanks for creating your HerBizReach account. You can sign in anytime to manage your storefront and connect with buyers.',
      '',
      '— The HerBizReach team',
    ].join('\n');
    const html = `
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>Thanks for creating your <strong>HerBizReach</strong> account. You can sign in anytime to manage your storefront and connect with buyers.</p>
      <p>— The HerBizReach team</p>
    `.trim();
    await this.send({ to, from: { email: fromEmail, name: fromName }, subject, text, html });
  }

  async sendPasswordResetCode(to: string, fullName: string, code: string): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'SendGrid is not configured (SENDGRID_API_KEY / SENDGRID_FROM_EMAIL); password reset email skipped',
      );
      return;
    }
    const fromName = this.config.get<string>('sendgrid.fromName') ?? 'HerBizReach';
    const fromEmail = this.config.get<string>('sendgrid.fromEmail')!.trim();
    const appUrl = this.config.get<string>('appPublicUrl') ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?email=${encodeURIComponent(to)}`;
    const subject = 'Your HerBizReach password reset code';
    const text = [
      `Hi ${fullName},`,
      '',
      `Your verification code is: ${code}`,
      '',
      `This code expires in 15 minutes. Enter it on the reset password page: ${resetUrl}`,
      '',
      'If you did not request this, you can ignore this email.',
      '',
      '— The HerBizReach team',
    ].join('\n');
    const html = `
      <p>Hi ${escapeHtml(fullName)},</p>
      <p>Your verification code is:</p>
      <p style="font-size:24px;letter-spacing:4px;font-weight:700;">${escapeHtml(code)}</p>
      <p>This code expires in <strong>15 minutes</strong>.</p>
      <p><a href="${escapeHtml(resetUrl)}">Open reset password page</a></p>
      <p style="color:#666;font-size:14px;">If you did not request this, you can ignore this email.</p>
      <p>— The HerBizReach team</p>
    `.trim();
    await this.send({ to, from: { email: fromEmail, name: fromName }, subject, text, html });
  }

  private async send(msg: {
    to: string;
    from: { email: string; name: string };
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    try {
      await sgMail.send(msg);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`SendGrid send failed: ${message}`);
      throw err;
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
