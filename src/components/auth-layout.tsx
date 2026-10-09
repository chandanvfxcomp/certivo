// src/components/auth-layout.tsx
//
// Shared premium shell for every public auth page (student / institute /
// super-admin sign-in, registration, password reset). Light theme: soft
// gradient wash, white card, brand accents. Every page gets a back-to-home
// control and the same trust footer.
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/config/brand";

function ArrowLeftIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function AuthLayout({
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-slate-50 text-neutral-900">
      {/* Backdrop: soft brand wash + faint grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-indigo-100/70 via-brand-50/40 to-transparent" />
        <div className="absolute -top-32 left-[8%] h-[380px] w-[520px] rounded-full bg-indigo-200/40 blur-[120px]" />
        <div className="absolute right-[6%] top-[24%] h-[320px] w-[320px] rounded-full bg-brand-200/40 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,black,transparent)]" />
      </div>

      {/* Top bar: back to home + brand */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-4 py-2 text-sm font-medium text-neutral-600 shadow-sm backdrop-blur transition hover:border-neutral-300 hover:text-neutral-900"
        >
          <ArrowLeftIcon />
          Back to home
        </Link>
        <Link
          href="/"
          aria-label="Back to home"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold tracking-tight text-neutral-700 transition hover:text-neutral-950"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25">
            <ShieldCheckIcon />
          </span>
          {BRAND.name}
        </Link>
      </header>

      {/* Card */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-20 pt-4">
        <div className={cn("w-full", wide ? "max-w-lg" : "max-w-sm")}>
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-[0_24px_70px_-28px_rgba(99,102,241,0.35)]">
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                <ShieldCheckIcon />
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{description}</p>
            </div>
            {children}
            {footer && (
              <div className="mt-6 border-t border-neutral-100 pt-5 text-center text-sm text-neutral-500">
                {footer}
              </div>
            )}
          </div>
          <p className="mt-6 text-center text-xs text-neutral-400">
            Certificates never expire · Verification is always free
          </p>
        </div>
      </div>
    </main>
  );
}
