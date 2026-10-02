import nodemailer, { type Transporter } from 'nodemailer';
import { db } from '@/db';
import { emailLog } from '@/db/schema';
import { smtpReady } from './env';

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
};

let transporter: Transporter | null = null;

function transport(): Transporter | null {
  if (!smtpReady()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h\d|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** E-posta gönderir ve kaydını tutar. Hata fırlatmaz. */
export async function sendMail(m: MailInput): Promise<boolean> {
  const t = transport();
  let status: 'sent' | 'failed' | 'not_configured' = 'not_configured';
  let error = '';
  if (t && m.to) {
    try {
      await t.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: m.to,
        subject: m.subject,
        html: m.html,
        text: m.text ?? htmlToText(m.html),
        replyTo: m.replyTo,
        attachments: m.attachments,
      });
      status = 'sent';
    } catch (e) {
      status = 'failed';
      error = e instanceof Error ? e.message : String(e);
      console.error('[e-posta] gönderilemedi:', error);
    }
  } else if (!m.to) {
    status = 'failed';
    error = 'Alıcı adresi boş.';
  } else {
    console.info(`[e-posta] SMTP ayarlı değil, gönderilmedi: ${m.to} | ${m.subject}`);
  }
  try {
    await db.insert(emailLog).values({ to: m.to || '-', subject: m.subject, html: m.html, status, error });
  } catch (e) {
    console.error('[e-posta] kayıt yazılamadı', e);
  }
  return status === 'sent';
}
