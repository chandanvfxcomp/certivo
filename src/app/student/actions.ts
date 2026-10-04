"use server";

// src/app/student/actions.ts — student-side Server Actions (login, logout,
// platform re-download fee payment).
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { verifyPassword, verifyPasswordAgainstDummy } from "@/server/auth/password";
import { createSessionCookie, clearSessionCookie, requireStudentSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { isRateLimited, resetRateLimit, getClientIp } from "@/server/auth/rate-limit";
import { writeAuditLog } from "@/server/audit/log";
import { logger } from "@/lib/logger";

export async function loginStudent(formData: FormData): Promise<void> {
  const studentCode = String(formData.get("studentCode") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!studentCode || !password) redirect("/student/login?error=missing");

  // QA audit finding C2: no brute-force protection existed on this login
  // at all. Keyed by IP + the identifier being attempted — see
  // rate-limit.ts's own comment for why.
  const rateLimitKey = `student:${await getClientIp()}:${studentCode}`;
  if (isRateLimited(rateLimitKey)) {
    logger.warn("student.login_rate_limited", { studentCode });
    redirect("/student/login?error=rate_limited");
  }

  // (getDefaultTenant no longer used — login is tenant-agnostic; see above)
  // Multi-tenant fix (2026-10-04): studentCode is unique per tenant, so a
  // student from ANY institute must be able to log in — not just the
  // default tenant's students. Search globally; codes are random
  // (STU-XXXXXX) so collisions are practically impossible.
  const student = await prisma.student.findFirst({
    where: { studentCode, deletedAt: null, tenant: { status: "APPROVED", deletedAt: null } },
    include: { user: true, tenant: { select: { id: true } } },
  });

  if (!student?.user?.passwordHash || student.user.status !== "ACTIVE") {
    // QA re-audit finding: same fix as loginAdmin — burn the same scrypt
    // derivation time here too, so an unknown/inactive student code can't
    // be distinguished from a wrong-password one by response timing.
    await verifyPasswordAgainstDummy(password);
    redirect("/student/login?error=invalid");
  }

  const ok = await verifyPassword(password, student.user.passwordHash);
  if (!ok) redirect("/student/login?error=invalid");

  await createSessionCookie({
    kind: "student",
    userId: student.user.id,
    studentId: student.id,
    tenantId: student.tenant.id,
  });
  resetRateLimit(rateLimitKey);
  logger.info("student.login", { studentId: student.id, tenantId: student.tenant.id });
  redirect("/student/portal");
}

export async function logoutStudent(): Promise<void> {
  await clearSessionCookie();
  redirect("/student/login");
}

/**
 * Pays the fixed ₹299 platform per-download fee
 * (PLATFORM_REDOWNLOAD_FEE_PAISE, src/config/certificate.ts) — the
 * platform's own revenue per the user's explicit instruction (2026-10-04).
 * One payment = exactly ONE download: it sets the single-use
 * platformFeePaid token, which the download route consumes atomically
 * when the paid download happens. downloadCount is never reset — it
 * keeps counting total downloads for the record.
 *
 * No payment gateway yet — marks paid directly.
 * Wire Razorpay here when the gateway lands (see docs/payments).
 */
export async function payPlatformFee(certificateId: string): Promise<void> {
  const session = await requireStudentSession();

  const updated = await withTenant(session.tenantId, async (tx) => {
    const result = await tx.certificate.updateMany({
      where: { id: certificateId, studentId: session.studentId, tenantId: session.tenantId },
      data: { platformFeePaid: true, platformFeePaidAt: new Date() },
    });
    if (result.count > 0) {
      await writeAuditLog(tx, {
        tenantId: session.tenantId,
        actorId: session.userId,
        action: "certificate.platform_fee_paid_by_student",
        targetType: "certificate",
        targetId: certificateId,
      });
    }
    return result.count;
  });

  if (updated === 0) {
    logger.warn("certificate.platform_fee_paid_by_student_not_found", {
      tenantId: session.tenantId,
      certificateId,
      studentId: session.studentId,
    });
    redirect("/student/portal?error=not_found");
  }

  logger.info("certificate.platform_fee_paid_by_student", {
    tenantId: session.tenantId,
    certificateId,
    studentId: session.studentId,
  });
  redirect("/student/portal");
}

/**
 * Opt in/out of the public certificate directory (/directory).
 * Opt-in only — the certificate appears publicly with name + course +
 * institute + verify link. Revoking the opt-in removes it immediately.
 */
export async function setDirectoryOptIn(certificateId: string, optIn: boolean): Promise<void> {
  const session = await requireStudentSession();

  const updated = await withTenant(session.tenantId, (tx) =>
    tx.certificate.updateMany({
      where: { id: certificateId, studentId: session.studentId, tenantId: session.tenantId },
      data: { directoryOptIn: optIn },
    }),
  );

  if (updated.count > 0) {
    await withTenant(session.tenantId, (tx) =>
      writeAuditLog(tx, {
        tenantId: session.tenantId,
        actorId: session.userId,
        action: optIn ? "certificate.directory_opt_in" : "certificate.directory_opt_out",
        targetType: "certificate",
        targetId: certificateId,
      }),
    );
    logger.info("certificate.directory_opt", {
      tenantId: session.tenantId,
      certificateId,
      optIn,
    });
  }
  redirect("/student/portal");
}
