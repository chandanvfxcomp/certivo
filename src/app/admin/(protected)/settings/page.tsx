// src/app/admin/(protected)/settings/page.tsx
//
// Institute branding settings — logo, tagline, and the two signatures
// generated certificates show (Centre Head, Authority). Per the user's
// explicit instruction, these are normally set once (at institute/centre
// setup) but can be changed here at any time afterwards; every
// certificate generated after a change picks it up immediately since
// branding is read live, never snapshotted (see
// src/server/certificates/generate-pdf.ts's header comment).
import { getSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { getFileBytes } from "@/server/storage/local-disk";
import { BrandingForm } from "./form";

function toDataUrl(file: { bytes: Buffer; mimeType: string } | null): string | null {
  if (!file) return null;
  return `data:${file.mimeType};base64,${file.bytes.toString("base64")}`;
}

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session || session.kind !== "admin") return null; // layout already guards this

  const { tenant, centre, logoDataUrl, authoritySignatureDataUrl, centreHeadSignatureDataUrl, campusPhotoDataUrl } =
    await withTenant(session.tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: session.tenantId } });
      const centre = await tx.centre.findFirstOrThrow({
        where: { tenantId: session.tenantId, isPrimary: true },
      });

      const [logo, authoritySignature, centreHeadSignature, campusPhoto] = await Promise.all([
        tenant.logoFileId ? getFileBytes(tx, tenant.logoFileId, session.tenantId) : null,
        tenant.authoritySignatureFileId
          ? getFileBytes(tx, tenant.authoritySignatureFileId, session.tenantId)
          : null,
        centre.headSignatureFileId
          ? getFileBytes(tx, centre.headSignatureFileId, session.tenantId)
          : null,
        tenant.campusPhotoFileId
          ? getFileBytes(tx, tenant.campusPhotoFileId, session.tenantId)
          : null,
      ]);

      return {
        tenant,
        centre,
        logoDataUrl: toDataUrl(logo),
        authoritySignatureDataUrl: toDataUrl(authoritySignature),
        centreHeadSignatureDataUrl: toDataUrl(centreHeadSignature),
        campusPhotoDataUrl: toDataUrl(campusPhoto),
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Certificate branding</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Shown on every certificate this institute generates — logo, tagline, and the two
          signatures. Changes apply immediately to new downloads; past certificates on file
          elsewhere are unaffected.
        </p>
      </div>
      <BrandingForm
        tagline={tenant.tagline ?? ""}
        motto={tenant.motto ?? ""}
        establishedYear={tenant.establishedYear ?? null}
        authorityName={tenant.authorizedPerson ?? ""}
        centreHeadName={centre.headName ?? ""}
        registrationFeeRupees={Math.round((tenant.registrationFeePaise ?? 0) / 100)}
        logoDataUrl={logoDataUrl}
        campusPhotoDataUrl={campusPhotoDataUrl}
        authoritySignatureDataUrl={authoritySignatureDataUrl}
        centreHeadSignatureDataUrl={centreHeadSignatureDataUrl}
      />
    </div>
  );
}
