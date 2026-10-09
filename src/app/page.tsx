import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { BRAND } from "@/config/brand";
import {
  resolveBranding,
  type ResolvedBranding,
} from "@/server/branding/resolve-branding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VerifyCodeBox } from "@/components/verify-code-box";
import { LeadForm } from "@/components/lead-form";
import { VisitBeacon } from "@/components/visit-beacon";
import { Reveal } from "@/components/landing/reveal";
import { CountUp } from "@/components/landing/count-up";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import {
  CertificateIcon,
  ShieldCheckIcon,
  GraduationCapIcon,
  QrCodeIcon,
  SparkleIcon,
} from "@/components/icons";

// Landing page — REDESIGN v2 (2026-10-05): visual polish ported from
// demo/certivo-demo-redesigned.html — gradient hero with live certificate
// visual, scroll-reveal sections, animated stat counters, template showcase
// with the 10 real thumbnails, smooth FAQ accordion, rich footer.
// Motion is plain CSS + tiny client components (landing/) — no new
// animation dependency.
//
// 2026-10-05: white-label support. When reached via a tenant's customDomain
// or subdomain (middleware sets x-white-label-tenant), the page renders
// with THAT institute's name/logo instead of Certivo branding.
export default async function Home() {
  const h = await headers();
  const hostname = h.get("x-hostname");
  const branding = await resolveBranding(hostname).catch(() => null);
  const brand = branding ?? {
    tenantId: null,
    name: BRAND.name,
    tagline: BRAND.tagline,
    logoUrl: null,
    primaryColor: "#0F172A",
    hidePoweredBy: false,
    isWhiteLabel: false,
  };
  // White-label: expose the institute's brand color as a CSS variable so
  // key accents (header dot, hero badge) can pick it up via inline style.
  const wlStyle = brand.isWhiteLabel
    ? ({ "--wl-primary": brand.primaryColor } as CSSProperties)
    : undefined;
  return (
    <main
      className="flex min-h-screen flex-col bg-neutral-0 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50"
      style={wlStyle}
    >
      <SiteHeader brand={brand} />
      <Hero brand={brand} />
      <TrustStrip />
      <HowItWorks />
      <StatsSection />
      <VerifySection />
      <LeadSection />
      <FaqSection />
      <SiteFooter brand={brand} />
      <VisitBeacon />
      {/* Floating WhatsApp support — research: must-have for Indian customers */}
      <a
        href="https://wa.me/919999999999?text=Hi%20Certivo%2C%20I%20need%20help"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </main>
  );
}

function SiteHeader({ brand }: { brand: ResolvedBranding }) {
  const dotStyle = brand.isWhiteLabel
    ? ({ backgroundColor: "var(--wl-primary)" } as CSSProperties)
    : undefined;
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200/60 bg-neutral-0/80 backdrop-blur dark:border-neutral-800/60 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className="h-8 w-auto max-w-[120px] object-contain" />
          ) : (
            <span
              aria-hidden
              style={dotStyle}
              className="h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_4px_var(--color-brand-500)]/20"
            />
          )}
          <span className="text-lg font-bold tracking-tight">
            {brand.name}
          </span>
        </Link>
        {/* QA audit findings D5/G1: consolidated onto one consistent pair
            of labels ("Student sign in" / "Institute admin sign in") used
            identically in the nav, hero CTAs, cross-links, and page
            headings — previously five different labels described these
            same two destinations across the app. */}
        <nav className="flex items-center gap-2">
          <Link href="/pricing">
            <Button variant="ghost" size="sm">
              Pricing
            </Button>
          </Link>
          <Link href="/student/login" className="hidden sm:inline-block">
            <Button variant="ghost" size="sm">
              Student sign in
            </Button>
          </Link>
          <Link href="/admin/login">
            <Button variant="outline" size="sm">
              Institute admin sign in
            </Button>
          </Link>
          {!brand.isWhiteLabel && (
            <Link href="/super-admin/login" className="hidden md:inline-block">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ShieldCheckIcon className="h-4 w-4" />
                Super Admin
              </Button>
            </Link>
          )}
          <Link href="/institute/register">
            <Button size="sm">Register institute</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero({ brand }: { brand: ResolvedBranding }) {
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-20 sm:pt-24">
      {/* Ambient gradient wash + drifting blobs, decorative only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-brand-500/[0.07] via-brand-500/[0.03] to-transparent"
      />
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
        <span className="animate-fade-in-up mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-500/25 bg-brand-500/[0.06] px-3.5 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
          <SparkleIcon className="h-3.5 w-3.5" />
          Digital certificates institutes can trust
        </span>
        <h1
          className="animate-fade-in-up text-4xl font-extrabold tracking-tight sm:text-6xl"
          style={{ animationDelay: "0.08s" }}
        >
          {brand.name} —{" "}
          <span className="text-gradient-brand">certificates</span> that prove
          themselves
        </h1>
        <p
          className="animate-fade-in-up mt-3 text-lg font-medium text-brand-600 dark:text-brand-400"
          style={{ animationDelay: "0.14s" }}
        >
          {brand.tagline || BRAND.tagline}
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
          <Link href="/admin/login">
            <Button size="lg" variant="outline">
              Institute admin sign in
            </Button>
          </Link>
        </div>

        {/* Live certificate visual — free Classic Simple template as sample */}
        <div
          className="animate-fade-in-up mt-12 w-full max-w-2xl"
          style={{ animationDelay: "0.36s" }}
        >
          <div className="animate-float relative" style={{ "--float-duration": "8s" } as CSSProperties}>
            <Image
              src="/templates/classic-simple.png"
              alt="Sample certificate"
              width={600}
              height={424}
              priority
              className="w-full rounded-xl shadow-2xl ring-1 ring-neutral-900/10 dark:ring-white/10"
            />
            <span className="absolute left-4 top-4 rounded-md bg-neutral-900/80 px-3 py-1 text-xs font-bold tracking-widest text-white">
              DEMO
            </span>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            Sample certificate — this is how it will look with your institute&apos;s branding
          </p>
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
    <section className="border-y border-neutral-200 bg-neutral-50 px-6 py-14 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
        {items.map(({ icon: Icon, label, copy }, i) => (
          <Reveal key={label} delay={i * 80}>
            <Card className="card-hover flex h-full flex-col items-center gap-2 p-7 text-center">
              <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="font-bold">{label}</h3>
              <p className="text-sm text-neutral-500">{copy}</p>
            </Card>
          </Reveal>
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
      copy: "Name, course, and every detail the certificate needs — captured once, at registration.",
    },
    {
      n: "2",
      title: "Student gets login access",
      copy: "A student ID and password to sign in and see their own record.",
    },
    {
      n: "3",
      title: "Certificate + code, ready",
      copy: "A unique verification code is generated straight from the registration — download as PDF anytime.",
    },
    {
      n: "4",
      title: "Anyone can verify it",
      copy: "Share the code or the link — verification shows only what's needed to confirm it's real.",
    },
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">
          Process
        </p>
        <h2 className="mb-10 mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          How it works
        </h2>
      </Reveal>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 80}>
            <div className="relative flex h-full flex-col gap-2 rounded-xl border border-transparent p-4 transition hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-900/40">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-sm font-bold text-white shadow-md">
                {s.n}
              </span>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-neutral-500">{s.copy}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { target: 1, prefix: "", suffix: "", label: "Free download per certificate" },
    { target: 299, prefix: "₹", suffix: "", label: "Platform fee per re-download" },
    { target: 0, prefix: "", suffix: "", label: "Logins needed to verify" },
    { target: 10, prefix: "", suffix: "", label: "Professional templates" },
  ];
  return (
    <section className="border-y border-neutral-200 bg-gradient-to-b from-brand-500/[0.05] to-transparent px-6 py-16 dark:border-neutral-800">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div className="text-4xl font-extrabold tracking-tight text-brand-600 dark:text-brand-400">
              <CountUp target={s.target} prefix={s.prefix} suffix={s.suffix} />
            </div>
            <div className="mt-2 text-sm text-neutral-500">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function VerifySection() {
  return (
    <section id="verify" className="px-6 py-20">
      <Reveal>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-brand-500/20 bg-gradient-to-b from-brand-500/[0.07] to-transparent p-8 text-center sm:p-10">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <ShieldCheckIcon className="h-7 w-7" />
          </span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
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
      </Reveal>
    </section>
  );
}

function LeadSection() {
  return (
    <section id="lead" className="scroll-mt-20 border-t border-neutral-200 px-6 py-20 dark:border-neutral-800">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">
              For institutes
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Run an institute? Let&apos;s talk.
            </h2>
            <p className="mt-3 text-neutral-600 dark:text-neutral-400">
              Leave your name and number — our team will call you with a live
              Certivo demo and set up your institute for free. No spam, just
              business.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-neutral-600 dark:text-neutral-400">
              {[
                "First verified certificate in 10 minutes",
                "QR + photo verification included",
                "10 professional templates, Hindi/English support",
              ].map((li) => (
                <li key={li} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-600">
                    ✓
                  </span>
                  {li}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <LeadForm />
        </Reveal>
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
      a: "One download is included free. After that, a ₹299 platform fee unlocks one more download, and so on — the student's institute never has to be involved again.",
    },
    {
      q: "How does my institute get started?",
      a: "Register your institute above — a Super Admin reviews and approves it. Once approved, sign in and register your students; certificates are generated automatically at registration.",
    },
    {
      q: "Can a revoked certificate still be verified?",
      a: "A revoked certificate shows a clear 'Revoked — no longer valid' state on its verification page, so nobody can pass it off as genuine.",
    },
    {
      q: "Which certificate designs are available?",
      a: "10 professional templates — Classic Simple is free forever, and 9 premium designs unlock with a one-time fee per institute. Every template renders as a print-ready PDF with QR.",
    },
  ];
  return (
    <section className="border-t border-neutral-200 px-6 py-20 dark:border-neutral-800">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">
            FAQ
          </p>
          <h2 className="mb-8 mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <FaqAccordion faqs={faqs} />
        </Reveal>
      </div>
    </section>
  );
}

function SiteFooter({ brand }: { brand: ResolvedBranding }) {
  const cols: { h: string; links: { label: string; href: string }[] }[] = [
    {
      h: "Verify",
      links: [
        { label: "Verify a certificate", href: "/#verify" },
        { label: "Verify from photo", href: "/verify-photo" },
        { label: "Public directory", href: "/directory" },
      ],
    },
    {
      h: "Institute",
      links: [
        { label: "Register institute", href: "/institute/register" },
        { label: "Institute admin sign in", href: "/admin/login" },
        { label: "Certificate templates", href: "/admin/templates" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      h: "Student",
      links: [
        { label: "Student sign in", href: "/student/login" },
      ],
    },
    // White-label hides the platform column (Super Admin link) — the
    // institute's own domain shouldn't advertise the platform.
    ...(brand.isWhiteLabel
      ? []
      : [
          {
            h: "Platform",
            links: [{ label: "Super Admin", href: "/super-admin/login" }],
          },
        ]),
  ];
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={brand.name} className="h-8 w-auto max-w-[120px] object-contain" />
            ) : (
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_4px_var(--color-brand-500)]/20"
              />
            )}
            <span className="text-lg font-bold tracking-tight">{brand.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
            {brand.tagline || BRAND.tagline} Digital certificates with public verification —
            issue once, trust forever.
          </p>
        </div>
        {cols.map((c) => (
          <nav key={c.h} aria-label={c.h}>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">
              {c.h}
            </h4>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-neutral-500 transition hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-neutral-400 sm:flex-row">
          <span>
            {brand.isWhiteLabel ? brand.name : `${BRAND.legalName} · ${BRAND.supportEmail}`}
            {" · "}
            <Link
              href="/super-admin/login"
              className="transition hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              Platform admin
            </Link>
          </span>
          <span>
            Certificates never expire · Verification is always free
            {!brand.hidePoweredBy && (
              <>
                {" "}· Powered by {BRAND.name}
              </>
            )}
          </span>
        </div>
        {/* Security audit L-4: disclose the anonymous visit counting. */}
        <p className="mx-auto max-w-6xl px-6 pb-4 text-[11px] leading-relaxed text-neutral-400">
          Privacy: we count page visits (IP address and browser type only) to
          improve this site — no personal data is collected on public pages.
        </p>
      </div>
    </footer>
  );
}
