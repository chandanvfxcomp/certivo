# Certivo Demo — Redesign v2 Report

**File:** `demo/certivo-demo-redesigned.html` (original `certivo-demo.html` untouched)
**Date:** 2026-10-04
**Basis:** Full audit of the demo + internet research on certificate-verification platforms
(Accredible, Certifier, Sertifier, CertifyMe, Blockcerts, DigiLocker/NAD, Credly)

---

## 1. Research findings (what top platforms do)

**Public verify page:** prominent valid/invalid/revoked result states (revoked is its own
state, never a generic error), certificate preview + metadata, QR deep-link, "verified at"
timestamp, anti-fraud note, actions — Download PDF, Share to LinkedIn, copy link,
"Verify another" — all with no login.

**Landing page:** outcome-first hero with dual CTA, stats band, trust signals, feature
grid, FAQ, rich footer.

**Motion:** skeleton shimmer for lookups, spinner inside the Verify button, animated
checkmark draw on success, 200–500ms ease-out, `prefers-reduced-motion` respected,
feedback within 100ms of any tap.

---

## 2. What was missing → what the redesign adds

### Verify page (`#/v/<code>`) — the core "verifier certificate" screen
| Missing | Added |
|---|---|
| Result appeared instantly, no loading | Staged check: skeleton shimmer + scan-line, "Checking certificate records…" |
| Static shield icon | Animated checkmark draw (SVG stroke) + pop-in result card |
| No confetti/celebration | Subtle confetti burst on valid verification only |
| No timestamp | "Checked <date time>" under the result |
| No QR | Real QR code (demo's own encoder) linking to the verification URL |
| No copy | Copy code + Copy verification link buttons (clipboard + fallback) |
| No share | WhatsApp, LinkedIn, Email, native-share buttons |
| No download | Download PDF button (reuses the real PDF generator, with loading spinner) |
| No print | Print button (+ print stylesheet) |
| No "verify another" | Inline "Verify another certificate" toggle form |
| Revoked = generic "Not verified" | Distinct amber "Revoked — no longer valid" state with reason |
| No trust context | Anti-fraud note ("compare details… treat as suspect"), "Verified by Certivo" line |
| Bare error | Shake-in animation + "Report a concern" mailto link |

### Buttons (whole demo)
- Icons on all primary actions (16 new SVG icons added to `ICONS`)
- Ripple effect on press, hover lift + shadow, active press scale (0.96)
- Loading spinner state (`setBtnLoading`) on Download/PDF actions
- Toast notification system (success/error) for copy, download, export feedback
- Students table "View" link → real button; portal buttons got icons

### Landing page
- Scroll-reveal animations (staggered) on hero, cards, steps
- Animated count-up stats band (certificates, institutes, <3s verification)
- Card hover lift on trust cards; icon buttons in hero
- New FAQ accordion (5 questions)
- Rich 4-column footer (replaces the one-line footer)

### Admin dashboard
- Stat cards: icons + count-up numbers + hover lift, clickable through to students
- New **Export CSV** button (real download of the institute's students)
- "Register a student" button with icon

### Student portal
- New: **Download PDF**, **Copy code**, **Share** buttons next to Preview
- Toasts confirm each action

### Global
- `prefers-reduced-motion` disables all new animation; focus-visible outline preserved
  despite button ripple overflow; modal gets a pop-in

---

## 3. Still missing (real-app roadmap, beyond demo scope)

Prioritised from research — none of these exist in the demo *or* the Next.js app:

1. **Bulk issuance** — CSV/XLSX upload for admins (biggest issuer-side gap)
2. **Email delivery** — branded certificate emails + open/delivery tracking
3. **Expiry dates** — certificates with validity periods + auto-reminders
4. **Real payment gateway** — Razorpay/UPI paywall before download (currently just
   "mark paid"; noted as out of scope in the QA audit too)
5. **Analytics** — verification counts, QR scans, share tracking for institutes
6. **Public directory** — opt-in searchable list of issued certificates
7. **API + webhooks** — issuance/verification events for LMS/CRM integrations
8. **Share-to-LinkedIn credential schema** — one-click "Add to profile" (page shares
   the URL today, not the LinkedIn credential format)
9. **India stack interop** — DigiLocker/NAD, ABC ID / APAAR alignment
10. **Admin SSO/MFA**, multi-language certificates, embed codes, wallet passes

---

## 4. Verification

- `node --check` passes on both script blocks
- 27-assertion runtime smoke test in Node (DOM stubs): landing, verify skeleton,
  valid/revoked/not-found verify states, dashboard, QR generation, full
  `render()` passes for `/` and `/v/<code>` — **all passed**
