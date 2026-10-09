import { requestPasswordReset } from "@/server/auth/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/auth-layout";
import { BRAND } from "@/config/brand";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset password"
      description={`${BRAND.name} — we'll send a reset link (valid 1 hour)`}
      footer={
        <a
          href="/super-admin/login"
          className="text-neutral-500 underline underline-offset-4 transition hover:text-neutral-900"
        >
          Back to login
        </a>
      }
    >
      <form action={request} className="flex flex-col gap-4">
        <Input
          name="email"
          type="email"
          placeholder="Email"
          required
          autoComplete="email"
          className="h-11 rounded-xl focus-visible:ring-brand-500"
        />
        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 text-[15px] font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-brand-400 hover:to-indigo-500"
        >
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}

async function request(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  await requestPasswordReset(email);
  // Always show the same message (no account enumeration).
}
