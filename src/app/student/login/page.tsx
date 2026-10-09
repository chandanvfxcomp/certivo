import Link from "next/link";
import { loginStudent } from "@/app/student/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth-layout";
import { BRAND } from "@/config/brand";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Student ID and password are required.",
  invalid: "That student ID/password combination isn't recognized.",
  rate_limited: "Too many sign-in attempts. Please wait a few minutes and try again.",
  // QA audit finding H1: distinct from "invalid" above — this is a stale
  // session for an account that no longer exists, not a wrong password.
  session_expired: "Your session has expired. Please sign in again.",
};

const linkClass =
  "text-neutral-500 underline underline-offset-4 transition hover:text-neutral-900";

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthLayout
      title="Student sign in"
      description={`${BRAND.name} — view and download your certificate`}
      footer={
        <div className="flex flex-col items-center gap-2">
          <Link href="/student/forgot-password" className={linkClass}>
            Forgot password?
          </Link>
          <Link href="/admin/login" className={linkClass}>
            Institute admin sign in
          </Link>
        </div>
      }
    >
      <form action={loginStudent} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {ERROR_MESSAGES[error] ?? "Something went wrong — please try again."}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="studentCode">
            Student ID
          </Label>
          {/* QA audit finding A10: student IDs were switched to random
              8-character codes (generateUniqueStudentCode, admin/actions.ts)
              to stop them being sequentially guessable — this placeholder
              still showed the old sequential format, which no student's
              real ID could ever match. */}
          <Input
            id="studentCode"
            name="studentCode"
            placeholder="STU-A3F9K2QH"
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
