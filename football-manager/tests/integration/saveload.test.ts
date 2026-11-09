import { describe, expect, it } from "vitest";
import { newWorld, norm } from "../fixtures";
import { openDatabase } from "@/db/sqlite";
import { integrityCheck, readWorld, writeWorld } from "@/db/serialize";
import { advanceDay } from "@/engine/world/calendar";

describe("save / load", () => {
  it("round-trips a freshly created career without data loss", async () => {
    const world = newWorld();
    const db = await openDatabase();
    writeWorld(db, world);
    expect(integrityCheck(db)).toEqual([]);
    const bytes = db.export();
    const db2 = await openDatabase(bytes);
    const loaded = readWorld(db2);
    expect(norm(loaded)).toEqual(norm(world));
  });

  it("round-trips a career after simulated matches, transfers and finances", async () => {
    const world = newWorld();
    for (let i = 0; i < 75; i++) advanceDay(world);
    expect(Object.values(world.matches).length).toBeGreaterThan(50);
    const db = await openDatabase();
    writeWorld(db, world);
    expect(integrityCheck(db)).toEqual([]);
    const loaded = readWorld(await openDatabase(db.export()));
    expect(norm(loaded)).toEqual(norm(world));
    // continuing from the loaded world produces exactly the same future as the original
    for (let i = 0; i < 5; i++) {
      advanceDay(world);
      advanceDay(loaded);
    }
    expect(norm(loaded)).toEqual(norm(world));
  });
});
