// src/server/settings/service.ts
//
// Swappable infrastructure/provider settings (AppSetting key-value store).
// Super admin edits these — e.g. changing the tunnel provider from
// Cloudflare to something else tomorrow is a settings change, not code.
import { prisma } from "@/server/db/client";

export interface SettingDef {
  key: string;
  label: string;
  hint: string;
}

export const SETTING_DEFS: SettingDef[] = [
  {
    key: "deploy.provider",
    label: "Deploy provider",
    hint: "Where the app is deployed (github, vercel, …). Informational + used by deploy scripts.",
  },
  {
    key: "tunnel.provider",
    label: "Tunnel provider",
    hint: "How localhost is exposed publicly (cloudflare, ngrok, …). Change here when you switch.",
  },
  {
    key: "site.url",
    label: "Site URL",
    hint: "Public URL of the app — used in emails, QR codes, verify links.",
  },
  {
    key: "payments.provider",
    label: "Payment provider",
    hint: "razorpay, cashfree, or both — 'both' lets the customer choose at checkout.",
  },
];

const cache = new Map<string, string>();

export async function getSetting(key: string): Promise<string | null> {
  if (cache.has(key)) return cache.get(key)!;
  const row = await prisma.appSetting.findUnique({ where: { key } }).catch(() => null);
  if (row) cache.set(key, row.value);
  return row?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.appSetting.findMany();
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const def = SETTING_DEFS.find((d) => d.key === key);
  if (!def) throw new Error("Unknown setting");
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: value.slice(0, 500) },
    update: { value: value.slice(0, 500) },
  });
  cache.delete(key);
}
