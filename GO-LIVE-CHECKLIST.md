# Certivo Go-Live Checklist

_Sirf woh steps jo tumhe khud karne hain. Code side sab ready hai (verified 2026-10-04)._

## 1. Domain final karo (sabse pehle — QR codes mein permanently embed hota hai)
- File: `src/config/brand.ts` → `BRAND.domain` abhi `"example.com"` hai
- Real domain daalo, saath mein `supportEmail` bhi (`support@example.com` abhi placeholder hai)
- **Dhyaan:** domain QR codes mein permanently embed hota hai — ek baar certificate issue ho gaya, baad mein domain change karne se purane QR galat ho jayenge. Pehle domain, phir certificates.

## 2. Production database pe migrations chalao
- `prisma/migrate deploy` — total 9 migrations hain (`20260907095000_init` se `20261004030000_certificate_directory_optin` tak)
- Iske baad seed script chalao (neeche)

## 3. Super Admin account banao
Seed script `scripts/seed-default-institute.ts` env vars se banata hai:
```
SUPER_ADMIN_EMAIL=you@yourdomain.com
SUPER_ADMIN_PASSWORD=<strong password>
SUPER_ADMIN_NAME=Your Name        # optional
```
- Login: `/super-admin/login` → console approve/reject/suspend

## 4. Email activate karo (Resend)
```
EMAIL_PROVIDER=resend
RESEND_API_KEY=<resend dashboard se>
EMAIL_FROM=noreply@yourdomain.com   # domain Resend mein verified hona chahiye
```
- Bina iske: download confirmation email sirf console log mein jayenge, bheje nahi jayenge

## 5. Payments activate karo (Razorpay) — jab ready ho
```
RAZORPAY_KEY_ID=<dashboard se>
RAZORPAY_KEY_SECRET=<dashboard se>
```
- `src/server/payments/razorpay.ts` dono keys maangta hai; nahi hain toh payment routes gracefully disabled rehte hain
- Yaad rahe: naya merchant account → pehle 90 din 0% platform fee (₹5L tak), KYC jitni jaldi utna fayda

## 6. Deploy
- ⚠️ **Pehle yeh block hatana hoga:** `next build` abhi CSS stage pe atak raha hai — Tailwind CSS v4.0.0 ka pre-existing dependency bug hai (tumhare recent changes se nahi aaya). Fix: Tailwind upgrade karna padega, tabhi `npm run build` poora hoga.
- Uske baad: `npm run build` → hosting (Vercel / apna server)

---
_Status: sab items open hain (2026-10-04 tak kuch bhi production mein nahi gaya tha)._
