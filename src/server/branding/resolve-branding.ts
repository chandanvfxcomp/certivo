// src/server/branding/resolve-branding.ts
//
// White-label branding resolution. Given a hostname (from middleware) or a
// tenant id, returns the branding a public page should render with.
//
// When a tenant has whiteLabelEnabled and is reached via their customDomain
// or subdomain, pages show THEIR name/logo/color and — if hidePoweredBy —
// no "Powered by Certivo". Otherwise the platform default (BRAND) applies.
//
// Logo is returned as a data: URL (same pattern as the admin settings page)
// so no extra public file route is needed.
import { BRAND } from "@/config/brand";
import { prisma } from "@/server/db/client";
import { getFileBytes } from "@/server/storage/local-disk";
import type { Prisma } from "@prisma/client";

export interface ResolvedBranding {
  /** Tenant id when white-label applies, else null. */
  tenantId: string | null;
  /** Display name: tenant name in white-label mode, else platform brand. */
  name: string;
  /** Tagline: tenant tagline in white-label mode, else platform tagline. */
  tagline: string;
  /** Logo as data: URL, or null. */
  logoUrl: string | null;
  /** Hex color. Tenant primaryColor in white-label mode, else platform default. */
  primaryColor: string;
  /** When true, footers must not render "Powered by Certivo". */
  hidePoweredBy: boolean;
  /** True when this request is served under a tenant's white-label domain. */
  isWhiteLabel: boolean;
}

const PLATFORM_DEFAULT: ResolvedBranding = {
  tenantId: null,
  name: BRAND.name,
  tagline: BRAND.tagline,
  logoUrl: null,
  primaryColor: "#0F172A",
  hidePoweredBy: false,
  isWhiteLabel: false,
};

/**
 * Base domain for subdomain matching, derived from APP_URL.
 * e.g. APP_URL=https://certivo-chandan21.vercel.app → base "certivo-chandan21.vercel.app".
 * Returns null when APP_URL is unset (subdomain mode disabled, custom domains still work).
 */
export function getBaseDomain(): string | null {
  const raw = process.env.APP_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Find the white-label tenant for a hostname. Returns null for platform traffic. */
export async function findWhiteLabelTenant(
  hostname: string | null,
): Promise<{ id: string } | null> {
  if (!hostname) return null;
  const host = hostname.toLowerCase().split(":")[0]; // strip port
  if (!host) return null;

  // Never white-label localhost / vercel preview internals.
  if (host === "localhost" || host.endsWith(".localhost")) return null;

  const base = getBaseDomain();

  // 1) Custom domain: exact hostname match.
  const byCustom = await prisma.tenant.findFirst({
    where: {
      customDomain: host,
      whiteLabelEnabled: true,
      status: "APPROVED",
      deletedAt: null,
    },
    select: { id: true },
  });
  if (byCustom) return byCustom;

  // 2) Subdomain: <subdomain>.<base-domain>.
  if (base && host.endsWith(`.${base}`)) {
    const sub = host.slice(0, -(base.length + 1));
    if (sub && sub !== "www") {
      const bySub = await prisma.tenant.findFirst({
        where: {
          subdomain: sub,
          whiteLabelEnabled: true,
          status: "APPROVED",
          deletedAt: null,
        },
        select: { id: true },
      });
      if (bySub) return bySub;
    }
  }

  return null;
}

/** Resolve full branding for a tenant id (white-label mode). */
export async function resolveBrandingByTenantId(tenantId: string): Promise<ResolvedBranding> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, whiteLabelEnabled: true, status: "APPROVED", deletedAt: null },
    select: {
      id: true,
      name: true,
      tagline: true,
      primaryColor: true,
      hidePoweredBy: true,
      logoFileId: true,
    },
  });
  if (!tenant) return PLATFORM_DEFAULT;

  let logoUrl: string | null = null;
  if (tenant.logoFileId) {
    // getFileBytes takes a transaction client; the base client satisfies
    // the fileObject subset it uses.
    const bytes = await getFileBytes(
      prisma as unknown as Prisma.TransactionClient,
      tenant.logoFileId,
      tenant.id,
    );
    if (bytes) logoUrl = `data:${bytes.mimeType};base64,${bytes.bytes.toString("base64")}`;
  }

  return {
    tenantId: tenant.id,
    name: tenant.name,
    tagline: tenant.tagline ?? "",
    logoUrl,
    primaryColor: tenant.primaryColor ?? "#0F172A",
    hidePoweredBy: tenant.hidePoweredBy,
    isWhiteLabel: true,
  };
}

/** Resolve branding for an incoming hostname. Platform default when no match. */
export async function resolveBranding(hostname: string | null): Promise<ResolvedBranding> {
  const match = await findWhiteLabelTenant(hostname);
  if (!match) return PLATFORM_DEFAULT;
  return resolveBrandingByTenantId(match.id);
}
