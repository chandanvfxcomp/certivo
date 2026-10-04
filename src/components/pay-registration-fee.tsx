"use client";

// src/components/pay-registration-fee.tsx
//
// Student registration fee payment — offers whichever gateway(s) the super
// admin enabled (AppSetting "payments.provider": razorpay | cashfree | both).
// On success, calls the verify endpoint which issues the invoice and marks
// the student paid; the parent refreshes via onPaid.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Provider = "razorpay" | "cashfree";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    Cashfree?: new (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget?: string }) => Promise<{ error?: unknown }>;
    };
  }
}

function loadRazorpayJs(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
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

export function PayRegistrationFee({
  amountLabel,
  onPaid,
}: {
  amountLabel: string;
  onPaid: (invoiceNumber: string) => void;
}) {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [choice, setChoice] = useState<Provider | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/payments/active-provider")
      .then((r) => r.json())
      .then((d) => setProviders((d.providers ?? []) as Provider[]))
      .catch(() => setProviders([]));
  }, []);

  if (providers === null) return null;
  if (providers.length === 0) {
    return <p className="text-sm text-neutral-500">Online payment isn&apos;t set up yet — please contact your institute.</p>;
  }

  const payWith = async (provider: Provider) => {
    setBusy(true);
    setError(null);
    try {
      const orderRes = await fetch("/api/student/registration-fee/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const order = (await orderRes.json()) as {
        orderId?: string;
        paymentSessionId?: string;
        keyId?: string;
        mode?: "sandbox" | "production";
        error?: string;
      };
      if (!orderRes.ok || !order.orderId) {
        throw new Error(order.error === "PAYMENTS_NOT_CONFIGURED" ? "Online payment isn't set up yet." : "Couldn't start the payment. Please try again.");
      }

      if (provider === "razorpay") {
        await loadRazorpayJs();
        const Razorpay = window.Razorpay;
        if (!Razorpay) throw new Error("Couldn't load the payment window. Please try again.");
        const rzp = new Razorpay({
          key: order.keyId,
          amount: undefined, // amount comes from the order
          currency: "INR",
          order_id: order.orderId,
          name: "Certivo",
          description: "Student registration fee",
          handler: async (resp: { razorpay_payment_id?: string; razorpay_signature?: string }) => {
            try {
              const verifyRes = await fetch("/api/student/registration-fee/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  provider: "razorpay",
                  orderId: order.orderId,
                  paymentId: resp.razorpay_payment_id,
                  signature: resp.razorpay_signature,
                }),
              });
              const verified = (await verifyRes.json()) as { ok?: boolean; invoiceNumber?: string; error?: string };
              if (!verified.ok || !verified.invoiceNumber) throw new Error(verified.error ?? "Verification failed");
              onPaid(verified.invoiceNumber);
            } catch {
              setError("Payment went through but confirmation failed — it will be reconciled automatically. Check back in a minute.");
            } finally {
              setBusy(false);
            }
          },
          modal: { ondismiss: () => setBusy(false) },
        });
        rzp.open();
      } else {
        await loadCashfreeJs();
        const CashfreeCtor = window.Cashfree;
        if (!CashfreeCtor) throw new Error("Cashfree SDK failed to load");
        const cf = new CashfreeCtor({ mode: order.mode ?? "production" });
        const result = await cf.checkout({
          paymentSessionId: order.paymentSessionId!,
          redirectTarget: "_modal",
        });
        if (result.error) throw new Error("Payment was not completed");
        const verifyRes = await fetch("/api/student/registration-fee/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "cashfree", orderId: order.orderId }),
        });
        const verified = (await verifyRes.json()) as { ok?: boolean; invoiceNumber?: string; error?: string };
        if (!verified.ok || !verified.invoiceNumber) throw new Error(verified.error ?? "Verification failed");
        onPaid(verified.invoiceNumber);
        setBusy(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setBusy(false);
    }
  };

  // Single provider → direct button.
  if (providers.length === 1) {
    const p = providers[0] as Provider;
    return (
      <div className="flex flex-col gap-2">
        <Button onClick={() => payWith(p)} disabled={busy}>
          {busy ? "Processing…" : `Pay ${amountLabel} online`}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // Both → chooser.
  if (!choice) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-neutral-700">Choose a payment method:</p>
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
      <Button onClick={() => payWith(choice)} disabled={busy}>
        {busy ? "Processing…" : `Pay ${amountLabel} with ${choice === "razorpay" ? "Razorpay" : "Cashfree"}`}
      </Button>
      <button type="button" onClick={() => setChoice(null)} className="text-xs text-neutral-500 underline">
        Choose a different method
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
