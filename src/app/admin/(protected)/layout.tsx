import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { logoutAdmin } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { BRAND } from "@/config/brand";

// Route-group layout: guards every /admin/* page EXCEPT /admin/login,
// which lives outside the (protected) group so it never redirect-loops
// against itself.
export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.kind !== "admin") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-neutral-0 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold">{BRAND.name} Admin</span>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin/dashboard" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50">
                Dashboard
              </Link>
              <Link href="/admin/students" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50">
                Students
              </Link>
              <Link href="/admin/approvals" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50">
                Approvals
              </Link>
              <Link href="/admin/settings" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50">
                Settings
              </Link>
            </nav>
          </div>
          <form action={logoutAdmin}>
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
