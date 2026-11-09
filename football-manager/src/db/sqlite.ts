import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

let sqlPromise: Promise<SqlJsStatic> | null = null;

/** Load the sql.js (SQLite compiled to WebAssembly) engine once. Works in the browser, Tauri and Node. */
export function loadSqlite(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    const isBrowser = typeof window !== "undefined";
    sqlPromise = initSqlJs(isBrowser ? { locateFile: () => `${basePath()}/sql-wasm.wasm` } : undefined);
  }
  return sqlPromise;
}

function basePath(): string {
  return (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
}

export async function openDatabase(bytes?: Uint8Array): Promise<Database> {
  const SQL = await loadSqlite();
  const db = bytes ? new SQL.Database(bytes) : new SQL.Database();
  db.run("PRAGMA foreign_keys = ON;");
  return db;
}

/** Run `fn` inside a transaction; rolls back on any error. */
export function transaction<T>(db: Database, fn: () => T): T {
  db.run("BEGIN IMMEDIATE;");
  try {
    const out = fn();
    db.run("COMMIT;");
    return out;
  } catch (e) {
    try {
      db.run("ROLLBACK;");
    } catch {
      /* already rolled back */
    }
    throw e;
  }
}

export function queryAll<T = Record<string, unknown>>(db: Database, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as never);
    const out: T[] = [];
    while (stmt.step()) out.push(stmt.getAsObject() as T);
    return out;
  } finally {
    stmt.free();
  }
}

export type { Database };
