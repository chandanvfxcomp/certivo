// src/server/payments/razorpay.ts
//
// Razorpay integration — dependency-free (REST API via fetch, no SDK).
// Used for the ₹299 platform re-download fee and any institute-set
// certificate fee, replacing the manual "mark paid" flow once keys are
// configured.
//
// Setup (see .env.example):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET — from the Razorpay dashboard.
//   RAZORPAY_WEBHOOK_SECRET — for verifying webhook signatures.
//
// Flow:
//   1. createRazorpayOrder() — server creates an order, returns order id.
//   2. Frontend opens Razorpay Checkout (checkout.js) with that order id.
//   3. On success, frontend posts razorpay_payment_id + signature to
//      /api/payments/razorpay/verify — server verifies the HMAC signature
//      and marks the fee paid.
//   4. Webhook (/api/payments/razorpay/webhook) is the source of truth for
//      async payment states — verify handler is the fast path, webhook is
//      the reconciliation path.
//
// Until keys are set, isRazorpayConfigured() is false and the app keeps
// the manual mark-paid flow.
import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/** Create a Razorpay order for the given amount (paise). */
export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.warn("razorpay.order_failed", { status: res.status, body: body.slice(0, 200) });
    throw new Error("Failed to create Razorpay order");
  }
  return (await res.json()) as RazorpayOrder;
}

/**
 * Verify the payment signature Razorpay Checkout returns — HMAC-SHA256 of
 * "order_id|payment_id" with the key secret. This is what proves the
 * payment actually happened; never mark a fee paid without it.
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;
  const expected = createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  const a = Buffer.from(params.signature, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Fetch an order back from Razorpay — lets the verify endpoint confirm the
 * order's receipt/notes match the certificate the student claims to pay for,
 * so a payment for one certificate can't be replayed against another. */
export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrder & { receipt?: string; notes?: Record<string, string> }> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured");
  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Razorpay order");
  return (await res.json()) as RazorpayOrder & { receipt?: string; notes?: Record<string, string> };
}

/** Verify a webhook's X-Razorpay-Signature header against the raw body. */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
