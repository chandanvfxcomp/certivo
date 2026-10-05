import Link from "next/link";
import { RegisterInstituteForm } from "./form";
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 py-12 dark:bg-neutral-950">
      <Link href="/" className="mb-6 text-sm font-semibold">
        {BRAND.name}
      </Link>
      <RegisterInstituteForm referralCode={referralCode} />
    </main>
  );
}
