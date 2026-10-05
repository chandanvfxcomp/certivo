// src/middleware.ts
//
// White-label hostname detection. Runs on the Node.js runtime (not Edge)
// so it can use Prisma to match the incoming hostname against tenant
// custom domains / subdomains.
//
// - Skips static assets, _next internals, and API routes (they resolve
//   their own tenant via session, not hostname).
// - On a white-label match, sets `x-white-label-tenant` so server
//   components (landing page, verify pages) can render tenant branding.
// - Always sets `x-hostname` for downstream branding resolution.
import { NextResponse, type NextRequest } from "next/server";
import { findWhiteLabelTenant } from "@/server/branding/resolve-branding";

export const runtime = "nodejs";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const { pathname } = req.nextUrl;

  // Forward request headers (mutated copy) so server components can read
  // x-hostname / x-pathname / x-white-label-tenant via headers().
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-hostname", hostname);
  requestHeaders.set("x-pathname", pathname);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // Skip internals, API, and files with extensions.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return res;
  }

  try {
    const match = await findWhiteLabelTenant(hostname || null);
    if (match) {
      // Also expose to downstream server components via request headers.
      const rh = new Headers(requestHeaders);
      rh.set("x-white-label-tenant", match.id);
      return NextResponse.next({ request: { headers: rh } });
    }
  } catch {
    // DB unavailable (e.g. pre-migration) — serve platform branding.
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
