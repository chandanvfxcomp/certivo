import Link from "next/link";
import { loginStudent } from "@/app/student/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BRAND } from "@/config/brand";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Student ID and password are required.",
  invalid: "That student ID/password combination isn't recognized.",
  rate_limited: "Too many sign-in attempts. Please wait a few minutes and try again.",
  // QA audit finding H1: distinct from "invalid" above — this is a stale
  // session for an account that no longer exists, not a wrong password.
  session_expired: "Your session has expired. Please sign in again.",
};

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Student sign in</CardTitle>
          <CardDescription>{BRAND.name} — view and download your certificate</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginStudent} className="flex flex-col gap-4">
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {ERROR_MESSAGES[error] ?? "Something went wrong — please try again."}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="studentCode">Student ID</Label>
              {/* QA audit finding A10: student IDs were switched to random
                  8-character codes (generateUniqueStudentCode, admin/actions.ts)
                  to stop them being sequentially guessable — this placeholder
                  still showed the old sequential format, which no student's
                  real ID could ever match. */}
              <Input id="studentCode" name="studentCode" placeholder="STU-A3F9K2QH" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <SubmitButton pendingText="Signing in…" className="mt-2">
              Sign in
            </SubmitButton>
          </form>
          <div className="mt-4 flex flex-col items-center gap-1 text-sm text-neutral-500">
            <Link href="/student/forgot-password" className="underline underline-offset-2">
              Forgot password?
            </Link>
            {/* QA audit findings D5/G1: standardized label — see
                admin/login/page.tsx's matching comment. */}
            <Link href="/admin/login" className="underline underline-offset-2">
              Institute admin sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
