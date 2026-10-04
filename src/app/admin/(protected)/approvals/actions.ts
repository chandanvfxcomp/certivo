"use server";

// src/app/admin/(protected)/approvals/actions.ts
//
// Approves a student's registration: sets approvedAt/approvedById, which
// activates their certificate download, and emails them.
import { getSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { prisma } from "@/server/db/client";
import { sendEmail } from "@/server/email/client";
import { registrationApprovedEmail } from "@/server/email/templates";
import { writeAuditLog } from "@/server/audit/log";
import { revalidatePath } from "next/cache";

export async function approveRegistration(studentId: string): Promise<void> {
  const session = await getSession();
  if (!session || session.kind !== "admin") throw new Error("UNAUTHENTICATED");

  const student = await withTenant(session.tenantId, (tx) =>
    tx.student.findFirst({
      where: { id: studentId, tenantId: session.tenantId, deletedAt: null },
      select: { id: true, fullName: true, email: true, approvedAt: true, registrationFeePaid: true },
    }),
  );
  if (!student) throw new Error("NOT_FOUND");
  if (student.approvedAt) return; // idempotent

  await withTenant(session.tenantId, async (tx) => {
    await tx.student.update({
      where: { id: studentId },
      data: { approvedAt: new Date(), approvedById: session.userId },
    });
    await writeAuditLog(tx, {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "student.registration_approved",
      targetType: "student",
      targetId: studentId,
    });
  });

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: session.tenantId },
    select: { name: true },
  });

  if (student.email) {
    const template = registrationApprovedEmail({
      studentName: student.fullName,
      instituteName: tenant.name,
    });
    await sendEmail({ to: student.email, ...template });
  }

  revalidatePath("/admin/approvals");
}
