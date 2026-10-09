"use client";

// src/components/site-nav.tsx
//
// Homepage primary nav: Home · Pricing · Student · Institute · FAQ.
// Student and Institute are direct links to hub pages (/student,
// /institute) that hold each audience's destinations — no dropdowns.
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "Student", href: "/student" },
  { label: "Institute", href: "/institute" },
  { label: "FAQ", href: "/#faq" },
];

function MobileLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      {label}
    </Link>
  );
}

export function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Button variant="ghost" size="sm">
              {l.label}
            </Button>
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </Button>
        {mobileOpen && (
          <nav
            aria-label="Mobile"
            className="absolute inset-x-0 top-full z-30 flex flex-col border-b border-neutral-200 bg-white/95 px-6 pb-6 pt-2 shadow-xl backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
          >
            {NAV_LINKS.map((l) => (
              <MobileLink key={l.href} href={l.href} label={l.label} onNavigate={close} />
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
