import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { ulid } from "@/lib/ulid";
import { logger } from "@/lib/logger";

// POST /api/setup/admin — one-time production setup: creates the first
// super admin. Protected by SETUP_SECRET (a long random string in env).
// Body: { secret, email, name?, password }
// Refuses if a super admin already exists (one-time use).
export async function POST(req: Request): Promise<NextResponse> {
  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json({ error: "SETUP_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    secret?: string;
    email?: string;
    name?: string;
    password?: string;
  } | null;

  if (!body?.secret || body.secret !== setupSecret) {
    logger.warn("setup.unauthorized_admin_attempt");
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !email.includes("@") || password.length < 8) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const existingAdmin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (existingAdmin) {
    return NextResponse.json({ error: "ALREADY_EXISTS" }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      id: ulid(),
      email,
      name: body.name?.trim().slice(0, 100) || "Super Admin",
      passwordHash: await hashPassword(password),
      isSuperAdmin: true,
      status: "ACTIVE",
    },
  });

  logger.info("setup.super_admin_created", { email });
  // Recommend removing SETUP_SECRET after this one-time use.
  return NextResponse.json({ ok: true, email: user.email });
}
