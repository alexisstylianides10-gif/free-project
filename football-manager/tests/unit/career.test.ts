import { describe, expect, it } from "vitest";
import { newWorld, norm } from "../fixtures";
import { openDatabase } from "@/db/sqlite";
import { readWorld, writeWorld } from "@/db/serialize";
import { realMarketValue, marketValue, overall } from "@/engine/core/ratings";
import { blockedMoveConversation, openConversations, respondConversation } from "@/engine/world/career";
import { clubPlayers } from "@/engine/world/index";

describe("career mode layer", () => {
  it("values players on a real-world euro scale for real datasets", () => {
    const w = newWorld();
    const p = clubPlayers(w, w.meta.userClubId).sort((a, b) => overall(b) - overall(a))[0];
    const real = realMarketValue(p, w.meta.currentDate, 80);
    expect(real).toBeGreaterThan(marketValue(p, w.meta.currentDate, 80));
    // a better player is worth more
    const worse = { ...p, attributes: Object.fromEntries(Object.entries(p.attributes).map(([k, v]) => [k, Math.max(1, v - 3)])) } as typeof p;
    expect(realMarketValue(worse, w.meta.currentDate, 80)).toBeLessThan(real);
  });

  it("player conversations open, resolve and change happiness", () => {
    const w = newWorld();
    const p = clubPlayers(w, w.meta.userClubId)[0];
    const buyer = Object.values(w.clubs).find((c) => !c.isUser)!;
    blockedMoveConversation(w, p.id, buyer.id);
    const open = openConversations(w);
    expect(open).toHaveLength(1);
    const before = p.happiness;
    const text = respondConversation(w, open[0].id, "let_go");
    expect(text).toMatch(/listed/);
    expect(p.squadStatus).toBe("listed");
    expect(p.happiness).toBeGreaterThan(before);
    expect(openConversations(w)).toHaveLength(0);
  });

  it("awards and conversations survive save and load", async () => {
    const w = newWorld();
    const p = clubPlayers(w, w.meta.userClubId)[0];
    blockedMoveConversation(w, p.id, Object.values(w.clubs).find((c) => !c.isUser)!.id);
    w.career.awards.push({ id: "aw_x", kind: "golden_ball", competitionId: null, seasonId: w.meta.currentSeasonId, label: "2026/27", playerId: p.id, clubId: p.clubId, note: "test" });
    const db = await openDatabase();
    writeWorld(db, w);
    const back = readWorld(db);
    expect(norm(back.career)).toEqual(norm(w.career));
  });
});
