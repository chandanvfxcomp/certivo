"use client";

// src/components/verify-code-box.tsx
//
// The landing page's "verify a certificate" box. /v/[code] is a dynamic
// route so a plain <form action> GET can't target it directly — this is
// the one bit of client interactivity the landing page needs, kept as its
// own small island rather than making the whole page a client component.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VerifyCodeBox() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = code.trim();
        if (trimmed) router.push(`/v/${encodeURIComponent(trimmed)}`);
      }}
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
    >
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        // QA audit finding A9: the example contained "I", a character the
        // code alphabet never produces (Crockford Base32 without
        // I/L/O/U — see src/lib/ulid.ts) — a student who typed the example
        // literally to "test" it would get a confusing not-found instead of
        // recognizing it as just a placeholder. Every character below is
        // one the generator can actually produce.
        placeholder="Enter certificate code, e.g. TSTA-2026-ABCDEFGHJK"
        aria-label="Certificate code"
        className="flex-1"
      />
      <Button type="submit">Verify</Button>
    </form>
  );
}
