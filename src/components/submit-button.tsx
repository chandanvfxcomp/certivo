"use client";

// src/components/submit-button.tsx
//
// QA audit finding D1: several forms (login, "Mark paid", "Pay now",
// "Sign out") had no pending/disabled state on their submit button, so a
// fast double-click fires two concurrent Server Action calls. The fix
// already existed in this codebase for two other forms
// (students/new/form.tsx, reset-password-button.tsx) via
// useActionState's `pending` — this component gets the same effect for
// every OTHER form here, including the void/redirect()-based actions
// (loginAdmin, logoutAdmin, markRegistrationFeePaid, etc.) that don't
// return a useActionState-compatible state at all: useFormStatus reads
// pending state from the nearest parent <form>, regardless of what its
// Server Action returns.
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingText,
  ...props
}: ButtonProps & { pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
