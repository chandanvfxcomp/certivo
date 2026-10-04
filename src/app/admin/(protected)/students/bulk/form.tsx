"use client";

// src/app/admin/(protected)/students/bulk/form.tsx
//
// Bulk CSV issuance: download template → upload → server validates every
// row → issue valid rows → credentials shown once + downloadable CSV.
import { useActionState, useState } from "react";
import Link from "next/link";
import { bulkRegisterStudents, type BulkRegisterState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";

const initialState: BulkRegisterState = { status: "idle" };

const COLUMNS = [
  "Full name", "Course", "Email", "Phone", "Date of birth", "Gender",
  "Guardian name", "Address line 1", "City", "State", "Pincode",
  "Completion date", "Grade", "Mode",
  "Registration fee (INR)",
];

function downloadTemplate() {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const example = ["Aarav Patel", "Full Stack Web Development", "aarav@example.com", "9876543210", "2002-05-14",
    "Male", "Suresh Patel", "44 MG Road", "Pune", "Maharashtra", "411001", "2026-09-30", "A+", "Offline", "5000"];
  const csv = "﻿" + COLUMNS.map(q).join(",") + "\n" + example.map(q).join(",");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "certivo-bulk-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function downloadCredentials(results: Extract<BulkRegisterState, { status: "success" }>["results"]) {
  const q = (v: string | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Student code (login)", "Temporary password", "Full name", "Course", "Certificate code"];
  const rows = results
    .filter((r) => r.ok)
    .map((r) => [r.studentCode, r.tempPassword, r.fullName, "", r.certificateCode].map(q).join(","));
  // Course isn't returned per-row; keep the column for shape compatibility.
  const csv = "﻿" + [head.map(q).join(","), ...rows].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "certivo-issued-credentials.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function BulkIssueForm() {
  const [state, formAction, pending] = useActionState(bulkRegisterStudents, initialState);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");

  const onFile = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
    input.value = "";
  };

  if (state.status === "success") {
    const ok = state.results.filter((r) => r.ok);
    const bad = state.results.filter((r) => !r.ok);
    return (
      <div className="flex flex-col gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-green-700 dark:text-green-400">
            {ok.length} certificate{ok.length === 1 ? "" : "s"} issued
          </h2>
          {bad.length > 0 && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              {bad.length} row{bad.length === 1 ? "" : "s"} skipped — see errors below.
            </p>
          )}
          <p className="mt-2 text-sm text-neutral-500">
            Download the credentials file and share each row privately with the student —
            passwords are shown only here.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-neutral-500">
                  <th className="py-2 pr-4">Student ID</th>
                  <th className="py-2 pr-4">Temp password</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2">Certificate code</th>
                </tr>
              </thead>
              <tbody>
                {ok.map((r) => (
                  <tr key={r.studentCode} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="py-2 pr-4 font-mono">{r.studentCode}</td>
                    <td className="py-2 pr-4 font-mono">{r.tempPassword}</td>
                    <td className="py-2 pr-4">{r.fullName}</td>
                    <td className="py-2 font-mono">{r.certificateCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bad.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Skipped rows</h3>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-red-700 dark:text-red-400">
                {bad.map((r) => (
                  <li key={r.rowNumber}>
                    Row {r.rowNumber}{r.fullName ? ` (${r.fullName})` : ""}: {r.errors.join("; ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={() => downloadCredentials(state.results)}>
              Download credentials CSV
            </Button>
            <Link href="/admin/students">
              <Button variant="outline">Back to students</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {state.status === "error" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}
      <Card className="p-6">
        <h2 className="font-semibold">1 · Download the template</h2>
        <p className="mt-1 text-sm text-neutral-500">
          One row per student. Full name and Course are required; everything else is optional —
          same rules as the single-register form. Max 500 rows per upload.
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={downloadTemplate}>
          Download CSV template
        </Button>
      </Card>
      <Card className="p-6">
        <h2 className="font-semibold">2 · Upload the filled CSV</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Every row is validated on the server before anything is created — bad rows are
          flagged, never silently skipped.
        </p>
        <form action={formAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="csvText" value={csvText} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="csvFile">CSV file</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onFile(e.target)}
              className="max-w-md"
            />
            {fileName && <p className="text-xs text-neutral-500">Selected: {fileName}</p>}
          </div>
          <div>
            <SubmitButton pendingText="Validating & issuing…" disabled={!csvText || pending}>
              Validate & issue certificates
            </SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
