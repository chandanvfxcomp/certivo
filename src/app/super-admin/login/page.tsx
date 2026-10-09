import Link from "next/link";
import { loginSuperAdmin } from "@/app/super-admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth-layout";
import { BRAND } from "@/config/brand";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Email and password are required.",
  invalid: "That email/password combination isn't recognized.",
  rate_limited: "Too many sign-in attempts. Please wait a few minutes and try again.",
};

export default async function SuperAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthLayout
      title="Super Admin sign in"
      description={`${BRAND.name} — platform administration`}
      footer={
        <Link
          href="/super-admin/forgot-password"
          className="text-neutral-500 underline underline-offset-4 transition hover:text-neutral-900"
        >
          Forgot password?
        </Link>
      }
    >
      <form action={loginSuperAdmin} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {ERROR_MESSAGES[error] ?? "Something went wrong — please try again."}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            className="h-11 rounded-xl focus-visible:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="h-11 rounded-xl focus-visible:ring-brand-500"
          />
        </div>
        <SubmitButton
          pendingText="Signing in…"
          className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 text-[15px] font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-brand-400 hover:to-indigo-500"
        >
          Sign in
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
