"use client";

// src/app/admin/(protected)/students/[id]/reset-password-button.tsx
//
// Client component so useActionState can render the new temp password
// inline — same reason as students/new/form.tsx: never let a password
// end up in a URL or browser-history entry via a redirect.
import { useActionState } from "react";
import { resetStudentPassword, type ResetPasswordState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const initialState: ResetPasswordState = { status: "idle" };

export function ResetPasswordButton({ studentId }: { studentId: string }) {
  const action = resetStudentPassword.bind(null, studentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.status === "success") {
    return (
      <div className="mt-3 rounded-md border border-success-500/30 bg-success-500/5 p-3 text-sm">
        <p className="font-medium text-success-500">Password reset</p>
        <p className="mt-1 text-neutral-500">
          New temporary password — share it with the student now, it won&apos;t be shown again:
        </p>
        <p className="mt-1 font-mono text-base">{state.data.tempPassword}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-3">
      {state.status === "error" && (
        <p className="mb-2 text-sm text-danger-500">{state.message}</p>
      )}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
