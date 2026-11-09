/**
 * Local persistence backends. Everything is stored on the user's machine:
 *  - Desktop (Tauri): real files in the OS app-data directory (atomic writes).
 *  - Browser / dev / e2e: IndexedDB.
 *  - Tests: in-memory.
 */
export type Bucket = "saves" | "backups" | "datasets" | "meta";

export interface BlobStore {
  readonly kind: "tauri" | "indexeddb" | "memory";
  list(bucket: Bucket): Promise<string[]>;
  read(bucket: Bucket, name: string): Promise<Uint8Array | null>;
  /** Atomic write: readers see either the old or the new content, never a partial file. */
  write(bucket: Bucket, name: string, data: Uint8Array): Promise<void>;
  remove(bucket: Bucket, name: string): Promise<void>;
  /** Human-readable storage location. */
  location(): Promise<string>;
}

const SAFE_NAME = /^[A-Za-z0-9_.\-]{1,120}$/;
export function assertSafeName(name: string): void {
  if (!SAFE_NAME.test(name) || name.includes("..")) throw new Error(`Invalid storage name: ${name}`);
}

export class MemoryStore implements BlobStore {
  readonly kind = "memory" as const;
  private data = new Map<string, Uint8Array>();
  async list(bucket: Bucket) {
    return [...this.data.keys()].filter((k) => k.startsWith(`${bucket}/`)).map((k) => k.slice(bucket.length + 1)).sort();
  }
  async read(bucket: Bucket, name: string) {
    assertSafeName(name);
    const v = this.data.get(`${bucket}/${name}`);
    return v ? v.slice() : null;
  }
  async write(bucket: Bucket, name: string, data: Uint8Array) {
    assertSafeName(name);
    this.data.set(`${bucket}/${name}`, data.slice());
  }
  async remove(bucket: Bucket, name: string) {
    assertSafeName(name);
    this.data.delete(`${bucket}/${name}`);
  }
  async location() {
    return "memory";
  }
}

export class IndexedDbStore implements BlobStore {
  readonly kind = "indexeddb" as const;
  private dbp: Promise<IDBDatabase> | null = null;
  private open(): Promise<IDBDatabase> {
    if (!this.dbp) {
      this.dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open("touchline-manager", 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbp;
  }
  private async tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const t = db.transaction("blobs", mode);
      const r = fn(t.objectStore("blobs"));
      t.oncomplete = () => resolve(r.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error ?? new Error("IndexedDB transaction aborted (storage may be full)."));
    });
  }
  async list(bucket: Bucket) {
    const keys = (await this.tx("readonly", (s) => s.getAllKeys(IDBKeyRange.bound(`${bucket}/`, `${bucket}/￿`)))) as string[];
    return keys.map((k) => k.slice(bucket.length + 1)).sort();
  }
  async read(bucket: Bucket, name: string) {
    assertSafeName(name);
    const v = (await this.tx("readonly", (s) => s.get(`${bucket}/${name}`))) as ArrayBuffer | Uint8Array | undefined;
    if (!v) return null;
    return v instanceof Uint8Array ? v : new Uint8Array(v);
  }
  async write(bucket: Bucket, name: string, data: Uint8Array) {
    assertSafeName(name);
    // a single IndexedDB transaction is atomic
    await this.tx("readwrite", (s) => s.put(data.slice().buffer, `${bucket}/${name}`));
  }
  async remove(bucket: Bucket, name: string) {
    assertSafeName(name);
    await this.tx("readwrite", (s) => s.delete(`${bucket}/${name}`));
  }
  async location() {
    return "Browser storage (IndexedDB)";
  }
}

interface TauriInternals {
  invoke: (cmd: string, args?: unknown, opts?: { headers?: Record<string, string> }) => Promise<unknown>;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export class TauriStore implements BlobStore {
  readonly kind = "tauri" as const;
  private async invoke<T>(cmd: string, args?: unknown, headers?: Record<string, string>): Promise<T> {
    const { invoke } = await import("@tauri-apps/api/core");
    return (invoke as unknown as TauriInternals["invoke"])(cmd, args, headers ? { headers } : undefined) as Promise<T>;
  }
  async list(bucket: Bucket) {
    return (await this.invoke<string[]>("storage_list", { bucket })).sort();
  }
  async read(bucket: Bucket, name: string) {
    assertSafeName(name);
    const exists = await this.invoke<boolean>("storage_exists", { bucket, name });
    if (!exists) return null;
    const buf = await this.invoke<ArrayBuffer | number[]>("storage_read", { bucket, name });
    return buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf);
  }
  async write(bucket: Bucket, name: string, data: Uint8Array) {
    assertSafeName(name);
    await this.invoke("storage_write", data, { "x-bucket": bucket, "x-name": name });
  }
  async remove(bucket: Bucket, name: string) {
    assertSafeName(name);
    await this.invoke("storage_remove", { bucket, name });
  }
  async location() {
    return this.invoke<string>("storage_location");
  }
}

let store: BlobStore | null = null;
export function getStore(): BlobStore {
  if (!store) store = isTauri() ? new TauriStore() : typeof indexedDB !== "undefined" ? new IndexedDbStore() : new MemoryStore();
  return store;
}

export function setStore(s: BlobStore): void {
  store = s;
}

export const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
export const dec = (b: Uint8Array): string => new TextDecoder().decode(b);
