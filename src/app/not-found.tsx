// src/app/not-found.tsx — shown for any unmatched route, and by
// `notFound()` calls (e.g. src/app/admin/(protected)/students/[id]/page.tsx).
// Server Component (no client interactivity needed) — pairs with the
// error.tsx boundaries added for QA audit finding A2, so "route doesn't
// exist" and "something threw" both get a real page instead of a bare
// Next.js default.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>That page doesn&apos;t exist, or may have moved.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button>Go home</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
