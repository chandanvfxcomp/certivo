// src/server/db/certificate-public.ts
//
// The ONLY function allowed to serve the public verification page
// (`/v/{code}`). Queries the `certificate_public` Postgres VIEW directly —
// never the `certificate` table, never `student` — via a parameterized
// $queryRaw (the code is user input from the URL). See the view's own
// comment in prisma/migrations/20260910100000_certificate_and_fees for why
// this is safe with no tenant context and no login: the view itself is
// already narrowed to safe columns + ACTIVE-only rows, so this function
// has no PII to leak even if the WHERE clause here were wrong.
//
// Not modelled as a Prisma model (that needs the "views" preview feature
// and a schema change beyond this MVP slice) — a small typed raw query is
// simpler and keeps the safety property visibly local to one file.
import { prisma } from "./client";

export interface PublicCertificate {
  code: string;
  status: "ACTIVE" | "REVOKED";
  student_name: string;
  institute_name: string;
  course_name: string;
  completion_date: Date | null;
  grade: string | null;
  mode: string | null;
  issued_at: Date;
}

export async function findPublicCertificateByCode(
  code: string,
): Promise<PublicCertificate | null> {
  const rows = await prisma.$queryRaw<PublicCertificate[]>`
    SELECT code, status, student_name, institute_name, course_name, completion_date, grade, mode, issued_at
    FROM certificate_public
    WHERE code = ${code}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
