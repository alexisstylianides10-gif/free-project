import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { MIGRATIONS } from "@/db/migrations.generated";
import { openDatabase, queryAll } from "@/db/sqlite";
import { runMigrations } from "@/db/migrate";

const root = path.resolve(__dirname, "../..");

describe("database migrations", () => {
  it("embedded migrations match the SQL files on disk", () => {
    const dirs = readdirSync(path.join(root, "prisma/migrations")).filter((d) => !d.includes(".") && !d.endsWith("toml")).sort();
    expect(MIGRATIONS.map((m) => m.name)).toEqual(dirs);
    for (const m of MIGRATIONS) expect(m.sql).toBe(readFileSync(path.join(root, "prisma/migrations", m.name, "migration.sql"), "utf8"));
  });

  it("the migrations produce exactly the Prisma schema (no missing migrations)", () => {
    // Prisma diffs the migration history against the schema; exit code 2 means drift.
    const out = execFileSync("npx", ["prisma", "migrate", "diff", "--from-migrations", "prisma/migrations", "--to-schema", "prisma/schema.prisma", "--exit-code"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    expect(out).toMatch(/No difference detected|empty/i);
  }, 60_000);

  it("applies cleanly and is idempotent", async () => {
    const db = await openDatabase();
    expect(runMigrations(db)).toEqual(MIGRATIONS.map((m) => m.name));
    expect(runMigrations(db)).toEqual([]);
    const tables = queryAll<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type='table'").map((t) => t.name);
    for (const t of ["Player", "Club", "Fixture", "Match", "MatchEvent", "FinancialTransaction", "TacticalInstruction", "SavedFormation", "Injury", "Suspension", "NewsItem"]) expect(tables).toContain(t);
  });
});
