import { NextResponse } from "next/server";
import { getCheckoutProviders } from "@/server/payments/provider";

// GET /api/payments/active-provider — public; tells the checkout UI which
// gateway(s) to offer. No secrets exposed.
export async function GET(): Promise<NextResponse> {
  const providers = await getCheckoutProviders();
  return NextResponse.json({ providers, configured: providers.length > 0 });
}
