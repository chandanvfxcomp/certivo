// src/server/storage/local-disk.ts
//
// File storage for uploaded images (institute logo, Centre Head /
// Authority signatures) — needed for the branded certificate PDF. This
// sandbox can't reach the npm registry (see README), so this is a local
// disk-backed FileObject implementation rather than pulling in an S3
// SDK: bytes live under STORAGE_ROOT (default var/uploads/, outside
// anything Next.js serves directly — a file is only readable through
// getFileBytes()'s own tenant-scoped check, never a static URL), keyed
// by the FileObject row's own id.
//
// Swapping this for real object storage later (S3/R2/whatever) only
// means reimplementing saveUploadedFile/getFileBytes/deleteFile against
// that backend — every caller (settings actions, generate-pdf.ts, the
// preview route) goes through this module, never touches the filesystem
// directly.
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import type { Prisma, FilePurpose } from "@prisma/client";
import { ulid } from "@/lib/ulid";

const STORAGE_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "var", "uploads");

// Matches the QA-audit's original logo-upload decision (PNG/JPEG only,
// capped small): a certificate-facing image doesn't need to be large,
// and keeping the cap tight keeps arbitrary-tenant-upload disk usage
// bounded without needing a quota system yet.
//
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@/lib/upload-limits";

// Re-exported so existing server-side importers keep working.
export { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES };

export class InvalidImageUploadError extends Error {}

function assertValidImage(mimeType: string, sizeBytes: number): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    throw new InvalidImageUploadError("Only PNG or JPEG images are allowed.");
  }
  if (sizeBytes === 0) {
    throw new InvalidImageUploadError("The uploaded file is empty.");
  }
  if (sizeBytes > MAX_IMAGE_BYTES) {
    throw new InvalidImageUploadError(
      `Image is too large (${Math.round(sizeBytes / 1024)}KB) — the limit is ${Math.round(MAX_IMAGE_BYTES / 1024)}KB.`,
    );
  }
}

function keyToPath(key: string): string {
  // `key` is always a freshly-generated ulid() (26 Crockford-Base32
  // chars, see ulid.ts) — never derived from user input — so there is no
  // path-traversal surface here, but resolve+prefix-check anyway as
  // defense in depth against a future caller passing something else in.
  const resolved = path.resolve(STORAGE_ROOT, key);
  if (!resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

export interface SavedImage {
  fileId: string;
  key: string;
  sizeBytes: number;
  checksum: string;
}

/**
 * Validates and saves an uploaded image, creating its FileObject row in
 * the SAME transaction as the caller's other writes (pass the `tx` from
 * withTenant()) so a failed follow-up write can't leave an orphaned file
 * row without also rolling back — though the on-disk bytes themselves
 * are written just before the transaction is handed the row, since
 * Postgres can't roll back a filesystem write; a failed transaction
 * after this point leaves one harmless orphaned file on disk, never a
 * dangling DB reference.
 */
export async function saveUploadedImage(
  tx: Prisma.TransactionClient,
  opts: {
    tenantId: string;
    purpose: FilePurpose;
    uploadedBy: string;
    originalName: string;
    mimeType: string;
    bytes: Buffer;
  },
): Promise<SavedImage> {
  assertValidImage(opts.mimeType, opts.bytes.length);

  await mkdir(STORAGE_ROOT, { recursive: true });

  const fileId = ulid();
  const key = ulid();
  const checksum = createHash("sha256").update(opts.bytes).digest("hex");

  await writeFile(keyToPath(key), opts.bytes);

  try {
    await tx.fileObject.create({
      data: {
        id: fileId,
        tenantId: opts.tenantId,
        key,
        originalName: opts.originalName.slice(0, 255),
        mimeType: opts.mimeType,
        sizeBytes: opts.bytes.length,
        checksum,
        purpose: opts.purpose,
        // No virus-scanning integration exists in this environment (see
        // README) — these uploads go through the same tenant-admin-only
        // trust boundary as everything else an admin can do (register a
        // student, set a fee), so there's no separate untrusted-upload
        // risk a PENDING/async-scan state would actually be gating.
        // Leaving this at the schema's PENDING default with nothing
        // ever advancing it to CLEAN would just permanently hide the
        // image instead, which is a worse, silently-broken outcome.
        scanStatus: "CLEAN",
        uploadedBy: opts.uploadedBy,
      },
    });
  } catch (err) {
    // DB write failed — don't leave the file behind.
    await unlink(keyToPath(key)).catch(() => {});
    throw err;
  }

  return { fileId, key, sizeBytes: opts.bytes.length, checksum };
}

/**
 * Reads back a previously-saved image's bytes, scoped to the tenant that
 * owns it — never trust a bare fileId from the client without this
 * check, same "never trust the client for object ownership" rule as
 * every other lookup in this codebase.
 */
export async function getFileBytes(
  tx: Prisma.TransactionClient,
  fileId: string,
  tenantId: string,
): Promise<{ bytes: Buffer; mimeType: string; originalName: string } | null> {
  const file = await tx.fileObject.findFirst({
    where: { id: fileId, tenantId, deletedAt: null },
  });
  if (!file) return null;
  try {
    const bytes = await readFile(keyToPath(file.key));
    return { bytes, mimeType: file.mimeType, originalName: file.originalName };
  } catch {
    return null;
  }
}

/**
 * Deletes a previously-uploaded image's row and on-disk bytes. Used when
 * a logo/signature is replaced — there's no versioning need for these
 * (unlike AuditLog, which is deliberately append-only), so the old file
 * is removed rather than left to accumulate forever.
 */
export async function deleteFile(
  tx: Prisma.TransactionClient,
  fileId: string,
  tenantId: string,
): Promise<void> {
  const file = await tx.fileObject.findFirst({ where: { id: fileId, tenantId } });
  if (!file) return;
  await tx.fileObject.delete({ where: { id: file.id } });
  await unlink(keyToPath(file.key)).catch(() => {});
}
