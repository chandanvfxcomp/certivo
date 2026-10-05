// src/app/super-admin/(protected)/plans/page.tsx
//
// Subscription plan management — list, create, edit, activate/deactivate
// the yearly institute plans.
import { requireSuperAdminSession } from "@/server/auth/session";
import { getAllPlans } from "@/server/subscription/service";
import { createPlan, updatePlan, togglePlanActive } from "@/app/super-admin/actions";
import { Card } from "@/components/ui/card";
import { PlanForm } from "./form";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function PlansPage() {
  await requireSuperAdminSession();
  const plans = await getAllPlans();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscription plans</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Yearly plans institutes buy to activate their account. Price is per
          year; student limit caps how many students an institute may register
          (−1 = unlimited).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={`p-5 ${!plan.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold">{plan.name}</h2>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {formatRupees(plan.pricePaise)} / year ·{" "}
                  {plan.studentLimit === -1 ? "Unlimited students" : `Up to ${plan.studentLimit} students`}
                </p>
              </div>
              <form action={togglePlanActive.bind(null, plan.id, !plan.isActive)}>
                <button
                  type="submit"
                  title={plan.isActive ? "Deactivate plan" : "Activate plan"}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    plan.isActive
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400"
                  }`}
                >
                  {plan.isActive ? "Active" : "Inactive"}
                </button>
              </form>
            </div>
            {plan.description && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{plan.description}</p>
            )}
            <ul className="mt-3 space-y-1 text-xs text-neutral-500">
              <li>Bulk issuance: {plan.features.bulkIssuance ? "✓" : "—"}</li>
              <li>Analytics: {plan.features.analytics ? "✓" : "—"}</li>
              <li>All templates: {plan.features.allTemplates ? "✓" : "—"}</li>
              <li>White-label: {plan.features.whiteLabel ? "✓" : "—"}</li>
            </ul>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:underline">
                Edit plan
              </summary>
              <PlanForm
                action={updatePlan.bind(null, plan.id)}
                initial={{
                  name: plan.name,
                  description: plan.description ?? "",
                  priceRupees: String(plan.pricePaise / 100),
                  studentLimit: plan.studentLimit === -1 ? "" : String(plan.studentLimit),
                  sortOrder: String(plan.sortOrder),
                  features: plan.features,
                }}
              />
            </details>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-semibold">Create a new plan</h2>
        <PlanForm
          action={createPlan}
          initial={{
            name: "",
            description: "",
            priceRupees: "",
            studentLimit: "",
            sortOrder: String(plans.length + 1),
            features: { bulkIssuance: true, analytics: true, allTemplates: false, whiteLabel: false },
          }}
        />
      </Card>
    </div>
  );
}
