-- 2026-10-04: password reset tokens + swappable app settings
CREATE TABLE "password_reset_token" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "password_reset_token_user_id_idx" ON "password_reset_token"("user_id");

CREATE TABLE "app_setting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "app_setting_pkey" PRIMARY KEY ("key")
);

-- Seed swappable provider settings
INSERT INTO "app_setting" ("key", "value") VALUES
('deploy.provider', 'github'),
('tunnel.provider', 'cloudflare'),
('site.url', 'https://example.com');
