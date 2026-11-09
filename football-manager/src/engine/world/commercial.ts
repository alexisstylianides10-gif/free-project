import type { ID, SponsorDeal, SponsorSlot, World } from "../core/types";
import { Rng } from "../core/rng";
import { newId } from "../core/ids";
import { addDays } from "../core/dates";
import { niceMoney } from "../core/util";
import { postTransaction } from "../finance/ledger";
import { addNews } from "./news";

export const SPONSOR_SLOTS: { slot: SponsorSlot; label: string; share: number; max: number }[] = [
  { slot: "shirt", label: "Shirt sponsor", share: 1, max: 1 },
  { slot: "kit_manufacturer", label: "Kit manufacturer", share: 0.6, max: 1 },
  { slot: "sleeve", label: "Sleeve sponsor", share: 0.25, max: 1 },
  { slot: "stadium_naming", label: "Stadium naming rights", share: 0.4, max: 1 },
  { slot: "commercial", label: "Commercial partner", share: 0.1, max: 4 },
];

export function baseSponsorValue(reputation: number, slot: SponsorSlot): number {
  const share = SPONSOR_SLOTS.find((s) => s.slot === slot)?.share ?? 0.1;
  return niceMoney(Math.pow(reputation, 2) * 2500 * share);
}

export function activeDeals(world: World, clubId: ID): SponsorDeal[] {
  return Object.values(world.sponsorDeals).filter((d) => d.clubId === clubId && d.endDate >= world.meta.currentDate);
}

function makeDeal(world: World, rng: Rng, clubId: ID, sponsorId: ID, slot: SponsorSlot, years: number, valueMul = 1): SponsorDeal {
  const club = world.clubs[clubId];
  const value = niceMoney(baseSponsorValue(club.reputation, slot) * valueMul * (0.85 + rng.next() * 0.3));
  return {
    id: newId(world, "deal"), clubId, sponsorId, slot, annualValue: value, startDate: world.meta.currentDate, endDate: `${Number(world.meta.currentDate.slice(0, 4)) + years}-06-30`,
    bonusLeagueTitle: niceMoney(value * 0.2), bonusTopFour: niceMoney(value * 0.08), bonusCupWin: niceMoney(value * 0.1),
  };
}

export function createInitialSponsorDeals(world: World, rng: Rng): void {
  const companies = Object.values(world.sponsors);
  for (const club of Object.values(world.clubs)) {
    const eligible = companies.filter((c) => c.minReputation <= club.reputation + 5);
    if (!eligible.length) continue;
    const kitMaker = companies.find((c) => c.industry === "Sportswear" && c.minReputation <= club.reputation + 10) ?? rng.pick(eligible);
    const shirt = rng.pick(eligible.filter((c) => c.industry !== "Sportswear")) ?? rng.pick(eligible);
    const slots: [SponsorSlot, ID][] = [["shirt", shirt.id], ["kit_manufacturer", kitMaker.id]];
    if (club.reputation >= 55) slots.push(["sleeve", rng.pick(eligible).id]);
    for (const [slot, sponsorId] of slots) {
      const d = makeDeal(world, rng, club.id, sponsorId, slot, rng.int(1, 3));
      world.sponsorDeals[d.id] = d;
    }
    const kit = club.kits;
    for (const k of kit) {
      k.manufacturer = world.sponsors[kitMaker.id].name;
      k.sponsorText = world.sponsors[shirt.id].name;
    }
  }
}

/** Generate offers for open sponsorship slots of the user's club. */
export function generateSponsorOffers(world: World, clubId: ID, rng: Rng): SponsorDeal[] {
  const club = world.clubs[clubId];
  const deals = activeDeals(world, clubId);
  world.sponsorOffers = world.sponsorOffers.filter((o) => o.clubId !== clubId);
  const used = new Set(deals.map((d) => d.sponsorId));
  const companies = Object.values(world.sponsors).filter((c) => c.minReputation <= club.reputation && !used.has(c.id));
  for (const s of SPONSOR_SLOTS) {
    const count = deals.filter((d) => d.slot === s.slot && d.endDate > addDays(world.meta.currentDate, 90)).length;
    if (count >= s.max) continue;
    if (s.slot === "kit_manufacturer" && !companies.some((c) => c.industry === "Sportswear")) continue;
    const pool = s.slot === "kit_manufacturer" ? companies.filter((c) => c.industry === "Sportswear") : companies.filter((c) => c.industry !== "Sportswear");
    rng.shuffle(pool);
    for (const company of pool.slice(0, 3)) {
      const deal = makeDeal(world, rng, clubId, company.id, s.slot, rng.int(2, 5), 0.85 + company.wealth / 40);
      deal.startDate = world.meta.currentDate;
      world.sponsorOffers.push(deal);
    }
  }
  return world.sponsorOffers.filter((o) => o.clubId === clubId);
}

/** Ask a sponsor for a better annual value. */
export function negotiateSponsorOffer(world: World, offerId: ID, requested: number): { result: "accepted" | "countered" | "rejected"; message: string } {
  const offer = world.sponsorOffers.find((o) => o.id === offerId);
  if (!offer) return { result: "rejected", message: "That offer is no longer available." };
  const company = world.sponsors[offer.sponsorId];
  const ceiling = niceMoney(offer.annualValue * (1.05 + company.wealth / 100));
  if (requested <= ceiling) {
    offer.annualValue = niceMoney(requested);
    return { result: "accepted", message: `${company.name} agree to ${requested.toLocaleString()} per season.` };
  }
  if (requested <= ceiling * 1.2) {
    offer.annualValue = ceiling;
    return { result: "countered", message: `${company.name} can go no higher than ${ceiling.toLocaleString()} per season.` };
  }
  world.sponsorOffers = world.sponsorOffers.filter((o) => o.id !== offerId);
  return { result: "rejected", message: `${company.name} found the demand unreasonable and withdrew.` };
}

export function acceptSponsorOffer(world: World, offerId: ID): { ok: boolean; message: string } {
  const offer = world.sponsorOffers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: "Offer not found." };
  const s = SPONSOR_SLOTS.find((x) => x.slot === offer.slot)!;
  const current = activeDeals(world, offer.clubId).filter((d) => d.slot === offer.slot);
  if (current.length >= s.max) {
    // replace the deal expiring soonest only if it ends within 90 days
    const soon = current.sort((a, b) => a.endDate.localeCompare(b.endDate))[0];
    if (soon.endDate > addDays(world.meta.currentDate, 90)) return { ok: false, message: `The ${s.label.toLowerCase()} slot is already taken until ${soon.endDate}.` };
    soon.endDate = addDays(world.meta.currentDate, -1);
  }
  const club = world.clubs[offer.clubId];
  const company = world.sponsors[offer.sponsorId];
  world.sponsorDeals[offer.id] = { ...offer };
  world.sponsorOffers = world.sponsorOffers.filter((o) => !(o.clubId === offer.clubId && o.slot === offer.slot));
  if (offer.slot === "shirt") for (const k of club.kits) k.sponsorText = company.name;
  if (offer.slot === "kit_manufacturer") for (const k of club.kits) k.manufacturer = company.name;
  if (offer.slot === "stadium_naming") {
    const st = world.stadiums[club.stadiumId];
    st.namingRightsName = `${company.name.split(" ")[0]} Arena`;
  }
  addNews(world, { category: "sponsor", title: `${company.name} sign ${s.label.toLowerCase()} deal`, body: `${club.name} have agreed a deal worth ${offer.annualValue.toLocaleString()} per season until ${offer.endDate}.`, clubIds: [club.id] });
  return { ok: true, message: "Deal signed." };
}

/** Monthly sponsorship income for all clubs. Idempotent per month. */
export function paySponsorships(world: World): void {
  const month = world.meta.currentDate.slice(0, 7);
  for (const d of Object.values(world.sponsorDeals)) {
    if (d.startDate > world.meta.currentDate || d.endDate < world.meta.currentDate) continue;
    postTransaction(world, d.clubId, d.annualValue / 12, "sponsorship", `${world.sponsors[d.sponsorId]?.name ?? "Sponsor"} (${d.slot.replace("_", " ")})`, `sponsor:${d.id}:${month}`);
  }
  // expire naming rights
  for (const club of Object.values(world.clubs)) {
    const st = world.stadiums[club.stadiumId];
    if (st?.namingRightsName && !activeDeals(world, club.id).some((d) => d.slot === "stadium_naming")) st.namingRightsName = null;
  }
}

export function payPerformanceBonuses(world: World, clubId: ID, leaguePos: number | null, cupWins: number): void {
  for (const d of activeDeals(world, clubId)) {
    if (leaguePos === 1 && d.bonusLeagueTitle) postTransaction(world, clubId, d.bonusLeagueTitle, "sponsorship", "Sponsor bonus: league title", `sponsorbonus:title:${d.id}:${world.meta.currentSeasonId}`);
    else if (leaguePos !== null && leaguePos <= 4 && d.bonusTopFour) postTransaction(world, clubId, d.bonusTopFour, "sponsorship", "Sponsor bonus: top four", `sponsorbonus:top4:${d.id}:${world.meta.currentSeasonId}`);
    if (cupWins > 0 && d.bonusCupWin) postTransaction(world, clubId, d.bonusCupWin * cupWins, "sponsorship", "Sponsor bonus: cup win", `sponsorbonus:cup:${d.id}:${world.meta.currentSeasonId}`);
  }
}

