import { requestPasswordReset } from "@/server/auth/password-reset";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold">Reset password</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter your super-admin email — we&apos;ll send a reset link (valid 1 hour).
        </p>
        <form action={request} className="mt-4 space-y-3">
          <Input name="email" type="email" placeholder="Email" required autoComplete="email" />
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
        <p className="mt-3 text-center text-sm">
          <a href="/super-admin/login" className="text-blue-600 hover:underline">Back to login</a>
        </p>
      </Card>
    </main>
  );
}

async function request(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  await requestPasswordReset(email);
  // Always show the same message (no account enumeration).
}
