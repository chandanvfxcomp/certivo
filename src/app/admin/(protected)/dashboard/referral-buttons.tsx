"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Copy-to-clipboard button with "Copied" feedback. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API unavailable (old browser / non-secure context) —
      // fall back to a prompt-less textarea select+copy.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy}>
      {copied ? "Copied!" : label}
    </Button>
  );
}

/** WhatsApp share button — opens wa.me with the referral message. */
export function WhatsAppShareButton({ shareUrl }: { shareUrl: string }) {
  const message = `Join me on Certivo — issue tamper-proof digital certificates for your institute. Register with my link: ${shareUrl}`;
  const href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Button type="button" size="sm" className="bg-[#25D366] text-white hover:bg-[#1fb857]">
        Share on WhatsApp
      </Button>
    </a>
  );
}
