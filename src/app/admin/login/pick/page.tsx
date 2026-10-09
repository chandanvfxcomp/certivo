import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { verifyPickerToken } from "@/server/auth/picker-token";
import { loginAdmin } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth-layout";
import { BRAND } from "@/config/brand";

// Tenant picker: shown when one email/password is valid for multiple
// approved institutes. Re-verifies the password per submission — the
// password itself is never stored between the first attempt and this page.
// Security (audit 2026-10-09, L-1): the page accepts only a short-lived
// HMAC-signed token (minted after a verified password in loginAdmin), never
// a raw email — so an email's institutes can't be enumerated by probing URLs.
export default async function AdminLoginPickPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const email = verifyPickerToken(token);
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
    <AuthLayout
      title="Select your institute"
      description={`${BRAND.name} — this sign-in works for more than one institute`}
    >
      <form action={loginAdmin} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={email} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tenantSlug" className="text-neutral-300">
            Institute
          </Label>
          <select
            id="tenantSlug"
            name="tenantSlug"
            required
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 [&>option]:bg-slate-900"
          >
            {tenants.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
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
            autoFocus
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
