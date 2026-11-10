import type { ID, MatchEvent, PlayerMatchLine, TeamMatchStats } from "../core/types";
import { Rng } from "../core/rng";
import { clamp } from "../core/util";
import { positionFamiliarity } from "../core/ratings";
import type { EngineOptions, EngineResult, EngineTeamInput, InjuryOutcome } from "./engine";

/**
 * Lightweight statistical match model used for background matches the user is
 * not involved with (leagues in other countries). It still uses each side's
 * actual line-up: attack/midfield/defence/goalkeeping strength from player
 * attributes, positional familiarity, condition, morale, cohesion, home
 * advantage and key tactical settings, then samples goals from Poisson
 * distributions. It is ~50× faster than the full engine.
 */
function poisson(rng: Rng, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L && k < 15);
  return k - 1;
}

interface Strength { att: number; mid: number; def: number; gk: number; scorers: { id: ID; w: number }[]; creators: { id: ID; w: number }[] }

function strength(t: EngineTeamInput, home: boolean): Strength {
  let att = 0, attN = 0, mid = 0, midN = 0, def = 0, defN = 0, gk = 8;
  const scorers: { id: ID; w: number }[] = [];
  const creators: { id: ID; w: number }[] = [];
  for (const { slotId, player: p } of t.starters) {
    const slot = t.tactic.slots.find((s) => s.id === slotId);
    if (!slot) continue;
    const a = p.attributes;
    const fam = slot.position === "GK" ? (p.position === "GK" ? 1 : 0.3) : positionFamiliarity(p, slot.position);
    const f = (0.7 + 0.3 * fam) * (0.72 + 0.28 * (p.fitness / 100)) * (0.94 + (p.morale / 100) * 0.12) * (home ? 1.03 : 1);
    if (slot.position === "GK") {
      gk = ((a.reflexes * 2 + a.handling + a.oneOnOnes + a.positioning) / 5) * f;
      continue;
    }
    const x = slot.outOfPossession.x;
    if (x >= 55) {
      att += ((a.finishing * 2 + a.offTheBall + a.dribbling + a.composure + a.pace) / 6) * f;
      attN++;
    } else if (x >= 32) {
      mid += ((a.passing * 2 + a.vision + a.decisions + a.workRate + a.firstTouch) / 6) * f;
      midN++;
    } else {
      def += ((a.tackling + a.marking + a.positioning * 2 + a.heading + a.pace) / 6) * f;
      defN++;
    }
    scorers.push({ id: p.id, w: Math.max(0.05, (a.finishing + a.offTheBall) / 20) * (x >= 55 ? 3 : x >= 32 ? 1 : 0.35) });
    creators.push({ id: p.id, w: Math.max(0.05, (a.passing + a.vision + a.crossing) / 30) * (x >= 40 ? 2 : 0.6) });
  }
  const coh = 0.95 + (t.cohesion / 100) * 0.07;
  return { att: (attN ? att / attN : 8) * coh, mid: (midN ? mid / midN : 8) * coh, def: (defN ? def / defN : 8) * coh, gk, scorers, creators };
}

function emptyStats(): TeamMatchStats {
  return { possession: 50, shots: 0, shotsOnTarget: 0, xg: 0, passes: 0, passesCompleted: 0, tackles: 0, interceptions: 0, fouls: 0, corners: 0, offsides: 0, saves: 0, yellow: 0, red: 0, crosses: 0, dribbles: 0, pressWins: 0 };
}

export function quickSimulate(home: EngineTeamInput, away: EngineTeamInput, o: EngineOptions): EngineResult {
  const rng = new Rng(o.seed);
  const S = [strength(home, o.homeAdvantage), strength(away, false)];
  const T = [home.tactic.team, away.tactic.team];
  const lambda = (i: 0 | 1): number => {
    const j = 1 - i;
    const mentality = (T[i].mentality - 3) * 0.06 - (T[j].mentality - 3) * 0.02;
    const x = (S[i].att - S[j].def) * 0.12 + (S[i].mid - S[j].mid) * 0.1 - (S[j].gk - 12) * 0.04 + mentality + (i === 0 && o.homeAdvantage ? 0.1 : 0);
    return clamp(1.3 * Math.exp(x), 0.15, 4.5);
  };
  // match-day form: some days a side is simply sharper or flatter than its squad suggests
  const lam: [number, number] = [clamp(lambda(0) * Math.exp(rng.normal(0, 0.15)), 0.15, 4.5), clamp(lambda(1) * Math.exp(rng.normal(0, 0.15)), 0.15, 4.5)];
  const goals: [number, number] = [poisson(rng, lam[0]), poisson(rng, lam[1])];
  const events: MatchEvent[] = [];
  const lines: PlayerMatchLine[] = [];
  const teams = [home, away];
  const lineMap = new Map<ID, PlayerMatchLine>();
  teams.forEach((t, side) => {
    for (const { slotId, player } of t.starters) {
      const slot = t.tactic.slots.find((s) => s.id === slotId);
      const l: PlayerMatchLine = { playerId: player.id, side: side as 0 | 1, started: true, minutes: 90, position: slot?.position ?? player.position, rating: 6.5, goals: 0, assists: 0, shots: 0, xg: 0, passes: 0, passesCompleted: 0, tackles: 0, interceptions: 0, saves: 0, yellow: 0, red: 0, fatigueEnd: 35 };
      lines.push(l);
      lineMap.set(player.id, l);
    }
  });
  const scoreGoals = (side: 0 | 1, n: number, from: number, to: number) => {
    const s = S[side];
    for (let g = 0; g < n; g++) {
      if (!s.scorers.length) break;
      const scorer = rng.weighted(s.scorers, s.scorers.map((x) => x.w)).id;
      const others = s.creators.filter((c) => c.id !== scorer);
      const assist = others.length && rng.chance(0.72) ? rng.weighted(others, others.map((x) => x.w)).id : null;
      const ls = lineMap.get(scorer)!;
      ls.goals++;
      ls.rating += 0.55;
      if (assist) {
        lineMap.get(assist)!.assists++;
        lineMap.get(assist)!.rating += 0.3;
      }
      events.push({ minute: rng.int(from, to), second: 0, type: "goal", side, playerId: scorer, otherPlayerId: assist, x: side === 0 ? 92 : 8, y: 50, text: "Goal" });
    }
  };
  scoreGoals(0, goals[0], 1, 90);
  scoreGoals(1, goals[1], 1, 90);
  let extraTime = false;
  let penalties: { home: number; away: number } | null = null;
  const prior = o.priorGoals ?? [0, 0];
  const level = () => goals[0] + prior[0] === goals[1] + prior[1];
  if (o.requiresWinner && level()) {
    if (o.extraTime) {
      extraTime = true;
      const et: [number, number] = [poisson(rng, lam[0] / 3), poisson(rng, lam[1] / 3)];
      goals[0] += et[0];
      goals[1] += et[1];
      scoreGoals(0, et[0], 91, 120);
      scoreGoals(1, et[1], 91, 120);
    }
    if (level() && o.penalties) {
      let h = 0, a = 0;
      for (let k = 0; k < 5; k++) {
        if (rng.chance(0.76)) h++;
        if (rng.chance(0.76)) a++;
      }
      while (h === a) {
        if (rng.chance(0.76)) h++;
        if (rng.chance(0.76)) a++;
      }
      penalties = { home: h, away: a };
    }
  }
  events.sort((x, y) => x.minute - y.minute);
  // cards & injuries
  const injuries: InjuryOutcome[] = [];
  const stats: [TeamMatchStats, TeamMatchStats] = [emptyStats(), emptyStats()];
  const midShare = S[0].mid / (S[0].mid + S[1].mid);
  stats[0].possession = Math.round(clamp(50 + (midShare - 0.5) * 120 + (T[0].mentality - T[1].mentality) * 2, 28, 72));
  stats[1].possession = 100 - stats[0].possession;
  for (const side of [0, 1] as const) {
    const st = stats[side];
    st.xg = Math.round(lam[side] * 100) / 100;
    st.shots = Math.max(goals[side], Math.round(lam[side] / 0.12 + rng.normal(0, 2)));
    st.shotsOnTarget = Math.max(goals[side], Math.round(st.shots * 0.38));
    st.passes = Math.round(4.4 * stats[side].possession * 2 + rng.normal(0, 30));
    st.passesCompleted = Math.round(st.passes * (0.7 + (S[side].mid - 10) * 0.012));
    st.fouls = poisson(rng, 9.5);
    st.corners = poisson(rng, 5);
    st.tackles = poisson(rng, 19);
    st.interceptions = poisson(rng, 12);
    st.saves = Math.max(0, stats[1 - side].shotsOnTarget - goals[1 - side]);
    const team = teams[side];
    const ids = team.starters.map((s) => s.player.id);
    const yellows = poisson(rng, 1.6);
    for (let k = 0; k < yellows && ids.length; k++) {
      const id = rng.pick(ids);
      const l = lineMap.get(id)!;
      if (l.yellow) continue;
      l.yellow = 1;
      st.yellow++;
      events.push({ minute: rng.int(10, 90), second: 0, type: "yellow", side, playerId: id, otherPlayerId: null, x: 50, y: 50, text: "Yellow card" });
    }
    if (rng.chance(0.06) && ids.length) {
      const id = rng.pick(ids);
      lineMap.get(id)!.red = 1;
      lineMap.get(id)!.minutes = rng.int(30, 89);
      st.red++;
      events.push({ minute: lineMap.get(id)!.minutes, second: 0, type: "red", side, playerId: id, otherPlayerId: null, x: 50, y: 50, text: "Red card" });
    }
    if (rng.chance(0.22) && ids.length) {
      const p = team.starters[rng.int(0, team.starters.length - 1)].player;
      const r = rng.next();
      const days = r < 0.6 ? rng.int(3, 12) : r < 0.9 ? rng.int(13, 40) : rng.int(41, 150);
      injuries.push({ playerId: p.id, days, type: rng.pick(["hamstring strain", "ankle sprain", "calf strain", "knee injury", "thigh strain"]) });
    }
    // conceded goals hurt defenders' ratings; wins help everyone
    const won = goals[side] > goals[1 - side];
    const lost = goals[side] < goals[1 - side];
    for (const id of ids) {
      const l = lineMap.get(id)!;
      l.rating = Math.round(clamp(l.rating + (won ? 0.25 : lost ? -0.3 : 0) - (["GK", "CB", "LB", "RB"].includes(l.position) ? goals[1 - side] * 0.15 : 0) + rng.normal(0, 0.35) - l.yellow * 0.2 - l.red, 4, 9.8) * 10) / 10;
      l.passes = Math.round(st.passes / 11);
      l.passesCompleted = Math.round(st.passesCompleted / 11);
      if (l.position === "GK") l.saves = st.saves;
    }
  }
  events.push({ minute: extraTime ? 120 : 90, second: 0, type: "full_time", side: 0, playerId: null, otherPlayerId: null, x: 50, y: 50, text: "Full-time" });
  let winnerSide: 0 | 1 | null = null;
  if (penalties) winnerSide = penalties.home > penalties.away ? 0 : 1;
  else if (goals[0] + prior[0] !== goals[1] + prior[1]) winnerSide = goals[0] + prior[0] > goals[1] + prior[1] ? 0 : 1;
  const motm = lines.slice().sort((a, b) => b.rating - a.rating)[0]?.playerId ?? null;
  return { goals, extraTime, penalties, winnerSide, stats, lines, events, injuries, playerOfMatchId: motm, shapes: [] };
}
