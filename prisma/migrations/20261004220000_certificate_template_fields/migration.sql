-- Certificate template fields (MJ reference design): grade/mode printed on
-- the certificate; tenant motto/established-year/campus-photo for branding.
ALTER TABLE "certificate" ADD COLUMN "grade" TEXT;
ALTER TABLE "certificate" ADD COLUMN "mode" TEXT;

ALTER TABLE "tenant" ADD COLUMN "motto" TEXT;
ALTER TABLE "tenant" ADD COLUMN "established_year" INTEGER;
ALTER TABLE "tenant" ADD COLUMN "campus_photo_file_id" CHAR(26);

DO $$ BEGIN
  ALTER TABLE "tenant" ADD CONSTRAINT "tenant_campus_photo_file_id_fkey"
    FOREIGN KEY ("campus_photo_file_id") REFERENCES "file_object"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
