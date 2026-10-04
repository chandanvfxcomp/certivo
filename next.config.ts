import type { NextConfig } from "next";

// Security headers per PLATFORM-CORE-SPECIFICATION.md Section 12.2.
//
// QA audit finding C4: this file previously shipped every static header
// EXCEPT Content-Security-Policy — the comment said a per-request nonce
// would arrive with middleware, but no middleware.ts exists and the app
// already has real, exposed functionality well past that point. A static
// baseline CSP (no nonce yet) is better than none: it still blocks
// third-party script/style/frame injection, which is the bulk of what a
// CSP buys you. Switch to a per-request nonce (dropping 'unsafe-inline'
// from script-src) once middleware.ts exists.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' is required for Next.js's inline hydration script
  // until a per-request nonce is wired up via middleware.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
