import Link from "next/link";
import { loginAdmin } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth-layout";
import { BRAND } from "@/config/brand";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Email and password are required.",
  invalid: "That email/password combination isn't recognized.",
  rate_limited: "Too many sign-in attempts. Please wait a few minutes and try again.",
  pending: "This institute's registration is still awaiting Super Admin approval — sign-in opens once it's approved.",
  suspended: "This institute's account has been suspended. Contact the platform to reactivate it.",
};

const linkClass =
  "text-neutral-400 underline underline-offset-4 transition hover:text-white";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthLayout
      title="Institute admin sign in"
      description={`${BRAND.name} — institute admin console`}
      footer={
        <div className="flex flex-col items-center gap-2">
          <p>
            Looking for your certificate instead?{" "}
            <Link href="/student/login" className={linkClass}>
              Student sign in
            </Link>
          </p>
          <p>
            New institute?{" "}
            <Link href="/institute/register" className={linkClass}>
              Register here
            </Link>
          </p>
        </div>
      }
    >
      <form action={loginAdmin} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {ERROR_MESSAGES[error] ?? "Something went wrong — please try again."}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-neutral-300">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-neutral-300">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-neutral-500 focus-visible:ring-brand-500"
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
