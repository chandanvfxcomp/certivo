"use client";

// src/app/super-admin/(protected)/plans/form.tsx
//
// Shared create/edit form for subscription plans.
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import type { PlanFeatures } from "@/server/subscription/service";

interface FormState {
  status: "ok" | "error";
  message: string;
}

const initialState: FormState = { status: "ok", message: "" };

export function PlanForm({
  action,
  initial,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial: {
    name: string;
    description: string;
    priceRupees: string;
    studentLimit: string;
    sortOrder: string;
    features: PlanFeatures;
  };
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      {state.status === "error" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Plan name</Label>
          <Input id="name" name="name" defaultValue={initial.name} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={initial.sortOrder} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue={initial.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priceRupees">Price (₹ per year)</Label>
          <Input
            id="priceRupees"
            name="priceRupees"
            type="number"
            min={0}
            step="1"
            defaultValue={initial.priceRupees}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="studentLimit">Student limit (blank = unlimited)</Label>
          <Input
            id="studentLimit"
            name="studentLimit"
            type="number"
            min={1}
            placeholder="Unlimited"
            defaultValue={initial.studentLimit}
          />
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Features</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["bulkIssuance", "Bulk issuance (CSV upload)"],
              ["analytics", "Analytics dashboard"],
              ["allTemplates", "All 10 certificate templates"],
              ["whiteLabel", "White-label branding"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={key}
                defaultChecked={initial.features[key] ?? false}
                className="h-4 w-4 rounded"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <SubmitButton pendingText="Saving…">Save plan</SubmitButton>
      </div>
    </form>
  );
}
