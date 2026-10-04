// src/server/payments/cashfree.ts
//
// Cashfree PG integration — dependency-free (REST API via fetch, no SDK).
// Mirrors the Razorpay module's shape so the two providers are
// interchangeable. The active provider is chosen in super admin
// (AppSetting "payments.provider").
//
// Setup (.env):
//   CASHFREE_CLIENT_ID, CASHFREE_CLIENT_SECRET — from Cashfree dashboard.
//   CASHFREE_WEBHOOK_SECRET — for verifying webhook signatures.
//   CASHFREE_ENV="sandbox" for test mode (default), "production" for live.
//
// Flow:
//   1. createCashfreeOrder() — server creates an order, returns
//      payment_session_id for Cashfree Checkout.js.
//   2. Frontend opens Cashfree Checkout with the session id.
//   3. On return, frontend posts order_id to
//      /api/payments/cashfree/verify — server fetches the order from
//      Cashfree and confirms status PAID + amount match, then applies it.
//   4. Webhook (/api/payments/cashfree/webhook) reconciles async states.
import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";

const API_VERSION = "2023-08-01";

function baseUrl(): string {
  return process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function isCashfreeConfigured(): boolean {
  return Boolean(process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET);
}

export function isCashfreeLive(): boolean {
  return process.env.CASHFREE_ENV === "production";
}

interface CashfreeOrder {
  order_id: string;
  payment_session_id: string;
  order_status: string;
  order_amount: number;
}

function authHeaders(): Record<string, string> {
  return {
    "x-client-id": process.env.CASHFREE_CLIENT_ID ?? "",
    "x-client-secret": process.env.CASHFREE_CLIENT_SECRET ?? "",
    "x-api-version": API_VERSION,
    "Content-Type": "application/json",
  };
}

/** Create a Cashfree order. Returns the payment_session_id for Checkout.js. */
export async function createCashfreeOrder(params: {
  orderId: string;
  amountPaise: number;
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: Record<string, string>;
}): Promise<CashfreeOrder> {
  if (!isCashfreeConfigured()) throw new Error("Cashfree is not configured");

  const res = await fetch(`${baseUrl()}/orders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      order_id: params.orderId,
      order_amount: params.amountPaise / 100,
      order_currency: "INR",
      customer_details: {
        customer_id: params.customerId,
        customer_email: params.customerEmail ?? "noreply@example.com",
        customer_phone: params.customerPhone ?? "9999999999",
      },
      order_meta: {
        // Replay guard: verify step checks these match the claimed payment.
        ...(params.notes ?? {}),
        return_url: `${process.env.APP_URL ?? "http://localhost:3000"}/payment/cashfree/return?order_id={order_id}`,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.warn("cashfree.order_failed", { status: res.status, body: body.slice(0, 200) });
    throw new Error("Failed to create Cashfree order");
  }
  return (await res.json()) as CashfreeOrder;
}

/** Fetch an order from Cashfree — source of truth for verify + webhook. */
export async function fetchCashfreeOrder(orderId: string): Promise<{
  order_id: string;
  order_status: string;
  order_amount: number;
  cf_order_id?: number;
}> {
  if (!isCashfreeConfigured()) throw new Error("Cashfree is not configured");
  const res = await fetch(`${baseUrl()}/orders/${orderId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch Cashfree order");
  return (await res.json()) as {
    order_id: string;
    order_status: string;
    order_amount: number;
    cf_order_id?: number;
  };
}

/**
 * Verify a Cashfree webhook's x-webhook-signature header.
 * Cashfree signs: base64(HMAC-SHA256(timestamp + rawBody, secret)).
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET;
  if (!secret || !timestamp || !signature) return false;
  const expected = createHmac("sha256", secret)
    .update(timestamp + rawBody)
    .digest("base64");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
