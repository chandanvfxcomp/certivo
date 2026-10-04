import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { logoutSuperAdmin } from "@/app/super-admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { BRAND } from "@/config/brand";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
    >
      {children}
    </Link>
  );
}

// Route-group layout: guards every /super-admin/* page EXCEPT
// /super-admin/login, which lives outside the (protected) group.
export default async function SuperAdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.kind !== "superadmin") {
    redirect("/super-admin/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-5">
            <span className="font-semibold">{BRAND.name} Super Admin</span>
            <nav className="flex flex-wrap items-center gap-1 text-sm">
              <NavLink href="/super-admin/dashboard">Institutes</NavLink>
              <NavLink href="/super-admin/visits">Visits</NavLink>
              <NavLink href="/super-admin/leads">Leads</NavLink>
              <NavLink href="/super-admin/followups">Follow-ups</NavLink>
              <NavLink href="/super-admin/deploy">Deploy</NavLink>
            </nav>
          </div>
          <form action={logoutSuperAdmin}>
            <SubmitButton pendingText="Signing out…" variant="ghost" size="sm">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
