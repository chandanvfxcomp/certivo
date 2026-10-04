// src/server/auth/password-reset.ts
//
// Super-admin password reset: time-limited, single-use tokens.
// Token plaintext is emailed; only the SHA-256 hash is stored.
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/server/db/client";
import { ulid } from "@/lib/ulid";
import { hashPassword } from "./password";
import { sendEmail } from "@/server/email/client";
import { logger } from "@/lib/logger";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a reset token for the super-admin email. Returns false if no such user (no enumeration). */
export async function requestPasswordReset(email: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), isSuperAdmin: true, status: "ACTIVE" },
    select: { id: true, email: true },
  });
  if (!user) return false;

  // Invalidate older unused tokens.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      id: ulid(),
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/super-admin/reset-password?token=${token}`;
  const sent = await sendEmail({
    to: user.email,
    subject: "Reset your Certivo super-admin password",
    html: `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    text: `Reset your password (expires in 1 hour): ${resetUrl}`,
  });
  if (!sent) {
    // Email not configured — log the link so the server owner can still recover.
    logger.warn("password_reset.email_failed_link_logged", { userId: user.id });
    logger.warn("[password-reset] email failed; reset link omitted (no email provider)");
  }
  return true;
}

/** Verify token and set the new password. Returns false on invalid/expired/used token. */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, userId: true },
  });
  if (!record) return false;

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return true;
}
