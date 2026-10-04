import Link from "next/link";
import { loginAdmin } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BRAND } from "@/config/brand";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Email and password are required.",
  invalid: "That email/password combination isn't recognized.",
  rate_limited: "Too many sign-in attempts. Please wait a few minutes and try again.",
  pending: "This institute's registration is still awaiting Super Admin approval — sign-in opens once it's approved.",
  suspended: "This institute's account has been suspended. Contact the platform to reactivate it.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          {/* QA audit findings D5/G1: five different labels
              ("Student Login"/"Admin Login"/"Sign in"/"Institute admin"/
              "Admin sign in") described the same two destinations across
              the app. Standardized on "Student sign in" /
              "Institute admin sign in" everywhere. */}
          <CardTitle>Institute admin sign in</CardTitle>
          <CardDescription>{BRAND.name} — institute admin console</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAdmin} className="flex flex-col gap-4">
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {ERROR_MESSAGES[error] ?? "Something went wrong — please try again."}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <SubmitButton pendingText="Signing in…" className="mt-2">
              Sign in
            </SubmitButton>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-500">
            Looking for your certificate instead?{" "}
            <Link href="/student/login" className="underline underline-offset-2">
              Student sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
