import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";

// Student hub: no dropdown in the nav — this page holds both student
// destinations in one clean place.
function LoginIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
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

export default function StudentHubPage() {
  return (
    <AuthLayout
      wide
      title="Students"
      description="Everything you need for your certificate — in one place"
    >
      <div className="flex flex-col gap-3">
        <OptionCard
          href="/student/login"
          icon={<LoginIcon />}
          title="Student sign in"
          description="View and download your certificates"
        />
        <OptionCard
          href="/student/forgot-password"
          icon={<KeyIcon />}
          title="Forgot password"
          description="Get help accessing your account"
        />
      </div>
    </AuthLayout>
  );
}
