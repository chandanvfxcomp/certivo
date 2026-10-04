// src/server/email/client.ts
//
// Pluggable transactional email — dependency-free. Providers:
//   - "console" (default): logs to stdout, for local dev. Nothing is sent.
//   - "resend": Resend's HTTP API via fetch (no SDK dependency).
//
// Configure via EMAIL_PROVIDER, RESEND_API_KEY, EMAIL_FROM (see .env.example).
// Failures never throw — sendEmail returns { sent: false } and logs, so a
// down email provider can't break the request that triggered the email
// (e.g. a certificate download).
import { logger } from "@/lib/logger";
import { BRAND } from "@/config/brand";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  sent: boolean;
  provider: string;
  messageId?: string;
}

async function sendViaResend(opts: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    logger.warn("email.resend_not_configured", {});
    return { sent: false, provider: "resend" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${BRAND.name} <${from}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.warn("email.resend_failed", { status: res.status, body: body.slice(0, 200) });
    return { sent: false, provider: "resend" };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { sent: true, provider: "resend", messageId: data.id };
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  try {
    if (provider === "resend") return await sendViaResend(opts);
    // console + unknown providers: log, don't send.
    logger.info("email.console", { to: opts.to, subject: opts.subject, provider });
    return { sent: provider === "console", provider: "console" };
  } catch (err) {
    logger.warn("email.send_failed", { to: opts.to, error: String(err) });
    return { sent: false, provider };
  }
}
