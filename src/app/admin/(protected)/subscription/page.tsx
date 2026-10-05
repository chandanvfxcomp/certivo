// src/app/admin/(protected)/subscription/page.tsx
//
// Institute subscription — choose a yearly plan to activate the account.
// Without an ACTIVE subscription the rest of the admin console stays locked
// (see the (protected) layout guard).
import { getSession } from "@/server/auth/session";
import {
  getActivePlans,
  getSubscriptionState,
} from "@/server/subscription/service";
import { isRazorpayConfigured } from "@/server/payments/razorpay";
import { getCheckoutProviders } from "@/server/payments/provider";
import { Card } from "@/components/ui/card";
import { PlanCheckout } from "./checkout";

function StatusBanner({
  status,
  planName,
  endsAt,
}: {
  status: string;
  planName: string | null;
  endsAt: Date | null;
}) {
  if (status === "ACTIVE") {
    return (
      <Card className="border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950">
        <p className="font-semibold text-green-800 dark:text-green-200">
          Subscription active{planName ? ` — ${planName}` : ""}
        </p>
        {endsAt && (
          <p className="mt-1 text-sm text-green-700 dark:text-green-300">
            Valid until {endsAt.toLocaleDateString("en-IN", { dateStyle: "long" })}.
            Renew or change your plan below anytime.
          </p>
        )}
      </Card>
    );
  }
  const headline =
    status === "EXPIRED"
      ? "Your subscription has expired"
      : "Activate your institute account";
  return (
    <Card className="border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
      <p className="font-semibold text-amber-800 dark:text-amber-200">{headline}</p>
      <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
        {status === "EXPIRED"
          ? "Renew your plan below to unlock the admin console again. Your data is safe."
          : "Choose a yearly plan and complete the payment to unlock the full admin console — student management, certificates, templates and analytics."}
      </p>
    </Card>
  );
}

export default async function SubscriptionPage() {
  const session = await getSession();
  if (!session || session.kind !== "admin") return null;

  const [plans, state, checkoutProviders] = await Promise.all([
    getActivePlans(),
    getSubscriptionState(session.tenantId),
    getCheckoutProviders(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscription</h1>
        <p className="mt-1 text-sm text-neutral-500">
          One yearly payment keeps your institute account active — student
          management, certificates, templates and analytics included.
        </p>
      </div>

      <StatusBanner
        status={state.status}
        planName={state.plan?.name ?? null}
        endsAt={state.subscriptionEndsAt}
      />

      <PlanCheckout
        plans={plans}
        currentPlanId={state.plan?.id ?? null}
        razorpayConfigured={isRazorpayConfigured()}
        razorpayKeyId={process.env.RAZORPAY_KEY_ID ?? ""}
        checkoutProviders={checkoutProviders}
      />
    </div>
  );
}
