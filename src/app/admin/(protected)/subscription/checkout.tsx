"use client";

// src/app/admin/(protected)/subscription/checkout.tsx
//
// Plan cards with Razorpay / Cashfree checkout for the yearly institute
// subscription. On successful verification the page reloads — the layout
// guard then lets the admin into the full console.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PlanInfo } from "@/server/subscription/service";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    Cashfree?: new (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget?: string }) => Promise<{ error?: unknown }>;
    };
  }
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatLimit(limit: number): string {
  return limit === -1 ? "Unlimited students" : `Up to ${limit} students`;
}

function loadRazorpayJs(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

function loadCashfreeJs(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.body.appendChild(script);
  });
}

export function PlanCheckout({
  plans,
  currentPlanId,
  razorpayConfigured,
  razorpayKeyId,
  checkoutProviders,
}: {
  plans: PlanInfo[];
  currentPlanId: string | null;
  razorpayConfigured: boolean;
  razorpayKeyId: string;
  checkoutProviders: ("razorpay" | "cashfree")[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (plans.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-neutral-500">
          No subscription plans are available right now. Please contact support.
        </p>
      </Card>
    );
  }

  async function payWithRazorpay(plan: PlanInfo) {
    if (!razorpayConfigured || !window.Razorpay) {
      throw new Error("Razorpay is not configured. Please contact support.");
    }
    const orderRes = await fetch("/api/payments/razorpay/subscription-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id }),
    });
    const order = (await orderRes.json()) as { orderId?: string; error?: string };
    if (!order.orderId) throw new Error(order.error ?? "Could not create payment order");

    await new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay!({
        key: razorpayKeyId,
        order_id: order.orderId,
        name: "Certivo",
        description: `Yearly subscription: ${plan.name}`,
        theme: { color: "#0F172A" },
        handler: async (resp: { razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/subscription-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                planId: plan.id,
                orderId: order.orderId,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              }),
            });
            const result = (await verifyRes.json()) as { ok?: boolean; error?: string };
            if (!result.ok) throw new Error(result.error ?? "Payment verification failed");
            window.location.reload();
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
      });
      rzp.open();
    });
  }

  async function payWithCashfree(plan: PlanInfo) {
    await loadCashfreeJs();
    const orderRes = await fetch("/api/payments/cashfree/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "subscription", planId: plan.id }),
    });
    const order = (await orderRes.json()) as {
      paymentSessionId?: string;
      orderId?: string;
      error?: string;
    };
    if (!order.paymentSessionId || !order.orderId) {
      throw new Error(order.error ?? "Could not create payment order");
    }
    const cf = new window.Cashfree!({ mode: "production" });
    const result = await cf.checkout({
      paymentSessionId: order.paymentSessionId,
      redirectTarget: "_modal",
    });
    if (result.error) throw new Error("Payment was not completed");
    const verifyRes = await fetch("/api/payments/cashfree/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.orderId, purpose: "subscription", planId: plan.id }),
    });
    const verified = (await verifyRes.json()) as { ok?: boolean; error?: string };
    if (!verified.ok) throw new Error(verified.error ?? "Verification failed");
    window.location.reload();
  }

  async function handlePay(plan: PlanInfo, provider: "razorpay" | "cashfree") {
    setBusy(plan.id);
    setError(null);
    try {
      if (provider === "razorpay") {
        await loadRazorpayJs();
        await payWithRazorpay(plan);
      } else {
        await payWithCashfree(plan);
      }
    } catch (err) {
      if (!(err instanceof Error && err.message === "Payment cancelled")) {
        setError(err instanceof Error ? err.message : "Payment failed");
      }
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </Card>
      )}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => {
          const isCurrent = plan.id === currentPlanId;
          const providers =
            checkoutProviders.length === 1
              ? checkoutProviders
              : (["razorpay", "cashfree"] as const).filter((p) => checkoutProviders.includes(p));
          return (
            <Card
              key={plan.id}
              className={`flex h-full flex-col p-6 ${i === 1 ? "ring-2 ring-brand-500" : ""}`}
            >
              {i === 1 && (
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-600">
                  Most popular
                </p>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              {plan.description && (
                <p className="mt-1 text-sm text-neutral-500">{plan.description}</p>
              )}
              <p className="mt-4 text-3xl font-extrabold tracking-tight">
                {formatRupees(plan.pricePaise)}
                <span className="text-sm font-medium text-neutral-500"> / year</span>
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-600">
                {formatLimit(plan.studentLimit)}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
                {plan.features.bulkIssuance && <li>✓ Bulk issuance (CSV upload)</li>}
                {plan.features.analytics && <li>✓ Analytics dashboard</li>}
                {plan.features.allTemplates && <li>✓ All 10 certificate templates</li>}
                {plan.features.whiteLabel && <li>✓ White-label branding</li>}
                <li>✓ QR &amp; code verification</li>
                <li>✓ 1 free download per certificate</li>
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <p className="text-center text-sm font-semibold text-green-700">
                    Current plan
                  </p>
                ) : providers.length === 0 ? (
                  <p className="text-center text-xs text-neutral-500">
                    Online payment isn&apos;t configured yet — please contact support.
                  </p>
                ) : providers.length === 1 ? (
                  <Button
                    className="w-full"
                    disabled={busy === plan.id}
                    onClick={() => handlePay(plan, providers[0]!)}
                  >
                    {busy === plan.id
                      ? "Processing…"
                      : `Choose ${plan.name} — ${formatRupees(plan.pricePaise)}/yr`}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full"
                      disabled={busy === plan.id}
                      onClick={() => handlePay(plan, "razorpay")}
                    >
                      {busy === plan.id ? "Processing…" : `Pay with Razorpay`}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={busy === plan.id}
                      onClick={() => handlePay(plan, "cashfree")}
                    >
                      Pay with Cashfree
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-center text-xs text-neutral-500">
        Secure payment via Razorpay or Cashfree (UPI, cards, netbanking). Your
        subscription activates instantly and stays valid for one full year.
      </p>
    </div>
  );
}
