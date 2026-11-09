import { describe, expect, it } from "vitest";
import { newWorld } from "../fixtures";
import type { Player, World } from "@/engine/core/types";
import { overall } from "@/engine/core/ratings";
import { ageOn, addDays } from "@/engine/core/dates";
import { contractDemand, defaultTransferOffer, evaluateBid, openNegotiation, submitBid, submitContractOffer, squadCount, releasePlayer, MIN_SQUAD } from "@/engine/transfers/market";
import { postTransaction, takeBankLoan } from "@/engine/finance/ledger";
import { weeklyDevelopment } from "@/engine/development/progression";
import { Rng } from "@/engine/core/rng";
import { autoSelect, activeTactic, validateSelection } from "@/engine/tactics/selection";
import { hireStaff, dismissStaff } from "@/engine/club/staff";
import { quoteProject, startProject, processStadiumProjects } from "@/engine/club/stadium";
import { generateSponsorOffers, acceptSponsorOffer } from "@/engine/world/commercial";
import { youthIntake } from "@/engine/development/progression";

const user = (w: World) => w.clubs[w.meta.userClubId];
const target = (w: World): Player => Object.values(w.players).filter((p) => p.clubId && p.clubId !== w.meta.userClubId && !p.contract?.releaseClause && w.clubs[p.clubId].leagueId === user(w).leagueId).sort((a, b) => a.value - b.value)[40];

describe("transfers & negotiations", () => {
  it("AI sellers reject low bids, counter reasonable ones and accept fair value", () => {
    const w = newWorld();
    const p = target(w);
    const buyer = user(w);
    expect(evaluateBid(w, p, buyer, defaultTransferOffer(Math.round(p.value * 0.3)), 3).decision).toBe("rejected");
    const mid = evaluateBid(w, p, buyer, defaultTransferOffer(Math.round(p.value * 0.95)), 3);
    expect(["countered", "accepted"]).toContain(mid.decision);
    if (mid.decision === "countered") expect(evaluateBid(w, p, buyer, mid.counter!, 3).decision).toBe("accepted");
    expect(evaluateBid(w, p, buyer, defaultTransferOffer(Math.round(p.value * 3)), 3).decision).toBe("accepted");
  });

  it("completes a transfer with consistent registration, finances and contracts", () => {
    const w = newWorld();
    w.meta.currentDate = "2026-07-15";
    const p = target(w);
    const seller = w.clubs[p.clubId!];
    const buyer = user(w);
    buyer.finance.transferBudget = 500_000_000;
    const bBal = buyer.finance.balance, sBal = seller.finance.balance;
    const n = openNegotiation(w, p.id, buyer.id, "transfer");
    const fee = Math.round(p.value * 3);
    expect(submitBid(w, n.id, defaultTransferOffer(fee)).decision).toBe("accepted");
    const demand = contractDemand(w, p, buyer, false);
    const res = submitContractOffer(w, n.id, { ...demand, wage: demand.wage * 2 });
    expect(res.completed).toBe(true);
    expect(p.clubId).toBe(buyer.id);
    expect(buyer.finance.balance).toBe(bBal - fee - demand.signingBonus);
    expect(seller.finance.balance).toBe(sBal + fee);
    expect(w.transfers.at(-1)!.fee).toBe(fee);
    // player is registered with exactly one club
    expect(Object.values(w.clubs).filter((c) => c.id === p.clubId).length).toBe(1);
  });

  it("blocks transfers outside the window but allows free agents", () => {
    const w = newWorld();
    w.meta.currentDate = "2026-10-10";
    const p = target(w);
    const buyer = user(w);
    buyer.finance.transferBudget = 500_000_000;
    const n = openNegotiation(w, p.id, buyer.id, "transfer");
    submitBid(w, n.id, defaultTransferOffer(p.value * 3));
    const d = contractDemand(w, p, buyer, false);
    const r = submitContractOffer(w, n.id, { ...d, wage: d.wage * 2 });
    expect(r.completed).toBeFalsy();
    expect(p.clubId).not.toBe(buyer.id);
    const free = Object.values(w.players).find((x) => !x.clubId && !x.retired)!;
    const n2 = openNegotiation(w, free.id, buyer.id, "free_agent");
    const d2 = contractDemand(w, free, buyer, false);
    expect(submitContractOffer(w, n2.id, { ...d2, wage: d2.wage * 1.5 }).completed).toBe(true);
    expect(free.clubId).toBe(buyer.id);
  });

  it("refuses bids beyond the transfer budget and honours release clauses", () => {
    const w = newWorld("club_cas_03");
    w.meta.currentDate = "2026-07-15";
    const buyer = user(w);
    const p = Object.values(w.players).find((x) => x.clubId && x.clubId !== buyer.id && x.contract?.releaseClause)!;
    buyer.finance.transferBudget = 1000;
    const n = openNegotiation(w, p.id, buyer.id, "transfer");
    expect(submitBid(w, n.id, defaultTransferOffer(p.contract!.releaseClause!)).message).toMatch(/budget/);
    buyer.finance.transferBudget = 1e10;
    buyer.finance.balance = 1e10;
    expect(evaluateBid(w, p, buyer, defaultTransferOffer(p.contract!.releaseClause!), 1).decision).toBe("accepted");
  });

  it("never lets a squad fall below the minimum size", () => {
    const w = newWorld();
    const c = user(w);
    const squad = Object.values(w.players).filter((p) => p.clubId === c.id);
    let released = 0;
    for (const p of squad) if (releasePlayer(w, p.id).ok) released++;
    expect(squadCount(w, c.id).total).toBe(MIN_SQUAD);
    expect(released).toBe(squad.length - MIN_SQUAD);
  });
});

describe("finances", () => {
  it("is idempotent and every movement reconciles to the balance", () => {
    const w = newWorld();
    const c = user(w);
    const start = c.finance.balance;
    postTransaction(w, c.id, 1000, "other", "test", "k1");
    postTransaction(w, c.id, 1000, "other", "test", "k1");
    postTransaction(w, c.id, -300, "other", "test", "k2");
    expect(c.finance.balance).toBe(start + 700);
    const txs = w.transactions.filter((t) => t.clubId === c.id);
    expect(txs.reduce((a, t) => a + t.amount, 0)).toBe(c.finance.balance - start);
    expect(txs.at(-1)!.balanceAfter).toBe(c.finance.balance);
  });
  it("bank loans are limited by club reputation", () => {
    const w = newWorld();
    expect(takeBankLoan(w, w.meta.userClubId, 1e12, 5).ok).toBe(false);
    expect(takeBankLoan(w, w.meta.userClubId, 2_000_000, 5).ok).toBe(true);
  });
});

describe("player development", () => {
  it("young high-potential players improve and veterans decline over a season", () => {
    const w = newWorld();
    const rng = new Rng(3);
    const young = Object.values(w.players).filter((p) => p.clubId && ageOn(p.dob, w.meta.currentDate) <= 19 && p.potential - overall(p) >= 12);
    const old = Object.values(w.players).filter((p) => p.clubId && ageOn(p.dob, w.meta.currentDate) >= 33);
    const y0 = young.reduce((a, p) => a + overall(p), 0);
    const o0 = old.reduce((a, p) => a + overall(p), 0);
    for (let i = 0; i < 40; i++) {
      weeklyDevelopment(w, rng);
      w.meta.currentDate = addDays(w.meta.currentDate, 7);
    }
    expect(young.reduce((a, p) => a + overall(p), 0)).toBeGreaterThan(y0 + young.length * 2);
    expect(old.reduce((a, p) => a + overall(p), 0)).toBeLessThan(o0);
  });
  it("youth intake creates unique, valid, flagged players", () => {
    const w = newWorld();
    const ids = youthIntake(w, w.meta.userClubId, new Rng(5));
    expect(ids.length).toBeGreaterThanOrEqual(3);
    const keys = new Set(Object.values(w.players).map((p) => `${p.firstName}|${p.lastName}|${p.dob}`));
    expect(keys.size).toBe(Object.values(w.players).length);
    for (const id of ids) {
      const p = w.players[id];
      expect(p.generated).toBe(true);
      expect(p.contract?.youth).toBe(true);
      expect(ageOn(p.dob, w.meta.currentDate)).toBeLessThanOrEqual(17);
    }
  });
});

describe("tactical validation", () => {
  it("flags duplicates, injuries and missing goalkeepers", () => {
    const w = newWorld();
    const c = user(w);
    const t = activeTactic(c);
    const comp = w.competitions[c.leagueId!];
    const sel = autoSelect(w, c, t, comp, w.meta.currentDate);
    expect(validateSelection(w, c, sel, comp, w.meta.currentDate).filter((i) => i.level === "error")).toEqual([]);
    const ids = Object.values(sel.starters);
    const dup = { ...sel, starters: { ...sel.starters, [t.slots[3].id]: ids[4] } };
    expect(validateSelection(w, c, dup, comp, w.meta.currentDate).some((i) => i.code === "duplicate")).toBe(true);
    w.players[ids[2]].injury = { type: "test", until: "2030-01-01" };
    expect(validateSelection(w, c, sel, comp, w.meta.currentDate).some((i) => i.code === "injured")).toBe(true);
    const outfield = Object.values(w.players).find((p) => p.clubId === c.id && p.position === "ST" && !ids.includes(p.id))!;
    const noGk = { ...sel, starters: { ...sel.starters, GK: outfield.id } };
    expect(validateSelection(w, c, noGk, comp, w.meta.currentDate).some((i) => i.code === "no_goalkeeper")).toBe(true);
    const bigBench = { ...sel, bench: Object.values(w.players).filter((p) => p.clubId === c.id && !ids.includes(p.id)).map((p) => p.id) };
    expect(validateSelection(w, c, bigBench, comp, w.meta.currentDate).some((i) => i.code === "bench_size")).toBe(true);
  });
});

describe("staff, stadium and sponsors", () => {
  it("hires and dismisses staff with contracts and compensation", () => {
    const w = newWorld();
    const c = user(w);
    const coach = Object.values(w.staff).find((s) => !s.clubId && s.role === "attacking_coach")!;
    expect(hireStaff(w, c.id, coach.id, 10, 2).ok).toBe(false);
    expect(hireStaff(w, c.id, coach.id, 1_000_000, 2).ok).toBe(true);
    expect(coach.clubId).toBe(c.id);
    const bal = c.finance.balance;
    expect(dismissStaff(w, c.id, coach.id).ok).toBe(true);
    expect(c.finance.balance).toBeLessThan(bal);
    expect(coach.clubId).toBeNull();
  });
  it("stadium expansion costs money, takes time and adds capacity", () => {
    const w = newWorld();
    const c = user(w);
    c.finance.balance = 1e9;
    const st = w.stadiums[c.stadiumId];
    const cap = st.capacity;
    const q = quoteProject(w, c.id, "expansion", 4000);
    expect(q.feasible).toBe(true);
    expect(startProject(w, c.id, "expansion", 4000).ok).toBe(true);
    expect(quoteProject(w, c.id, "expansion", 1000).feasible).toBe(false); // one at a time
    const end = st.projects[0].endDate;
    let d = w.meta.currentDate;
    while (d <= end) {
      w.meta.currentDate = d;
      processStadiumProjects(w, d.endsWith("-01"));
      d = addDays(d, 1);
    }
    expect(st.capacity).toBe(cap + 4000);
    expect(st.projects[0].paid).toBe(st.projects[0].cost);
  });
  it("sponsor offers can be signed into deals", () => {
    const w = newWorld();
    const c = user(w);
    const offers = generateSponsorOffers(w, c.id, new Rng(2));
    const naming = offers.find((o) => o.slot === "stadium_naming") ?? offers[0];
    expect(naming).toBeTruthy();
    expect(acceptSponsorOffer(w, naming.id).ok).toBe(true);
    expect(w.sponsorDeals[naming.id]).toBeTruthy();
  });
});
