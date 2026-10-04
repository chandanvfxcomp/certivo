import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

// SPEC-GAP: no email/SMS sending is wired up yet, so this is an honest
// stub, not a working reset flow — self-service reset needs that
// infrastructure first. Until then, a student who's lost their password
// asks their institute admin to look them up (admin already sees the
// student's login details on their profile page) rather than getting a
// broken "check your email" screen that never arrives.
export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>Self-service reset isn&apos;t available yet</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <p>
            Password reset emails aren&apos;t set up yet. For now, please contact your
            institute&apos;s admin — they can look up your account and share your login
            details again.
          </p>
          {/* QA audit finding D2: the page told a locked-out student to
              "contact your admin" with no way to actually do that from
              here — a genuine dead end. This is a stopgap, not a full
              per-institute contact directory (that needs a Centre contact
              field, which doesn't exist yet), but it's a real, working
              contact method rather than none. */}
          <a
            href={`mailto:${BRAND.supportEmail}`}
            className="rounded-md border border-neutral-200 px-3 py-2 text-center underline underline-offset-2 dark:border-neutral-800"
          >
            Email {BRAND.supportEmail}
          </a>
          <Link href="/student/login">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
