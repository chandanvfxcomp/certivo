"use client";

// src/app/error.tsx — root error boundary.
//
// QA audit finding A2: no error.tsx existed anywhere in the app, so any
// uncaught exception in a Server Component/Server Action (an expired
// session, a *OrThrow miss, an unexpected Prisma error) fell through to
// Next's bare production fallback — "Application error: a client-side
// exception has occurred," with no navigation and no way back except
// retyping a URL. This (plus the two more specific boundaries under
// admin/(protected) and student/(protected)) gives every route a
// friendly recovery screen instead.
//
// Deliberately shows only a generic message — never the raw error — per
// the same client-safe-message discipline as src/lib/errors.ts.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            That&apos;s on us, not something you did. Try again, or head back home.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/">
            <Button variant="outline">Go home</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
