// src/lib/upload-limits.ts
//
// Shared upload constraints — intentionally free of node: imports so both
// server code and client components can import it.

/** Image types the institute logo upload accepts. */
export const ALLOWED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg"] as const;

/** Max institute logo size: 200 KB. */
export const MAX_IMAGE_BYTES = 200 * 1024; // 200 KB
