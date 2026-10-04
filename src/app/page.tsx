import type { CSSProperties } from "react";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VerifyCodeBox } from "@/components/verify-code-box";
import { LeadForm } from "@/components/lead-form";
import { VisitBeacon } from "@/components/visit-beacon";
import {
  CertificateIcon,
  ShieldCheckIcon,
  GraduationCapIcon,
  QrCodeIcon,
  SparkleIcon,
} from "@/components/icons";

// Landing page — feature-first MVP pivot (2026-09-10, explicit user
// instruction). Pure server-rendered marketing page: no data fetching, so
// it's the "free/easy" piece with zero backend risk, built first per the
// user's own priority order. Motion is plain CSS (globals.css) — no new
// animation dependency.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-neutral-0 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <SiteHeader />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <StatsSection />
      <VerifySection />
      <LeadSection />
      <FaqSection />
      <SiteFooter />
      <VisitBeacon />
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200/60 bg-neutral-0/80 backdrop-blur dark:border-neutral-800/60 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">
          {BRAND.name}
        </span>
        {/* QA audit findings D5/G1: consolidated onto one consistent pair
            of labels ("Student sign in" / "Institute admin sign in") used
            identically in the nav, hero CTAs, cross-links, and page
            headings — previously five different labels described these
            same two destinations across the app. */}
        <nav className="flex items-center gap-2">
          <Link href="/student/login">
            <Button variant="ghost" size="sm">
              Student sign in
            </Button>
          </Link>
          <Link href="/admin/login">
            <Button variant="outline" size="sm">
              Institute admin sign in
            </Button>
          </Link>
          <Link href="/institute/register">
            <Button size="sm">Register institute</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-20 sm:pt-28">
      {/* Ambient gradient blobs, decorative only */}
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -right-16 top-10 h-80 w-80 rounded-full bg-brand-600/20 blur-3xl"
        style={{ animationDelay: "-6s" }}
      />

      {/* Floating icons, decorative only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        <CertificateIcon
          className="animate-float absolute left-[8%] top-[18%] h-10 w-10 text-brand-500/70"
          style={{ "--float-duration": "7s" } as CSSProperties}
        />
        <ShieldCheckIcon
          className="animate-float absolute right-[12%] top-[28%] h-12 w-12 text-success-500/70"
          style={{ "--float-duration": "8s", "--float-rot": "-6deg", animationDelay: "-2s" } as CSSProperties}
        />
        <GraduationCapIcon
          className="animate-float absolute left-[18%] top-[62%] h-11 w-11 text-brand-600/60"
          style={{ "--float-duration": "6.5s", animationDelay: "-4s" } as CSSProperties}
        />
        <QrCodeIcon
          className="animate-float absolute right-[20%] top-[68%] h-9 w-9 text-neutral-400"
          style={{ "--float-duration": "9s", "--float-rot": "8deg", animationDelay: "-1s" } as CSSProperties}
        />
        <SparkleIcon
          className="animate-float absolute left-[45%] top-[8%] h-5 w-5 text-brand-400"
          style={{ "--float-duration": "5s", animationDelay: "-3s" } as CSSProperties}
        />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="animate-fade-in-up mb-4 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          <SparkleIcon className="h-3.5 w-3.5 text-brand-500" />
          Digital certificates institutes can trust
        </span>
        <h1
          className="animate-fade-in-up text-4xl font-bold tracking-tight sm:text-5xl"
          style={{ animationDelay: "0.08s" }}
        >
          {BRAND.name}
        </h1>
        <p
          className="animate-fade-in-up mt-2 text-lg font-medium text-brand-600 dark:text-brand-400"
          style={{ animationDelay: "0.14s" }}
        >
          {BRAND.tagline}
        </p>
        <p
          className="animate-fade-in-up mt-5 max-w-xl text-balance text-neutral-600 dark:text-neutral-400"
          style={{ animationDelay: "0.2s" }}
        >
          Register students once. Every certificate gets a unique code the
          moment it&apos;s issued — students download their own PDF, and
          anyone can confirm it&apos;s genuine in seconds, no login required.
        </p>
        <div
          className="animate-fade-in-up mt-8 flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: "0.26s" }}
        >
          {/* QA audit finding D6: "View my certificate" linked to a login
              form, not a certificate — clicking it started a sign-in flow,
              not the thing it promised. Reworded to match what actually
              happens next; label matches the nav/G1 pair exactly. */}
          <Link href="/student/login">
            <Button size="lg">Student sign in</Button>
          </Link>
          <Link href="/admin/login">
            <Button size="lg" variant="outline">
              Institute admin sign in
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    { icon: CertificateIcon, label: "Issue", copy: "Register a student, a certificate exists instantly." },
    { icon: ShieldCheckIcon, label: "Verify", copy: "One code, publicly checkable, no account needed." },
    { icon: GraduationCapIcon, label: "Trust", copy: "Students see and download their own record anytime." },
  ];
  return (
    <section className="border-y border-neutral-200 bg-neutral-50 px-6 py-12 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
        {items.map(({ icon: Icon, label, copy }) => (
          <Card key={label} className="flex flex-col items-center gap-2 p-6 text-center">
            <Icon className="h-8 w-8 text-brand-600 dark:text-brand-400" />
            <h3 className="font-semibold">{label}</h3>
            <p className="text-sm text-neutral-500">{copy}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "1",
      title: "Admin registers the student",
      copy:
        "Name, course, and every detail the certificate needs — captured once, at registration.",
    },
    {
      n: "2",
      title: "Student gets login access",
      copy: "A student ID and password to sign in and see their own record.",
    },
    {
      n: "3",
      title: "Certificate + code, ready",
      copy:
        "A unique verification code is generated straight from the registration — download as PDF anytime.",
    },
    {
      n: "4",
      title: "Anyone can verify it",
      copy:
        "Share the code or the link — verification shows only what's needed to confirm it's real.",
    },
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <h2 className="mb-10 text-center text-2xl font-semibold sm:text-3xl">
        How it works
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="flex flex-col gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900">
              {s.n}
            </span>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="text-sm text-neutral-500">{s.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function VerifySection() {
  return (
    <section className="border-t border-neutral-200 px-6 py-20 dark:border-neutral-800">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <ShieldCheckIcon className="h-10 w-10 text-brand-600 dark:text-brand-400" />
        <h2 className="text-2xl font-semibold sm:text-3xl">
          Already have a certificate code?
        </h2>
        {/* QA audit finding G3: "Certificate verification" is now the one
            noun phrase used for this feature everywhere it's named — this
            line varies only in its explanatory sentence, matching the
            /v/[code] page heading and the "Verify" trust-strip pillar. */}
        <p className="text-neutral-500">
          Certificate verification is public — no sign-in needed.
        </p>
        <VerifyCodeBox />
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "2", label: "Free downloads per certificate" },
    { value: "₹299", label: "Platform fee per re-download" },
    { value: "0", label: "Logins needed to verify" },
  ];
  return (
    <section className="border-t border-neutral-200 px-6 py-16 dark:border-neutral-800">
      <div className="mx-auto grid max-w-4xl gap-8 text-center sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-4xl font-bold tracking-tight">{s.value}</div>
            <div className="mt-2 text-sm text-neutral-500">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LeadSection() {
  return (
    <section className="border-t border-neutral-200 px-6 py-20 dark:border-neutral-800">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Institute chalate ho? Baat karte hain.
          </h2>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Apna naam aur number chhodo — hamari team call karke Certivo ka demo
            degi aur aapke institute ka setup free mein karegi. Koi spam nahi,
            sirf kaam ki baat.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li>✓ 10 minute mein pehla verified certificate</li>
            <li>✓ QR + photo verification included</li>
            <li>✓ Hindi/English support</li>
          </ul>
        </div>
        <LeadForm />
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    {
      q: "How does certificate verification work?",
      a: "Every certificate carries a unique code. Anyone can enter that code on this site — no login needed — and instantly see whether it's genuine and active, or revoked.",
    },
    {
      q: "How many times can a student download their certificate?",
      a: "Two downloads are included. After that, a ₹299 platform fee unlocks two more downloads, and so on — the student's institute never has to be involved again.",
    },
    {
      q: "How does my institute get started?",
      a: "Register your institute above — a Super Admin reviews and approves it. Once approved, sign in and register your students; certificates are generated automatically at registration.",
    },
    {
      q: "Can a revoked certificate still be verified?",
      a: "A revoked certificate shows a clear 'Revoked — no longer valid' state on its verification page, so nobody can pass it off as genuine.",
    },
  ];
  return (
    <section className="border-t border-neutral-200 px-6 py-20 dark:border-neutral-800">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-8 text-center text-2xl font-semibold sm:text-3xl">
          Frequently asked questions
        </h2>
        <div className="flex flex-col gap-4">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <summary className="cursor-pointer font-medium marker:text-neutral-400">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 px-6 py-10 dark:border-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-sm text-neutral-500 sm:flex-row sm:justify-between">
        <div>
          <span className="font-semibold text-neutral-900 dark:text-neutral-50">{BRAND.name}</span>
          {" · "}
          {BRAND.tagline}
        </div>
        <nav className="flex gap-5">
          <Link href="/institute/register" className="hover:underline">
            Register institute
          </Link>
          <Link href="/directory" className="hover:underline">
            Directory
          </Link>
          <Link href="/verify-photo" className="hover:underline">
            Verify from photo
          </Link>
          <Link href="/student/login" className="hover:underline">
            Student sign in
          </Link>
          <Link href="/admin/login" className="hover:underline">
            Institute admin sign in
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-4 max-w-6xl text-center text-xs text-neutral-400 sm:text-left">
        {BRAND.legalName} · {BRAND.supportEmail}
      </p>
    </footer>
  );
}
