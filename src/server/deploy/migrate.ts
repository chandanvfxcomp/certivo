// src/server/deploy/migrate.ts
//
// 1-click database migration for the super admin.
//
// Runs pending Prisma migrations WITHOUT the prisma CLI: the CLI needs the
// schema-engine binary, which isn't shipped in the Vercel serverless bundle.
// Instead we apply each migration's SQL directly in a transaction and track
// state in the standard `_prisma_migrations` table — the same bookkeeping
// `prisma migrate deploy` uses, so the two stay compatible.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

export interface MigrateResult {
  ok: boolean;
  output: string;
  applied?: string[];
}

const MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);`;

function sha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function newId(): string {
  // Simple UUIDv4 — avoids importing the ulid helper into deploy code.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Split a migration script into individual statements, respecting
// line/block comments, single-quoted strings, double-quoted identifiers,
// and dollar-quoted blocks ($$...$$ / $tag$...$tag$). Prisma's
// $executeRawUnsafe uses prepared statements, which reject multi-command
// strings — so each statement runs separately.
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1] ?? "";

    // -- line comment
    if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? n : end + 1;
      continue;
    }
    // /* block comment */
    if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    // 'string' with '' escapes
    if (ch === "'") {
      current += ch;
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          current += "''";
          i += 2;
        } else if (sql[i] === "'") {
          current += "'";
          i++;
          break;
        } else {
          current += sql[i];
          i++;
        }
      }
      continue;
    }
    // "identifier"
    if (ch === '"') {
      current += ch;
      i++;
      while (i < n) {
        if (sql[i] === '"' && sql[i + 1] === '"') {
          current += '""';
          i += 2;
        } else if (sql[i] === '"') {
          current += '"';
          i++;
          break;
        } else {
          current += sql[i];
          i++;
        }
      }
      continue;
    }
    // $tag$ dollar-quoted block
    if (ch === "$") {
      const m = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        const close = end === -1 ? n : end + tag.length;
        current += sql.slice(i, close);
        i = close;
        continue;
      }
      current += ch;
      i++;
      continue;
    }
    // Statement terminator
    if (ch === ";") {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = "";
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

export async function runMigrations(): Promise<MigrateResult> {
  // Migrations need DDL privileges: use the direct (non-pooled) connection.
  // Falls back to DATABASE_URL if DIRECT_URL isn't set.
  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
    },
    log: ["error"],
  });
  const applied: string[] = [];
  try {
    const migrationsDir = join(process.cwd(), "prisma", "migrations");

    // 1. Ensure the bookkeeping table exists.
    await prisma.$executeRawUnsafe(MIGRATIONS_TABLE_SQL);

    // 2. Which migrations are already applied?
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`
    )) as Array<{ migration_name: string }>;
    const done = new Set(rows.map((r) => r.migration_name));

    // 3. List migration directories in order.
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    for (const dir of dirs) {
      if (done.has(dir)) continue;
      const sqlPath = join(migrationsDir, dir, "migration.sql");
      const sql = await readFile(sqlPath, "utf8");
      const checksum = sha256Hex(sql);

      // Apply in a transaction, then record it — mirroring `migrate deploy`.
      await prisma.$transaction(async (tx) => {
        for (const stmt of splitStatements(sql)) {
          await tx.$executeRawUnsafe(stmt);
        }
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count") VALUES ($1, $2, now(), $3, 1)`,
          newId(),
          checksum,
          dir
        );
      });
      applied.push(dir);
    }

    const output =
      applied.length === 0
        ? "Migrations applied — database is up to date."
        : `Applied ${applied.length} migration(s): ${applied.join(", ")}`;
    return { ok: true, output, applied };
  } catch (err) {
    const e = err as { message?: string };
    return { ok: false, output: `Migration failed: ${e.message ?? String(err)}`.slice(0, 6000), applied };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
