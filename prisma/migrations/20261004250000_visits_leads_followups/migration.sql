-- 2026-10-04: visit tracking + lead follow-up system
CREATE TABLE "site_visit" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "ip_hash" TEXT,
  "user_agent" TEXT,
  "referrer" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "site_visit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "site_visit_created_at_idx" ON "site_visit"("created_at");
CREATE INDEX "site_visit_path_created_at_idx" ON "site_visit"("path", "created_at");

CREATE TABLE "lead" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "institute_name" TEXT,
  "message" TEXT,
  "source" TEXT NOT NULL DEFAULT 'landing',
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lead_status_created_at_idx" ON "lead"("status", "created_at");

CREATE TABLE "follow_up_template" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "delay_days" INTEGER NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "follow_up_template_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "follow_up_log" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sent_at" TIMESTAMPTZ,
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "follow_up_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "follow_up_log_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "follow_up_log_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "follow_up_template"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "follow_up_log_status_created_at_idx" ON "follow_up_log"("status", "created_at");

-- Seed default follow-up sequence (super admin can edit/disable these)
INSERT INTO "follow_up_template" ("id", "name", "subject", "body", "delay_days", "channel", "enabled") VALUES
('01J00000000000000000000001', 'Welcome — Day 0', 'Welcome to Certivo, {{name}}!',
 'Hi {{name}},\n\nThanks for your interest in Certivo — the certificate verification platform institutes trust.\n\nYou can issue tamper-proof certificates with QR verification in minutes. Reply to this email and our team will help you get started.\n\n— Team Certivo',
 0, 'email', true),
('01J00000000000000000000002', 'Nudge — Day 2', '{{institute}}, still thinking about digital certificates?',
 'Hi {{name}},\n\nJust checking in — did you get a chance to look at Certivo?\n\nInstitutes like yours issue their first verified certificate in under 10 minutes. No credit card needed to start.\n\n— Team Certivo',
 2, 'email', true),
('01J00000000000000000000003', 'Last call — Day 7', 'Last chance: get your institute verified on Certivo',
 'Hi {{name}},\n\nThis is our last follow-up. If digital certificates with instant QR verification are on your roadmap this quarter, we would love to help.\n\nJust reply "YES" and we will set everything up for {{institute}}.\n\n— Team Certivo',
 7, 'email', true);
