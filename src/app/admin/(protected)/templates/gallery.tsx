"use client";

// src/app/admin/(protected)/templates/gallery.tsx
//
// Template gallery: cards with live thumbnails, watermarked preview modal,
// select (free/unlocked) and Razorpay unlock flow for premium templates.
import { useState } from "react";
import type { TenantTemplateInfo } from "@/server/certificates/template-service";
import { selectTemplateAction } from "./actions";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    Cashfree?: new (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget?: string }) => Promise<{ error?: unknown }>;
    };
  }
}

export function TemplateGallery({
  templates,
  razorpayConfigured,
  razorpayKeyId,
  checkoutProviders,
}: {
  templates: TenantTemplateInfo[];
  razorpayConfigured: boolean;
  razorpayKeyId: string;
  checkoutProviders: ("razorpay" | "cashfree")[];
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState(templates);

  const preview = previewId ? local.find((t) => t.id === previewId) : null;

  async function handleSelect(id: string) {
    setBusy(id);
    setError(null);
    const res = await selectTemplateAction(id);
    setBusy(null);
    if (!res.ok) {
      setError(res.error ?? "Could not select template");
      return;
    }
    setLocal((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
  }

  async function handleUnlock(t: TenantTemplateInfo, provider: "razorpay" | "cashfree") {
    setError(null);
    if (provider === "cashfree") {
      await unlockWithCashfree(t);
      return;
    }
    if (!razorpayConfigured || !window.Razorpay) {
      setError("Online payment is not configured yet. Please contact support to unlock premium templates.");
      return;
    }
    setBusy(t.id);
    try {
      const orderRes = await fetch("/api/payments/razorpay/template-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: t.id }),
      });
      const order = (await orderRes.json()) as { orderId?: string; error?: string };
      if (!order.orderId) throw new Error(order.error ?? "Could not create payment order");

      const rzp = new window.Razorpay({
        key: razorpayKeyId,
        order_id: order.orderId,
        name: "Certivo",
        description: `Unlock template: ${t.name}`,
        theme: { color: "#0F172A" },
        handler: async (resp: { razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/payments/razorpay/template-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              templateId: t.id,
              orderId: order.orderId,
              paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
            }),
          });
          const result = (await verifyRes.json()) as { ok?: boolean; error?: string };
          setBusy(null);
          if (!result.ok) {
            setError(result.error ?? "Payment verification failed");
            return;
          }
          setLocal((prev) => prev.map((x) => (x.id === t.id ? { ...x, unlocked: true } : x)));
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.open();
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : "Unlock failed");
    }
  }

  async function unlockWithCashfree(t: TenantTemplateInfo) {
    setBusy(t.id);
    try {
      const { default: loadCashfree } = await import("./cashfree-loader");
      await loadCashfree();
      const orderRes = await fetch("/api/payments/cashfree/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "template_unlock", templateId: t.id }),
      });
      const order = (await orderRes.json()) as { paymentSessionId?: string; orderId?: string; error?: string };
      if (!order.paymentSessionId || !order.orderId) {
        throw new Error(order.error ?? "Could not create payment order");
      }
      const cf = new window.Cashfree!({ mode: "production" });
      const result = await cf.checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: "_modal" });
      if (result.error) throw new Error("Payment was not completed");
      const verifyRes = await fetch("/api/payments/cashfree/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, purpose: "template_unlock", templateId: t.id }),
      });
      const verified = (await verifyRes.json()) as { ok?: boolean; error?: string };
      if (!verified.ok) throw new Error(verified.error ?? "Verification failed");
      setLocal((prev) => prev.map((x) => (x.id === t.id ? { ...x, unlocked: true } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {local.map((t) => (
          <div
            key={t.id}
            className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
              t.active ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200"
            }`}
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/templates/${t.id}.png`}
                alt={`${t.name} preview`}
                className="aspect-[1.414/1] w-full bg-slate-100 object-cover"
                loading="lazy"
                onError={(e) => {
                  // Thumbnail PNG not in repo yet — hide gracefully instead
                  // of a broken image (watermarked preview still works).
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="absolute right-3 top-3 rounded-md bg-neutral-900/80 px-2.5 py-1 text-[10px] font-bold tracking-widest text-white">
                DEMO
              </span>
              <div className="absolute left-3 top-3 flex gap-2">
                {t.tier === "free" ? (
                  <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">FREE</span>
                ) : (
                  <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white">
                    {formatRupees(t.pricePaise)}
                  </span>
                )}
                {t.active && (
                  <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">ACTIVE</span>
                )}
                {t.tier === "premium" && !t.unlocked && (
                  <span className="rounded-full bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-white">LOCKED</span>
                )}
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-slate-900">{t.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{t.blurb}</p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setPreviewId(t.id)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Preview
                </button>
                {t.active ? (
                  <span className="flex-1 rounded-lg bg-indigo-50 px-3 py-2 text-center text-sm font-medium text-indigo-700">
                    In use
                  </span>
                ) : t.unlocked ? (
                  <button
                    onClick={() => handleSelect(t.id)}
                    disabled={busy === t.id}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {busy === t.id ? "…" : "Use template"}
                  </button>
                ) : checkoutProviders.length === 0 ? (
                  <span className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs text-slate-500">
                    Payment not configured — contact support
                  </span>
                ) : checkoutProviders.length > 1 ? (
                  <div className="flex flex-1 flex-col gap-1.5">
                    <span className="text-center text-xs text-slate-500">Unlock {formatRupees(t.pricePaise)} via</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleUnlock(t, "razorpay")}
                        disabled={busy === t.id}
                        className="flex-1 rounded-lg bg-amber-500 px-2 py-2 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                      >
                        {busy === t.id ? "…" : "Razorpay"}
                      </button>
                      <button
                        onClick={() => handleUnlock(t, "cashfree")}
                        disabled={busy === t.id}
                        className="flex-1 rounded-lg bg-sky-600 px-2 py-2 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                      >
                        {busy === t.id ? "…" : "Cashfree"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleUnlock(t, checkoutProviders[0]!)}
                    disabled={busy === t.id}
                    className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {busy === t.id ? "…" : `Unlock ${formatRupees(t.pricePaise)}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Watermarked preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewId(null)}>
          <div className="w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div>
                <h2 className="font-semibold text-slate-900">{preview.name}</h2>
                <p className="text-xs text-slate-500">Watermarked preview — unlock to use on real certificates</p>
              </div>
              <button onClick={() => setPreviewId(null)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
                Close
              </button>
            </div>
            <iframe
              src={`/api/admin/templates/preview/${preview.id}`}
              title={`${preview.name} preview`}
              className="h-[70vh] w-full"
            />
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              {preview.unlocked && !preview.active ? (
                <button
                  onClick={() => { handleSelect(preview.id); setPreviewId(null); }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Use this template
                </button>
              ) : !preview.unlocked ? (
                checkoutProviders.length === 0 ? (
                  <span className="text-xs text-slate-500">Payment not configured — contact support</span>
                ) : checkoutProviders.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Unlock {formatRupees(preview.pricePaise)} via</span>
                    <button
                      onClick={() => { setPreviewId(null); handleUnlock(preview, "razorpay"); }}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                    >
                      Razorpay
                    </button>
                    <button
                      onClick={() => { setPreviewId(null); handleUnlock(preview, "cashfree"); }}
                      className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                    >
                      Cashfree
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setPreviewId(null); handleUnlock(preview, checkoutProviders[0]!); }}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                  >
                    Unlock {formatRupees(preview.pricePaise)}
                  </button>
                )
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Checkout.js */}
      {razorpayConfigured && <script src="https://checkout.razorpay.com/v1/checkout.js" async />}
    </div>
  );
}
