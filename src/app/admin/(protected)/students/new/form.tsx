"use client";

// src/app/admin/(protected)/students/new/form.tsx
//
// Client component so useActionState can render registerStudent's result
// (studentCode/tempPassword/certificateCode) inline instead of a redirect
// — keeps the temp password out of any URL/browser-history entry.
import { useActionState, type InputHTMLAttributes } from "react";
import Link from "next/link";
import { registerStudent, type RegisterStudentState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const initialState: RegisterStudentState = { status: "idle" };

export function RegisterStudentForm() {
  const [state, formAction, pending] = useActionState(registerStudent, initialState);
  // QA audit finding D4: bound both date fields to "no later than today" in
  // the browser too (the server already enforces this in
  // parseOptionalPastOrTodayDate) so the picker itself can't offer a future
  // date. Computed once per render rather than a module constant so a page
  // left open across midnight still gets the correct bound on next render.
  const today = new Date().toISOString().slice(0, 10);

  if (state.status === "success") {
    const { studentCode, tempPassword, certificateCode } = state.data;
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-success-500">Student registered</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Share these with the student — the password is shown only once.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Student ID (login)</dt>
            <dd className="font-mono text-sm">{studentCode}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Temporary password</dt>
            <dd className="font-mono text-sm">{tempPassword}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Certificate code</dt>
            <dd className="font-mono text-sm">{certificateCode}</dd>
          </div>
        </dl>
        <div className="mt-6 flex gap-3">
          <Link href="/admin/students">
            <Button variant="outline">Back to students</Button>
          </Link>
          <Link href="/admin/students/new">
            <Button>Register another</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.status === "error" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Student details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="fullName" required autoFocus />
          <Field label="Course" name="courseName" required placeholder="e.g. Full Stack Web Development" />
          <Field label="Grade" name="grade" placeholder="e.g. A+" />
          <Field label="Mode" name="mode" placeholder="e.g. Offline" />
          <Field
            label="Email"
            name="email"
            type="email"
            placeholder="name@example.com"
            pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
            title="Enter a valid email address"
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            pattern="[6-9][0-9]{9}"
            title="10-digit mobile number"
            placeholder="9876543210"
          />
          <Field label="Date of birth" name="dateOfBirth" type="date" max={today} />
          <Field label="Gender" name="gender" />
          <Field label="Guardian name" name="guardianName" />
          <Field
            label="Completion date"
            name="completionDate"
            type="date"
            max={today}
            helperText="Defaults to today if left blank."
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1" name="addressLine1" className="sm:col-span-2" />
          <Field label="City" name="city" />
          <Field label="State" name="state" />
          <Field label="Pincode" name="pincode" />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 font-semibold">Fees</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Shown to the student transparently in their portal. Amounts are collected manually for
          now (no payment gateway yet) — mark them paid from the student&apos;s page.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration fee (₹)" name="registrationFeeRupees" type="number" min={0} step="1" />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Registering…" : "Register student"}
        </Button>
        <Link href="/admin/students">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  className,
  helperText,
  ...props
}: {
  label: string;
  name: string;
  className?: string;
  helperText?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
      {helperText && <p className="text-xs text-neutral-500">{helperText}</p>}
    </div>
  );
}
