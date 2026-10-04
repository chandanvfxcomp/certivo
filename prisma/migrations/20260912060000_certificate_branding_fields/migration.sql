-- Adds the fields the redesigned certificate PDF needs beyond what
-- already existed (Tenant.logoFileId, Centre.headName): a signature
-- image for the Centre Head, a signature image + name for the
-- institute's top "Authority" signer, and an optional marketing tagline
-- shown under the institute name/logo. All nullable — a tenant/centre
-- that hasn't uploaded a signature yet just gets a blank signature line
-- on generated certificates rather than a broken PDF (see
-- generate-pdf.ts).
--
-- FileObject already has FilePurpose.SIGNATURE (schema.prisma, added in
-- P0 as a Phase-2 seam) — these columns are the first real use of it.

ALTER TABLE "centre" ADD COLUMN "head_signature_file_id" CHAR(26);
ALTER TABLE "centre" ADD CONSTRAINT "centre_head_signature_file_id_fkey"
  FOREIGN KEY ("head_signature_file_id") REFERENCES "file_object"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "tenant" ADD COLUMN "authority_signature_file_id" CHAR(26);
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_authority_signature_file_id_fkey"
  FOREIGN KEY ("authority_signature_file_id") REFERENCES "file_object"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "tenant" ADD COLUMN "tagline" TEXT;
