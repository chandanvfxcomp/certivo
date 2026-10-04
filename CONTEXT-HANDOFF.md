# Certivo — Claude Code handoff notes

Yeh chat (Cowork) seedha Claude Code CLI mein transfer nahi ho sakti — dono
alag systems hain, aur transcript import karne ka koi feature abhi Anthropic
ke paas nahi hai. Lekin poora kaam already is repo (git history samet) mein
hai, isliye continuity issue nahi hai — bas ek fresh Claude Code session
start karke isi repo mein kaam continue kar sakte ho.

## Kaise continue karein

1. Is zip ko apne machine par unzip karo (jo already bheja gaya hai —
   `certivo-platform.zip`).
2. Us folder mein terminal khol kar `claude` chalao (Claude Code CLI).
3. Pehle prompt mein niche wala context paste kar do, ya seedha
   `git log --oneline` dikha do — commit messages khud hi poora design
   reasoning carry karte hain.

## Project state (2026-09-17 tak)

**Do codebases hain:**
- `demo/certivo-demo.html` — standalone click-through HTML/JS prototype,
  Claude Artifact ke through published/hosted bhi hai.
- `src/...` — real Next.js 15 + Prisma 6 app (single-tenant MVP abhi,
  admin/student roles, RLS-based multi-tenant Postgres schema).

**Sabse recent completed kaam (certificate redesign):**
- Certificate PDF ka layout redesign — sample certificate jaisa hi (koi
  visual change nahi), dynamic data (institute logo, course, student name)
  add kiya gaya.
- Logo + dono signatures (Centre Head, Authority) ab live read hote hain
  Tenant/Centre se — registration ke time capture, Settings se baad mein
  bhi edit ho sakta hai.
- Naya admin Settings page (`src/app/admin/(protected)/settings/`) —
  logo/signature upload-replace, tagline/signer-name edit.
- Dependency-free QR code encoder (`src/lib/qrcode.ts`) — verification link
  scan-able banane ke liye, koi external package nahi.
- Ek genuine pre-existing bug fix bhi kiya gaya: `session.ts` mein
  `Omit<SessionPayload, "exp">` discriminated union par silently keys drop
  kar raha tha — `DistributiveOmit` helper se fix kiya.
- Demo (`certivo-demo.html`) mein bhi wahi sab mirror kiya — including ek
  real generated PDF (CSS mockup nahi) jo pdf-lib se browser mein hi banta
  hai, aur QR encoder ka plain-JS port jo automated cross-check se
  TypeScript original ke against byte-for-byte verify kiya gaya hai.

**Verification jo already ho chuki hai:**
- Real app: isolated stub-based `tsc` harness se poora typecheck pass
  (zero errors) — is sandbox mein real `node_modules` install nahi ho
  sakta (no network access), isliye ek hand-built stub-based verification
  workflow banaya gaya jo genuinely real Prisma/Next/React types ke against
  checks karta hai.
- Demo: script syntax check, duplicate-identifier check, aur ek real
  pdf-lib smoke test (branded + no-branding dono cases) — sab pass.

**Git history** — sab kaam properly committed hai (`git log --oneline`
dekho), koi uncommitted changes nahi.

## Sandbox constraints jo Claude Code mein bhi apply hongi (agar wahi
setup use kar rahe ho)

- Is Cowork session mein npm/pip registries tak network access nahi tha —
  isliye `pnpm install` kabhi nahi chala. Agar tumhare local machine par
  internet hai, to `pnpm install` chalega aur ek REAL `pnpm typecheck`
  pehli baar chalega — usse pehle jitna bhi "typecheck passed" bola gaya
  hai, woh stub-based isolated verification tha, real dependencies ke
  saath nahi.
- Local Postgres setup + `.env` (dekh lo `.env.example`) chahiye hoga
  migrations aur RLS tests chalane ke liye.

## Agla kaam (agar continue karna hai)

Poora spec `PLATFORM-CORE-SPECIFICATION.md` mein hai (agar attach kiya gaya
tha) — abhi tak P0 (foundation) + certificate-branding feature complete
hai. Aage ke phases spec ke Section 17 build-order ke hisab se hain.
