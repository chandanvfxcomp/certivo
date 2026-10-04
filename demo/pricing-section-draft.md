# Pricing section draft — landing page (`certivo-demo-redesigned.html`)

Status: DRAFT, not applied. User approval needed.

## 1) Where it goes

Inside `screenLanding()` (starts ~line 1887), insert the pricing `<section>`
right after the verify section's closing `</section>` (~line 1953) and before
the FAQ section that opens at ~line 1954:

```html
  <section style="border-top:1px solid var(--border);padding:48px 0;background:var(--bg-subtle);">
    <div class="wrap-narrow">
      <h2 class="reveal" style="font-size:22px;text-align:center;">Frequently asked questions</h2>
```

i.e. insert: `${renderPricing()}` between the two sections.

## 2) CSS to add (paste near the FAQ styles, ~line 1702)

```css
/* Pricing */
.pricing-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:28px; text-align:left; }
@media (max-width:720px){ .pricing-grid { grid-template-columns:1fr; } }
.plan { display:flex; flex-direction:column; padding:26px; position:relative; }
.plan-pop { border:2px solid var(--brand); box-shadow:0 12px 32px rgba(59,130,246,.16); }
.plan-tag { position:absolute; top:-13px; left:50%; transform:translateX(-50%); background:var(--brand); color:#fff; font-size:12px; font-weight:700; padding:4px 14px; border-radius:999px; white-space:nowrap; }
.plan-name { font-size:15px; font-weight:700; }
.plan-price { font-size:32px; font-weight:800; margin:8px 0 2px; letter-spacing:-.02em; }
.plan-per { font-size:12.5px; color:var(--text-faint); margin-bottom:14px; }
.plan ul { list-style:none; margin:0 0 20px; padding:0; display:flex; flex-direction:column; gap:9px; font-size:13.5px; color:var(--text-muted); }
.plan ul li { display:flex; gap:8px; align-items:flex-start; }
.plan ul svg { width:16px; height:16px; flex:none; color:var(--ok); margin-top:2px; }
.plan .btn { margin-top:auto; }
```

## 3) Function to add (paste next to screenLanding helpers, before `screenLanding()`)

```js
function renderPricing() {
  const plans = [
    { name: "Free", price: "₹0", per: "forever — start without paying", tag: null, cta: "Start free", btn: "btn-outline", link: "#/institute/register", feats: ["100 certificates / year free", "Unlimited public verification", "1 admin seat", "QR code + print-ready PDF", "Community support"] },
    { name: "Starter", price: "₹999", per: "per month · billed yearly", tag: "Most popular", cta: "Choose Starter", btn: "btn-primary", link: "#/institute/register", pop: true, feats: ["1,000 certificates / month", "3 admin seats", "Email delivery to students", "GST-ready invoices", "Basic analytics dashboard", "Everything in Free"] },
    { name: "Growth", price: "₹2,499", per: "per month · billed yearly", tag: null, cta: "Choose Growth", btn: "btn-outline", link: "#/institute/register", feats: ["5,000 certificates / month", "10 admin seats", "Bulk CSV issuance", "Custom institute branding on PDFs", "API access + webhooks", "Priority support"] },
  ];
  return `
  <section id="pricing" style="border-top:1px solid var(--border);padding:48px 0;">
    <div class="wrap">
      <div style="text-align:center;max-width:640px;margin:0 auto;" class="reveal">
        <span class="eyebrow">✦ Pricing</span>
        <h2 style="font-size:22px;margin-top:8px;">Free to start. Fair when you grow.</h2>
        <p style="color:var(--text-muted);font-size:14px;margin-top:8px;">Verification stays free for everyone, forever. You only pay when you're issuing at scale.</p>
      </div>
      <div class="pricing-grid">
        ${plans.map((p, i) => `
        <div class="card card-hover plan${p.pop ? " plan-pop" : ""} reveal${i === 1 ? " reveal-d1" : i === 2 ? " reveal-d2" : ""}">
          ${p.tag ? `<span class="plan-tag">${p.tag}</span>` : ""}
          <div class="plan-name">${p.name}</div>
          <div class="plan-price">${p.price}</div>
          <div class="plan-per">${p.per}</div>
          <ul>${p.feats.map(f => `<li>${ic("check")}<span>${f}</span></li>`).join("")}</ul>
          <a href="${p.link}" class="btn ${p.btn}" style="text-decoration:none;justify-content:center;">${p.cta}</a>
        </div>`).join("")}
      </div>
      <p class="reveal" style="text-align:center;color:var(--text-muted);font-size:13.5px;margin-top:22px;">
        Need more? <strong>₹15 per extra certificate</strong> beyond your plan · Student certificate-fee collections settle to you on T+2 days,
        after Razorpay's standard 2% + GST gateway charge.
      </p>
    </div>
  </section>`;
}
```

## 4) Tier rationale (grounded)

- Free 100/yr mirrors competitors' free entry (Certifier-style) — low-risk onboarding
  (assistant's earlier recommendation, conversation source:6-7).
- ₹999 / ₹2,499 tiers match the subscription figures already discussed with the user.
- Razorpay standard: 2% + 18% GST on the platform fee for domestic cards/UPI/netbanking,
  no setup/AMC, T+2 settlement. New merchants: 0% platform fee for first 90 days up to
  ₹5L GMV (auto-applied to accounts activated on/after 1 Jul 2026 — confirm current terms
  in dashboard before acting).
  Sources: https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/
  and https://razorpay.com/blog/razorpay-0-percent-platform-fee-offer-90-days-new-merchants-2026/

## 5) Honesty caveat before any real sale

Plans claim "email delivery", "bulk CSV issuance", "API + webhooks" — these are on the
roadmap (REDESIGN-REPORT.md) but not built yet. Landing copy is aspirational for demo
purposes; build the features before showing to a paying institute.
