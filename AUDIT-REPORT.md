# Certivo Codebase Audit Report
**Date:** 2026-10-05
**Scope:** `~/workspace/certivo/platform/` — full codebase review (no code changes made)
**Method:** Manual inspection of business-critical routes, payment flows, auth checks, dead-code analysis via usage grep, file inventory.

---

## Critical Bugs

### 1. ₹299 payment grants 2 FREE downloads instead of 1 paid download
- **Files:**
  - `src/app/api/payments/razorpay/verify/route.ts:52`
  - `src/app/api/payments/cashfree/verify/route.ts:50`
- **Severity:** CRITICAL
- **Description:** Both verify routes set `downloadCount: 0` when the ₹299 platform fee is paid:
  ```ts
  const data = { platformFeePaid: true, platformFeePaidAt: new Date(), downloadCount: 0 };
  ```
  The download route (`src/app/student/(protected)/portal/certificate/route.ts`) treats `platformFeePaid` as a single-use token: one payment = exactly one additional download. By resetting `downloadCount` to 0, the student gets 2 more FREE downloads (0→1→2) before the paid token is even checked. Net effect: one ₹299 payment yields 3 downloads (2 free + 1 paid) instead of 1. This completely breaks the monetization model — a student can pay once and effectively get 2 free downloads on repeat.
- **Fix:** Remove `downloadCount: 0` from both verify routes. Only set `platformFeePaid: true` + `platformFeePaidAt`.

### 2. Registration-fee verify has non-atomic idempotency check (duplicate invoice race)
- **File:** `src/app/api/student/registration-fee/verify/route.ts:100-108`
- **Severity:** HIGH
- **Description:** The idempotency guard reads `registrationFeePaid`/`invoiceNumber`, then separately calls `issueInvoice()` and updates the student. Two concurrent verify requests for the same student can both pass the guard before either updates, resulting in two invoices issued (two sequence numbers consumed) with the second overwriting the first's `invoiceNumber` on the student row — one orphaned invoice.
- **Fix:** Make the check-and-set atomic (e.g., `updateMany` with `where: { registrationFeePaid: false }` and check `count`, or a DB-level unique constraint on paid state transition).

### 3. Razorpay registration-fee verify does not check the paid amount
- **File:** `src/app/api/student/registration-fee/verify/route.ts:60-84`
- **Severity:** HIGH
- **Description:** The Razorpay branch verifies the signature and the order receipt/notes, but never compares `order.amount` against `tenant.registrationFeePaise`. The Cashfree branch in the same file DOES check (`Math.round(order.order_amount * 100) !== amountPaise`). While the order is created server-side (so the amount is normally correct), the missing check is a defense-in-depth gap: if order creation were ever manipulated, an underpaid order would verify.
- **Fix:** Add `order.amount !== amountPaise` check after `fetchRazorpayOrder`, matching the Cashfree branch.

---

## High / Medium Bugs

### 4. FAQ misstates the ₹299 fee ("two more downloads")
- **File:** `src/app/page.tsx:371`
- **Severity:** MEDIUM
- **Description:** FAQ answer: "After that, a ₹299 platform fee unlocks **two more downloads**, and so on." The actual (intended) behavior is one ₹299 payment = exactly one additional download (single-use token). The pricing page (`src/app/pricing/page.tsx:357`) correctly says "₹299 per download". The landing FAQ contradicts it.
- **Fix:** Change to "unlocks one more download".

### 5. Invoice PDF rendered then discarded (`void pdf;`)
- **File:** `src/app/api/student/registration-fee/verify/route.ts:141-148`
- **Severity:** MEDIUM
- **Description:** The route renders the invoice PDF (`renderInvoicePdf`) then does `void pdf;` — the bytes are thrown away. The comment claims "PDF persisted for portal re-download", but nothing is persisted; the portal re-renders on demand via `/api/student/invoice`. Functionally harmless (re-render works), but it wastes CPU on every payment and the comment is misleading.
- **Fix:** Remove the render call (or actually persist to storage if email attachments are added later), and correct the comment.

### 6. Cashfree amount comparison uses raw float multiplication
- **File:** `src/app/api/payments/cashfree/verify/route.ts:43,58`
- **Severity:** MEDIUM
- **Description:** `order.order_amount * 100 !== PLATFORM_REDOWNLOAD_FEE_PAISE` — floating-point multiplication can produce `29899.999999999996` for values like 298.99. The registration-fee route in the same codebase correctly uses `Math.round(order.order_amount * 100)`. For the exact ₹299.00 case this works, but it's fragile and inconsistent.
- **Fix:** Use `Math.round(order.order_amount * 100) !== ...` in both places.

### 7. Cron secret passed as URL query parameter
- **File:** `src/app/api/cron/send-followups/route.ts:13`
- **Severity:** LOW
- **Description:** `?secret=CRON_SECRET` appears in server access logs, browser history, and any proxy logs. The route also accepts the `Authorization` header (good), but the documented GitHub Actions usage (`.github/workflows/send-followups.yml`) should prefer the header.
- **Fix:** Document header-only usage; consider rejecting query-param auth.

### 8. Setup-admin route has no rate limiting
- **File:** `src/app/api/setup/admin/route.ts`
- **Severity:** LOW
- **Description:** An attacker can brute-force `SETUP_SECRET` with unlimited attempts. The secret is long/random (low practical risk), and the route refuses once an admin exists, but a simple attempt counter or delay would close it.
- **Fix:** Add basic rate limiting or temporary lockout after N failed attempts. Remove `SETUP_SECRET` from env after first use (already recommended in code comment).

---

## Dead Code

| Path | Severity | Notes |
|---|---|---|
| `src/components/landing/templates-showcase.tsx` | MEDIUM | 0 usages — removed from `page.tsx` but file remains |
| `src/components/forms/` (empty dir) | LOW | Empty directory |
| `src/components/layout/` (empty dir) | LOW | Empty directory |
| `src/server/jobs/` (empty dir) | LOW | Empty directory |
| `src/server/services/` (empty dir) | LOW | Empty directory |
| `src/server/repos/` (empty dir) | LOW | Empty directory |
| `src/app/(marketing)/` (empty dir) | LOW | Empty route group |
| `src/app/(onboarding)/` (empty dir) | LOW | Empty route group |
| `src/app/(auth)/` (empty dir) | LOW | Empty route group |
| `src/app/portal/` (empty dir) | LOW | Empty directory (portal lives under `src/app/student/(protected)/portal/`) |
| `src/app/app/[tenantSlug]/dashboard/` (empty dir) | LOW | Leftover scaffold |

**Not dead (verified in use):** `pay-with-razorpay.tsx` (used by `pay-with-provider.tsx`), `pay-with-provider.tsx` + `pay-registration-fee.tsx` (used in student portal), `idle-logout.tsx`, `theme-toggle.tsx`, `visit-beacon.tsx`, `verify-code-box.tsx`, `lead-form.tsx`, template-order/template-verify API routes (called from admin gallery via fetch).

---

## Unwanted Files

| Path | Severity | Notes |
|---|---|---|
| `demo/` (HTML prototypes: `certivo-demo.html`, `certivo-demo-redesigned.html`, drafts, proof PNGs) | LOW | Design prototypes, not part of the Next.js app. Keep for reference or move out of the deployable repo. Not harmful (not bundled). |
| `CONTEXT-HANDOFF.md`, `GO-LIVE-CHECKLIST.md`, `FREE-ACCOUNTS-GUIDE.md` (repo root) | LOW | Operational docs. Fine to keep, but consider `docs/` folder. |
| `.next/` build cache | INFO | Gitignored correctly — not in repo. No action. |
| No `.bak`, `.tmp`, `*~`, `.DS_Store` files found | — | Clean. |
| No files >500KB in source (excluding `public/fonts/*.ttf` and `public/templates/*.png`, which are intentional binaries) | — | Clean. |

---

## Inconsistencies

### 9. Fee messaging contradicts code
- **Files:** `src/app/page.tsx:371` vs `src/app/pricing/page.tsx:357` vs `src/app/student/(protected)/portal/certificate/route.ts:60`
- **Severity:** MEDIUM (same as #4, listed here for the inconsistency angle)
- **Description:** Landing FAQ says ₹299 "unlocks two more downloads"; pricing page says "₹299 per download"; code implements single-use token (one download per payment). Three sources, two different stories.

### 10. Fee amount is centralized correctly
- **File:** `src/config/certificate.ts:18` (`PLATFORM_REDOWNLOAD_FEE_PAISE = 29900`)
- **Severity:** INFO (good)
- **Description:** The paise constant is the single source of truth and is imported (not hardcoded) in all payment routes. Display strings ("₹299") are hardcoded in UI copy, which is acceptable for a fixed price but would need a sweep if the price ever changes.

### 11. Language: user-facing strings are now consistently professional English
- **Severity:** INFO (good)
- **Description:** No Hinglish found in `src/app/page.tsx`, `src/components/lead-form.tsx`, or portal copy. Verified via grep for common Hinglish markers.

---

## Security Issues

| # | Issue | File | Severity |
|---|---|---|---|
| 12 | No hardcoded secrets, API keys, or credentials found in source | — | INFO (good) |
| 13 | All payment/admin/super-admin API routes enforce session auth (`requireStudentSession` / `requireAdminSession` / `requireSuperAdminSession`) | `src/app/api/**` | INFO (good) |
| 14 | No TypeScript `any` leaks found in `src/` | — | INFO (good) |
| 15 | Email client never throws (failures return `{ sent: false }`) — can't break requests | `src/server/email/client.ts` | INFO (good) |
| 16 | Template preview route requires admin session | `src/app/api/admin/templates/preview/[id]/route.ts` | INFO (good) |
| 17 | RLS: tenant-scoped reads go through `withTenant`; platform tables (`tenant`, `user`) use base client by documented design | various | INFO (good) |
| 7 | Cron secret in URL query param (see Medium Bugs) | `src/app/api/cron/send-followups/route.ts` | LOW |
| 8 | Setup route has no rate limiting (see Medium Bugs) | `src/app/api/setup/admin/route.ts` | LOW |
| 18 | Razorpay webhook: verify route file exists — webhook signature verification not audited in this pass (recommend review) | `src/app/api/payments/razorpay/webhook/route.ts` | LOW (unverified) |
| 19 | Cashfree webhook is documented as "best-effort reconciliation" — production behavior unverified | `src/app/api/payments/cashfree/webhook/route.ts` | LOW (unverified) |

---

## Summary Counts

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 2 |
| Medium | 4 |
| Low | 8 |
| Info (good) | 8 |

## Top 5 Most Critical Issues

1. **₹299 payment resets `downloadCount` to 0** (`razorpay/verify/route.ts:52`, `cashfree/verify/route.ts:50`) — CRITICAL. One payment grants 2 free + 1 paid download instead of exactly 1. Direct revenue loss; fix by removing `downloadCount: 0`.
2. **Registration-fee verify race condition** (`registration-fee/verify/route.ts:100-108`) — HIGH. Concurrent verifies can issue duplicate invoices. Fix with atomic check-and-set.
3. **Razorpay regfee verify skips amount check** (`registration-fee/verify/route.ts:60-84`) — HIGH. Add `order.amount !== amountPaise` check like the Cashfree branch has.
4. **Landing FAQ misstates fee** (`page.tsx:371`) — MEDIUM. "Unlocks two more downloads" should be "unlocks one more download". Legal/trust risk from false advertising.
5. **Dead `templates-showcase.tsx`** — MEDIUM (code hygiene). 0 usages; remove file and empty scaffold directories.
