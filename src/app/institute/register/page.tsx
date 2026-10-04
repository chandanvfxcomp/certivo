import Link from "next/link";
import { RegisterInstituteForm } from "./form";
import { BRAND } from "@/config/brand";

export default function InstituteRegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 py-12 dark:bg-neutral-950">
      <Link href="/" className="mb-6 text-sm font-semibold">
        {BRAND.name}
      </Link>
      <RegisterInstituteForm />
    </main>
  );
}
