import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { logoutStudent } from "@/app/student/actions";
import { StudentIdleLogoutTrigger } from "./idle-logout-trigger";
import { SubmitButton } from "@/components/submit-button";
import { BRAND } from "@/config/brand";

export default async function StudentProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.kind !== "student") {
    redirect("/student/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <StudentIdleLogoutTrigger />
      <header className="border-b border-neutral-200 bg-neutral-0 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <span className="font-semibold">{BRAND.name}</span>
          <form action={logoutStudent}>
            <SubmitButton pendingText="Signing out…" variant="ghost" size="sm">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
