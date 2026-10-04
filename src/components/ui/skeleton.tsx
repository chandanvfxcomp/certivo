// src/components/ui/skeleton.tsx
// Loading-state primitive — every list needs one (spec Section 15.4:
// "Every list: server-side pagination, search, empty state, loading
// skeleton, and error state").
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800",
        className,
      )}
      {...props}
    />
  );
}
