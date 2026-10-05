-- 2026-10-05: white-label for institutes.
-- Tenant.custom_domain: institute's own domain (e.g. certificates.sharmacoaching.com)
-- Tenant.subdomain: slug for <subdomain>.<base-domain> hosting
-- Tenant.white_label_enabled: premium feature gate (super-admin can toggle)
-- Tenant.hide_powered_by: hide "Powered by Certivo" in footer
-- Brand color reuses existing Tenant.primary_color (no new column needed).

ALTER TABLE "tenant" ADD COLUMN "custom_domain" TEXT;
ALTER TABLE "tenant" ADD COLUMN "subdomain" TEXT;
ALTER TABLE "tenant" ADD COLUMN "white_label_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenant" ADD COLUMN "hide_powered_by" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "tenant_custom_domain_key" ON "tenant"("custom_domain");
CREATE UNIQUE INDEX "tenant_subdomain_key" ON "tenant"("subdomain");
