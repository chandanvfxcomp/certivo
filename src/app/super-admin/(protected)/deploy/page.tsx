"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Super admin → Deploy: 1-click GitHub push + repo status.
export default function DeployPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Deploy to GitHub</h1>
      <p className="mt-1 max-w-2xl text-sm text-neutral-500">
        One click stages every change, commits it, and pushes to your GitHub repo — no manual{" "}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">git</code> commands needed.
        Connect your repo once (remote <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">origin</code>{" "}
        + credentials on this server) and this button handles every update after that.
      </p>
      <DeployPanel />
    </div>
  );
}

interface Step { step: string; ok: boolean; output: string }

interface SettingDef { key: string; label: string; hint: string }

function DeployPanel() {
  const [status, setStatus] = useState<null | {
    isRepo: boolean; branch: string; remote: string; dirty: boolean; ahead: number;
  }>(null);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [migrateBusy, setMigrateBusy] = useState(false);
  const [migrateOut, setMigrateOut] = useState<string | null>(null);
  const [migrateOk, setMigrateOk] = useState<boolean | null>(null);
  const [defs, setDefs] = useState<SettingDef[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/super-admin/github/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    fetch("/api/super-admin/settings")
      .then((r) => r.json())
      .then((d) => { setDefs(d.defs ?? []); setValues(d.values ?? {}); })
      .catch(() => {});
  }, []);

  async function push() {
    setBusy(true);
    setSteps(null);
    setOk(null);
    try {
      const res = await fetch("/api/super-admin/github/push", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; steps: Step[] };
      setOk(data.ok);
      setSteps(data.steps);
      const s = await fetch("/api/super-admin/github/status").then((r) => r.json());
      setStatus(s);
    } catch {
      setOk(false);
      setSteps([{ step: "Push", ok: false, output: "Request failed — is the server running?" }]);
    } finally {
      setBusy(false);
    }
  }

  async function migrate() {
    setMigrateBusy(true);
    setMigrateOut(null);
    setMigrateOk(null);
    try {
      const res = await fetch("/api/super-admin/db/migrate", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; output: string };
      setMigrateOk(data.ok);
      setMigrateOut(data.output);
    } catch {
      setMigrateOk(false);
      setMigrateOut("Request failed — is the server running?");
    } finally {
      setMigrateBusy(false);
    }
  }

  async function saveSetting(key: string, value: string) {
    setSavingKey(key);
    try {
      await fetch("/api/super-admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      setValues((v) => ({ ...v, [key]: value }));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Database migration */}
      <Card className="p-5">
        <h2 className="font-semibold">Database migration</h2>
        <p className="mt-1 text-sm text-neutral-500">
          One click runs all pending migrations (<code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">prisma migrate deploy</code>).
          Safe to press anytime — already-applied migrations are skipped.
        </p>
        <div className="mt-3">
          <Button onClick={migrate} disabled={migrateBusy} variant="outline">
            {migrateBusy ? "Migrating…" : "Run migrations now"}
          </Button>
        </div>
        {migrateOut && (
          <div className="mt-3">
            <div className={`text-sm font-medium ${migrateOk ? "text-green-600" : "text-red-600"}`}>
              {migrateOk ? "✓ Migrations complete" : "✗ Migration failed"}
            </div>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-900">
              {migrateOut}
            </pre>
          </div>
        )}
      </Card>

      {/* Swappable provider settings */}
      <Card className="p-5">
        <h2 className="font-semibold">Provider settings</h2>
        <p className="mt-1 text-sm text-neutral-500">
          If you switch providers later (e.g. from Cloudflare Tunnel to another), update it here — no code change needed.
        </p>
        <div className="mt-3 space-y-3">
          {defs.map((d) => (
            <div key={d.key} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">{d.label} <code className="text-xs text-neutral-400">{d.key}</code></span>
                <input
                  defaultValue={values[d.key] ?? ""}
                  key={d.key + (values[d.key] ?? "")}
                  id={`setting-${d.key}`}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <span className="mt-1 block text-xs text-neutral-500">{d.hint}</span>
              </label>
              <Button
                size="sm"
                variant="outline"
                disabled={savingKey === d.key}
                onClick={() => {
                  const el = document.getElementById(`setting-${d.key}`) as HTMLInputElement | null;
                  if (el) saveSetting(d.key, el.value);
                }}
              >
                {savingKey === d.key ? "…" : "Save"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Repository status</h2>
        {!status ? (
          <p className="mt-2 text-sm text-neutral-500">Loading…</p>
        ) : !status.isRepo ? (
          <p className="mt-2 text-sm text-red-600">This folder is not a git repository.</p>
        ) : (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-neutral-500">Branch</dt><dd className="font-medium">{status.branch || "—"}</dd></div>
            <div><dt className="text-neutral-500">Remote</dt><dd className="break-all font-medium">{status.remote || "not configured"}</dd></div>
            <div><dt className="text-neutral-500">Uncommitted changes</dt><dd className="font-medium">{status.dirty ? "Yes" : "No"}</dd></div>
            <div><dt className="text-neutral-500">Commits ahead of remote</dt><dd className="font-medium">{status.ahead}</dd></div>
          </dl>
        )}
        <div className="mt-4">
          <Button onClick={push} disabled={busy || !status?.isRepo}>
            {busy ? "Pushing…" : "Push to GitHub now"}
          </Button>
        </div>
      </Card>

      {steps && (
        <Card className="p-5">
          <h2 className="font-semibold">
            {ok ? <span className="text-green-600">Pushed successfully</span> : <span className="text-red-600">Push had issues</span>}
          </h2>
          <ol className="mt-3 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className={s.ok ? "text-green-600" : "text-red-600"}>{s.ok ? "✓" : "✗"}</span>
                  <span className="font-medium">{s.step}</span>
                </div>
                {s.output && (
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-900">
                    {s.output}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card className="p-5 text-sm text-neutral-600 dark:text-neutral-400">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">One-time setup</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Create an empty repo on GitHub (no README needed).</li>
          <li>On this server run: <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">git remote add origin git@github.com:USER/REPO.git</code></li>
          <li>Add this server&apos;s SSH key to GitHub (or configure a personal access token).</li>
          <li>Come back here and press the button — every future update is one click.</li>
        </ol>
      </Card>
    </div>
  );
}
