// src/components/auth-layout.tsx
//
// Shared premium shell for every public auth page (student / institute /
// super-admin sign-in, registration, password reset). One dark, branded
// backdrop; every page gets a back-to-home control and the same trust
// footer — no more plain cards floating on grey.
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
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-white">
      {/* Backdrop: brand glows + faint grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[140px]" />
        <div className="absolute -bottom-24 left-[8%] h-[380px] w-[540px] rounded-full bg-brand-500/15 blur-[130px]" />
        <div className="absolute right-[6%] top-[28%] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,black,transparent)]" />
      </div>

      {/* Top bar: back to home + brand */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-300 backdrop-blur transition hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeftIcon />
          Back to home
        </Link>
        <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-200">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-indigo-600 text-white shadow-lg shadow-indigo-500/30">
            <ShieldCheckIcon />
          </span>
          {BRAND.name}
        </span>
      </header>

      {/* Card */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-20 pt-4">
        <div className={cn("w-full", wide ? "max-w-lg" : "max-w-sm")}>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_90px_-24px_rgba(99,102,241,0.45)] backdrop-blur-xl">
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-indigo-600 text-white shadow-lg shadow-indigo-500/40">
                <ShieldCheckIcon />
              </span>
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{description}</p>
            </div>
            {children}
            {footer && (
              <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-neutral-400">
                {footer}
              </div>
            )}
          </div>
          <p className="mt-6 text-center text-xs text-neutral-500">
            Certificates never expire · Verification is always free
          </p>
        </div>
      </div>
    </main>
  );
}
