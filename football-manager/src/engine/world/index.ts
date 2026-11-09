import type { ID, Player, World } from "../core/types";

/**
 * Lazily-built club → players index. Any code that changes `player.clubId`
 * or adds players must call `invalidateSquadIndex`.
 */
const cache = new WeakMap<World, Map<ID, Player[]>>();

export function invalidateSquadIndex(world: World): void {
  cache.delete(world);
}

function build(world: World): Map<ID, Player[]> {
  const m = new Map<ID, Player[]>();
  for (const id in world.players) {
    const p = world.players[id];
    if (!p.clubId || p.retired) continue;
    let list = m.get(p.clubId);
    if (!list) m.set(p.clubId, (list = []));
    list.push(p);
  }
  cache.set(world, m);
  return m;
}

/** Players currently registered with a club (including loaned-in, excluding retired). */
export function clubPlayers(world: World, clubId: ID): Player[] {
  const m = cache.get(world) ?? build(world);
  return m.get(clubId) ?? [];
}
