// src/app/api/admin/templates/preview/[id]/route.ts
//
// GET — watermarked sample PDF for any template (locked or not).
// Lets institutes see the full design before unlocking; the PREVIEW
// watermark makes it unusable as a real certificate.
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { generateCertificatePdf } from "@/server/certificates/generate-pdf";
import { isTemplateId } from "@/server/certificates/templates/registry";
import { buildCertificatePdfInput, sampleBrandingFacts } from "@/server/certificates/branding";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!isTemplateId(id)) {
    return NextResponse.json({ error: "UNKNOWN_TEMPLATE" }, { status: 404 });
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId } });
  const input = await buildCertificatePdfInput(session.tenantId, sampleBrandingFacts(tenant.name));
  const pdfBytes = await generateCertificatePdf(input, { templateId: id, watermark: true });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="template-preview-${id}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
