"use client";

// src/app/institute/register/form.tsx
//
// Client component so useActionState can render registerInstitute's result
// inline — the "awaiting approval" state, not a redirect.
import { useActionState } from "react";
import Link from "next/link";
import { registerInstitute, type RegisterInstituteState } from "@/app/institute/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BRAND } from "@/config/brand";

const initialState: RegisterInstituteState = { status: "idle" };

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...props} />
    </div>
  );
}

export function RegisterInstituteForm() {
  const [state, formAction, pending] = useActionState(registerInstitute, initialState);

  if (state.status === "success") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Registration submitted</CardTitle>
          <CardDescription>
            {state.instituteName} is awaiting approval from Certivo&apos;s Super Admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Once approved, sign in with the email and password you just chose. We&apos;ll
            review the application shortly.
          </p>
          <Link href="/" className="mt-6 block">
            <Button variant="outline" className="w-full">
              Back to home
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Register your institute</CardTitle>
        <CardDescription>
          {BRAND.name} — creates your institute&apos;s own admin login. A Super Admin
          approves it before sign-in opens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.status === "error" && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
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
          <label className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <input type="checkbox" name="termsAccepted" required className="mt-1" />
            <span>
              I agree to Certivo&apos;s Terms of Service and Privacy Policy on behalf of this
              institute.
            </span>
          </label>
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Submitting…" : "Submit for approval"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500">
          Looking for your certificate instead?{" "}
          <Link href="/student/login" className="underline underline-offset-2">
            Student sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
