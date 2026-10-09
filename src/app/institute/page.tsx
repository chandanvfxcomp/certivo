import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";

// Institute hub: no dropdown in the nav — this page holds both institute
// destinations in one clean place.
function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v8" />
      <path d="M18 12h2a2 2 0 0 1 2 2v8" />
      <path d="M10 6h1" /><path d="M10 10h1" /><path d="M10 14h1" />
      <path d="M13 6h1" /><path d="M13 10h1" /><path d="M13 14h1" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 21a8 8 0 0 1 13.292-6" />
      <circle cx="10" cy="8" r="5" />
      <path d="M19 16v6" /><path d="M22 19h-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function OptionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-[0_12px_40px_-16px_rgba(99,102,241,0.35)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-neutral-900">{title}</span>
        <span className="block text-sm text-neutral-500">{description}</span>
      </span>
      <ArrowRightIcon />
    </Link>
  );
}

export default function InstituteHubPage() {
  return (
    <AuthLayout
      wide
      title="Institutes"
      description="Run your institute's certificates on Certivo"
    >
      <div className="flex flex-col gap-3">
        <OptionCard
          href="/admin/login"
          icon={<BuildingIcon />}
          title="Institute sign in"
          description="Manage students, certificates and billing"
        />
        <OptionCard
          href="/institute/register"
          icon={<UserPlusIcon />}
          title="Register institute"
          description="Create your institute's account — free to join"
        />
      </div>
    </AuthLayout>
  );
}
