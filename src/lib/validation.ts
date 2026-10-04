// src/lib/validation.ts
//
// Small, dependency-free validators for the two student-registration
// fields that need a real format check (spec never called for a
// validation library, and these two rules are simple enough not to need
// one). Both fields are optional on Student (many institutes won't have
// every student's email/phone on day one) — these functions only judge
// the value when one was actually typed; an empty field is not this
// module's problem, callers decide whether blank is acceptable.
export function isValidEmail(value: string): boolean {
  // Deliberately simple — not a full RFC 5322 parser, just "does this
  // look like an email" (something@something.something, no whitespace).
  // Good enough to catch typos without rejecting real-world addresses.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Indian mobile numbers: exactly 10 digits, starting 6-9 (the only
// digits Indian mobile numbers are issued with). Matches the rest of
// the product's Indian-specific choices (₹, en-IN date/number
// formatting, pincode field) — see README if this ever needs to
// generalize past India.
export function isValidIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value);
}
