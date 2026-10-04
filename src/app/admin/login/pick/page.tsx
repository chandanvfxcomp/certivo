import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/db/client";
import { loginAdmin } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BRAND } from "@/config/brand";

// Tenant picker: shown when one email/password is valid for multiple
// approved institutes. Re-verifies the password per submission — the
// password itself is never stored between the first attempt and this page.
export default async function AdminLoginPickPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email) redirect("/admin/login");

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      memberships: {
        where: { status: "ACTIVE", role: { not: "STUDENT" } },
        include: { tenant: { select: { slug: true, name: true, status: true } } },
      },
    },
  });
  const tenants = (user?.memberships ?? [])
    .filter((m) => m.tenant.status === "APPROVED")
    .map((m) => m.tenant);
  if (tenants.length === 0) redirect("/admin/login?error=invalid");

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Select your institute</CardTitle>
          <CardDescription>
            {BRAND.name} — this sign-in works for more than one institute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAdmin} className="flex flex-col gap-4">
            <input type="hidden" name="email" value={email} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tenantSlug">Institute</Label>
              <select
                id="tenantSlug"
                name="tenantSlug"
                required
                className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              >
                {tenants.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoFocus />
            </div>
            <SubmitButton pendingText="Signing in…" className="mt-2">
              Sign in
            </SubmitButton>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-500">
            <Link href="/admin/login" className="underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
