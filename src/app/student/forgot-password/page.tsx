import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth-layout";
import { BRAND } from "@/config/brand";

// SPEC-GAP: no email/SMS sending is wired up yet, so this is an honest
// stub, not a working reset flow — self-service reset needs that
// infrastructure first. Until then, a student who's lost their password
// asks their institute admin to look them up (admin already sees the
// student's login details on their profile page) rather than getting a
// broken "check your email" screen that never arrives.
export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot your password?"
      description="Self-service reset isn't available yet"
      footer={
        <Link href="/student/login">
          <Button
            variant="outline"
            className="h-11 w-full rounded-xl"
          >
            Back to sign in
          </Button>
        </Link>
      }
    >
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-neutral-600">
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
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-center text-neutral-900 underline underline-offset-4 shadow-sm transition hover:border-neutral-300"
        >
          Email {BRAND.supportEmail}
        </a>
      </div>
    </AuthLayout>
  );
}
