// src/config/certificate.ts
//
// Certificate download policy — the one thing about the download-limit
// feature that's a genuine product decision, factored out so it isn't
// buried as a magic number inside the download route.
//
// Per the user's explicit instruction (2026-10-04, updated): every
// certificate gets this many FREE downloads. After those are used up,
// EVERY further download costs the fixed platform fee below — one payment
// = one download. Verification (via code or QR) stays free forever and
// is never gated by this.
export const FREE_DOWNLOADS_PER_PAYMENT = 2;

// Fixed platform per-download fee (paise) — the platform's own revenue per
// the user's explicit instruction. Once the 2 free downloads are exhausted,
// the student pays ₹299 for EACH further download (single-use: one payment
// unlocks exactly one download).
export const PLATFORM_REDOWNLOAD_FEE_PAISE = 29900;
