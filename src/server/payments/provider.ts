// src/server/payments/provider.ts
//
// Payment provider switch — the super admin picks the active provider
// (AppSetting "payments.provider": "razorpay" | "cashfree").
// New providers plug in here; callers never hardcode one.
import { getSetting } from "@/server/settings/service";
import { isRazorpayConfigured } from "./razorpay";
import { isCashfreeConfigured } from "./cashfree";

export type PaymentProvider = "razorpay" | "cashfree";
export type PaymentMode = PaymentProvider | "both";

export async function getActivePaymentProvider(): Promise<PaymentProvider> {
  const configured = await getSetting("payments.provider").catch(() => null);
  if (configured === "cashfree" && isCashfreeConfigured()) return "cashfree";
  if (configured === "razorpay" && isRazorpayConfigured()) return "razorpay";
  // Fallback: whichever is configured (Razorpay preferred for backwards compat).
  if (isRazorpayConfigured()) return "razorpay";
  if (isCashfreeConfigured()) return "cashfree";
  // Neither configured — default to razorpay so UI shows "not configured".
  return "razorpay";
}

/**
 * List of gateways to OFFER AT CHECKOUT. Super admin controls this with
 * AppSetting "payments.provider":
 *   "razorpay" | "cashfree" → only that one (if its keys are configured)
 *   "both"                 → customer picks between the two at payment time
 * Only configured providers are ever returned.
 */
export async function getCheckoutProviders(): Promise<PaymentProvider[]> {
  const mode = ((await getSetting("payments.provider").catch(() => null)) ?? "") as PaymentMode;
  const configured: PaymentProvider[] = [];
  if (isRazorpayConfigured()) configured.push("razorpay");
  if (isCashfreeConfigured()) configured.push("cashfree");
  if (mode === "both") return configured;
  if (mode === "razorpay" || mode === "cashfree") {
    return configured.includes(mode) ? [mode] : configured;
  }
  return configured;
}

export async function isAnyPaymentConfigured(): Promise<boolean> {
  return isRazorpayConfigured() || isCashfreeConfigured();
}
