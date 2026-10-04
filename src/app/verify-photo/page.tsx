"use client";

// src/app/verify-photo/page.tsx
//
// Smart certificate verification from a photo: upload (or snap) a picture
// of a certificate, and the page tries to identify it —
//   1. QR decode (jsqr): the certificate's QR encodes the verify URL, so
//      a visible QR gives an exact certificate code.
//   2. OCR fallback (tesseract.js): if no QR is found, OCR the image and
//      look for a certificate-ID-shaped string, then verify that.
// If either yields a code, we redirect to the normal /v/[code] page, which
// shows the official record — a fake or altered certificate won't match.
//
// Everything runs client-side; the photo never leaves the device until
// the user is redirected to the (public) verify page for the found code.
import { useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { createWorker } from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/config/brand";

type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "qr" }
  | { kind: "ocr" }
  | { kind: "found"; code: string }
  | { kind: "notfound"; reason: string };

/** Pull a certificate code out of a QR payload (verify URL or bare code). */
function extractCode(text: string): string | null {
  const t = text.trim();
  // Full verify URL: https://domain/v/CODE
  const m = t.match(/\/v\/([A-Za-z0-9][A-Za-z0-9\-_]{3,40})/);
  if (m?.[1]) return m[1];
  // Bare code: e.g. MJCA-DCA-2026-000123 or INST-2026-XXXXXXXXXX
  if (/^[A-Z]{2,8}-[A-Z0-9]{2,8}-\d{4}-[A-Z0-9]{4,12}$/.test(t)) return t;
  if (/^[A-Z0-9]{4,}-[0-9]{4}-[A-Z0-9]{6,}$/.test(t)) return t;
  return null;
}

/** Scan OCR text for anything shaped like a certificate ID. */
function extractCodeFromOcr(text: string): string | null {
  const patterns = [
    /[A-Z]{2,8}-[A-Z]{2,8}-\d{4}-\d{4,8}/g, // MJCA-DCA-2026-000123
    /[A-Z]{2,8}-\d{4}-[A-Z0-9]{8,12}/g, // INST-2026-XXXXXXXXXX
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

async function decodeQrFromImage(img: HTMLImageElement): Promise<string | null> {
  const canvas = document.createElement("canvas");
  // Downscale huge photos — QR decode doesn't need 12MP, and it keeps
  // the pixel loop fast on phones.
  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(data.data, data.width, data.height);
  return result?.data ?? null;
}

export default function VerifyPhotoPage() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setStatus({ kind: "reading" });
    setPreview(URL.createObjectURL(file));

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });

    // Step 1: QR decode.
    setStatus({ kind: "qr" });
    try {
      const qrText = await decodeQrFromImage(img);
      if (qrText) {
        const code = extractCode(qrText);
        if (code) {
          setStatus({ kind: "found", code });
          // Small beat so the user sees what was found before redirect.
          setTimeout(() => {
            window.location.href = `/v/${encodeURIComponent(code)}`;
          }, 900);
          return;
        }
      }
    } catch {
      // fall through to OCR
    }

    // Step 2: OCR fallback — look for a certificate ID in the text.
    setStatus({ kind: "ocr" });
    try {
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const code = extractCodeFromOcr(data.text.toUpperCase());
      if (code) {
        setStatus({ kind: "found", code });
        setTimeout(() => {
          window.location.href = `/v/${encodeURIComponent(code)}`;
        }, 900);
        return;
      }
      setStatus({
        kind: "notfound",
        reason:
          "No QR code or certificate ID found in this photo. Try a clearer, straight-on photo — or type the certificate code manually below.",
      });
    } catch {
      setStatus({
        kind: "notfound",
        reason: "Couldn't read this photo. Try a clearer image, or type the certificate code manually below.",
      });
    }
  };

  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      <div className="text-center">
        <Link href="/" className="text-sm font-semibold">
          {BRAND.name}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Verify from a photo</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Upload a photo of the certificate — we&apos;ll read its QR code (or certificate ID)
          and check it against the official record. The photo never leaves your device.
        </p>
      </div>

      <Card className="mt-8 p-6">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        {preview && (
          <img src={preview} alt="Uploaded certificate" className="mb-4 max-h-64 w-full rounded object-contain" />
        )}

        {status.kind === "idle" && (
          <Button className="w-full" onClick={() => inputRef.current?.click()}>
            Upload certificate photo
          </Button>
        )}
        {status.kind === "reading" && <p className="text-center text-sm">Reading photo…</p>}
        {status.kind === "qr" && <p className="text-center text-sm">Looking for a QR code…</p>}
        {status.kind === "ocr" && (
          <p className="text-center text-sm">No QR found — reading the certificate ID from the photo…</p>
        )}
        {status.kind === "found" && (
          <div className="text-center">
            <p className="font-semibold text-green-700 dark:text-green-400">Found certificate {status.code}</p>
            <p className="mt-1 text-sm text-neutral-500">Opening its verification page…</p>
          </div>
        )}
        {status.kind === "notfound" && (
          <div className="text-center">
            <p className="text-sm text-red-700 dark:text-red-400">{status.reason}</p>
            <Button className="mt-4" variant="outline" onClick={() => inputRef.current?.click()}>
              Try another photo
            </Button>
          </div>
        )}
      </Card>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Have the code?{" "}
        <Link href="/v" className="underline underline-offset-2">
          Verify it directly
        </Link>
      </p>
    </main>
  );
}
