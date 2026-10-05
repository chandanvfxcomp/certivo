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
    // Vercel serverless has a read-only filesystem except /tmp — point
    // npm/npx caches there so `npx prisma` doesn't fail on mkdir.
    const { stdout, stderr } = await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
      cwd: process.cwd(),
      timeout: 180_000,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        npm_config_cache: "/tmp/.npm-cache",
        XDG_CACHE_HOME: "/tmp/.cache",
      },
    });
    const output = (stdout + "\n" + stderr).trim().slice(0, 6000);
    return { ok: true, output: output || "Migrations applied — database is up to date." };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const output = ((e.stdout ?? "") + "\n" + (e.stderr ?? "")).trim() || e.message || "migrate failed";
    return { ok: false, output: output.slice(0, 6000) };
  }
}
