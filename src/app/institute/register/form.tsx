"use client";

// src/app/institute/register/form.tsx
//
// Client component so useActionState can render registerInstitute's result
// inline — the "awaiting approval" state, not a redirect. Renders
// borderless content by design: the page wraps it in AuthLayout's glass
// card, so this component must not bring its own Card.
import { useActionState } from "react";
import Link from "next/link";
import { registerInstitute, type RegisterInstituteState } from "@/app/institute/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: RegisterInstituteState = { status: "idle" };

const inputClass =
  "h-11 rounded-xl focus-visible:ring-brand-500";

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
      </Label>
      <Input id={id} name={id} className={inputClass} {...props} />
    </div>
  );
}

export function RegisterInstituteForm({ referralCode }: { referralCode?: string | null }) {
  const [state, formAction, pending] = useActionState(registerInstitute, initialState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm leading-relaxed text-neutral-600">
          <strong className="text-neutral-900">{state.instituteName}</strong> is awaiting approval
          from Certivo&apos;s Super Admin. Once approved, sign in with the email and
          password you just chose — we&apos;ll review the application shortly.
        </p>
        <Link href="/" className="mt-2 block">
          <Button
            variant="outline"
            className="h-11 w-full rounded-xl"
          >
            Back to home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {referralCode && (
        <p className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
          You were referred by a partner institute — welcome!
        </p>
      )}
      <form action={formAction} className="flex flex-col gap-4">
        {referralCode && (
          <input type="hidden" name="referralCode" value={referralCode} />
        )}
        {state.status === "error" && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message}
          </p>
        )}
        <Field id="name" label="Institute name" required autoFocus placeholder="e.g. Sunrise Skills Academy" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ownerName" label="Owner / contact name" required />
          <Field id="ownerEmail" label="Owner email" type="email" required placeholder="name@example.com" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="ownerPhone"
            label="Owner phone"
            type="tel"
            required
            placeholder="9876543210"
            inputMode="numeric"
            maxLength={10}
            pattern="[6-9][0-9]{9}"
            title="10-digit mobile number"
          />
          <Field id="pincode" label="Pincode" required inputMode="numeric" maxLength={6} pattern="[0-9]{6}" />
        </div>
        <Field id="addressLine1" label="Address line 1" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="city" label="City" required />
          <Field id="state" label="State" required />
        </div>
        <Field
          id="password"
          label="Choose a password (min 8 characters)"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <label className="flex items-start gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="termsAccepted" required className="mt-1 accent-indigo-500" />
          <span>
            I agree to Certivo&apos;s Terms of Service and Privacy Policy on behalf of this
            institute.
          </span>
        </label>
        <Button
          type="submit"
          disabled={pending}
          className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 text-[15px] font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-brand-400 hover:to-indigo-500"
        >
          {pending ? "Submitting…" : "Submit for approval"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-neutral-500">
        Looking for your certificate instead?{" "}
        <Link href="/student/login" className="underline underline-offset-4 transition hover:text-neutral-900">
          Student sign in
        </Link>
      </p>
    </div>
  );
}
