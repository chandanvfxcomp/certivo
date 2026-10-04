"use server";

// src/app/admin/actions.ts
//
// Admin-side Server Actions: login, logout, student registration, and the
// manual fee-paid toggles (no payment gateway — see README). Every
// mutation here is the admin equivalent of guard() for this MVP slice: it
// re-checks requireAdminSession() itself rather than trusting the caller,
// same spirit as guard()'s Section 8.4 steps even though it isn't routed
// through that exact function yet (see session.ts's header comment).
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { withTenant } from "@/server/db/tenant-client";
import { verifyPassword, verifyPasswordAgainstDummy, hashPassword, generateTempPassword } from "@/server/auth/password";
import { createSessionCookie, clearSessionCookie, requireAdminSession } from "@/server/auth/session";
import { isRateLimited, resetRateLimit, getClientIp } from "@/server/auth/rate-limit";
import { ulid, randomBase32 } from "@/lib/ulid";
import { generateCertificateCode } from "@/lib/certificate-code";
import { findUnsupportedCertificateText } from "@/server/certificates/generate-pdf";
import { saveUploadedImage, deleteFile, InvalidImageUploadError } from "@/server/storage/local-disk";
import { isValidEmail, isValidIndianMobile } from "@/lib/validation";
import { isBrandDomainConfigured } from "@/config/brand";
import { writeAuditLog } from "@/server/audit/log";
import { logger } from "@/lib/logger";

/**
 * True for a Prisma unique-constraint violation (P2002) whose target
 * mentions `fieldSubstring`. Callers must pass a substring specific enough
 * to disambiguate between the table's different unique constraints —
 * e.g. "certificate_code" vs "student_code" vs "email", NOT the bare word
 * "code", since Postgres's default constraint-naming convention
 * (`<table>_<columns>_key`) means "student_tenant_id_student_code_key"
 * also contains "code".
 */
function isUniqueConstraintViolation(err: unknown, fieldSubstring: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Boolean(
      (err.meta?.target as string[] | string | undefined)
        ?.toString()
        .includes(fieldSubstring),
    )
  );
}

// QA audit finding B4: fee/date fields from FormData were parsed with
// `Number(...)`/`new Date(...)` and no NaN/Invalid-Date guard before
// hitting Prisma — a malformed value (autofill glitch, a hand-crafted
// request) either throws an unhandled Prisma error or coerces silently.
// QA audit finding D4: no plausibility bounds on a date of birth /
// completion date either, so a future date could reach the certificate
// PDF unchecked. These two helpers fix both at once, at the point every
// such field is parsed.
function parseOptionalRupeesToPaise(raw: string, label: string): { paise: number | null; error?: string } {
  if (!raw) return { paise: null };
  const rupees = Number(raw);
  if (!Number.isFinite(rupees) || rupees < 0) {
    return { paise: null, error: `${label} must be a valid, non-negative amount.` };
  }
  return { paise: Math.round(rupees * 100) };
}

function parseOptionalPastOrTodayDate(raw: string, label: string): { date: Date | null; error?: string } {
  if (!raw) return { date: null };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { date: null, error: `${label} isn't a valid date.` };
  }
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (date.getTime() > endOfToday.getTime()) {
    return { date: null, error: `${label} can't be in the future.` };
  }
  return { date };
}


// Student login codes used to be sequential (STU-000001, STU-000002, …) —
// predictable and enumerable, which is exactly what a login identifier
// shouldn't be (per the user's explicit "students id ka unique code acha
// raho random"). Random, Crockford-Base32, same alphabet/generator as the
// certificate code's random segment (src/lib/certificate-code.ts) for
// consistency. 8 characters is ~1.1 trillion combinations — collisions are
// astronomically unlikely, but this still checks-and-retries rather than
// assuming, same spirit as guard() never trusting an assumption it can
// cheaply verify.
async function generateUniqueStudentCode(tenantId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `STU-${randomBase32(8)}`;
    const existing = await withTenant(tenantId, (tx) =>
      tx.student.findFirst({ where: { tenantId, studentCode: code } }),
    );
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique student code after 5 attempts");
}

export async function loginAdmin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim() || null;

  if (!email || !password) redirect("/admin/login?error=missing");

  // QA audit finding C2: no brute-force protection existed on this login
  // at all. Keyed by IP + the identifier being attempted, not either
  // alone — see rate-limit.ts's own comment for why.
  const rateLimitKey = `admin:${await getClientIp()}:${email}`;
  if (isRateLimited(rateLimitKey)) {
    logger.warn("admin.login_rate_limited", { email });
    redirect("/admin/login?error=rate_limited");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || user.status !== "ACTIVE") {
    // QA re-audit finding: run the same scrypt derivation an existing
    // account would trigger before redirecting, so "no such email" and
    // "wrong password" take the same amount of time — otherwise the
    // missing-account branch returns near-instantly while a real check
    // pays scrypt's deliberate cost, letting an attacker enumerate valid
    // admin emails purely from response timing. See password.ts.
    await verifyPasswordAgainstDummy(password);
    redirect("/admin/login?error=invalid");
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) redirect("/admin/login?error=invalid");

  // Multi-tenant login: find the user's ACTIVE non-student memberships.
  // A specific tenant can be preselected (tenant picker / slug URL); else
  // resolve automatically when there's exactly one eligible tenant.
  const memberships = await prisma.membership.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: { not: "STUDENT" },
    },
    include: { tenant: { select: { id: true, slug: true, name: true, status: true } } },
  });

  let membership = tenantSlug
    ? memberships.find((m) => m.tenant.slug === tenantSlug)
    : undefined;
  if (!membership && !tenantSlug) {
    const eligible = memberships.filter((m) => m.tenant.status === "APPROVED");
    if (eligible.length === 1) membership = eligible[0];
    else if (eligible.length > 1) {
      // Genuine choice — stash the verified email and show the picker.
      // The password is NOT stored; the picker re-verifies it per tenant.
      redirect(`/admin/login/pick?email=${encodeURIComponent(email)}`);
    }
  }

  if (!membership) {
    // Either no membership at all, or the tenant isn't approved yet.
    const pending = memberships.some((m) => m.tenant.status === "PENDING");
    redirect(pending ? "/admin/login?error=pending" : "/admin/login?error=invalid");
  }
  if (membership.tenant.status === "SUSPENDED") redirect("/admin/login?error=suspended");
  if (membership.tenant.status !== "APPROVED") redirect("/admin/login?error=pending");

  await createSessionCookie({
    kind: "admin",
    userId: user.id,
    tenantId: membership.tenant.id,
    membershipId: membership.id,
  });
  resetRateLimit(rateLimitKey);
  logger.info("admin.login", { userId: user.id, tenantId: membership.tenant.id });
  redirect("/admin/dashboard");
}

export async function logoutAdmin(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}

export interface RegisterStudentResult {
  studentCode: string;
  tempPassword: string;
  certificateCode: string;
}

export type RegisterStudentState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; data: RegisterStudentResult };

/**
 * Registers a student, creates their login account, and — per the user's
 * explicit instruction ("unique code ussi se direct generate ho jayega") —
 * issues the certificate immediately, in the same transaction. The temp
 * password is returned once, in-page (via useActionState — deliberately
 * NOT a redirect, so it never ends up in a URL/browser-history entry); it
 * is never stored in plaintext or logged.
 *
 * Signature matches React's useActionState convention (prevState first)
 * — bound from a client component, src/app/admin/students/new/form.tsx.
 */
export async function registerStudent(
  _prevState: RegisterStudentState,
  formData: FormData,
): Promise<RegisterStudentState> {
  const admin = await requireAdminSession();

  // QA audit finding A1: BRAND.domain is baked into every certificate's
  // verify URL and is unfixable after the fact — refuse to issue any new
  // certificate while it's still the placeholder, instead of silently
  // creating a permanently-wrong one.
  if (!isBrandDomainConfigured()) {
    return {
      status: "error",
      message:
        "Certificate issuance is disabled until the platform's domain is configured — contact your platform administrator.",
    };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const dobRaw = String(formData.get("dateOfBirth") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim() || null;
  const guardianName = String(formData.get("guardianName") ?? "").trim() || null;
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || null;
  const pincode = String(formData.get("pincode") ?? "").trim() || null;
  const courseName = String(formData.get("courseName") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim() || null;
  const mode = String(formData.get("mode") ?? "").trim() || null;
  const completionDateRaw = String(formData.get("completionDate") ?? "").trim();
  const registrationFeeRupees = String(formData.get("registrationFeeRupees") ?? "").trim();

  if (!fullName || !courseName) {
    return { status: "error", message: "Full name and course are required." };
  }
  if (email && !isValidEmail(email)) {
    return { status: "error", message: "That email address doesn't look valid." };
  }
  if (phone && !isValidIndianMobile(phone)) {
    return { status: "error", message: "Phone must be a valid 10-digit mobile number." };
  }

  // QA audit findings B4 + D4: validate every fee/date field up front,
  // before any row is created, rather than letting a NaN or future date
  // reach Prisma / the certificate PDF.
  const registrationFee = parseOptionalRupeesToPaise(registrationFeeRupees, "Registration fee");
  if (registrationFee.error) return { status: "error", message: registrationFee.error };
  const dob = parseOptionalPastOrTodayDate(dobRaw, "Date of birth");
  if (dob.error) return { status: "error", message: dob.error };
  const completion = parseOptionalPastOrTodayDate(completionDateRaw, "Completion date");
  if (completion.error) return { status: "error", message: completion.error };

  try {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: admin.tenantId } });
    const centre = await withTenant(admin.tenantId, (tx) =>
      tx.centre.findFirstOrThrow({ where: { tenantId: admin.tenantId, isPrimary: true } }),
    );

    // QA audit finding A6: pdf-lib's standard fonts can't render
    // non-WinAnsi characters (e.g. Devanagari) — check up front, at
    // registration time, rather than letting it crash the certificate
    // download later after the student/user rows already exist.
    const unsupportedFields = await findUnsupportedCertificateText({
      "Full name": fullName,
      Course: courseName,
      Institute: tenant.name,
      ...(grade ? { Grade: grade } : {}),
      ...(mode ? { Mode: mode } : {}),
    });
    if (unsupportedFields.length > 0) {
      return {
        status: "error",
        message: `Certificates can't print non-Latin characters yet — please re-enter ${unsupportedFields.join(" and ")} using standard English letters.`,
      };
    }

    const studentId = ulid();
    const userId = ulid();
    const certificateId = ulid();

    // Random, non-enumerable login code — scoped to the tenant, matches the
    // @@unique([tenantId, studentCode]) constraint. See
    // generateUniqueStudentCode's comment for why this isn't sequential.
    // Not `const`: QA audit finding B2 — the pre-check above and the actual
    // insert below aren't atomic, so a collision can still occur at insert
    // time; the retry loop regenerates this on a real student_code
    // collision rather than assuming the pre-check was sufficient.
    let studentCode = await generateUniqueStudentCode(admin.tenantId);

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const registrationFeePaise = registrationFee.paise;
    const completionDate = completion.date ?? new Date();

    // QA audit findings A4 + A5:
    //   A4 — User used to be created OUTSIDE the withTenant transaction
    //   that creates Student/Certificate, so a failure in that transaction
    //   left an orphaned, login-capable User row with no student behind
    //   it. Now all three inserts are one atomic transaction: all or
    //   nothing.
    //   A5 — certificateCode had no collision handling, unlike
    //   studentCode two lines above. A fresh code is generated and the
    //   whole transaction retried on a Certificate.code unique-constraint
    //   violation, bounded to a few attempts (collisions are astronomically
    //   unlikely at 10 random Crockford-Base32 characters, but "rely on
    //   the DB constraint and crash" isn't a real handling strategy).
    //   B2 — same retry now also covers a student_code collision (the
    //   pre-check above isn't atomic with this insert), and a duplicate
    //   email is treated as a distinct, non-retryable validation error
    //   rather than silently retried with the same email forever. See
    //   isUniqueConstraintViolation's doc-comment for why the substrings
    //   below must be specific ("code" alone matches both code columns).
    //   C5 — the audit row is written in the SAME transaction as the
    //   three inserts it records, so it can never exist without them (or
    //   vice versa).
    const MAX_CERTIFICATE_CODE_ATTEMPTS = 5;
    let certificateCode = "";
    let registered = false;
    for (let attempt = 1; attempt <= MAX_CERTIFICATE_CODE_ATTEMPTS; attempt++) {
      certificateCode = generateCertificateCode(tenant.prefix ?? "CERT");
      try {
        await withTenant(admin.tenantId, async (tx) => {
          await tx.user.create({
            data: {
              id: userId,
              email: email ?? `${studentCode.toLowerCase()}@${tenant.slug}.local`,
              name: fullName,
              passwordHash,
              status: "ACTIVE",
            },
          });

          await tx.student.create({
            data: {
              id: studentId,
              tenantId: admin.tenantId,
              centreId: centre.id,
              userId,
              studentCode,
              fullName,
              email,
              phone,
              dateOfBirth: dob.date,
              gender,
              guardianName,
              addressLine1,
              city,
              state,
              pincode,
              registrationFeePaise,
              createdBy: admin.userId,
            },
          });

          await tx.certificate.create({
            data: {
              id: certificateId,
              tenantId: admin.tenantId,
              studentId,
              code: certificateCode,
              status: "ACTIVE",
              studentNameSnapshot: fullName,
              instituteNameSnapshot: tenant.name,
              courseNameSnapshot: courseName,
              completionDate,
              grade,
              mode,
              createdBy: admin.userId,
            },
          });

          await writeAuditLog(tx, {
            tenantId: admin.tenantId,
            actorId: admin.userId,
            action: "student.register",
            targetType: "student",
            targetId: studentId,
            after: { studentCode, fullName, courseName, certificateId, certificateCode },
          });
        });
        registered = true;
        break; // success — stop retrying
      } catch (err) {
        const isLastAttempt = attempt === MAX_CERTIFICATE_CODE_ATTEMPTS;
        if (isUniqueConstraintViolation(err, "email")) {
          // Not retryable — retrying with the same email would just fail
          // again forever. Distinguished from the two code collisions
          // below, which regenerate a fresh random value and retry.
          return {
            status: "error",
            message: "That email address is already registered to another student.",
          };
        }
        if (isUniqueConstraintViolation(err, "certificate_code") && !isLastAttempt) {
          continue; // certificate code collision — the whole transaction rolled back, retry with a new code
        }
        if (isUniqueConstraintViolation(err, "student_code") && !isLastAttempt) {
          studentCode = await generateUniqueStudentCode(admin.tenantId); // student code collision — regenerate before retrying
          continue;
        }
        throw err;
      }
    }
    if (!registered) {
      throw new Error("Could not register student after exhausting code-collision retry attempts");
    }

    logger.info("student.register", {
      tenantId: admin.tenantId,
      studentId,
      certificateId,
      actorUserId: admin.userId,
    });

    return { status: "success", data: { studentCode, tempPassword, certificateCode } };
  } catch (err) {
    logger.error("student.register_failed", {
      tenantId: admin.tenantId,
      actorUserId: admin.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      status: "error",
      message: "Something went wrong while registering the student. Please try again.",
    };
  }
}

export interface ResetPasswordResult {
  tempPassword: string;
}

export type ResetPasswordState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; data: ResetPasswordResult };

/**
 * Issues a fresh temporary password for a student and returns it once —
 * same shape/spirit as registerStudent's tempPassword: passwords are
 * scrypt-hashed (src/server/auth/password.ts) and never stored or logged
 * in plaintext, so there is no "current password" to look up and show an
 * admin later. What an admin CAN do — and what was missing — is reset it
 * to a brand-new one, on demand, whenever a student forgets theirs. Bound
 * from a client component the same way registerStudent is (useActionState),
 * so the new password stays off any URL/browser-history entry.
 */
export async function resetStudentPassword(
  studentId: string,
  _prevState: ResetPasswordState,
): Promise<ResetPasswordState> {
  const admin = await requireAdminSession();

  try {
    const student = await withTenant(admin.tenantId, (tx) =>
      tx.student.findFirst({ where: { id: studentId, tenantId: admin.tenantId, deletedAt: null } }),
    );
    if (!student || !student.userId) {
      return { status: "error", message: "Student not found." };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    // QA audit finding C5: this update used the top-level `prisma` client
    // directly (bypassing withTenant/RLS entirely, relying only on the
    // find-first above for tenant scoping) and left no audit trail. Now
    // scoped through withTenant and paired with an audit row in the same
    // transaction.
    await withTenant(admin.tenantId, async (tx) => {
      await tx.user.update({ where: { id: student.userId! }, data: { passwordHash } });
      await writeAuditLog(tx, {
        tenantId: admin.tenantId,
        actorId: admin.userId,
        action: "student.password_reset",
        targetType: "student",
        targetId: studentId,
      });
    });

    logger.info("student.password_reset", {
      tenantId: admin.tenantId,
      studentId,
      actorUserId: admin.userId,
    });

    return { status: "success", data: { tempPassword } };
  } catch (err) {
    logger.error("student.password_reset_failed", {
      tenantId: admin.tenantId,
      studentId,
      actorUserId: admin.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "error", message: "Couldn't reset the password. Please try again." };
  }
}

export async function markRegistrationFeePaid(studentId: string): Promise<void> {
  const admin = await requireAdminSession();
  // QA audit finding C6: `update({ where: { id } })` targets a row by its
  // global id alone — it relies entirely on RLS to keep an admin from
  // touching another tenant's student, with no explicit tenant check and
  // no way to notice if RLS were ever misconfigured. `updateMany` with an
  // explicit tenantId filter is defense in depth: it can only ever affect
  // this tenant's row, and a `count === 0` result (wrong tenant, or the
  // student no longer exists) is now something the code can actually see
  // instead of assuming a bare `update` always found a row.
  const updated = await withTenant(admin.tenantId, async (tx) => {
    const result = await tx.student.updateMany({
      where: { id: studentId, tenantId: admin.tenantId, deletedAt: null },
      data: { registrationFeePaid: true, registrationFeePaidAt: new Date() },
    });
    if (result.count > 0) {
      await writeAuditLog(tx, {
        tenantId: admin.tenantId,
        actorId: admin.userId,
        action: "student.registration_fee_paid",
        targetType: "student",
        targetId: studentId,
      });
    }
    return result.count;
  });
  if (updated === 0) {
    logger.warn("student.registration_fee_paid_not_found", {
      tenantId: admin.tenantId,
      studentId,
      actorUserId: admin.userId,
    });
    redirect(`/admin/students/${studentId}?error=not_found`);
  }
  logger.info("student.registration_fee_paid", { tenantId: admin.tenantId, studentId, actorUserId: admin.userId });
  redirect(`/admin/students/${studentId}`);
}

export type UpdateBrandingState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

/**
 * A parsed <input type="file"> entry, or null if the admin didn't choose
 * a new file for that field. An unselected file input still shows up in
 * FormData as a zero-byte File — that must mean "leave this unchanged",
 * never "replace it with nothing", since there is no way for a browser
 * form to submit "please delete the existing logo" through this field.
 */
async function readOptionalUploadedFile(
  entry: FormDataEntryValue | null,
): Promise<{ name: string; mimeType: string; bytes: Buffer } | null> {
  if (!(entry instanceof File) || entry.size === 0) return null;
  return { name: entry.name, mimeType: entry.type, bytes: Buffer.from(await entry.arrayBuffer()) };
}

/**
 * Updates the institute's certificate branding: logo, tagline, and the
 * two signatures generateCertificatePdf draws (Centre Head, Authority) —
 * see that file's header comment for why these are read LIVE from
 * Tenant/Centre rather than snapshotted per-certificate. Per the user's
 * explicit instruction, a signature is normally captured once (at
 * institute/centre setup) but can be replaced here any time afterwards —
 * this single action covers both the first upload and every later change.
 *
 * All three images are optional and independent: an admin can update just
 * the tagline without touching either signature, or replace only one
 * signature. Uses the same "point the FK at the new file, THEN delete the
 * old one" ordering local-disk.ts's deleteFile doc-comment calls for,
 * since the FK is ON DELETE NO ACTION — deleting the old file first would
 * fail with a foreign-key violation while the tenant/centre row still
 * pointed at it.
 */
export async function updateBranding(
  _prevState: UpdateBrandingState,
  formData: FormData,
): Promise<UpdateBrandingState> {
  const admin = await requireAdminSession();

  const tagline = String(formData.get("tagline") ?? "").trim() || null;
  const motto = String(formData.get("motto") ?? "").trim() || null;
  const establishedYearRaw = String(formData.get("establishedYear") ?? "").trim();
  const authorityName = String(formData.get("authorityName") ?? "").trim() || null;
  const centreHeadName = String(formData.get("centreHeadName") ?? "").trim() || null;

  let establishedYear: number | null = null;
  if (establishedYearRaw) {
    const y = Number(establishedYearRaw);
    if (!Number.isInteger(y) || y < 1900 || y > 2100) {
      return { status: "error", message: "Established year must be between 1900 and 2100." };
    }
    establishedYear = y;
  }

  try {
    const logo = await readOptionalUploadedFile(formData.get("logo"));
    const campusPhoto = await readOptionalUploadedFile(formData.get("campusPhoto"));
    const authoritySignature = await readOptionalUploadedFile(formData.get("authoritySignature"));
    const centreHeadSignature = await readOptionalUploadedFile(formData.get("centreHeadSignature"));

    await withTenant(admin.tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: admin.tenantId } });
      const centre = await tx.centre.findFirstOrThrow({
        where: { tenantId: admin.tenantId, isPrimary: true },
      });

      // Unchecked inputs: we set raw FK ids (logoFileId etc.) for FileObject
      // rows created just above in this same transaction — the checked
      // inputs only expose the relation objects, not the scalar FK fields.
      const tenantData: Prisma.TenantUncheckedUpdateInput = {
        tagline, motto, establishedYear, authorizedPerson: authorityName,
      };
      const centreData: Prisma.CentreUncheckedUpdateInput = { headName: centreHeadName };

      let oldLogoFileId: string | null = null;
      let oldCampusPhotoFileId: string | null = null;
      let oldAuthoritySignatureFileId: string | null = null;
      let oldHeadSignatureFileId: string | null = null;

      if (logo) {
        const saved = await saveUploadedImage(tx, {
          tenantId: admin.tenantId,
          purpose: "TENANT_LOGO",
          uploadedBy: admin.userId,
          originalName: logo.name,
          mimeType: logo.mimeType,
          bytes: logo.bytes,
        });
        tenantData.logoFileId = saved.fileId;
        oldLogoFileId = tenant.logoFileId;
      }
      if (campusPhoto) {
        const saved = await saveUploadedImage(tx, {
          tenantId: admin.tenantId,
          purpose: "TENANT_LOGO",
          uploadedBy: admin.userId,
          originalName: campusPhoto.name,
          mimeType: campusPhoto.mimeType,
          bytes: campusPhoto.bytes,
        });
        tenantData.campusPhotoFileId = saved.fileId;
        oldCampusPhotoFileId = tenant.campusPhotoFileId;
      }
      if (authoritySignature) {
        const saved = await saveUploadedImage(tx, {
          tenantId: admin.tenantId,
          purpose: "SIGNATURE",
          uploadedBy: admin.userId,
          originalName: authoritySignature.name,
          mimeType: authoritySignature.mimeType,
          bytes: authoritySignature.bytes,
        });
        tenantData.authoritySignatureFileId = saved.fileId;
        oldAuthoritySignatureFileId = tenant.authoritySignatureFileId;
      }
      if (centreHeadSignature) {
        const saved = await saveUploadedImage(tx, {
          tenantId: admin.tenantId,
          purpose: "SIGNATURE",
          uploadedBy: admin.userId,
          originalName: centreHeadSignature.name,
          mimeType: centreHeadSignature.mimeType,
          bytes: centreHeadSignature.bytes,
        });
        centreData.headSignatureFileId = saved.fileId;
        oldHeadSignatureFileId = centre.headSignatureFileId;
      }

      await tx.tenant.update({ where: { id: admin.tenantId }, data: tenantData });
      await tx.centre.update({ where: { id: centre.id }, data: centreData });

      if (oldLogoFileId) await deleteFile(tx, oldLogoFileId, admin.tenantId);
      if (oldCampusPhotoFileId) await deleteFile(tx, oldCampusPhotoFileId, admin.tenantId);
      if (oldAuthoritySignatureFileId) await deleteFile(tx, oldAuthoritySignatureFileId, admin.tenantId);
      if (oldHeadSignatureFileId) await deleteFile(tx, oldHeadSignatureFileId, admin.tenantId);

      await writeAuditLog(tx, {
        tenantId: admin.tenantId,
        actorId: admin.userId,
        action: "branding.update",
        targetType: "tenant",
        targetId: admin.tenantId,
      });
    });

    logger.info("branding.update", { tenantId: admin.tenantId, actorUserId: admin.userId });
    return { status: "success" };
  } catch (err) {
    if (err instanceof InvalidImageUploadError) {
      return { status: "error", message: err.message };
    }
    logger.error("branding.update_failed", {
      tenantId: admin.tenantId,
      actorUserId: admin.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "error", message: "Couldn't save your changes. Please try again." };
  }
}

const BULK_COLUMNS = [
  "Full name", "Course", "Email", "Phone", "Date of birth", "Gender",
  "Guardian name", "Address line 1", "City", "State", "Pincode",
  "Completion date", "Grade", "Mode",
  "Registration fee (INR)", "Certificate fee (INR)",
] as const;

export interface BulkRowResult {
  rowNumber: number;
  ok: boolean;
  errors: string[];
  studentCode?: string;
  tempPassword?: string;
  certificateCode?: string;
  fullName?: string;
}

export type BulkRegisterState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; results: BulkRowResult[] };

/** Minimal CSV parser: quoted cells, embedded commas/quotes, BOM-tolerant. */
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  const t = text.replace(/^\ufeff/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++; }
        else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  row.push(cell); rows.push(row);
  return rows.filter((r) => r.length > 1 || (r[0] ?? "").trim() !== "");
}

/**
 * Bulk student registration from CSV text — the server-side counterpart of
 * the demo's bulk flow. Parses, validates every row with the same rules as
 * registerStudent, and creates all valid rows (each with its own
 * certificate) — invalid rows are reported, never silently skipped.
 * Bounded at 500 rows per upload to keep the request sane.
 */
export async function bulkRegisterStudents(
  _prevState: BulkRegisterState,
  formData: FormData,
): Promise<BulkRegisterState> {
  const admin = await requireAdminSession();

  if (!isBrandDomainConfigured()) {
    return {
      status: "error",
      message: "Certificate issuance is disabled until the platform's domain is configured — contact your platform administrator.",
    };
  }

  const csvText = String(formData.get("csvText") ?? "");
  if (!csvText.trim()) {
    return { status: "error", message: "No CSV content received." };
  }

  const grid = parseCsvText(csvText);
  if (grid.length < 2) {
    return { status: "error", message: "That file looks empty — download the template first." };
  }
  const header = (grid[0] ?? []).map((h) => h.trim());
  const missing = BULK_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return { status: "error", message: `Missing columns: ${missing.join(", ")}` };
  }
  const dataRows = grid.slice(1);
  if (dataRows.length > 500) {
    return { status: "error", message: "Maximum 500 rows per upload — split larger files." };
  }
  const idx: Record<string, number> = {};
  BULK_COLUMNS.forEach((c) => { idx[c] = header.indexOf(c); });

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: admin.tenantId } });
  const centre = await withTenant(admin.tenantId, (tx) =>
    tx.centre.findFirstOrThrow({ where: { tenantId: admin.tenantId, isPrimary: true } }),
  );

  const results: BulkRowResult[] = [];

  for (let ri = 0; ri < dataRows.length; ri++) {
    const cells = dataRows[ri] ?? [];
    const raw: Record<string, string> = {};
    BULK_COLUMNS.forEach((c) => { raw[c] = (cells[idx[c] ?? -1] ?? "").trim(); });
    // Safe getter — raw is fully populated above, but noUncheckedIndexedAccess
    // still types index access as string|undefined.
    const v = (k: string): string => raw[k] ?? "";
    const rowNumber = ri + 2; // 1-based incl. header
    const errors: string[] = [];

    const fullName = v("Full name");
    const courseName = v("Course");
    const email = v("Email").toLowerCase() || null;
    const phone = v("Phone") || null;
    const grade = v("Grade") || null;
    const mode = v("Mode") || null;

    if (!fullName) errors.push("Full name required");
    if (!courseName) errors.push("Course required");
    if (email && !isValidEmail(email)) errors.push("Invalid email");
    if (phone && !isValidIndianMobile(phone)) errors.push("Phone must be a 10-digit Indian mobile");

    const dob = parseOptionalPastOrTodayDate(v("Date of birth"), "Date of birth");
    if (dob.error) errors.push(dob.error);
    const completion = parseOptionalPastOrTodayDate(v("Completion date"), "Completion date");
    if (completion.error) errors.push(completion.error);
    const regFee = parseOptionalRupeesToPaise(v("Registration fee (INR)"), "Registration fee");
    if (regFee.error) errors.push(regFee.error);

    if (fullName && courseName) {
      const unsupported = await findUnsupportedCertificateText({
        "Full name": fullName,
        Course: courseName,
        Institute: tenant.name,
        ...(grade ? { Grade: grade } : {}),
        ...(mode ? { Mode: mode } : {}),
      });
      if (unsupported.length > 0) errors.push(`Non-Latin characters in ${unsupported.join(" and ")}`);
    }

    // Duplicate email check (within this file + DB)
    if (email) {
      const dupInFile = dataRows.slice(0, ri).some((r) => ((r ?? [])[idx["Email"] ?? -1] ?? "").trim().toLowerCase() === email);
      if (dupInFile) errors.push("Duplicate email in this file");
      else {
        const dupInDb = await withTenant(admin.tenantId, (tx) =>
          tx.student.findFirst({ where: { tenantId: admin.tenantId, email } }),
        );
        if (dupInDb) errors.push("Email already registered");
      }
    }

    if (errors.length > 0) {
      results.push({ rowNumber, ok: false, errors, fullName: fullName || undefined });
      continue;
    }

    // Create student + user + certificate (same shape as registerStudent)
    try {
      const studentId = ulid();
      const userId = ulid();
      const certificateId = ulid();
      const studentCode = await generateUniqueStudentCode(admin.tenantId);
      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);
      const certificateCode = generateCertificateCode(tenant.prefix ?? "CERT");
      const completionDate = completion.date ?? new Date();

      await withTenant(admin.tenantId, async (tx) => {
        await tx.user.create({
          data: {
            id: userId,
            email: email ?? `${studentCode.toLowerCase()}@${tenant.slug}.local`,
            name: fullName,
            passwordHash,
            status: "ACTIVE",
          },
        });
        await tx.student.create({
          data: {
            id: studentId,
            tenantId: admin.tenantId,
            centreId: centre.id,
            userId,
            studentCode,
            fullName,
            email,
            phone,
            dateOfBirth: dob.date,
            gender: v("Gender") || null,
            guardianName: v("Guardian name") || null,
            addressLine1: v("Address line 1") || null,
            city: v("City") || null,
            state: v("State") || null,
            pincode: v("Pincode") || null,
            registrationFeePaise: regFee.paise,
            createdBy: admin.userId,
          },
        });
        await tx.certificate.create({
          data: {
            id: certificateId,
            tenantId: admin.tenantId,
            studentId,
            code: certificateCode,
            status: "ACTIVE",
            studentNameSnapshot: fullName,
            instituteNameSnapshot: tenant.name,
            courseNameSnapshot: courseName,
            completionDate,
            issuedAt: new Date(),
            grade,
            mode,
            createdBy: admin.userId,
          },
        });
        await writeAuditLog(tx, {
          tenantId: admin.tenantId,
          actorId: admin.userId,
          action: "student.bulk_registered",
          targetType: "student",
          targetId: studentId,
        });
      });

      results.push({
        rowNumber, ok: true, errors: [],
        studentCode, tempPassword, certificateCode, fullName,
      });
    } catch (err) {
      logger.warn("admin.bulk_register_row_failed", { rowNumber, error: String(err) });
      results.push({ rowNumber, ok: false, errors: ["Couldn't create this row — try again"], fullName });
    }
  }

  logger.info("admin.bulk_register", {
    tenantId: admin.tenantId,
    total: results.length,
    ok: results.filter((r) => r.ok).length,
  });
  return { status: "success", results };
}
