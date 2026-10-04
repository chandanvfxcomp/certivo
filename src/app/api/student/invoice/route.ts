import { NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { renderInvoicePdf } from "@/server/invoices/service";

// GET /api/student/invoice
// Serves the signed-in student's registration fee invoice as a PDF.
// Scoped to the student's own invoice via session — no id parameter.
export async function GET(): Promise<NextResponse> {
  let session;
  try {
    session = await requireStudentSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const student = await withTenant(session.tenantId, (tx) =>
    tx.student.findFirst({
      where: { id: session.studentId, tenantId: session.tenantId, deletedAt: null },
      select: { invoiceNumber: true },
    }),
  );
  if (!student?.invoiceNumber) {
    return NextResponse.json({ error: "NO_INVOICE" }, { status: 404 });
  }

  const pdf = await renderInvoicePdf(session.tenantId, student.invoiceNumber);
  if (!pdf) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${student.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
