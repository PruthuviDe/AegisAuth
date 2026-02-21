// =============================================================================
// EmailService — Nodemailer SMTP Email Sending
// =============================================================================
// WHY Nodemailer over an SDK:
// - Works with any SMTP provider (Mailtrap dev, SendGrid/SES prod)
// - No vendor lock-in; just swap SMTP credentials
// - In development, all emails go to Mailtrap for safe preview
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    const port = this.config.get<number>('SMTP_PORT', 465);
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port,
      // Port 465 uses implicit TLS; port 587 uses STARTTLS (secure: false)
      secure: port === 465,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  // ── Verify Email ─────────────────────────────────────────────────────────
  async sendEmailVerification(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
    const appName = this.config.get<string>('APP_NAME', 'AegisAuth');
    const fromAddress = this.config.get<string>('EMAIL_FROM', 'noreply@aegisauth.com');

    const html = this.buildVerificationEmail(name, verifyUrl, appName);

    await this.send({
      from: `"${appName}" <${fromAddress}>`,
      to,
      subject: `Verify your email — ${appName}`,
      html,
    });

  }

  // ── Account Verified Confirmation ──────────────────────────────────────────
  async sendAccountVerified(to: string, name: string): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const appName = this.config.get<string>('APP_NAME', 'AegisAuth');
    const fromAddress = this.config.get<string>('EMAIL_FROM', 'noreply@aegisauth.com');
    const displayName = name || 'there';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account verified</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:12px;border:1px solid #2a2d3e;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1d27 0%,#0f1830 100%);padding:36px 40px;text-align:center;border-bottom:1px solid #2a2d3e;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="background:#3b82f6;width:36px;height:36px;border-radius:8px;display:inline-block;text-align:center;line-height:36px;font-size:18px;">&#128274;</div>
                <span style="color:#f1f5f9;font-size:20px;font-weight:700;vertical-align:middle;">${appName}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;text-align:center;">
              <!-- Green checkmark circle -->
              <div style="width:64px;height:64px;border-radius:50%;background:#052e16;border:2px solid #16a34a;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;">
                <span style="font-size:28px;">&#10003;</span>
              </div>
              <h1 style="color:#f1f5f9;font-size:22px;font-weight:600;margin:0 0 12px;">Email verified!</h1>
              <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Hi ${displayName}, your email address has been successfully verified.
                Your <strong style="color:#f1f5f9;">${appName}</strong> account is now fully active.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="border-radius:8px;background:#3b82f6;">
                    <a href="${frontendUrl}/dashboard" target="_blank"
                      style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid #2a2d3e;margin:0 0 24px;" />
              <p style="color:#64748b;font-size:13px;margin:0;">
                If you didn't verify this account, please contact support immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0f1117;padding:20px 40px;border-top:1px solid #2a2d3e;">
              <p style="color:#475569;font-size:12px;margin:0;text-align:center;">
                &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    await this.send({
      from: `"${appName}" <${fromAddress}>`,
      to,
      subject: `Your ${appName} account is verified ✅`,
      html,
    });
  }

  // ── Password Reset ────────────────────────────────────────────────────────
  async sendPasswordReset(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const appName = this.config.get<string>('APP_NAME', 'AegisAuth');
    const fromAddress = this.config.get<string>('EMAIL_FROM', 'noreply@aegisauth.com');

    const html = this.buildPasswordResetEmail(name, resetUrl, appName);

    await this.send({
      from: `"${appName}" <${fromAddress}>`,
      to,
      subject: `Reset your password — ${appName}`,
      html,
    });

  }

  // ── Internal send with error swallowing ──────────────────────────────────
  // WHY catch+log instead of throw: A failed email shouldn't crash the HTTP
  // request that triggered it. The token is already saved in DB; user can
  // request a resend or admin can recover.
  private async send(options: nodemailer.SendMailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail(options);
      this.logger.log(`Email delivered to ${options.to} (messageId: ${info.messageId})`);
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) this.logger.log(`Preview URL: ${preview}`);
    } catch (err) {
      this.logger.error(`SMTP error sending to ${options.to}: ${(err as Error).message}`);
      throw err; // re-throw so .catch() in callers catches the real failure
    }
  }

  // ── Email Templates ───────────────────────────────────────────────────────
  private buildVerificationEmail(
    name: string,
    verifyUrl: string,
    appName: string,
  ): string {
    const displayName = name || 'there';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:12px;border:1px solid #2a2d3e;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1d27 0%,#0f1830 100%);padding:36px 40px;text-align:center;border-bottom:1px solid #2a2d3e;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="background:#3b82f6;width:36px;height:36px;border-radius:8px;display:inline-block;text-align:center;line-height:36px;font-size:18px;">🔒</div>
                <span style="color:#f1f5f9;font-size:20px;font-weight:700;vertical-align:middle;">${appName}</span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="color:#f1f5f9;font-size:22px;font-weight:600;margin:0 0 12px;">Verify your email address</h1>
              <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Hi ${displayName}, thanks for signing up! Please confirm your email address by clicking the button below.
                This link will expire in <strong style="color:#f1f5f9;">24 hours</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:8px;background:#3b82f6;">
                    <a href="${verifyUrl}" target="_blank"
                      style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="background:#0f1117;border-radius:6px;padding:10px 14px;margin:0 0 28px;">
                <a href="${verifyUrl}" style="color:#60a5fa;font-size:12px;word-break:break-all;text-decoration:none;">${verifyUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #2a2d3e;margin:0 0 24px;" />
              <p style="color:#64748b;font-size:13px;margin:0;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0f1117;padding:20px 40px;border-top:1px solid #2a2d3e;">
              <p style="color:#475569;font-size:12px;margin:0;text-align:center;">
                © ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
  }

  private buildPasswordResetEmail(
    name: string,
    resetUrl: string,
    appName: string,
  ): string {
    const displayName = name || 'there';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:12px;border:1px solid #2a2d3e;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1d27 0%,#0f1830 100%);padding:36px 40px;text-align:center;border-bottom:1px solid #2a2d3e;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="background:#3b82f6;width:36px;height:36px;border-radius:8px;display:inline-block;text-align:center;line-height:36px;font-size:18px;">🔒</div>
                <span style="color:#f1f5f9;font-size:20px;font-weight:700;vertical-align:middle;">${appName}</span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="color:#f1f5f9;font-size:22px;font-weight:600;margin:0 0 12px;">Reset your password</h1>
              <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Hi ${displayName}, we received a request to reset your ${appName} password.
                Click the button below to choose a new password. This link will expire in <strong style="color:#f1f5f9;">1 hour</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:8px;background:#3b82f6;">
                    <a href="${resetUrl}" target="_blank"
                      style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="background:#0f1117;border-radius:6px;padding:10px 14px;margin:0 0 28px;">
                <a href="${resetUrl}" style="color:#60a5fa;font-size:12px;word-break:break-all;text-decoration:none;">${resetUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #2a2d3e;margin:0 0 24px;" />
              <p style="color:#64748b;font-size:13px;margin:0;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password will not be changed.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0f1117;padding:20px 40px;border-top:1px solid #2a2d3e;">
              <p style="color:#475569;font-size:12px;margin:0;text-align:center;">
                © ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
  }
}
