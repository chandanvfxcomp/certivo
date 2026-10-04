# platform

Core platform for a multi-tenant SaaS (institutions / centres / students /
certificates). Brand name is not final — see `src/config/brand.ts`. Original
full product spec: `PLATFORM-CORE-SPECIFICATION.md`. Working rules:
`CLAUDE.md`.

## Scope change (2026-09-10) — feature-first MVP

The original plan was to build strictly phase-by-phase (P0 foundation, then
P1, P2, ...). The user explicitly asked to pivot instead: build the features
that make a real, demoable product first — landing page, admin registers a
student, the student logs in and downloads a certificate, anyone can verify
it publicly — and defer institute self-registration and a real payment
gateway. See `prisma/schema.prisma`'s top-of-file comment and the
`Certificate` model's own comment for exactly what was brought forward from
the old "Phase 2" scope and what wasn't.

**What exists now:**

- **Landing page** (`/`) — animated hero, "how it works", a public
  certificate-verification search box. Pure frontend, no backend dependency.
- **Admin** (`/admin/login`, `/admin/dashboard`, `/admin/students`,
  `/admin/students/new`, `/admin/students/[id]`) — session-cookie login;
  register a student with every certificate-relevant field; a certificate
  (with a unique code) is issued automatically at registration; mark
  registration/certificate fees paid manually.
- **Student** (`/student/login`, `/student/forgot-password`,
  `/student/portal`) — session-cookie login by student ID + password;
  view profile, certificate status, and fee status; download the
  certificate as a PDF (`/student/portal/certificate`).
- **Public verification** (`/v/{code}`) — no login, no tenant context.
  Reads ONLY through the `certificate_public` Postgres view (safe fields:
  student name, institute, course, completion date, code, status — never
  email/phone/address/DOB/photo/guardian name). See the migration
  `prisma/migrations/20260910100000_certificate_and_fees` for the full
  design and why it's safe even though it needs no login.
- **Single default institute** — `scripts/seed-default-institute.ts` seeds
  one Tenant + Centre + admin User, until real multi-institute
  self-registration is built. Run `pnpm db:seed` after migrating.

**Deliberately not done yet:** institute self-registration/approval, a real
payment gateway (fees are shown transparently and marked paid manually by
the admin — see `Student.registrationFeePaise`/`Certificate.feePaise`),
password-reset emails (`/student/forgot-password` is an honest stub), and a
final certificate visual design (the current PDF layout in
`src/server/certificates/generate-pdf.ts` is a placeholder — the user is
sending a real sample to match exactly).

**Current phase: P0 — Foundation, extended.** The original P0 foundation
(schema, RLS, tenant isolation, error/logging conventions) is unchanged and
still the base every route above is built on. See
`PLATFORM-CORE-SPECIFICATION.md` Section 17 for the original build order,
now superseded in ordering (not in its underlying engineering rules) by the
feature list above.

## ⚠️ Unverified build — read this first

This repo was generated in a sandboxed environment with **no access to the
npm registry** (or any package registry), so `pnpm install` was never run
here, and nothing in this repo has been compiled, typechecked, linted, or
tested end-to-end as a Node/Next.js project. What *was* verified, without
`pnpm install`:

- **SQL/RLS layer, directly against a running local Postgres via `psql`**
  (`scripts/verify-rls.sh`, 9 checks / 0 failures): all three migrations
  apply cleanly; every tenant-scoped table (`certificate` included) enables
  + forces RLS with a working `tenant_isolation` policy; the literal
  Section 17 Done-when condition (`app_user` without `set_config` sees zero
  rows); `audit_log` is append-only at the DB level; the new
  `certificate_public` view returns the active certificate's safe snapshot
  with **no** login and **no** tenant context, returns **zero rows** for a
  revoked code, and has **zero PII columns** by construction (all asserted
  against `information_schema`, not just eyeballed).
- **Certificate PDF generation, actually executed** (not just read) using
  the real `pdf-lib` package (globally available in this sandbox) with the
  exact drawing calls in `src/server/certificates/generate-pdf.ts` —
  produced a real `%PDF`-signed file and was visually reviewed.
- **Syntax**, across every `.ts`/`.tsx` file in `src/`, `scripts/`, and
  `tests/` (41 files): parsed with the real TypeScript parser, 0 errors.
- **Types**, for framework-independent files only (no `@prisma/client`, no
  Next.js/React types available without `pnpm install`): `src/lib/ulid.ts`,
  `src/lib/certificate-code.ts`, `src/server/auth/password.ts`, and
  `src/server/certificates/generate-pdf.ts` (against the real `pdf-lib`
  type declarations) all typecheck clean in isolation.
- Every new/changed file was manually reviewed for unused imports (also
  checked with a heuristic script) and stray `console.*` calls outside
  `src/lib/logger.ts` / `scripts/**` (see `eslint.config.mjs`'s scripts
  override and its comment).

What was **not** verified: TypeScript compiles *as a whole Next.js project*
(React/Next JSX types, `@prisma/client`'s generated types — anything that
needs `pnpm install`), ESLint passes, the Next.js app actually builds/runs,
`prisma generate`/`prisma migrate dev` run cleanly, and the Vitest suite
(`tests/tenant-isolation.test.ts`, `tests/rls-coverage.test.ts` — the
latter's *parsing logic* was hand-run against the real schema/migrations
and found 0 gaps, but not through `pnpm test` itself) actually passes
end-to-end. Do this first, locally, before trusting anything beyond what's
listed above:

```bash
pnpm install
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm test
```

If any of those surface errors, they're pre-existing issues in this
handoff, not regressions you introduced — fix them before building on top.

## Dependencies & licences (Hard Rule #10)

Every dependency in `package.json` was checked before being added — all
MIT, Apache-2.0, or BSD, none GPL/AGPL:

| Package | Licence |
|---|---|
| next, react, react-dom, zod, clsx, tailwind-merge | MIT |
| @prisma/client, prisma, typescript | Apache-2.0 |
| class-variance-authority | Apache-2.0 |
| pdf-lib | MIT |
| @types/node, @types/react, @types/react-dom | MIT |
| tailwindcss, @tailwindcss/postcss, postcss | MIT |
| eslint, eslint-config-next, @eslint/eslintrc | MIT |
| @typescript-eslint/eslint-plugin, @typescript-eslint/parser | MIT |
| prettier, prettier-plugin-tailwindcss | MIT |
| vitest, @vitest/coverage-v8 | MIT |
| tsx | MIT |
| dotenv | BSD-2-Clause |

These are the licences these packages ship under as of the pinned
versions in `package.json`, from general knowledge — not confirmed
against the actual installed `node_modules/*/LICENSE` files or
`pnpm licenses list`, since `pnpm install` couldn't run in this sandbox
(no npm registry access). Re-run `pnpm licenses list` after `pnpm
install` to confirm before treating this table as final.

## Stack

Next.js 15 (App Router) · TypeScript 5 (strict) · React 19 · Tailwind CSS 4 ·
PostgreSQL 16 · Prisma 6 · pnpm. Full rationale in spec Section 3.

## Getting started

1. `pnpm install`
2. Copy `.env.example` to `.env`.
3. Local Postgres: run `scripts/setup-db-roles.sh` (creates the `app_user`
   and `migrator` roles plus the `platform_dev` database — see Section 6.3).
   Point `DATABASE_URL` (pooled, `app_user`) and `DIRECT_URL` (direct,
   `migrator`) at it, or at Neon once you have a project.
4. `pnpm db:generate && pnpm db:migrate:deploy` (applies the migrations in
   `prisma/migrations/`, written by hand in this handoff — see the warning
   above; sanity-check them before relying on `prisma migrate dev` to
   regenerate anything on top).
5. Set a real `SESSION_SECRET` in `.env` (see `.env.example` for how to
   generate one) and review the `DEFAULT_*` vars.
6. `pnpm db:seed` — creates the one default institute + its admin login.
7. `pnpm dev`, then sign in at `/admin/login` with `DEFAULT_ADMIN_EMAIL` /
   `DEFAULT_ADMIN_PASSWORD`.

## Verifying the RLS layer without Node

```bash
scripts/verify-rls.sh
```

Spins up the two DB roles, applies both migrations, seeds two tenants,
and asserts (a) `app_user` without `set_config` sees zero rows, (b)
`app_user` with `set_config` sees only its own tenant's rows, (c)
`migrator` (BYPASSRLS) sees everything, (d) `audit_log` rejects
`UPDATE`/`DELETE` from `app_user`.

## Definition of Done (Section 19)

Updated for the 2026-09-10 feature-first pivot — mutations, UI, and Zod
now all apply where P0's original checklist said N/A. Status against every
item, as of this handoff:

- [ ] **TypeScript strict passes, zero `any`, zero `@ts-ignore`** — NOT
  CONFIRMED end-to-end (no `pnpm install` in this sandbox). `tsconfig.json`
  has `strict: true`; ESLint bans both explicitly (`eslint.config.mjs`); a
  manual `any`-usage grep across `src/` found none outside comments. Every
  `.ts`/`.tsx` file (41) was parsed with the real TypeScript parser —
  0 syntax errors. Framework-independent files typecheck clean in
  isolation against real type declarations (`ulid.ts`,
  `certificate-code.ts`, `password.ts`, `generate-pdf.ts` — the last
  against real `pdf-lib` types). Files needing `@prisma/client`/Next.js/
  React types were not — run `pnpm typecheck` to confirm.
- [~] **Every mutation begins with `guard()`** — not literally: `guard()`
  itself is still the Section 8.4 SPEC-GAP skeleton (unimplemented,
  intentionally — see its header comment), because Better Auth (P1) and
  the permission matrix (P3) don't exist yet. Every mutation added this
  pass (`registerStudent`, `markRegistrationFeePaid`,
  `markCertificateFeePaid`, the certificate-download route) instead opens
  with `requireAdminSession()`/`requireStudentSession()`
  (`src/server/auth/session.ts`) — a narrower, parallel check for this
  MVP's one tenant/two roles. Re-route these through `guard()` once real
  multi-tenant/role data exists to fill it in for real.
- [x] **Every tenant-scoped read/write goes through `withTenant()`** —
  true by construction; every `student`/`certificate`/`centre` query in
  the new admin/student routes goes through it (checked by reading every
  new file). Platform tables (`tenant`, `user_account`, `membership`) use
  plain `prisma` calls, correctly, per their no-RLS carve-out.
- [x] **Every new tenant table has RLS enabled and forced, and the CI
  coverage test passes** — verified via `scripts/verify-rls.sh` against
  real Postgres (9/9 passing, `certificate` + `certificate_public`
  included), and via `tests/rls-coverage.test.ts`'s parsing logic
  (now reading ALL migrations, not just one file — see its header),
  hand-run against the real schema + migrations: 0 gaps, `Certificate`
  correctly picked up.
- [ ] **Every input is Zod-validated server-side** — NOT DONE for the new
  Server Actions (`registerStudent` et al. do manual `String(...)`
  coercion + a bare required-fields check, not Zod schemas). Flagged
  honestly rather than silently skipped — `zod` is already a dependency;
  adding schemas for these forms is the next hardening pass.
- [ ] **Every state-changing action writes an audit log entry** — NOT DONE
  for the new mutations (they call `logger.info(...)`, which is
  server-log output, not a persisted `AuditLog` row a tenant admin could
  later review). `AuditLog`'s table + append-only DB-level enforcement
  are verified (`verify-rls.sh` step 8); wiring actual inserts is not.
- [ ] **Cross-tenant access test written and passing (asserts 404)** — NOT
  DONE as an automated test yet, though the underlying guarantee (RLS
  returning zero rows for another tenant) is verified, and every new
  query scopes by `tenantId` from the session, never from client input.
- [x] **Every list is paginated with a hard maximum** — the one list added
  (`/admin/students`) caps at `take: 100`.
- [ ] **Mobile layout verified at 360px** — NOT verified in an actual
  browser/viewport (no Node runtime here to run Next.js dev server).
  Layouts use responsive Tailwind classes (`sm:`/`lg:` breakpoints,
  `flex-col` stacking) throughout — visually reviewed in markup, not
  rendered.
- [~] **Keyboard navigation and focus states verified** — the base UI
  components (`button.tsx`, `input.tsx`) have explicit `focus-visible`
  rings, inherited by every new form; not verified in an actual browser.
- [x] **No brand string outside `config/brand.ts`** — true by
  construction; every new page reads `BRAND.name`/`BRAND.tagline` rather
  than hardcoding (checked by reading every file written).
- [x] **No new dependency outside MIT / Apache-2.0 / BSD / ISC** — one
  new dependency this pass, `pdf-lib` (MIT) — see the licence table above.

Re-run this checklist yourself after `pnpm install` succeeds — the items
marked "NOT CONFIRMED"/"NOT DONE" above are exactly the ones that need it
or need real follow-up work, not just verification.
