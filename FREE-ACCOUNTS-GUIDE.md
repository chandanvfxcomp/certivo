# Certivo — Free Accounts Guide

Sab kuch free tier mein shuru karne ke liye kahan account banana hai.

## 1. Database (Postgres) — FREE

**Neon** (recommended) — https://neon.tech
- Free: 3 GB storage, no credit card
- Signup → New Project → connection string copy karo
- `.env` mein: `DATABASE_URL="postgresql://..."` aur `DIRECT_URL="postgresql://..."`
- Phir super admin → Deploy → **"Run migrations now"** dabao

Alternative: **Supabase** — https://supabase.com (free 500 MB)

## 2. Email — FREE

**Resend** (recommended, already integrated) — https://resend.com
- Free: 100 emails/day (3,000/month), no credit card
- Signup → API Keys → key banao
- `.env` mein:
  ```
  EMAIL_PROVIDER="resend"
  RESEND_API_KEY="re_..."
  EMAIL_FROM="Certivo <noreply@yourdomain.com>"
  ```

Alternative: **Brevo** — https://brevo.com (free 300 emails/day)

## 3. Payments — FREE account

**Razorpay** (aapka purana account) — https://razorpay.com
- Dashboard → Settings → API Keys: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Webhooks → `RAZORPAY_WEBHOOK_SECRET`
- Webhook URL: `https://yourdomain.com/api/payments/razorpay/webhook`

**Cashfree** (naya banao) — https://cashfree.com
- Signup → Developers → API Keys: `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`
- Webhooks → `CASHFREE_WEBHOOK_SECRET`
- `CASHFREE_ENV="sandbox"` pehle testing ke liye, phir `"production"`
- Webhook URL: `https://yourdomain.com/api/payments/cashfree/webhook`

**Provider switch:** Super admin → Deploy → Provider settings → `payments.provider` = `razorpay`, `cashfree`, ya `both`. `both` pe customer checkout pe khud choose karega — Razorpay ya Cashfree. Ek setting change, code change nahi chahiye.

## 4. Code + Deploy — FREE

- **GitHub** — https://github.com (repo banao, Deploy page pe connect karo)
- **Cloudflare** — https://cloudflare.com (domain + tunnel, free plan)
- **Hosting**: Vercel (https://vercel.com, free) ya koi VPS

## 5. Daily follow-up emails

Server pe cron lagao (1 baar):
```
0 9 * * * cd /path/to/certivo/platform && npx tsx scripts/send-followups.ts
```
(Ya super admin → Leads → "Send due follow-ups now" button dabao jab chaaho)

## Checklist (order mein)

- [ ] Neon account → DATABASE_URL set → super admin se Migrate dabao
- [ ] Resend account → EMAIL_* keys set
- [ ] Razorpay account → keys set (test mode pehle)
- [ ] GitHub repo → Deploy page pe connect → 1-click push
- [ ] Domain Cloudflare pe → site.url setting update karo
- [ ] Follow-up cron lagao
