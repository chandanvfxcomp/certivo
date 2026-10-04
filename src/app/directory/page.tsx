import Link from "next/link";
import { searchDirectory } from "@/server/db/certificate-directory";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

// Public, searchable directory of certificates whose holders opted in.
// Only the safe snapshot columns — same boundary as certificate_public.
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const entries = await searchDirectory(q ?? "");

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <div className="text-center">
        <Link href="/" className="text-sm font-semibold">
          {BRAND.name}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Certificate directory</h1>
        <p className="mt-2 text-sm text-neutral-500">
          A public listing of certificates whose holders chose to be listed.{" "}
          <Link href="/v" className="underline underline-offset-2">
            Verify a code directly
          </Link>
          .
        </p>
      </div>

      <form method="get" className="mx-auto mt-8 flex max-w-md gap-2">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, course, or institute…"
          aria-label="Search the directory"
        />
        <Button type="submit">Search</Button>
      </form>

      {entries.length === 0 ? (
        <Card className="mt-8 p-8 text-center text-neutral-500">
          {q ? (
            <>No certificates match “{q}”.</>
          ) : (
            <>No certificates are listed yet — holders opt in from their student portal.</>
          )}
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {entries.map((e) => (
            <Link key={e.code} href={`/v/${e.code}`}>
              <Card className="p-5 transition-shadow hover:shadow-md">
                <p className="font-semibold">{e.student_name}</p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{e.course_name}</p>
                <p className="mt-1 text-xs text-neutral-500">{e.institute_name}</p>
                <p className="mt-2 font-mono text-xs text-neutral-400">{e.code}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-neutral-400">
        Listed with the holder&apos;s consent ·{" "}
        <Link href="/" className="underline underline-offset-2">
          Back to {BRAND.name} home
        </Link>
      </p>
    </main>
  );
}
