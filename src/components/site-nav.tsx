"use client";

// src/components/site-nav.tsx
//
// Homepage primary nav: Home · Pricing · Student ▾ · Institute ▾ · FAQ.
// The two dropdowns group each audience's destinations in one place
// (Student → sign in / forgot password; Institute → sign in / register),
// so the header stays clean instead of growing a button per destination.
// Click-to-toggle works for mouse and touch; Escape / outside-click closes.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STUDENT_LINKS = [
  { label: "Student sign in", href: "/student/login" },
  { label: "Forgot password", href: "/student/forgot-password" },
];

const INSTITUTE_LINKS = [
  { label: "Institute admin sign in", href: "/admin/login" },
  { label: "Register institute", href: "/institute/register" },
];

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

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

function NavDropdown({
  label,
  links,
}: {
  label: string;
  links: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="gap-1"
      >
        {label}
        <ChevronDownIcon className={cn("transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-60 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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

function MobileGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-neutral-400">
      {children}
    </p>
  );
}

export function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
        <Link href="/">
          <Button variant="ghost" size="sm">
            Home
          </Button>
        </Link>
        <Link href="/pricing">
          <Button variant="ghost" size="sm">
            Pricing
          </Button>
        </Link>
        <NavDropdown label="Student" links={STUDENT_LINKS} />
        <NavDropdown label="Institute" links={INSTITUTE_LINKS} />
        <Link href="/#faq">
          <Button variant="ghost" size="sm">
            FAQ
          </Button>
        </Link>
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
            <MobileLink href="/" label="Home" onNavigate={close} />
            <MobileLink href="/pricing" label="Pricing" onNavigate={close} />
            <MobileGroupLabel>Student</MobileGroupLabel>
            <MobileLink href="/student/login" label="Student sign in" onNavigate={close} />
            <MobileLink href="/student/forgot-password" label="Forgot password" onNavigate={close} />
            <MobileGroupLabel>Institute</MobileGroupLabel>
            <MobileLink href="/admin/login" label="Institute admin sign in" onNavigate={close} />
            <MobileLink href="/institute/register" label="Register institute" onNavigate={close} />
            <MobileGroupLabel>Help</MobileGroupLabel>
            <MobileLink href="/#faq" label="FAQ" onNavigate={close} />
          </nav>
        )}
      </div>
    </>
  );
}
