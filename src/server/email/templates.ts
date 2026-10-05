// src/server/email/templates.ts
//
// Transactional email templates — plain functions returning { subject, html, text }.
// Per BRAND hard rule: all brand strings come from @/config/brand, never hardcoded.
import { BRAND } from "@/config/brand";

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
<div style="font-weight:700;font-size:18px;margin-bottom:16px;">${BRAND.name}</div>
<h1 style="font-size:20px;margin:0 0 12px;">${title}</h1>
${bodyHtml}
<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />
<p style="font-size:12px;color:#888;">${BRAND.legalName} · ${BRAND.tagline}<br/>Questions? Reply to ${BRAND.supportEmail}</p>
</body></html>`;
}

/**
 * Sent after every successful certificate PDF download — the user's
 * explicit "confirmation mail for download". Includes the verification
 * link so the student can share/prove it without re-downloading.
 */
export function downloadConfirmationEmail(params: {
  studentName: string;
  courseName: string;
  certificateCode: string;
  downloadsLeft: number;
}): EmailTemplate {
  const verifyUrl = `https://${BRAND.domain}/v/${encodeURIComponent(params.certificateCode)}`;
  const subject = `Your certificate download — ${params.courseName}`;
  const bodyHtml = `
<p>Hi ${escapeHtml(params.studentName)},</p>
<p>Your certificate for <strong>${escapeHtml(params.courseName)}</strong> was just downloaded.</p>
<p style="background:#f5f5f5;border-radius:8px;padding:12px 16px;">
Certificate code: <strong style="font-family:monospace;">${escapeHtml(params.certificateCode)}</strong><br/>
Verify it anytime (no login needed):<br/>
<a href="${verifyUrl}">${verifyUrl}</a>
</p>
<p>${params.downloadsLeft > 0
    ? `You have <strong>1</strong> free download left — use it from your student portal.`
    : `You've used your free download — each further download costs ₹299, payable from your student portal.`}</p>
<p>If this wasn't you, please contact your institute right away.</p>`;
  const text = `Hi ${params.studentName},\n\nYour certificate for ${params.courseName} was just downloaded.\n\nCertificate code: ${params.certificateCode}\nVerify it anytime (no login needed): ${verifyUrl}\n\n${params.downloadsLeft > 0
    ? `You have 1 free download left — use it from your student portal.`
    : `You've used your free download — each further download costs ₹299, payable from your student portal.`}\n\nIf this wasn't you, please contact your institute right away.`;
  return { subject, html: shell("Download confirmed", bodyHtml), text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sent when a student's registration fee payment succeeds. Includes the
 * invoice number and notes that the certificate download activates after
 * institute approval.
 */
export function registrationFeePaidEmail(params: {
  studentName: string;
  instituteName: string;
  invoiceNumber: string;
  amountPaise: number;
}): EmailTemplate {
  const amount = `₹${(params.amountPaise / 100).toLocaleString("en-IN")}`;
  const subject = `Payment received — invoice ${params.invoiceNumber}`;
  const bodyHtml = `
<p>Hi ${escapeHtml(params.studentName)},</p>
<p>We've received your registration fee of <strong>${amount}</strong> for ${escapeHtml(params.instituteName)}.</p>
<p style="background:#f5f5f5;border-radius:8px;padding:12px 16px;">
Invoice number: <strong style="font-family:monospace;">${escapeHtml(params.invoiceNumber)}</strong><br/>
Amount paid: <strong>${amount}</strong>
</p>
<p>Your invoice is attached to this email for your records. Your certificate download will be activated once your institute approves your registration — we'll email you the moment it's ready.</p>`;
  const text = `Hi ${params.studentName},\n\nWe've received your registration fee of ${amount} for ${params.instituteName}.\n\nInvoice number: ${params.invoiceNumber}\nAmount paid: ${amount}\n\nYour certificate download will be activated once your institute approves your registration — we'll email you the moment it's ready.`;
  return { subject, html: shell("Payment received", bodyHtml), text };
}

/**
 * Sent when an admin approves a student's registration. The certificate
 * download link is now active.
 */
export function registrationApprovedEmail(params: {
  studentName: string;
  instituteName: string;
}): EmailTemplate {
  const portalUrl = `https://${BRAND.domain}/student/login`;
  const subject = `Approved — your certificate is ready to download`;
  const bodyHtml = `
<p>Hi ${escapeHtml(params.studentName)},</p>
<p>Good news — ${escapeHtml(params.instituteName)} has approved your registration.</p>
<p>Your certificate download is now active. Sign in to your student portal to download it:</p>
<p><a href="${portalUrl}">${portalUrl}</a></p>`;
  const text = `Hi ${params.studentName},\n\nGood news — ${params.instituteName} has approved your registration.\n\nYour certificate download is now active. Sign in to your student portal to download it:\n${portalUrl}`;
  return { subject, html: shell("Registration approved", bodyHtml), text };
}

