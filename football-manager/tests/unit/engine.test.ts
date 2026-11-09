import { describe, expect, it } from "vitest";
import { simulateMatch, MatchSimulation } from "@/engine/match/engine";
import { expectedGoals } from "@/engine/match/xg";
import { Rng } from "@/engine/core/rng";
import { teamInput, baseOptions } from "../helpers";
import type { TeamInstructions } from "@/engine/core/types";

function avgStats(n: number, homeTeam: Partial<TeamInstructions>, ovr = 70, awayTeam: Partial<TeamInstructions> = {}) {
  const acc = { goals: 0, shots: 0, passes: 0, pressWins: 0, crosses: 0, offsides: 0, fatigue: 0, against: 0, conceded: 0, possession: 0 };
  for (let i = 0; i < n; i++) {
    const r = simulateMatch(teamInput(100 + i, "H", ovr, homeTeam), teamInput(900 + i, "A", ovr, awayTeam), { ...baseOptions, seed: 7000 + i });
    const s = r.stats[0];
    acc.goals += r.goals[0];
    acc.conceded += r.goals[1];
    acc.shots += s.shots;
    acc.passes += s.passes;
    acc.pressWins += s.pressWins;
    acc.crosses += s.crosses;
    acc.offsides += r.stats[1].offsides;
    acc.against += r.stats[1].shots;
    acc.possession += s.possession;
    acc.fatigue += r.lines.filter((l) => l.side === 0 && l.started).reduce((a, l) => a + l.fatigueEnd, 0) / 11;
  }
  for (const k of Object.keys(acc) as (keyof typeof acc)[]) acc[k] /= n;
  return acc;
}

describe("seeded RNG", () => {
  it("is deterministic and serialisable", () => {
    const a = new Rng(42);
    const seq = Array.from({ length: 5 }, () => a.next());
    const b = new Rng(42);
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(seq);
    const c = new Rng(1);
    c.next();
    const d = new Rng(0);
    d.state = c.state;
    expect(d.next()).toEqual(c.next());
  });
});

describe("xG model", () => {
  it("rewards closer, central shots and penalises headers and pressure", () => {
    const base = { header: false, bigChance: false, directFreeKick: false, penalty: false, pressure: 0 };
    const close = expectedGoals({ ...base, x: 94, y: 50 });
    const far = expectedGoals({ ...base, x: 75, y: 50 });
    const wide = expectedGoals({ ...base, x: 94, y: 15 });
    expect(close).toBeGreaterThan(far);
    expect(close).toBeGreaterThan(wide);
    expect(expectedGoals({ ...base, x: 94, y: 50, header: true })).toBeLessThan(close);
    expect(expectedGoals({ ...base, x: 94, y: 50, pressure: 1 })).toBeLessThan(close);
    expect(expectedGoals({ ...base, x: 94, y: 50, bigChance: true })).toBeGreaterThan(close);
    expect(expectedGoals({ ...base, x: 0, y: 0, penalty: true })).toBe(0.76);
  });
});

describe("match engine", () => {
  it("is reproducible for the same seed and inputs", () => {
    const run = () => simulateMatch(teamInput(1, "H", 70), teamInput(2, "A", 70), { ...baseOptions, seed: 99, detailed: true });
    const a = run();
    const b = run();
    expect(a.goals).toEqual(b.goals);
    expect(a.events.length).toBe(b.events.length);
    expect(a.stats).toEqual(b.stats);
  });

  it("produces realistic aggregate statistics", () => {
    const s = avgStats(120, {});
    expect(s.goals).toBeGreaterThan(0.9);
    expect(s.goals).toBeLessThan(2.3);
    expect(s.shots).toBeGreaterThan(7);
    expect(s.shots).toBeLessThan(18);
    expect(s.passes).toBeGreaterThan(250);
  });

  it("does not decide matches by overall rating alone, but quality matters", () => {
    let strongWins = 0, weakWins = 0;
    for (let i = 0; i < 150; i++) {
      const r = simulateMatch(teamInput(10 + i, "S", 76), teamInput(500 + i, "W", 64), { ...baseOptions, seed: i });
      if (r.goals[0] > r.goals[1]) strongWins++;
      if (r.goals[1] > r.goals[0]) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(90);
    expect(weakWins).toBeGreaterThan(0); // upsets happen
  });

  it("forces a winner with extra time and penalties when required", () => {
    for (let i = 0; i < 30; i++) {
      const r = simulateMatch(teamInput(i, "H", 70), teamInput(i + 50, "A", 70), { ...baseOptions, seed: i, requiresWinner: true, extraTime: true, penalties: true });
      expect(r.winnerSide).not.toBeNull();
      if (r.penalties) expect(r.penalties.home).not.toBe(r.penalties.away);
    }
  });

  it("respects aggregate scores in second legs", () => {
    // home side lost the first leg 0-3: a 1-0 win must not make them the winner
    let found = false;
    for (let i = 0; i < 40 && !found; i++) {
      const r = simulateMatch(teamInput(i, "H", 70), teamInput(i + 7, "A", 70), { ...baseOptions, seed: i, requiresWinner: true, extraTime: true, penalties: true, priorGoals: [0, 3], priorAwayGoals: [0, 0] });
      if (r.goals[0] - r.goals[1] < 3) {
        expect(r.winnerSide).toBe(1);
        expect(r.extraTime).toBe(false);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("supports live control: substitutions, tactic changes, sub limits", () => {
    const sim = new MatchSimulation(teamInput(3, "H", 70), teamInput(4, "A", 70), { ...baseOptions, seed: 5, detailed: true });
    sim.stepTo(30);
    const view = sim.teamView(0);
    const res = sim.substitute(0, view.onPitch[5].id, view.bench[1].id);
    expect(res.ok).toBe(true);
    expect(sim.teamView(0).subsLeft).toBe(4);
    const t = JSON.parse(JSON.stringify(view.tactic));
    t.team.mentality = 5;
    sim.changeTactic(0, t);
    expect(sim.teamView(0).tactic.team.mentality).toBe(5);
    expect(sim.substitute(0, "nobody", view.bench[2].id).ok).toBe(false);
    const r = sim.simulateToEnd();
    expect(r.events.some((e) => e.type === "tactic_change")).toBe(true);
    expect(r.lines.filter((l) => l.side === 0).length).toBeGreaterThanOrEqual(12);
  });
});

describe("tactical instructions change the simulation", () => {
  const N = 70;
  it("high pressing wins the ball more often and tires players more", () => {
    const low = avgStats(N, { pressing: 1 });
    const high = avgStats(N, { pressing: 5 });
    expect(high.pressWins).toBeGreaterThan(low.pressWins * 1.3);
    expect(high.fatigue).toBeGreaterThan(low.fatigue);
  });
  it("width and crossing focus produce more crosses", () => {
    expect(avgStats(N, { width: 5 }).crosses).toBeGreaterThan(avgStats(N, { width: 1 }).crosses);
  });
  it("direct build-up plays fewer passes than playing out from the back", () => {
    expect(avgStats(N, { buildUp: "direct", tempo: 5 }).passes).toBeLessThan(avgStats(N, { buildUp: "short", tempo: 1 }).passes);
  });
  it("an offside trap with a high line catches opponents offside more often", () => {
    expect(avgStats(N, { offsideTrap: true, defensiveLine: 5 }).offsides).toBeGreaterThan(avgStats(N, { offsideTrap: false, defensiveLine: 1 }).offsides);
  });
  it("attacking mentality creates more shots than very defensive", () => {
    expect(avgStats(N, { mentality: 5 }).shots).toBeGreaterThan(avgStats(N, { mentality: 1 }).shots);
  });
  it("counter-pressing regains possession more than regrouping", () => {
    expect(avgStats(N, { defensiveTransition: "counter_press" }).pressWins).toBeGreaterThan(avgStats(N, { defensiveTransition: "regroup" }).pressWins);
  });
});
