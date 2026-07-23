import nodemailer from 'nodemailer';
import { config } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!config.email.user || !config.email.pass) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }
  return transporter;
}

export class MailerService {
  /**
   * Sends an email if SMTP is configured; otherwise logs a warning and
   * returns false so callers can fall back gracefully (e.g. console-logging
   * a link) rather than throwing and breaking the request. Never throws -
   * a broken/unconfigured mailer should never take down the operation
   * (a data save, a CAPA creation) that triggered the notification.
   */
  async sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
    if (Array.isArray(to) && to.length === 0) {
      return false;
    }

    const t = getTransporter();
    if (!t) {
      console.warn('Email not sent - SMTP is not configured (EMAIL_USER/EMAIL_PASS missing).');
      return false;
    }

    try {
      await t.sendMail({
        from: `"Protecther Safety Dashboard" <${config.email.user}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
      });
      return true;
    } catch (err) {
      console.error('Failed to send email:', err);
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    return this.sendEmail(
      to,
      'Reset your Protecther Safety Dashboard password',
      `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Reset your password</h2>
          <p>We received a request to reset the password for your Protecther Safety Dashboard account.</p>
          <p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">
              Reset Password
            </a>
          </p>
          <p style="color: #64748b; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    );
  }

  async sendCriticalIncidentAlert(
    to: string[],
    params: { siteName: string; month: string; year: number; incidents: { label: string; actual: number }[] }
  ): Promise<boolean> {
    const rows = params.incidents
      .map((i) => `<li><strong>${i.label}</strong>: ${i.actual}</li>`)
      .join('');
    return this.sendEmail(
      to,
      `⚠ Critical incident reported - ${params.siteName} (${params.month} ${params.year})`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Critical incident reported</h2>
          <p><strong>${params.siteName}</strong> — ${params.month} ${params.year}</p>
          <ul style="color: #1e293b;">${rows}</ul>
          <p style="color: #64748b; font-size: 13px;">
            This is an automated alert - the data was just saved or imported into the Safety Dashboard.
          </p>
        </div>
      `
    );
  }

  async sendCapaPriorityAlert(
    to: string[],
    params: { title: string; priority: string; siteName?: string; dueDate?: string | null }
  ): Promise<boolean> {
    return this.sendEmail(
      to,
      `New ${params.priority} priority corrective action: ${params.title}`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #ea580c;">New ${params.priority} priority corrective action</h2>
          <p><strong>${params.title}</strong></p>
          ${params.siteName ? `<p>Site: ${params.siteName}</p>` : ''}
          ${params.dueDate ? `<p>Due: ${new Date(params.dueDate).toLocaleDateString()}</p>` : ''}
          <p style="color: #64748b; font-size: 13px;">View it in the CAPA Tracking section of the Safety Dashboard.</p>
        </div>
      `
    );
  }

  async sendCapaOverdueDigest(
    to: string[],
    items: { title: string; siteName?: string; dueDate: string; priority: string }[]
  ): Promise<boolean> {
    const rows = items
      .map(
        (i) =>
          `<li><strong>${i.title}</strong>${i.siteName ? ` (${i.siteName})` : ''} — ${i.priority}, due ${new Date(i.dueDate).toLocaleDateString()}</li>`
      )
      .join('');
    return this.sendEmail(
      to,
      `${items.length} overdue corrective action${items.length === 1 ? '' : 's'}`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Overdue corrective actions</h2>
          <ul style="color: #1e293b;">${rows}</ul>
          <p style="color: #64748b; font-size: 13px;">
            This is a daily reminder for any open/in-progress corrective action past its due date.
          </p>
        </div>
      `
    );
  }
}

export const mailerService = new MailerService();
