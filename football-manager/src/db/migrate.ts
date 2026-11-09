import type { Database } from "sql.js";
import { MIGRATIONS } from "./migrations.generated";
import { queryAll } from "./sqlite";

export class MigrationError extends Error {}

/**
 * Apply pending SQL migrations in order. Each migration runs inside its own
 * transaction and is recorded in SchemaMigration, so it can never run twice.
 */
export function runMigrations(db: Database): string[] {
  db.run(`CREATE TABLE IF NOT EXISTS "SchemaMigration" ("name" TEXT NOT NULL PRIMARY KEY, "appliedAt" TEXT NOT NULL);`);
  const applied = new Set(queryAll<{ name: string }>(db, `SELECT name FROM "SchemaMigration"`).map((r) => r.name));
  const known = new Set(MIGRATIONS.map((m) => m.name));
  for (const a of applied) if (!known.has(a)) throw new MigrationError(`This save was created by a newer version of the game (unknown migration ${a}).`);
  const ran: string[] = [];
  for (const m of MIGRATIONS) {
    if (applied.has(m.name)) continue;
    // The generated init migration also creates SchemaMigration; skip that statement when it exists.
    const sql = m.sql.replace(/CREATE TABLE "SchemaMigration"[\s\S]*?\);/, "");
    db.run("BEGIN;");
    try {
      db.exec(sql);
      db.run(`INSERT INTO "SchemaMigration" (name, appliedAt) VALUES (?, ?)`, [m.name, new Date().toISOString()]);
      db.run("COMMIT;");
    } catch (e) {
      db.run("ROLLBACK;");
      throw new MigrationError(`Migration ${m.name} failed: ${(e as Error).message}`);
    }
    ran.push(m.name);
  }
  return ran;
}

export function latestMigration(): string {
  return MIGRATIONS[MIGRATIONS.length - 1]?.name ?? "";
}
