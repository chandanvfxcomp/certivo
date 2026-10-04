import { redirect } from "next/navigation";
import { resetPasswordWithToken } from "@/server/auth/password-reset";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/super-admin/forgot-password");

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold">Set new password</h1>
        <form action={reset.bind(null, token)} className="mt-4 space-y-3">
          <Input name="password" type="password" placeholder="New password (min 8 chars)" required minLength={8} autoComplete="new-password" />
          <Input name="confirm" type="password" placeholder="Confirm password" required minLength={8} autoComplete="new-password" />
          <Button type="submit" className="w-full">Reset password</Button>
        </form>
      </Card>
    </main>
  );
}

async function reset(token: string, formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) redirect("/super-admin/reset-password?token=" + token + "&error=mismatch");
  try {
    const ok = await resetPasswordWithToken(token, password);
    if (!ok) redirect("/super-admin/forgot-password?error=invalid");
  } catch {
    redirect("/super-admin/reset-password?token=" + token + "&error=weak");
  }
  redirect("/super-admin/login?reset=done");
}
