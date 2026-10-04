// src/server/invoices/service.ts
//
// Invoice issuance for student registration fees. Invoice numbers are
// per-tenant sequences: INV-<TENANT PREFIX>-<zero-padded seq>, e.g.
// INV-CRTV-0007. The sequence row is incremented atomically inside the
// same withTenant transaction as the invoice insert, so concurrent
// payments can never reuse a number.
import { withTenant } from "@/server/db/tenant-client";
import { prisma } from "@/server/db/client";
import { ulid } from "@/lib/ulid";
import { generateInvoicePdf, type InvoicePdfInput } from "./generate-invoice";

export interface IssueInvoiceInput {
  tenantId: string;
  studentId: string;
  amountPaise: number;
  paymentRef: string;
  studentName: string;
  studentEmail?: string | null;
  studentCode: string;
  instituteName: string;
  instituteAddress?: string | null;
}

/**
 * Atomically allocates the next invoice number for a tenant and creates
 * the Invoice row. Returns the invoice number and the row id.
 */
export async function issueInvoice(input: IssueInvoiceInput): Promise<{ invoiceNumber: string; invoiceId: string }> {
  return withTenant(input.tenantId, async (tx) => {
    // Atomic increment-or-create of the per-tenant counter.
    const seq = await tx.invoiceSequence.upsert({
      where: { tenantId: input.tenantId },
      create: { tenantId: input.tenantId, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });

    // Tenant prefix for the human-readable number (fallback: first 4 of id).
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: input.tenantId },
      select: { prefix: true, slug: true },
    });
    const code = (tenant.prefix ?? tenant.slug ?? input.tenantId.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "GEN";
    const invoiceNumber = `INV-${code}-${String(seq.lastNumber).padStart(4, "0")}`;

    const invoice = await tx.invoice.create({
      data: {
        id: ulid(),
        invoiceNumber,
        tenantId: input.tenantId,
        studentId: input.studentId,
        amountPaise: input.amountPaise,
        status: "PAID",
        paymentRef: input.paymentRef,
      },
    });
    return { invoiceNumber, invoiceId: invoice.id };
  });
}

/** Renders the invoice PDF for an already-issued invoice. */
export async function renderInvoicePdf(tenantId: string, invoiceNumber: string): Promise<Buffer | null> {
  const invoice = await withTenant(tenantId, (tx) =>
    tx.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        student: { select: { fullName: true, email: true, studentCode: true } },
        tenant: {
          select: {
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            pincode: true,
          },
        },
      },
    }),
  );
  if (!invoice) return null;
  const pdfInput: InvoicePdfInput = {
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: invoice.createdAt,
    studentName: invoice.student.fullName,
    studentEmail: invoice.student.email,
    studentCode: invoice.student.studentCode,
    instituteName: invoice.tenant.name,
    instituteAddress: [invoice.tenant.addressLine1, invoice.tenant.city, invoice.tenant.state, invoice.tenant.pincode]
      .filter(Boolean)
      .join(", "),
    amountPaise: invoice.amountPaise,
    paymentRef: invoice.paymentRef ?? "—",
  };
  return generateInvoicePdf(pdfInput);
}

/** Reads tenant via the platform-level (non-RLS) client for fee config. */
export async function getTenantFeeConfig(tenantId: string): Promise<{ registrationFeePaise: number; name: string }> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { registrationFeePaise: true, name: true },
  });
  return { registrationFeePaise: tenant.registrationFeePaise, name: tenant.name };
}
