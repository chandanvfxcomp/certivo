import Link from "next/link";
import { BulkIssueForm } from "./form";

export default function BulkIssuePage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bulk issue certificates</h1>
        <Link href="/admin/students" className="text-sm text-neutral-500 underline underline-offset-2">
          Back to students
        </Link>
      </div>
      <BulkIssueForm />
    </div>
  );
}
