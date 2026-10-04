-- 2026-10-05: student registration fee + invoice + approval flow
-- Tenant.registration_fee_paise: institute-set one-time student fee (0 = free)
-- Student: payment reference, invoice number, approval gate for downloads
-- New tables: invoice (paid fee receipts), invoice_sequence (per-tenant numbering)

ALTER TABLE "tenant" ADD COLUMN "registration_fee_paise" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "student" ADD COLUMN "registration_payment_id" TEXT;
ALTER TABLE "student" ADD COLUMN "invoice_number" TEXT;
ALTER TABLE "student" ADD COLUMN "approved_at" TIMESTAMPTZ;
ALTER TABLE "student" ADD COLUMN "approved_by_id" CHAR(26);

CREATE TABLE "invoice" (
  "id" TEXT NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "tenant_id" CHAR(26) NOT NULL,
  "student_id" CHAR(26) NOT NULL,
  "amount_paise" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PAID',
  "payment_ref" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "invoice_invoice_number_key" ON "invoice"("invoice_number");
CREATE INDEX "invoice_tenant_id_created_at_idx" ON "invoice"("tenant_id", "created_at");

CREATE TABLE "invoice_sequence" (
  "tenant_id" CHAR(26) NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "invoice_sequence_pkey" PRIMARY KEY ("tenant_id")
);

-- Foreign keys
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_sequence" ADD CONSTRAINT "invoice_sequence_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: tenant isolation (same pattern as other tenant tables)
ALTER TABLE "invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoice"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "invoice_sequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_sequence" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoice_sequence"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
