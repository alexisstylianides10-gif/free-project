import { readFileSync } from "node:fs";
import path from "node:path";
import { datasetSchema, type Dataset } from "@/data/schema";
import { createCareer } from "@/engine/world/create";
import type { World } from "@/engine/core/types";

let cached: Dataset | null = null;
export function devDataset(): Dataset {
  if (!cached) cached = datasetSchema.parse(JSON.parse(readFileSync(path.resolve(__dirname, "../public/data/dev-world.json"), "utf8")));
  return cached;
}

export function newWorld(clubId = "club_alb_05", seed = 1234): World {
  return createCareer(devDataset(), { clubId, managerFirstName: "Test", managerLastName: "Manager", saveName: "Test save", seed });
}

/** JSON round-trip to normalise undefined/optional fields before deep comparisons. */
export const norm = <T>(x: T): T => JSON.parse(JSON.stringify(x));
