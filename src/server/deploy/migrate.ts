// src/server/deploy/migrate.ts
//
// 1-click database migration for the super admin. Runs
// `prisma migrate deploy` and returns the output.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface MigrateResult {
  ok: boolean;
  output: string;
}

export async function runMigrations(): Promise<MigrateResult> {
  try {
    // Use the prisma binary directly (not npx): npx tries to use a cache
    // dir and can attempt network installs, both of which fail on Vercel
    // serverless (read-only fs, tiny /tmp). `prisma` is a production
    // dependency so its CLI ships with the deployment.
    const prismaCli = `${process.cwd()}/node_modules/prisma/build/index.js`;
    const schemaPath = `${process.cwd()}/prisma/schema.prisma`;
    const { stdout, stderr } = await execFileAsync(
      "node",
      [prismaCli, "migrate", "deploy", "--schema", schemaPath],
      {
        cwd: process.cwd(),
        timeout: 180_000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env },
      }
    );
    const output = (stdout + "\n" + stderr).trim().slice(0, 6000);
    return { ok: true, output: output || "Migrations applied — database is up to date." };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const output = ((e.stdout ?? "") + "\n" + (e.stderr ?? "")).trim() || e.message || "migrate failed";
    return { ok: false, output: output.slice(0, 6000) };
  }
}
