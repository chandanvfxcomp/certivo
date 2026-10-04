import Image from "next/image";
import Link from "next/link";
import { TEMPLATE_CATALOG } from "@/server/certificates/templates/registry";
import { Reveal } from "./reveal";

// Certificate template showcase for the landing page. Renders the 10 REAL
// template thumbnails (public/templates/*.png — actual server-rendered PDF
// designs, not mockups). Royal Heritage — the institute-facing flagship
// design — is featured first and larger; the rest follow in catalog order.
function priceLabel(pricePaise: number) {
  return pricePaise === 0 ? "FREE" : `₹${(pricePaise / 100).toLocaleString("en-IN")}`;
}

export function TemplatesShowcase() {
  const [featured, ...rest] = [
    TEMPLATE_CATALOG.find((t) => t.id === "royal-heritage")!,
    ...TEMPLATE_CATALOG.filter((t) => t.id !== "royal-heritage"),
  ];

  return (
    <section className="border-t border-neutral-200 px-6 py-20 dark:border-neutral-800">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400">
            Certificate templates
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            10 professional designs — 1 free, 9 premium
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
            Har template asli server-generated PDF ka render hai — wahi design
            jo student ke certificate pe print hoga. Free plan mein{" "}
            <strong>Classic Simple</strong> milta hai; premium templates
            one-time fee deke unlock hote hain.
          </p>
        </Reveal>

        {/* Featured: Royal Heritage */}
        <Reveal delay={80} className="mt-10">
          <div className="template-featured overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-2">
              <div className="relative">
                <Image
                  src="/templates/royal-heritage.png"
                  alt="Royal Heritage certificate template"
                  width={600}
                  height={424}
                  className="w-full rounded-lg shadow-xl"
                  loading="lazy"
                />
                <span className="absolute left-3 top-3 rounded-full bg-amber-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
                  Flagship
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold">{featured.name}</h3>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {priceLabel(featured.pricePaise)} one-time
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {featured.blurb} Navy side panel, gold seal, medal ribbon aur
                  QR ke saath — shaandaar certificates ke liye institutes ki
                  pehli pasand.
                </p>
                <Link
                  href="/institute/register"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
                >
                  Is design se shuru karo
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Rest of the catalog */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((t, i) => (
            <Reveal key={t.id} delay={(i % 3) * 80}>
              <div className="card-hover group h-full overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40">
                <div className="relative">
                  <Image
                    src={`/templates/${t.id}.png`}
                    alt={`${t.name} certificate template`}
                    width={600}
                    height={424}
                    className="block aspect-[1.4142] w-full object-cover"
                    loading="lazy"
                  />
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white ${
                      t.tier === "free" ? "bg-emerald-600" : "bg-amber-600"
                    }`}
                  >
                    {priceLabel(t.pricePaise)}
                  </span>
                  {t.tier === "premium" && (
                    <span className="absolute right-3 top-3 rounded-full bg-neutral-700/90 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
                      Premium
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-bold">{t.name}</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
                    {t.blurb}
                  </p>
                  {t.tier === "premium" ? (
                    <p className="mt-2 text-xs text-neutral-400">
                      One-time unlock — preview mein watermark rahega.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-emerald-600">
                      Free plan mein included
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="mt-8 text-center">
          <Link
            href="/admin/templates"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Poori gallery watermarked preview ke saath dekho
            <span aria-hidden>→</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
