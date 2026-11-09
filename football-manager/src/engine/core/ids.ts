import type { World } from "./types";

/** Allocate a new unique id inside a world (monotonic counter persisted in the save). */
export function newId(world: World, prefix: string): string {
  world.meta.idCounter += 1;
  return `${prefix}_${world.meta.idCounter.toString(36)}`;
}
