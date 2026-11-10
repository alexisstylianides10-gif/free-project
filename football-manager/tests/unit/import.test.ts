import { describe, expect, it } from "vitest";
import { importFiles, parseCSV, validateDataset } from "@/data/importer";
import { devDataset } from "../fixtures";
import { DatasetLibrary } from "@/data/datasets";
import { MemoryStore } from "@/db/storage";
import { readFileSync } from "node:fs";
import path from "node:path";

const small = () => {
  const d = JSON.parse(JSON.stringify(devDataset()));
  d.meta.id = "test-import";
  d.meta.name = "Test import";
  return d;
};

describe("CSV parsing", () => {
  it("handles quotes, commas, newlines and BOM", () => {
    const rows = parseCSV('﻿id,name\r\n1,"Smith, ""Jr"""\n2,"multi\nline"\n');
    expect(rows).toEqual([{ id: "1", name: 'Smith, "Jr"' }, { id: "2", name: "multi\nline" }]);
  });
});

describe("dataset validation", () => {
  it("accepts the development dataset and reports coverage", () => {
    const { report } = validateDataset(devDataset());
    expect(report.ok).toBe(true);
    expect(report.coverage.clubs).toBe(128);
  });
  it("reports missing fields, duplicates and broken references", () => {
    const d = small();
    delete d.players[0].lastName;
    d.players[2].id = d.players[1].id;
    d.clubs[0].stadiumId = "nowhere";
    const r1 = validateDataset(d).report;
    expect(r1.ok).toBe(false);
    expect(r1.errors.some((e) => /Missing required field "lastName"/.test(e.message))).toBe(true);
    d.players[0].lastName = "Fixed";
    const r2 = validateDataset(d).report;
    expect(r2.errors.some((e) => /Duplicate id/.test(e.message))).toBe(true);
    expect(r2.errors.some((e) => /unknown stadium/.test(e.message))).toBe(true);
  });
  it("imports CSV updates on top of a base dataset", () => {
    const base = small();
    const p = base.players[0];
    const header = ["id", "firstName", "lastName", "dob", "nationId", "clubId", "position", "potential", "wage", "contractEnd", ...Object.keys(p.attributes)];
    const row = ["new_player_1", "Test", "Csvson", "2004-02-02", p.nationId, p.clubId, "ST", "80", "5000", "2029-06-30", ...Object.values(p.attributes).map(String)];
    const { report, dataset } = importFiles([{ name: "players.csv", text: `${header.join(",")}\n${row.join(",")}\n` }], base);
    expect(report.ok).toBe(true);
    expect(dataset!.players.find((x) => x.id === "new_player_1")?.lastName).toBe("Csvson");
  });
  it("installs nothing when validation fails (rollback)", async () => {
    const store = new MemoryStore();
    const text = readFileSync(path.resolve(__dirname, "../../public/data/dev-world.json"), "utf8");
    const index = JSON.stringify([{ url: "/data/dev-world.json", info: { id: "dev-world-fictional" } }]);
    const lib = new DatasetLibrary(store, async (url) => (url.endsWith("index.json") ? index : text));
    const bad = small();
    bad.clubs[0].nationId = "nope";
    const r = await lib.import([{ name: "bad.json", text: JSON.stringify(bad) }]);
    expect(r.ok).toBe(false);
    expect(await store.list("datasets")).toEqual([]);
    const ok = await lib.import([{ name: "good.json", text: JSON.stringify(small()) }]);
    expect(ok.ok).toBe(true);
    expect((await lib.list()).map((x) => x.id)).toContain("test-import");
    expect((await lib.load("test-import")).meta.name).toBe("Test import");
  });
});
