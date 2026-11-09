import type { World } from "@/engine/core/types";
import { openDatabase } from "./sqlite";
import { integrityCheck, readWorld, writeWorld } from "./serialize";
import { dec, enc, getStore, type BlobStore } from "./storage";

export interface SaveMeta {
  id: string;
  careerId: string;
  saveName: string;
  clubId: string;
  clubName: string;
  managerName: string;
  gameDate: string;
  savedAt: string;
  gameVersion: string;
  datasetLabel: string;
  datasetIsReal: boolean;
  kind: "manual" | "auto";
  sizeBytes: number;
}

export interface BackupMeta {
  id: string;
  saveId: string;
  createdAt: string;
  gameDate: string;
  reason: "rolling" | "manual" | "pre-restore";
  sizeBytes: number;
}

const MAX_ROLLING = 3;

function slug(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "save";
}

export async function serializeWorld(world: World): Promise<Uint8Array> {
  const db = await openDatabase();
  try {
    writeWorld(db, world);
    const problems = integrityCheck(db);
    if (problems.length) throw new Error(`Refusing to save an inconsistent world: ${problems[0]}`);
    return db.export();
  } finally {
    db.close();
  }
}

export async function deserializeWorld(bytes: Uint8Array): Promise<World> {
  const db = await openDatabase(bytes);
  try {
    const problems = integrityCheck(db);
    if (problems.length) throw new Error(`Save file is damaged: ${problems[0]}`);
    return readWorld(db);
  } finally {
    db.close();
  }
}

function metaFor(world: World, id: string, kind: SaveMeta["kind"], size: number): SaveMeta {
  const club = world.clubs[world.meta.userClubId];
  return {
    id, careerId: world.meta.careerId, saveName: world.meta.saveName, clubId: club.id, clubName: club.name, managerName: world.manager.name, gameDate: world.meta.currentDate,
    savedAt: new Date().toISOString(), gameVersion: world.meta.gameVersion, datasetLabel: world.meta.dataset.label, datasetIsReal: world.meta.dataset.isReal, kind, sizeBytes: size,
  };
}

export class SaveManager {
  constructor(private readonly store: BlobStore = getStore()) {}

  defaultSaveId(world: World): string {
    return `${slug(world.meta.saveName)}_${world.meta.careerId.slice(-10)}`;
  }

  async list(): Promise<SaveMeta[]> {
    const names = await this.store.list("meta");
    const out: SaveMeta[] = [];
    for (const n of names) {
      if (!n.startsWith("save_")) continue;
      const raw = await this.store.read("meta", n);
      if (!raw) continue;
      try {
        out.push(JSON.parse(dec(raw)) as SaveMeta);
      } catch {
        /* skip unreadable metadata */
      }
    }
    return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  /**
   * Save a career. The previous file is first copied to a rolling backup, then
   * the new file is written atomically, then metadata is updated.
   */
  async save(world: World, opts: { id?: string; kind?: SaveMeta["kind"] } = {}): Promise<SaveMeta> {
    const id = opts.id ?? this.defaultSaveId(world);
    world.meta.daysSinceAutosave = 0;
    const bytes = await serializeWorld(world);
    const previous = await this.store.read("saves", `${id}.sqlite`);
    if (previous) await this.writeBackup(id, previous, "rolling", world.meta.currentDate);
    await this.store.write("saves", `${id}.sqlite`, bytes);
    const meta = metaFor(world, id, opts.kind ?? "manual", bytes.length);
    await this.store.write("meta", `save_${id}.json`, enc(JSON.stringify(meta)));
    await this.store.write("meta", "last_save.json", enc(JSON.stringify({ id })));
    return meta;
  }

  async load(id: string): Promise<World> {
    const bytes = await this.store.read("saves", `${id}.sqlite`);
    if (!bytes) throw new Error("Save file not found.");
    return deserializeWorld(bytes);
  }

  /** Try the save; if it is damaged, fall back to the newest backup that loads. */
  async loadWithRecovery(id: string): Promise<{ world: World; recoveredFrom: string | null }> {
    try {
      return { world: await this.load(id), recoveredFrom: null };
    } catch (e) {
      const backups = await this.listBackups(id);
      for (const b of backups) {
        const bytes = await this.store.read("backups", `${b.id}.sqlite`);
        if (!bytes) continue;
        try {
          const world = await deserializeWorld(bytes);
          return { world, recoveredFrom: b.id };
        } catch {
          /* try next */
        }
      }
      throw e;
    }
  }

  async delete(id: string): Promise<void> {
    for (const b of await this.listBackups(id)) await this.deleteBackup(b.id);
    await this.store.remove("saves", `${id}.sqlite`);
    await this.store.remove("meta", `save_${id}.json`);
  }

  async lastSaveId(): Promise<string | null> {
    const raw = await this.store.read("meta", "last_save.json");
    if (!raw) return null;
    try {
      const { id } = JSON.parse(dec(raw)) as { id: string };
      return (await this.store.read("meta", `save_${id}.json`)) ? id : null;
    } catch {
      return null;
    }
  }

  private async writeBackup(saveId: string, bytes: Uint8Array, reason: BackupMeta["reason"], gameDate: string): Promise<BackupMeta> {
    const id = `${saveId}__${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
    const meta: BackupMeta = { id, saveId, createdAt: new Date().toISOString(), gameDate, reason, sizeBytes: bytes.length };
    await this.store.write("backups", `${id}.sqlite`, bytes);
    await this.store.write("meta", `backup_${id}.json`, enc(JSON.stringify(meta)));
    if (reason === "rolling") {
      const rolling = (await this.listBackups(saveId)).filter((b) => b.reason === "rolling");
      for (const old of rolling.slice(MAX_ROLLING)) await this.deleteBackup(old.id);
    }
    return meta;
  }

  async createBackup(saveId: string): Promise<BackupMeta> {
    const bytes = await this.store.read("saves", `${saveId}.sqlite`);
    if (!bytes) throw new Error("Save the career before backing it up.");
    const metaRaw = await this.store.read("meta", `save_${saveId}.json`);
    const gameDate = metaRaw ? (JSON.parse(dec(metaRaw)) as SaveMeta).gameDate : "";
    return this.writeBackup(saveId, bytes, "manual", gameDate);
  }

  async listBackups(saveId?: string): Promise<BackupMeta[]> {
    const out: BackupMeta[] = [];
    for (const n of await this.store.list("meta")) {
      if (!n.startsWith("backup_")) continue;
      const raw = await this.store.read("meta", n);
      if (!raw) continue;
      const m = JSON.parse(dec(raw)) as BackupMeta;
      if (!saveId || m.saveId === saveId) out.push(m);
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async deleteBackup(id: string): Promise<void> {
    await this.store.remove("backups", `${id}.sqlite`);
    await this.store.remove("meta", `backup_${id}.json`);
  }

  /** Restore a backup over its save (the current file is backed up first). */
  async restoreBackup(backupId: string): Promise<SaveMeta> {
    const raw = await this.store.read("meta", `backup_${backupId}.json`);
    if (!raw) throw new Error("Backup not found.");
    const b = JSON.parse(dec(raw)) as BackupMeta;
    const bytes = await this.store.read("backups", `${backupId}.sqlite`);
    if (!bytes) throw new Error("Backup file missing.");
    const world = await deserializeWorld(bytes); // validates before touching the live save
    const current = await this.store.read("saves", `${b.saveId}.sqlite`);
    if (current) await this.writeBackup(b.saveId, current, "pre-restore", world.meta.currentDate);
    await this.store.write("saves", `${b.saveId}.sqlite`, bytes);
    const meta = metaFor(world, b.saveId, "manual", bytes.length);
    await this.store.write("meta", `save_${b.saveId}.json`, enc(JSON.stringify(meta)));
    return meta;
  }

  async exportBytes(id: string): Promise<Uint8Array> {
    const bytes = await this.store.read("saves", `${id}.sqlite`);
    if (!bytes) throw new Error("Save file not found.");
    return bytes;
  }

  /** Import an exported .sqlite save file (validated & migrated before it is stored). */
  async importBytes(bytes: Uint8Array): Promise<SaveMeta> {
    const world = await deserializeWorld(bytes);
    const id = this.defaultSaveId(world);
    return this.save(world, { id, kind: "manual" });
  }
}
