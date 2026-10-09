// src/app/institute/actions.ts
//
// Public institute self-registration — the missing Step 1 of the user's
// flow ("koi v institute ya coaching registration krega"). Creates a
// Tenant in PENDING status plus the owner's User + OWNER Membership in one
// atomic transaction. A Super Admin approves it (src/app/super-admin/)
// before the admin login opens — loginAdmin gates on tenant.status.
//
// The demo (demo/certivo-demo.html) already had this flow; this is the
// real-app implementation against Prisma/RLS.
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { isRateLimited, getClientIp } from "@/server/auth/rate-limit";
import { isValidEmail, isValidIndianMobile } from "@/lib/validation";
import { ulid } from "@/lib/ulid";
import {
  generateUniqueReferralCode,
  normalizeReferralCode,
} from "@/server/referrals/code";

const TERMS_VERSION = "v1";

/** URL-safe slug from the institute name, suffixed until unique. */
async function generateUniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "institute";
  let slug = base;
  let n = 2;
  // Bounded: 100 tries is far beyond any realistic collision chain.
  while (n <= 100) {
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${n}`;
    n++;
  }
  // Fallback: timestamp suffix is practically unique.
  return `${base}-${Date.now().toString(36)}`;
}

export type RegisterInstituteState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; instituteName: string; slug: string };

export async function registerInstitute(
  _prevState: RegisterInstituteState,
  formData: FormData,
): Promise<RegisterInstituteState> {
  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const ownerPhone = String(formData.get("ownerPhone") ?? "").trim();
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const termsAccepted = formData.get("termsAccepted") === "on";

  if (!name || !ownerName || !ownerEmail || !ownerPhone || !addressLine1 || !city || !state || !pincode || !password) {
    return { status: "error", message: "All fields are required." };
  }
  if (!isValidEmail(ownerEmail)) {
    return { status: "error", message: "That email address doesn't look valid." };
  }
  if (!isValidIndianMobile(ownerPhone)) {
    return { status: "error", message: "Phone must be a valid 10-digit mobile number." };
  }
  if (!/^\d{6}$/.test(pincode)) {
    return { status: "error", message: "Pincode must be a 6-digit number." };
  }
  if (password.length < 8) {
    return { status: "error", message: "Password must be at least 8 characters." };
  }
  if (!termsAccepted) {
    return { status: "error", message: "Please accept the Terms of Service and Privacy Policy to continue." };
  }

  // Rate-limit by IP — public form, abuse target.
  const rateLimitKey = `institute-register:${await getClientIp()}`;
  if (await isRateLimited(rateLimitKey)) {
    return { status: "error", message: "Too many registration attempts. Please wait a few minutes and try again." };
  }

  // Owner email must be unique across the platform (User.email is @unique).
  const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingUser) {
    return { status: "error", message: "An account with this email already exists. Try signing in instead." };
  }

  const slug = await generateUniqueSlug(name);
  const passwordHash = await hashPassword(password);
  const tenantId = ulid();
  const userId = ulid();
  const membershipId = ulid();
  // Every tenant needs a primary centre for certificate issuance
  // (registerStudent requires one) — create it at registration time.
  const centreId = ulid();

  // Referral: link to the referring institute if a valid code was supplied.
  // Invalid/unknown codes are ignored silently — never block registration.
  const rawRef = normalizeReferralCode(String(formData.get("referralCode") ?? ""));
  let referredByTenantId: string | null = null;
  if (rawRef) {
    const referrer = await prisma.tenant.findUnique({
      where: { referralCode: rawRef },
      select: { id: true },
    });
    // Can't refer yourself (different email, but be safe) — and the
    // referrer must be a real tenant.
    if (referrer && referrer.id !== tenantId) referredByTenantId = referrer.id;
  }
  const referralCode = await generateUniqueReferralCode();

  await prisma.$transaction(async (tx) => {
    await tx.tenant.create({
      data: {
        id: tenantId,
        slug,
        name,
        type: "ACADEMY",
        status: "PENDING",
        ownerName,
        ownerEmail,
        ownerPhone,
        addressLine1,
        city,
        state,
        pincode,
        country: "IN",
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
        referralCode,
        referredByTenantId,
      },
    });
    await tx.user.create({
      data: {
        id: userId,
        email: ownerEmail,
        name: ownerName,
        phone: ownerPhone,
        passwordHash,
      },
    });
    await tx.membership.create({
      data: {
        id: membershipId,
        userId,
        tenantId,
        role: "OWNER",
        status: "ACTIVE",
      },
    });
    await tx.centre.create({
      data: {
        id: centreId,
        tenantId,
        code: "MAIN",
        name: "Main Centre",
        isPrimary: true,
      },
    });
  });

  return { status: "success", instituteName: name, slug };
}

export async function redirectAfterRegistration(): Promise<void> {
  redirect("/institute/register?registered=1");
}
