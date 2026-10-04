import Link from "next/link";
import { loginSuperAdmin } from "@/app/super-admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Super Admin sign in</CardTitle>
          <CardDescription>{BRAND.name} — platform administration</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginSuperAdmin} className="flex flex-col gap-4">
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
          <p className="mt-3 text-center text-sm">
            <Link href="/super-admin/forgot-password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </p>
          <p className="mt-4 text-center text-sm text-neutral-500">
            <Link href="/" className="underline underline-offset-2">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
