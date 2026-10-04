"use client";

// src/components/pay-with-provider.tsx
//
// Provider-aware payment button — offers whichever gateway(s) the super admin
// enabled (AppSetting "payments.provider": razorpay | cashfree | both).
// "both" shows a chooser so the customer picks their gateway.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PayWithRazorpay } from "./pay-with-razorpay";

type Provider = "razorpay" | "cashfree";

declare global {
  interface Window {
    Cashfree?: new (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget?: string }) => Promise<{ error?: unknown }>;
    };
  }
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

function CashfreeButton({
  certificateId,
  amountLabel,
  onPaid,
}: {
  certificateId: string;
  amountLabel: string;
  onPaid: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      await loadCashfreeJs();
      const orderRes = await fetch("/api/payments/cashfree/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "platform_fee", certificateId }),
      });
      const order = (await orderRes.json()) as { paymentSessionId?: string; orderId?: string; error?: string };
      if (!order.paymentSessionId || !order.orderId) {
        throw new Error(order.error ?? "Could not create payment order");
      }
      const CashfreeCtor = window.Cashfree;
      if (!CashfreeCtor) throw new Error("Cashfree SDK failed to load");
      const cf = new CashfreeCtor({ mode: "production" });
      const result = await cf.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_modal",
      });
      if (result.error) throw new Error("Payment was not completed");
      const verifyRes = await fetch("/api/payments/cashfree/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, purpose: "platform_fee", certificateId }),
      });
      const verified = (await verifyRes.json()) as { ok?: boolean; error?: string };
      if (!verified.ok) throw new Error(verified.error ?? "Verification failed");
      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button onClick={pay} disabled={busy} variant="outline">
        {busy ? "Processing…" : `Pay ${amountLabel} with Cashfree`}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function PayWithProvider({
  certificateId,
  amountLabel,
  onPaid,
}: {
  certificateId: string;
  amountLabel: string;
  onPaid: () => void;
}) {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [choice, setChoice] = useState<Provider | null>(null);

  useEffect(() => {
    fetch("/api/payments/active-provider")
      .then((r) => r.json())
      .then((d) => setProviders((d.providers ?? []) as Provider[]))
      .catch(() => setProviders([]));
  }, []);

  if (providers === null) return null;
  if (providers.length === 0) return null;

  // Single provider → direct button, no chooser.
  if (providers.length === 1) {
    const p = providers[0];
    return p === "razorpay" ? (
      <PayWithRazorpay
        certificateId={certificateId}
        kind="platform_fee"
        amountLabel={amountLabel}
        enabled
        onPaid={onPaid}
      />
    ) : (
      <CashfreeButton certificateId={certificateId} amountLabel={amountLabel} onPaid={onPaid} />
    );
  }

  // Both → let the customer pick.
  if (!choice) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-700">Choose a payment method:</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setChoice("razorpay")}>Pay {amountLabel} with Razorpay</Button>
          <Button variant="outline" onClick={() => setChoice("cashfree")}>
            Pay {amountLabel} with Cashfree
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {choice === "razorpay" ? (
        <PayWithRazorpay
          certificateId={certificateId}
          kind="platform_fee"
          amountLabel={amountLabel}
          enabled
          onPaid={onPaid}
        />
      ) : (
        <CashfreeButton certificateId={certificateId} amountLabel={amountLabel} onPaid={onPaid} />
      )}
      <button
        type="button"
        onClick={() => setChoice(null)}
        className="self-start text-xs text-slate-500 underline"
      >
        Use a different payment method
      </button>
    </div>
  );
}
