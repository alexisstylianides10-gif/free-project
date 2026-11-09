import { describe, expect, it } from "vitest";
import { roundRobin, spreadDates, datesOnWeekday } from "@/engine/competition/schedule";
import { computeTable } from "@/engine/competition/table";
import { newWorld } from "../fixtures";
import { playFixture } from "@/engine/world/matchday";
import type { World } from "@/engine/core/types";

describe("round-robin scheduling", () => {
  it("every pair meets home and away exactly once, no club twice per round", () => {
    const ids = Array.from({ length: 16 }, (_, i) => `c${i}`);
    const rounds = roundRobin(ids, 2);
    expect(rounds.length).toBe(30);
    const pairs = new Map<string, number>();
    for (const r of rounds) {
      const seen = new Set<string>();
      for (const [h, a] of r) {
        expect(seen.has(h) || seen.has(a)).toBe(false);
        seen.add(h); seen.add(a);
        pairs.set(`${h}>${a}`, (pairs.get(`${h}>${a}`) ?? 0) + 1);
      }
      expect(seen.size).toBe(16);
    }
    expect(pairs.size).toBe(16 * 15);
    for (const v of pairs.values()) expect(v).toBe(1);
  });
  it("handles odd numbers of clubs with byes", () => {
    const rounds = roundRobin(["a", "b", "c", "d", "e"], 1);
    expect(rounds.length).toBe(5);
    expect(rounds.flat().length).toBe(10);
  });
  it("spreads dates without duplicates", () => {
    const d = spreadDates(datesOnWeekday("2026-08-01", "2027-05-31", 6), 30);
    expect(new Set(d).size).toBe(30);
    expect(d).toEqual([...d].sort());
  });
});

describe("league tables", () => {
  it("applies head-to-head tie-breakers when configured", () => {
    const results = [
      { home: "A", away: "B", hg: 0, ag: 1 }, { home: "B", away: "A", hg: 0, ag: 0 },
      { home: "A", away: "C", hg: 5, ag: 0 }, { home: "C", away: "B", hg: 1, ag: 0 },
    ];
    // A and B both have 4 points; A has the better goal difference, B won the head-to-head
    const r2 = results;
    const gdFirst = computeTable(["A", "B", "C"], r2, undefined, ["points", "goal_difference", "goals_for"]);
    const h2hFirst = computeTable(["A", "B", "C"], r2, undefined, ["points", "head_to_head_points", "goal_difference"]);
    expect(gdFirst[0].points).toBe(h2hFirst[0].points);
    expect(gdFirst[0].clubId).toBe("A"); // better goal difference
    expect(h2hFirst[0].clubId).toBe("B"); // won the head-to-head
  });
});

function playCompetition(world: World, compId: string): void {
  const cs = world.competitionSeasons[`cs_${compId}_${world.meta.currentSeasonId}`];
  for (let guard = 0; guard < 50 && cs.status !== "completed"; guard++) {
    const next = Object.values(world.fixtures).filter((f) => f.competitionSeasonId === cs.id && f.status === "scheduled").sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    if (!next.length) break;
    const day = next[0].date;
    for (const f of next.filter((x) => x.date === day)) {
      world.meta.currentDate = f.date;
      playFixture(world, f.id);
    }
  }
}

describe("competition setup and knockouts", () => {
  it("creates no duplicate fixtures and schedules no club twice on one day", () => {
    const w = newWorld();
    const keys = new Set<string>();
    const perDay = new Set<string>();
    for (const f of Object.values(w.fixtures)) {
      const k = `${f.competitionSeasonId}|${f.round}|${f.homeClubId}|${f.awayClubId}|${f.leg}`;
      expect(keys.has(k)).toBe(false);
      keys.add(k);
      for (const c of [f.homeClubId, f.awayClubId]) {
        expect(perDay.has(`${c}|${f.date}`)).toBe(false);
        perDay.add(`${c}|${f.date}`);
      }
    }
  });

  it("plays a domestic cup with two-legged semi-finals through to a single champion", () => {
    const w = newWorld();
    playCompetition(w, "cup_alb");
    const cs = w.competitionSeasons[`cs_cup_alb_${w.meta.currentSeasonId}`];
    expect(cs.status).toBe("completed");
    expect(cs.championId).toBeTruthy();
    expect(cs.ties.filter((t) => t.roundIndex === 0).length).toBe(16);
    const semis = cs.ties.filter((t) => t.roundIndex === 3);
    expect(semis.length).toBe(2);
    for (const t of semis) expect(t.fixtureIds.length).toBe(2);
    for (const t of cs.ties) expect(t.winnerId).toBeTruthy();
    expect(w.trophies.some((t) => t.competitionId === "cup_alb" && t.clubId === cs.championId)).toBe(true);
  });

  it("plays a continental group stage into knockouts", () => {
    const w = newWorld();
    playCompetition(w, "c_ccc");
    const cs = w.competitionSeasons[`cs_c_ccc_${w.meta.currentSeasonId}`];
    expect(cs.groups.length).toBe(4);
    expect(cs.ties.filter((t) => t.roundIndex === 0).length).toBe(4);
    expect(cs.championId).toBeTruthy();
  });
});
