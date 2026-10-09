import { RegisterInstituteForm } from "./form";
import { AuthLayout } from "@/components/auth-layout";
import { BRAND } from "@/config/brand";
import { normalizeReferralCode } from "@/server/referrals/code";
import { prisma } from "@/server/db/client";

export default async function InstituteRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  // Validate the referral code: only pass through codes that belong to a
  // real institute. Invalid codes are ignored silently — registration
  // must never be blocked by a bad ?ref= value.
  const normalized = normalizeReferralCode(ref);
  let referralCode: string | null = null;
  if (normalized) {
    const referrer = await prisma.tenant.findUnique({
      where: { referralCode: normalized },
      select: { id: true },
    });
    if (referrer) referralCode = normalized;
  }

  return (
    <AuthLayout
      wide
      title="Register your institute"
      description={`${BRAND.name} — creates your institute's own admin login. A Super Admin approves it before sign-in opens.`}
    >
      <RegisterInstituteForm referralCode={referralCode} />
    </AuthLayout>
  );
}
