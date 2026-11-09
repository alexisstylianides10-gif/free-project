import { describe, expect, it } from "vitest";
import { newWorld, norm } from "../fixtures";
import { SaveManager } from "@/db/saves";
import { MemoryStore } from "@/db/storage";
import { advanceDay } from "@/engine/world/calendar";

describe("save manager", () => {
  it("saves, lists, loads, backs up, restores and recovers from corruption", async () => {
    const store = new MemoryStore();
    const sm = new SaveManager(store);
    const w = newWorld();
    const meta = await sm.save(w);
    expect((await sm.list()).map((s) => s.id)).toEqual([meta.id]);
    for (let i = 0; i < 3; i++) advanceDay(w);
    await sm.save(w, { id: meta.id });
    expect((await sm.listBackups(meta.id)).length).toBe(1); // rolling backup of the previous file
    const loaded = await sm.load(meta.id);
    expect(norm(loaded)).toEqual(norm(w));
    const manual = await sm.createBackup(meta.id);
    advanceDay(w);
    await sm.save(w, { id: meta.id });
    await sm.restoreBackup(manual.id);
    expect((await sm.load(meta.id)).meta.currentDate).toBe(loaded.meta.currentDate);
    // corrupt the save file: recovery falls back to a backup
    await store.write("saves", `${meta.id}.sqlite`, new Uint8Array([1, 2, 3, 4]));
    const { world, recoveredFrom } = await sm.loadWithRecovery(meta.id);
    expect(recoveredFrom).toBeTruthy();
    expect(world.meta.careerId).toBe(w.meta.careerId);
    // export / import
    await expect(sm.importBytes(await sm.exportBytes(meta.id))).rejects.toThrow();
    await sm.save(world, { id: meta.id });
    const good = await sm.exportBytes(meta.id);
    expect((await sm.importBytes(good)).careerId).toBe(w.meta.careerId);
    await sm.delete(meta.id);
    expect(await sm.list()).toEqual([]);
  });
});
