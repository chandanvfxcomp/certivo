import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VisitBeacon } from "@/components/visit-beacon";
import { Reveal } from "@/components/landing/reveal";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { TEMPLATE_CATALOG } from "@/server/certificates/templates/registry";

export const metadata: Metadata = {
  title: `Pricing — ${BRAND.name}`,
  description:
    "Simple, honest pricing: free verification forever, 2 free downloads per certificate, then ₹299 per download. Premium certificate templates as one-time unlocks. No subscription.",
};

// Pricing page — the real pay-as-you-go model, presented honestly.
// No invented subscription tiers: Free (verification + 2 downloads +
// 1 template), ₹299 per extra download, one-time template unlocks.
export default function PricingPage() {
  const premiumTemplates = TEMPLATE_CATALOG.filter((t) => t.tier === "premium");
  const freeTemplate = TEMPLATE_CATALOG.find((t) => t.tier === "free");

  return (
    <main className="flex min-h-screen flex-col bg-neutral-0 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <PricingHeader />
      <Hero />
      <TrustBar />
      <PricingCards />
      <TemplateTable templates={premiumTemplates} />
      <RegistrationFeeNote />
      <PricingFaq />
      <FinalCta />
      <PricingFooter freeTemplateName={freeTemplate?.name ?? "Classic Simple"} />
      <VisitBeacon />
    </main>
  );
}

function PricingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200/60 bg-neutral-0/80 backdrop-blur dark:border-neutral-800/60 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_4px_var(--color-brand-500)]/20"
          />
          <span className="text-lg font-bold tracking-tight">
            {BRAND.name}
          </span>
        </Link>
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
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-brand-100),transparent)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-brand-900),transparent)]"
      />
      <div className="relative mx-auto max-w-4xl px-6 pb-10 pt-16 text-center sm:pt-24">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            Pricing
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Issue certificates for free.
            <br />
            <span className="text-gradient-brand">Pay only when students download.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
            No subscription. No hidden charges. Verification is free forever —
            you only pay a small fee when a student downloads beyond their two
            free downloads.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [
    "No subscription",
    "No hidden charges",
    "Verification always free",
    "Secure payments via Razorpay & UPI",
  ];
  return (
    <section className="border-y border-neutral-200/70 bg-neutral-50 dark:border-neutral-800/70 dark:bg-neutral-900/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-5">
        {items.map((t) => (
          <span
            key={t}
            className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300"
          >
            <span
              aria-hidden
              className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-600"
            >
              ✓
            </span>
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

function PricingCards() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free forever */}
        <Reveal>
          <Card className="card-hover flex h-full flex-col p-7">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">
              Free forever
            </h2>
            <p className="mt-3 text-4xl font-extrabold tracking-tight">
              ₹0
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Everything you need to start issuing verified certificates.
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              <li className="flex gap-2.5">
                <Check /> Verification by code, QR &amp; photo — unlimited, forever
              </li>
              <li className="flex gap-2.5">
                <Check /> 2 free downloads per certificate
              </li>
              <li className="flex gap-2.5">
                <Check /> 1 professional template (Classic Simple)
              </li>
              <li className="flex gap-2.5">
                <Check /> Certificates never expire
              </li>
              <li className="flex gap-2.5">
                <Check /> Bulk CSV issuance
              </li>
            </ul>
            <Link href="/institute/register" className="mt-7">
              <Button variant="outline" className="w-full">
                Start free
              </Button>
            </Link>
          </Card>
        </Reveal>

        {/* Downloads — the core paid unit */}
        <Reveal delay={80}>
          <Card className="card-hover relative flex h-full flex-col border-2 border-brand-500 p-7 shadow-lg">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Most popular
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Extra downloads
            </h2>
            <p className="mt-3 text-4xl font-extrabold tracking-tight">
              ₹299
              <span className="text-base font-medium text-neutral-500">
                {" "}
                / download
              </span>
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              After the 2 free downloads, each additional download costs a
              flat ₹299.
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              <li className="flex gap-2.5">
                <Check /> First 2 downloads per certificate are free
              </li>
              <li className="flex gap-2.5">
                <Check /> Flat ₹299 per download after that — no tiers, no surprises
              </li>
              <li className="flex gap-2.5">
                <Check /> Student pays at download time via Razorpay / UPI
              </li>
              <li className="flex gap-2.5">
                <Check /> Email confirmation on every download
              </li>
            </ul>
            <Link href="/institute/register" className="mt-7">
              <Button className="w-full">Register institute</Button>
            </Link>
          </Card>
        </Reveal>

        {/* Templates */}
        <Reveal delay={160}>
          <Card className="card-hover flex h-full flex-col p-7">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">
              Premium templates
            </h2>
            <p className="mt-3 text-4xl font-extrabold tracking-tight">
              ₹499<span className="text-neutral-400">–</span>₹999
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              One-time unlock per institute. Yours forever — no renewal.
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              <li className="flex gap-2.5">
                <Check /> 9 premium designs, one-time fee each
              </li>
              <li className="flex gap-2.5">
                <Check /> Unlock once, use on unlimited certificates
              </li>
              <li className="flex gap-2.5">
                <Check /> Watermarked preview before you buy
              </li>
              <li className="flex gap-2.5">
                <Check /> Free template included forever
              </li>
            </ul>
            <a href="#templates" className="mt-7">
              <Button variant="outline" className="w-full">
                See all templates
              </Button>
            </a>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

function Check() {
  return (
    <span
      aria-hidden
      className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-600"
    >
      ✓
    </span>
  );
}

function TemplateTable({
  templates,
}: {
  templates: { id: string; name: string; blurb: string; pricePaise: number }[];
}) {
  const inr = (paise: number) =>
    `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return (
    <section id="templates" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 pb-14 sm:pb-20">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            Template gallery
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            One-time unlocks. Yours forever.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-600 dark:text-neutral-400">
            Pick a design that matches your institute&apos;s prestige. Pay once
            per template — use it on every certificate you ever issue. No
            subscription, no renewal.
          </p>
        </div>
      </Reveal>
      <div className="mt-10 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60">
              <th className="px-5 py-4 font-bold">Template</th>
              <th className="hidden px-5 py-4 font-bold sm:table-cell">Style</th>
              <th className="px-5 py-4 text-right font-bold">One-time price</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t, i) => (
              <tr
                key={t.id}
                className={
                  i % 2 === 1
                    ? "bg-neutral-50/60 dark:bg-neutral-900/30"
                    : undefined
                }
              >
                <td className="px-5 py-4">
                  <span className="font-semibold">{t.name}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500 sm:hidden">
                    {t.blurb}
                  </span>
                </td>
                <td className="hidden px-5 py-4 text-neutral-500 sm:table-cell">
                  {t.blurb}
                </td>
                <td className="px-5 py-4 text-right font-bold">
                  {inr(t.pricePaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-center text-xs text-neutral-400">
        Prices are one-time per institute, inclusive of all taxes as applicable.
        Preview any template with a watermark before unlocking.
      </p>
    </section>
  );
}

function RegistrationFeeNote() {
  return (
    <section className="border-y border-neutral-200/70 bg-neutral-50 dark:border-neutral-800/70 dark:bg-neutral-900/40">
      <div className="mx-auto max-w-4xl px-6 py-12 text-center">
        <Reveal>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Institutes can also set a student registration fee
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
            Need to collect a one-time registration fee from students? Set it
            in your institute settings. Students pay once, get an automatic
            invoice, and download access activates after your approval. Set it
            to ₹0 and everything stays free and instant.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function PricingFaq() {
  const faqs = [
    {
      q: "What happens after the 2 free downloads?",
      a: "Every certificate includes 2 free downloads. From the 3rd download onwards, the student pays a flat ₹299 per download at checkout (Razorpay / UPI). There are no tiers or volume traps — it is always ₹299.",
    },
    {
      q: "Do certificates expire?",
      a: "Never. Certificates issued on Certivo do not expire. Verification links and QR codes keep working forever, at no cost.",
    },
    {
      q: "Is verification really free?",
      a: "Yes — always. Anyone can verify a certificate by code, QR scan, or photo upload, unlimited times, without an account and without paying anything.",
    },
    {
      q: "How do premium templates work?",
      a: "One template (Classic Simple) is free forever. The 9 premium designs unlock with a one-time fee per institute (₹499–₹999 depending on the design). Once unlocked, a template can be used on unlimited certificates — you never pay again for it.",
    },
    {
      q: "What about refunds?",
      a: "Template unlocks are previewed with a watermark before purchase, so you know exactly what you are getting. Download fees are charged per download at the moment of download. If a payment fails or a download does not complete, contact support and we will make it right.",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
            Pricing questions, answered
          </h2>
        </div>
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-8">
          <FaqAccordion faqs={faqs} />
        </div>
      </Reveal>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-neutral-200/70 dark:border-neutral-800/70">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_100%,var(--color-brand-100),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_100%,var(--color-brand-900),transparent)]"
      />
      <div className="relative mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
        <Reveal>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Start issuing verified certificates today.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-600 dark:text-neutral-400">
            Free to start, free to verify, and you only pay when students
            download. Join institutes already building trust with{" "}
            {BRAND.name}.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/institute/register">
              <Button size="lg">Register your institute</Button>
            </Link>
            <Link href="/#lead">
              <Button size="lg" variant="outline">
                Talk to us
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PricingFooter({ freeTemplateName }: { freeTemplateName: string }) {
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
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      h: "Student",
      links: [{ label: "Student sign in", href: "/student/login" }],
    },
    {
      h: "Platform",
      links: [{ label: "Super Admin", href: "/super-admin/login" }],
    },
  ];
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_4px_var(--color-brand-500)]/20"
            />
            <span className="text-lg font-bold tracking-tight">{BRAND.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
            {BRAND.tagline} Simple pricing: free verification, 2 free downloads
            per certificate, then ₹299. {freeTemplateName} template free forever.
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
            {BRAND.legalName} · {BRAND.supportEmail}
          </span>
          <span>Certificates never expire · Verification is always free</span>
        </div>
      </div>
    </footer>
  );
}
