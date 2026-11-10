import type { DatasetInput } from "../../src/data/schema";

type Comp = DatasetInput["competitions"][number];

const COMPS = [
  { id: "c_ucl", name: "Champions League", shortName: "UCL", reputation: 98, prize: 80_000_000, weekday: 2, quota: (r: number) => (r < 2 ? 4 : r < 4 ? 3 : 1) },
  { id: "c_uel", name: "Europa League", shortName: "UEL", reputation: 85, prize: 25_000_000, weekday: 4, quota: (r: number) => (r < 6 ? 2 : 1) },
  { id: "c_uecl", name: "Conference League", shortName: "UECL", reputation: 72, prize: 10_000_000, weekday: 4, quota: (r: number) => (r < 20 ? 1 : 0) },
];

/**
 * (Re)creates the three European club competitions (32 clubs: 8 groups of 4, then
 * last 16, quarter-finals, semi-finals over two legs and a one-match final), sets each
 * European top league's qualification places by league strength, and picks the
 * season-1 entrants (top clubs by reputation, no club in two competitions).
 */
export function addEuropeanCompetitions(ds: DatasetInput, isEuropean: (nationId: string) => boolean): void {
  ds.competitions = ds.competitions.filter((c) => !COMPS.some((x) => x.id === c.id));
  const leagues = ds.competitions.filter((c): c is Comp & { league: NonNullable<Comp["league"]> } => c.type === "league" && c.tier === 1 && !!c.league && !!c.nationId && isEuropean(c.nationId)).sort((a, b) => b.reputation - a.reputation);
  const initial: Record<string, string[]> = {};
  const taken = new Set<string>();
  for (const l of ds.competitions) if (l.league) l.league.qualification = l.league.qualification.filter((q) => !COMPS.some((x) => x.id === q.competitionId));
  const offset = new Map<string, number>(); // next league position not yet assigned
  let overflow: string[] = [];
  for (const comp of COMPS) {
    const list: { id: string; pos: number }[] = [];
    leagues.forEach((l, rank) => {
      const n = comp.quota(rank);
      if (!n) return;
      const from = (offset.get(l.id) ?? 0) + 1;
      l.league.qualification.push({ competitionId: comp.id, fromPosition: from, toPosition: from + n - 1 });
      offset.set(l.id, from + n - 1);
      const clubs = ds.clubs.filter((c) => c.leagueId === l.id && !taken.has(c.id) && !overflow.includes(c.id)).sort((a, b) => b.reputation - a.reputation).slice(0, n);
      clubs.forEach((c, i) => list.push({ id: c.id, pos: from + i }));
    });
    // trim to 32 by reputation, then top up from the remaining European top-flight clubs
    const lrep = (id: string) => ds.competitions.find((x) => x.id === ds.clubs.find((c) => c.id === id)?.leagueId)?.reputation ?? 0;
    // every league champion first, then the other places from the strongest leagues down
    const ordered = [...new Set([...overflow, ...list.sort((a, b) => Number(a.pos > 1) - Number(b.pos > 1) || lrep(b.id) - lrep(a.id) || a.pos - b.pos).map((x) => x.id)])];
    let chosen = ordered.slice(0, 32);
    overflow = ordered.slice(32);
    if (chosen.length < 32) {
      // top up league by league: the next-best remaining club of each league in turn (strongest leagues first)
      const pools = leagues.map((l) => ds.clubs.filter((c) => c.leagueId === l.id && !chosen.includes(c.id) && !taken.has(c.id)).sort((a, b) => b.reputation - a.reputation));
      for (let i = 0; chosen.length < 32 && i < 20; i++) for (const pool of pools) if (chosen.length < 32 && pool[i]) chosen.push(pool[i].id);
    }
    chosen.forEach((id) => taken.add(id));
    initial[comp.id] = chosen;
    ds.competitions.push({
      id: comp.id, name: comp.name, shortName: comp.shortName, type: "continental", nationId: null, tier: 1, reputation: comp.reputation, league: null,
      cup: { entrantLeagueIds: [], groupStage: { groups: 8, teamsPerGroup: 4, rounds: 2, advancePerGroup: 2 }, rounds: [{ name: "Round of 16", legs: 2 }, { name: "Quarter-final", legs: 2 }, { name: "Semi-final", legs: 2 }, { name: "Final", legs: 1 }], extraTime: true, penalties: true, awayGoals: false, homeAdvantageToLowerTier: false, prizeMoneyWinner: comp.prize, bracketSize: 32 },
      matchday: { substitutes: 5, benchSize: 12 }, yellowCardBanThreshold: 3, preferredWeekday: comp.weekday,
    });
  }
  ds.initialQualifiers = { ...(ds.initialQualifiers ?? {}), ...initial };
}
