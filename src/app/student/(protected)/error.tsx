"use client";

// src/app/student/(protected)/error.tsx — error boundary scoped to the
// student portal. See src/app/error.tsx for the root boundary and the
// full rationale (QA audit finding A2). This one's likely trigger is an
// expired/tampered session cookie mid-action, so it offers a sign-in
// link in addition to retry/home.
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function StudentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            That&apos;s on us, not something you did. If your session expired, sign in again —
            otherwise, try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/student/login">
            <Button variant="outline">Sign in again</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
