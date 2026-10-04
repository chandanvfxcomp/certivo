-- 2026-10-04: 10-template system — active template per tenant + premium unlocks
ALTER TABLE "tenant" ADD COLUMN "active_template_id" TEXT NOT NULL DEFAULT 'classic-simple';

CREATE TABLE "tenant_template_unlock" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "unlocked_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "payment_ref" TEXT,
  CONSTRAINT "tenant_template_unlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_template_unlock_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "tenant_template_unlock_tenant_id_template_id_key" ON "tenant_template_unlock"("tenant_id", "template_id");

-- RLS: tenant isolation for template unlocks (same pattern as other tenant tables)
ALTER TABLE "tenant_template_unlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_template_unlock" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant_template_unlock"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
