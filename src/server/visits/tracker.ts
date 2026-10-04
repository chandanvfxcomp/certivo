// src/server/visits/tracker.ts
//
// Anonymous visit tracking for the super-admin analytics dashboard.
// IPs are SHA-256 hashed (privacy) — we count visits, not people.
import { createHash } from "node:crypto";
import { prisma } from "@/server/db/client";
import { ulid } from "@/lib/ulid";

const TRACKED_PREFIXES = ["/", "/directory", "/pricing", "/v/", "/verify-photo"];

export function shouldTrack(path: string): boolean {
  return TRACKED_PREFIXES.some((p) => (p === "/" ? path === "/" : path.startsWith(p)));
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function logVisit(params: {
  path: string;
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
}): Promise<void> {
  if (!shouldTrack(params.path)) return;
  try {
    await prisma.siteVisit.create({
      data: {
        id: ulid(),
        path: params.path.slice(0, 500),
        ipHash: hashIp(params.ip),
        userAgent: params.userAgent?.slice(0, 500) ?? null,
        referrer: params.referrer?.slice(0, 500) ?? null,
      },
    });
  } catch {
    // Tracking must never break the page.
  }
}

export interface VisitStats {
  today: number;
  last7Days: number;
  last30Days: number;
  byPath: Array<{ path: string; count: number }>;
}

export async function getVisitStats(): Promise<VisitStats> {
  const now = new Date();
  const day = new Date(now); day.setHours(0, 0, 0, 0);
  const week = new Date(now); week.setDate(week.getDate() - 7);
  const month = new Date(now); month.setDate(month.getDate() - 30);

  const [today, last7Days, last30Days, byPath] = await Promise.all([
    prisma.siteVisit.count({ where: { createdAt: { gte: day } } }),
    prisma.siteVisit.count({ where: { createdAt: { gte: week } } }),
    prisma.siteVisit.count({ where: { createdAt: { gte: month } } }),
    prisma.siteVisit.groupBy({
      by: ["path"],
      _count: { path: true },
      where: { createdAt: { gte: month } },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
  ]);

  return {
    today,
    last7Days,
    last30Days,
    byPath: byPath.map((r) => ({ path: r.path, count: r._count.path })),
  };
}
