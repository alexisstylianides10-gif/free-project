import { describe, expect, it } from "vitest";
import { newWorld, norm } from "../fixtures";
import { advanceDay, CalendarError } from "@/engine/world/calendar";
import { MIN_SQUAD } from "@/engine/transfers/market";
import { openDatabase } from "@/db/sqlite";
import { integrityCheck, readWorld, writeWorld } from "@/db/serialize";
import type { World } from "@/engine/core/types";

function checkInvariants(w: World) {
  // loans are consistent with registrations
  for (const p of Object.values(w.players)) {
    if (p.loanParentClubId) expect(Object.values(w.loans).some((l) => l.active && l.playerId === p.id && l.loanClubId === p.clubId)).toBe(true);
    if (p.retired) expect(p.clubId).toBeNull();
    if (p.clubId) expect(w.clubs[p.clubId]).toBeTruthy();
  }
  for (const c of Object.values(w.clubs)) {
    const n = Object.values(w.players).filter((p) => p.clubId === c.id).length;
    expect(n).toBeGreaterThanOrEqual(MIN_SQUAD - 2);
  }
  // no duplicate fixtures, every played fixture has exactly one match
  const keys = new Set<string>();
  for (const f of Object.values(w.fixtures)) {
    const k = `${f.competitionSeasonId}|${f.round}|${f.homeClubId}|${f.awayClubId}`;
    expect(keys.has(k)).toBe(false);
    keys.add(k);
    if (f.status === "played") expect(w.matches[f.matchId!].fixtureId).toBe(f.id);
  }
}

describe("world progression", () => {
  it("is deterministic for the same seed", () => {
    const a = newWorld("club_ves_04", 77);
    const b = newWorld("club_ves_04", 77);
    // careerId/createdAt contain wall-clock time; align them
    b.meta.careerId = a.meta.careerId;
    b.meta.createdAt = a.meta.createdAt;
    for (let i = 0; i < 45; i++) {
      advanceDay(a);
      advanceDay(b);
    }
    expect(norm(b)).toEqual(norm(a));
  });

  it("never processes a date twice", () => {
    const w = newWorld();
    advanceDay(w);
    w.meta.currentDate = w.meta.lastProcessedDate!;
    expect(() => advanceDay(w)).toThrow(CalendarError);
  });

  it("simulates a full season: tables, cups, promotion/relegation, rollover, finances and saves", async () => {
    const w = newWorld("club_alb_08", 2026);
    const user = w.clubs[w.meta.userClubId];
    const startBalance = user.finance.balance;
    const firstSeason = w.meta.currentSeasonId;
    const leagueSizes = Object.fromEntries(Object.values(w.competitions).filter((c) => c.type === "league").map((c) => [c.id, Object.values(w.clubs).filter((x) => x.leagueId === c.id).length]));
    let ended = false;
    for (let i = 0; i < 400 && !ended; i++) ended = advanceDay(w).seasonEnded;
    expect(ended).toBe(true);
    // every fixture of the first season was played
    const s1 = Object.values(w.fixtures).filter((f) => f.seasonId === firstSeason);
    expect(s1.length).toBeGreaterThan(2000);
    expect(s1.filter((f) => f.status !== "played")).toEqual([]);
    // champions crowned for every league and cup
    for (const c of Object.values(w.competitions)) expect(w.trophies.some((t) => t.competitionId === c.id && t.seasonId === firstSeason)).toBe(true);
    // promotion & relegation keep league sizes
    for (const [id, n] of Object.entries(leagueSizes)) expect(Object.values(w.clubs).filter((x) => x.leagueId === id).length).toBe(n);
    expect(w.clubHistory.filter((h) => h.seasonId === firstSeason).length).toBe(128);
    // new season is set up
    expect(w.meta.currentSeasonId).not.toBe(firstSeason);
    expect(Object.values(w.fixtures).filter((f) => f.seasonId === w.meta.currentSeasonId).length).toBeGreaterThan(1500);
    // the AI football world was active
    expect(w.transfers.filter((t) => t.type === "permanent" && t.fee > 0).length).toBeGreaterThan(20);
    expect(w.youthIntakes.length).toBe(128);
    // user ledger reconciles with the balance
    const sum = w.transactions.filter((t) => t.clubId === user.id).reduce((a, t) => a + t.amount, 0);
    expect(sum).toBe(user.finance.balance - startBalance);
    checkInvariants(w);
    // the evolved world still saves with valid relationships and reloads identically
    const db = await openDatabase();
    writeWorld(db, w);
    expect(integrityCheck(db)).toEqual([]);
    expect(norm(readWorld(await openDatabase(db.export())))).toEqual(norm(w));
  }, 300_000);
});
