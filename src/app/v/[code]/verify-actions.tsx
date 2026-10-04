"use client";

// src/app/v/[code]/verify-actions.tsx
//
// Client-side actions on the public verify page: copy code/link, share via
// WhatsApp/LinkedIn/email, and "verify another" (inline code entry). The
// page itself stays a server component — only this interactive slice is
// client-rendered.
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND } from "@/config/brand";
import { linkedInAddToProfileUrl } from "@/lib/linkedin";

export function VerifyActions({
  code,
  studentName,
  courseName,
  instituteName,
  issueDate,
  compact,
  notFound,
}: {
  code: string;
  studentName: string;
  courseName?: string;
  instituteName?: string;
  issueDate?: Date;
  compact?: boolean;
  notFound?: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [anotherCode, setAnotherCode] = useState("");
  const verifyUrl = `${BRAND.domain}/v/${encodeURIComponent(code)}`;
  const fullUrl = `https://${verifyUrl}`;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API unavailable (old browser / insecure context) — fall
      // back to a prompt the user can copy from manually.
      window.prompt("Copy:", text);
      return;
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  };

  const shareText = notFound
    ? `Certificate verification: ${fullUrl}`
    : `Verified certificate of ${studentName} — check it here: ${fullUrl}`;

  const linkedInUrl =
    !notFound && courseName && instituteName && issueDate
      ? linkedInAddToProfileUrl({
          courseName,
          instituteName,
          certificateCode: code,
          issueDate,
        })
      : null;

  return (
    <div className="mt-5 flex flex-col gap-3">
      {!compact && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => copy(code, "code")}>
            {copied === "code" ? "Copied!" : "Copy code"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => copy(fullUrl, "link")}>
            {copied === "link" ? "Copied!" : "Copy link"}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
        >
          <Button size="sm" variant="outline">
            WhatsApp
          </Button>
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`}
          target="_blank"
          rel="noreferrer"
        >
          <Button size="sm" variant="outline">
            LinkedIn
          </Button>
        </a>
        {linkedInUrl && (
          <a href={linkedInUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline">
              Add to LinkedIn profile
            </Button>
          </a>
        )}
        <a href={`mailto:?subject=${encodeURIComponent("Certificate verification")}&body=${encodeURIComponent(shareText)}`}>
          <Button size="sm" variant="outline">
            Email
          </Button>
        </a>
      </div>
      <form
        className="mt-1 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const c = anotherCode.trim();
          if (c) window.location.href = `/v/${encodeURIComponent(c)}`;
        }}
      >
        <Input
          value={anotherCode}
          onChange={(e) => setAnotherCode(e.target.value)}
          placeholder="Verify another code…"
          aria-label="Verify another certificate code"
          className="font-mono"
        />
        <Button type="submit" variant="outline">
          Verify
        </Button>
      </form>
      <p className="text-center text-xs text-neutral-400">
        <Link href="/" className="underline underline-offset-2">
          Back to {BRAND.name} home
        </Link>
      </p>
    </div>
  );
}
