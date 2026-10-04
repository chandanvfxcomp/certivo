import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// QA audit finding F2: `Skeleton` was built (with a comment saying "every
// list needs one") but never actually used anywhere, and no route had a
// `loading.tsx` — this is the students list's real loading state, shown
// automatically by Next.js while the page's data fetch (page.tsx) is
// in flight.
export default function AdminStudentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-900">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
