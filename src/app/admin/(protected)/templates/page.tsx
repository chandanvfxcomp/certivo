// src/app/admin/(protected)/templates/page.tsx
//
// Certificate template gallery — 1 free + 9 premium templates.
// Institutes preview any template (watermarked) and unlock premium ones
// with a one-time payment.
import { getSession } from "@/server/auth/session";
import { getTenantTemplates } from "@/server/certificates/template-service";
import { isRazorpayConfigured } from "@/server/payments/razorpay";
import { getCheckoutProviders } from "@/server/payments/provider";
import { TemplateGallery } from "./gallery";

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session || session.kind !== "admin") return null;

  const templates = await getTenantTemplates(session.tenantId);
  const checkoutProviders = await getCheckoutProviders();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Certificate Templates</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose the design printed on every certificate your institute issues.{" "}
          <span className="font-medium text-slate-800">Classic Simple is free forever.</span>{" "}
          Premium templates unlock with a one-time payment — yours to keep.
        </p>
      </div>
      <TemplateGallery
        templates={templates}
        razorpayConfigured={isRazorpayConfigured()}
        razorpayKeyId={process.env.RAZORPAY_KEY_ID ?? ""}
        checkoutProviders={checkoutProviders}
      />
    </div>
  );
}
