// src/server/leads/default-templates.ts
//
// Default follow-up templates — written for INSTITUTE/COACHING owners
// (the only audience that gets follow-ups). Placeholders: {{name}},
// {{institute}}, {{email}}.
// The super admin can load these with one click from /super-admin/followups,
// then edit freely.
export interface DefaultTemplate {
  name: string;
  channel: "email";
  delayDays: number;
  subject: string;
  body: string;
}

export const DEFAULT_FOLLOWUP_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Day 0 — Welcome",
    channel: "email",
    delayDays: 0,
    subject: "{{institute}} ke certificates ab digital — welcome to Certivo",
    body: `Namaste {{name}},

{{institute}} ke liye Certivo me interest dikhane ke liye dhanyavaad!

Certivo se aap:
- 2 minute me professional certificate banao (10 premium templates)
- Har certificate pe QR code — koi bhi scan karke verify kar sakta hai
- Student ko 2 free downloads, uske baad sirf ₹299

Agla step: yahan register karo aur apna institute onboard karo.
Jawab me "DEMO" likh bhejo — hum aapko live demo dikhayenge.

— Team Certivo`,
  },
  {
    name: "Day 2 — Pitch",
    channel: "email",
    delayDays: 2,
    subject: "{{institute}}: nakli certificate ka jhanjhat khatm",
    body: `Namaste {{name}},

Socho — {{institute}} ka har certificate QR-verified. Koi employer ya
dusra institute scan kare aur turant pata chale: asli hai.

- Certificates kabhi expire nahi hote
- Verification hamesha FREE (code, QR, ya photo upload se)
- Aapka kharcha: sirf tab jab student 2 free downloads ke baad dobara download kare

Ek baar setup, phir sab automatic. Register karna 5 minute ka kaam hai.

— Team Certivo`,
  },
  {
    name: "Day 7 — Last nudge",
    channel: "email",
    delayDays: 7,
    subject: "{{institute}} ke liye aakhri yaad — free me shuru karo",
    body: `Namaste {{name}},

Ye {{institute}} ke liye hamara aakhri follow-up hai.

Yaad rahe:
- Classic template hamesha FREE hai
- Koi monthly fee nahi — paisa sirf downloads pe
- Aapka data, aapke students — poora control aapke paas

Jab taiyaar ho, yahan se shuru karo. Hum help ke liye yahin hain.

— Team Certivo`,
  },
];
