import type { CompetitionSeason, Fixture, ID, MatchRecord, TableRow, Tiebreaker, World } from "../core/types";

export interface PlayedResult {
  home: ID;
  away: ID;
  hg: number;
  ag: number;
}

const POINTS_DEFAULT = { win: 3, draw: 1, loss: 0 };

export function computeTable(clubIds: ID[], results: PlayedResult[], points = POINTS_DEFAULT, tiebreakers: Tiebreaker[] = ["points", "goal_difference", "goals_for"]): TableRow[] {
  const rows = new Map<ID, TableRow>();
  for (const id of clubIds) rows.set(id, { clubId: id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [] });
  for (const r of results) {
    const h = rows.get(r.home);
    const a = rows.get(r.away);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.goalsFor += r.hg; h.goalsAgainst += r.ag;
    a.goalsFor += r.ag; a.goalsAgainst += r.hg;
    if (r.hg > r.ag) {
      h.won++; a.lost++; h.points += points.win; a.points += points.loss; h.form.push("W"); a.form.push("L");
    } else if (r.hg < r.ag) {
      a.won++; h.lost++; a.points += points.win; h.points += points.loss; a.form.push("W"); h.form.push("L");
    } else {
      h.drawn++; a.drawn++; h.points += points.draw; a.points += points.draw; h.form.push("D"); a.form.push("D");
    }
  }
  for (const row of rows.values()) row.form = row.form.slice(-5);
  return sortTable([...rows.values()], results, points, tiebreakers);
}

function h2h(ids: Set<ID>, results: PlayedResult[], points: typeof POINTS_DEFAULT): Map<ID, { pts: number; gd: number; gf: number }> {
  const m = new Map<ID, { pts: number; gd: number; gf: number }>();
  for (const id of ids) m.set(id, { pts: 0, gd: 0, gf: 0 });
  for (const r of results) {
    if (!ids.has(r.home) || !ids.has(r.away)) continue;
    const h = m.get(r.home)!;
    const a = m.get(r.away)!;
    h.gf += r.hg; a.gf += r.ag; h.gd += r.hg - r.ag; a.gd += r.ag - r.hg;
    if (r.hg > r.ag) h.pts += points.win;
    else if (r.hg < r.ag) a.pts += points.win;
    else { h.pts += points.draw; a.pts += points.draw; }
  }
  return m;
}

export function sortTable(rows: TableRow[], results: PlayedResult[], points = POINTS_DEFAULT, tiebreakers: Tiebreaker[]): TableRow[] {
  const awayGoals = new Map<ID, number>();
  for (const r of results) awayGoals.set(r.away, (awayGoals.get(r.away) ?? 0) + r.ag);
  const cmpSimple = (a: TableRow, b: TableRow, tb: Tiebreaker): number => {
    switch (tb) {
      case "points": return b.points - a.points;
      case "goal_difference": return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
      case "goals_for": return b.goalsFor - a.goalsFor;
      case "wins": return b.won - a.won;
      case "away_goals_for": return (awayGoals.get(b.clubId) ?? 0) - (awayGoals.get(a.clubId) ?? 0);
      default: return 0;
    }
  };
  // group-wise sort to support head-to-head criteria among tied clubs
  const sorted = rows.slice().sort((a, b) => b.points - a.points || a.clubId.localeCompare(b.clubId));
  const out: TableRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && sorted[j].points === sorted[i].points) j++;
    const group = sorted.slice(i, j);
    if (group.length > 1) {
      const ids = new Set(group.map((g) => g.clubId));
      const hh = tiebreakers.some((t) => t.startsWith("head_to_head")) ? h2h(ids, results, points) : null;
      group.sort((a, b) => {
        for (const tb of tiebreakers) {
          let c = 0;
          if (tb === "head_to_head_points" && hh) c = hh.get(b.clubId)!.pts - hh.get(a.clubId)!.pts;
          else if (tb === "head_to_head_goal_difference" && hh) c = hh.get(b.clubId)!.gd - hh.get(a.clubId)!.gd;
          else c = cmpSimple(a, b, tb);
          if (c !== 0) return c;
        }
        return a.clubId.localeCompare(b.clubId);
      });
    }
    out.push(...group);
    i = j;
  }
  return out;
}

export function resultsFor(world: World, cs: CompetitionSeason, groupIndex: number | null = null): PlayedResult[] {
  const out: PlayedResult[] = [];
  for (const id in world.fixtures) {
    const f: Fixture = world.fixtures[id];
    if (f.competitionSeasonId !== cs.id || f.status !== "played" || !f.matchId) continue;
    if (f.tieId) continue; // knockout matches never count in tables
    if (groupIndex !== null && f.groupIndex !== groupIndex) continue;
    const m: MatchRecord | undefined = world.matches[f.matchId];
    if (!m) continue;
    out.push({ home: f.homeClubId, away: f.awayClubId, hg: m.homeGoals, ag: m.awayGoals });
  }
  return out;
}

export function leagueTable(world: World, cs: CompetitionSeason): TableRow[] {
  const comp = world.competitions[cs.competitionId];
  const rules = comp.league;
  return computeTable(cs.clubIds, resultsFor(world, cs), rules?.points, rules?.tiebreakers);
}

export function groupTables(world: World, cs: CompetitionSeason): { name: string; rows: TableRow[] }[] {
  return cs.groups.map((g, idx) => ({ name: g.name, rows: computeTable(g.clubIds, resultsFor(world, cs, idx), undefined, ["points", "head_to_head_points", "head_to_head_goal_difference", "goal_difference", "goals_for"]) }));
}
