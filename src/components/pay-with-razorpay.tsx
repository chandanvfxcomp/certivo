"use client";

// src/components/pay-with-razorpay.tsx
//
// Razorpay Checkout button — loads checkout.js on demand, creates an order
// server-side, opens the Razorpay payment modal, and verifies the result.
// If Razorpay isn't configured, renders nothing (callers fall back to the
// manual mark-paid button).
import { useState } from "react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckoutJs(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

export function PayWithRazorpay({
  certificateId,
  kind,
  amountLabel,
  enabled,
  onPaid,
}: {
  certificateId: string;
  kind: "platform_fee";
  amountLabel: string;
  /** False when Razorpay isn't configured — render nothing, caller shows manual fallback. */
  enabled: boolean;
  onPaid: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      await loadCheckoutJs();
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateId, kind }),
      });
      const order = (await orderRes.json()) as {
        orderId?: string;
        amountPaise?: number;
        keyId?: string;
        error?: string;
      };
      if (!orderRes.ok || !order.orderId) {
        throw new Error(order.error === "PAYMENTS_NOT_CONFIGURED" ? "Online payment isn't set up yet." : "Couldn't start the payment. Please try again.");
      }
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error("Couldn't load the payment window. Please try again.");
      const rzp = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        order_id: order.orderId,
        name: "Certivo",
        description: "Certificate re-download fee",
        handler: async (resp: { razorpay_payment_id?: string; razorpay_signature?: string }) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                certificateId,
                kind,
                orderId: order.orderId,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              }),
            });
            if (!verifyRes.ok) throw new Error("verification failed");
            onPaid();
          } catch {
            setError("Payment went through but confirmation failed — it will be reconciled automatically. Check back in a minute.");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={pay} disabled={busy}>
        {busy ? "Processing…" : `Pay ${amountLabel} online`}
      </Button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
