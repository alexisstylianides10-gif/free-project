import type { ID, Staff, StaffRole, World } from "../core/types";
import { diffDays } from "../core/dates";
import { clamp, niceMoney } from "../core/util";
import { postTransaction } from "../finance/ledger";
import { addNews } from "../world/news";

export const STAFF_LIMITS: Record<StaffRole, number> = {
  manager: 1, assistant: 1, attacking_coach: 2, defensive_coach: 2, goalkeeping_coach: 1, fitness_coach: 2, youth_coach: 2, set_piece_coach: 1, scout: 4, head_of_recruitment: 1, physio: 3,
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  manager: "Manager", assistant: "Assistant Manager", attacking_coach: "Attacking Coach", defensive_coach: "Defensive Coach", goalkeeping_coach: "Goalkeeping Coach",
  fitness_coach: "Fitness Coach", youth_coach: "Youth Coach", set_piece_coach: "Set-Piece Coach", scout: "Scout", head_of_recruitment: "Head of Recruitment", physio: "Medical Staff (Physio)",
};

/** The attribute that matters most for a role (shown as the headline rating). */
export function keyRating(s: Staff): number {
  const a = s.attributes;
  switch (s.role) {
    case "manager": case "assistant": return Math.round((a.coaching + a.tactical + a.manManagement) / 3);
    case "attacking_coach": return a.attacking;
    case "defensive_coach": return a.defending;
    case "goalkeeping_coach": return a.goalkeeping;
    case "fitness_coach": return a.fitness;
    case "youth_coach": return a.youth;
    case "set_piece_coach": return a.setPieces;
    case "scout": case "head_of_recruitment": return Math.round((a.judgingAbility + a.judgingPotential) / 2);
    case "physio": return a.medical;
  }
}

export function staffWageDemand(s: Staff, clubReputation: number): number {
  const q = keyRating(s);
  return niceMoney((250 + q * q * (s.role === "assistant" ? 40 : 22)) * (0.7 + clubReputation / 150) * (0.8 + s.reputation / 250));
}

export function hireStaff(world: World, clubId: ID, staffId: ID, wageOffer: number, years: number): { ok: boolean; message: string } {
  const club = world.clubs[clubId];
  const s = world.staff[staffId];
  if (!s || s.isUser) return { ok: false, message: "Staff member not found." };
  if (s.role === "manager") return { ok: false, message: "You are the manager. Hire an assistant manager instead." };
  if (s.clubId === clubId) return { ok: false, message: "Already employed by your club." };
  const current = Object.values(world.staff).filter((x) => x.clubId === clubId && x.role === s.role).length;
  if (current >= STAFF_LIMITS[s.role]) return { ok: false, message: `You already have the maximum number of ${ROLE_LABEL[s.role].toLowerCase()}s (${STAFF_LIMITS[s.role]}).` };
  if (years < 1 || years > 4) return { ok: false, message: "Staff contracts run 1–4 years." };
  if (s.reputation > club.reputation + 20) return { ok: false, message: `${s.firstName} ${s.lastName} is not interested in working at a club of your stature.` };
  const demand = staffWageDemand(s, club.reputation) * (s.clubId ? 1.25 : 1);
  if (wageOffer < demand * 0.95) return { ok: false, message: `${s.firstName} ${s.lastName} wants at least ${niceMoney(demand).toLocaleString()} per week.` };
  if (s.clubId) {
    // compensation to the current employer
    const comp = niceMoney(staffWageDemand(s, world.clubs[s.clubId].reputation) * 26);
    if (club.finance.balance + club.finance.overdraftLimit < comp) return { ok: false, message: "The club cannot afford the compensation fee." };
    postTransaction(world, clubId, -comp, "compensation", `Compensation for ${s.firstName} ${s.lastName}`, `staffcomp:${s.id}:${world.meta.currentDate}:out`);
    postTransaction(world, s.clubId, comp, "compensation", `Compensation for ${s.firstName} ${s.lastName}`, `staffcomp:${s.id}:${world.meta.currentDate}:in`);
  }
  s.clubId = clubId;
  s.contract = { wage: Math.round(wageOffer), startDate: world.meta.currentDate, endDate: `${Number(world.meta.currentDate.slice(0, 4)) + years + (Number(world.meta.currentDate.slice(5, 7)) >= 7 ? 1 : 0)}-06-30` };
  addNews(world, { category: "staff", title: `${s.firstName} ${s.lastName} joins as ${ROLE_LABEL[s.role]}`, body: `${s.firstName} ${s.lastName} has signed a contract until ${s.contract.endDate}.`, clubIds: [clubId] });
  return { ok: true, message: `${s.firstName} ${s.lastName} hired.` };
}

/** Dismiss a staff member, paying the remaining contract (max 1 year). */
export function dismissStaff(world: World, clubId: ID, staffId: ID): { ok: boolean; message: string } {
  const s = world.staff[staffId];
  if (!s || s.clubId !== clubId) return { ok: false, message: "Staff member not at your club." };
  if (s.isUser) return { ok: false, message: "You cannot dismiss yourself." };
  const weeks = s.contract ? clamp(diffDays(s.contract.endDate, world.meta.currentDate) / 7, 0, 52) : 0;
  const payout = Math.round(weeks * (s.contract?.wage ?? 0));
  postTransaction(world, clubId, -payout, "compensation", `Dismissal: ${s.firstName} ${s.lastName}`, `staffdismiss:${s.id}:${world.meta.currentDate}`);
  s.clubId = null;
  s.contract = null;
  return { ok: true, message: `${s.firstName} ${s.lastName} dismissed (payout ${payout.toLocaleString()}).` };
}
