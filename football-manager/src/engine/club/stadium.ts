import type { ID, Stadium, StadiumProject, World } from "../core/types";
import { newId } from "../core/ids";
import { addDays, diffDays } from "../core/dates";
import { clamp } from "../core/util";
import { canAfford, postTransaction } from "../finance/ledger";
import { addNews } from "../world/news";

export type ProjectKind = StadiumProject["type"];

export interface ProjectQuote {
  type: ProjectKind;
  description: string;
  cost: number;
  days: number;
  capacityDelta: number;
  capacityReduction: number;
  requiresRelocation: boolean;
  levelTarget: number | null;
  feasible: boolean;
  reason: string | null;
}

export const MAX_CAPACITY = 95_000;

/** Quote a stadium project. Costs and durations scale with the stadium and project size. */
export function quoteProject(world: World, clubId: ID, type: ProjectKind, amount = 0): ProjectQuote {
  const club = world.clubs[clubId];
  const st = world.stadiums[club.stadiumId];
  const busy = st.projects.some((p) => p.endDate > world.meta.currentDate && (p.type === type || type === "new_stadium" || p.type === "new_stadium"));
  let q: ProjectQuote;
  switch (type) {
    case "expansion": {
      const seats = clamp(Math.round(amount / 500) * 500, 500, 20_000);
      q = { type, description: `Add ${seats.toLocaleString()} seats`, cost: seats * 3_800, days: 120 + Math.round(seats / 40), capacityDelta: seats, capacityReduction: Math.round(seats * 0.6), requiresRelocation: false, levelTarget: null, feasible: true, reason: null };
      if (st.capacity + seats > MAX_CAPACITY) q = { ...q, feasible: false, reason: `Capacity cannot exceed ${MAX_CAPACITY.toLocaleString()}; build a new stadium instead.` };
      if (st.capacity + seats > st.capacity * 1.6) q = { ...q, feasible: false, reason: "The current structure cannot be expanded by more than 60%." };
      break;
    }
    case "renovation":
      q = { type, description: "Full renovation (condition to 100%, +1 facilities)", cost: Math.round(st.capacity * 450), days: 150, capacityDelta: 0, capacityReduction: Math.round(st.capacity * 0.25), requiresRelocation: false, levelTarget: null, feasible: st.condition < 95 || st.facilities < 5, reason: st.condition >= 95 && st.facilities >= 5 ? "Stadium is already in top condition." : null };
      break;
    case "pitch":
      q = { type, description: "Relay pitch with hybrid grass", cost: 450_000 + Math.round(st.capacity * 8), days: 21, capacityDelta: 0, capacityReduction: 0, requiresRelocation: false, levelTarget: 95, feasible: st.pitchQuality < 92, reason: st.pitchQuality >= 92 ? "The pitch is already excellent." : null };
      break;
    case "lighting":
    case "hospitality":
    case "facilities": {
      const cur = type === "lighting" ? st.lighting : type === "hospitality" ? st.hospitality : st.facilities;
      const next = cur + 1;
      q = { type, description: `Upgrade ${type} to level ${next}`, cost: Math.round((type === "lighting" ? 900_000 : type === "hospitality" ? 2_500_000 : 1_800_000) * next * (0.6 + st.capacity / 50_000)), days: 60 + next * 15, capacityDelta: 0, capacityReduction: type === "hospitality" ? Math.round(st.capacity * 0.05) : 0, requiresRelocation: false, levelTarget: next, feasible: next <= 5, reason: next > 5 ? "Already at the maximum level." : null };
      break;
    }
    case "vip": {
      const boxes = clamp(Math.round(amount) || 10, 2, 60);
      q = { type, description: `Build ${boxes} VIP boxes`, cost: boxes * 420_000, days: 90 + boxes * 2, capacityDelta: -boxes * 12, capacityReduction: boxes * 25, requiresRelocation: false, levelTarget: null, feasible: st.vipBoxes + boxes <= 200, reason: st.vipBoxes + boxes > 200 ? "Too many VIP boxes for this stadium." : null };
      break;
    }
    case "new_stadium": {
      const cap = clamp(Math.round(amount / 1000) * 1000 || Math.round(st.capacity * 1.5 / 1000) * 1000, 10_000, MAX_CAPACITY);
      q = { type, description: `Build a new ${cap.toLocaleString()}-seat stadium`, cost: cap * 9_500, days: 900, capacityDelta: cap - st.capacity, capacityReduction: 0, requiresRelocation: false, levelTarget: cap, feasible: true, reason: null };
      if (club.reputation < 55) q = { ...q, feasible: false, reason: "The board does not believe the club can fill a new stadium yet (reputation 55+ required)." };
      break;
    }
  }
  if (busy && q.feasible) q = { ...q, feasible: false, reason: "A conflicting project is already under way." };
  // board approval: total cost may not exceed balance + 3 seasons of projected surplus (rough proxy: reputation based credit)
  const credit = club.finance.balance + club.reputation * 1_500_000;
  if (q.feasible && q.cost > credit) q = { ...q, feasible: false, reason: "The board will not approve a project the club cannot finance." };
  return q;
}

/** Start a project. Construction cost is paid in monthly instalments while works run. */
export function startProject(world: World, clubId: ID, type: ProjectKind, amount = 0): { ok: boolean; message: string } {
  const club = world.clubs[clubId];
  const st = world.stadiums[club.stadiumId];
  const q = quoteProject(world, clubId, type, amount);
  if (!q.feasible) return { ok: false, message: q.reason ?? "Not feasible." };
  const deposit = Math.round(q.cost * 0.2);
  if (!canAfford(club, deposit)) return { ok: false, message: "The club cannot afford the 20% deposit." };
  const p: StadiumProject = {
    id: newId(world, "proj"), type, description: q.description, cost: q.cost, startDate: world.meta.currentDate, endDate: addDays(world.meta.currentDate, q.days),
    capacityDelta: q.capacityDelta, capacityReduction: q.capacityReduction, requiresRelocation: q.requiresRelocation, levelTarget: q.levelTarget, paid: 0,
  };
  st.projects.push(p);
  postTransaction(world, clubId, -deposit, "stadium_construction", `${q.description}: deposit`, `proj:${p.id}:deposit`);
  p.paid = deposit;
  addNews(world, { category: "stadium", title: "Stadium works begin", body: `${q.description}. Expected completion ${p.endDate}.`, clubIds: [clubId] });
  return { ok: true, message: `Project started: ${q.description}. Completion expected ${p.endDate}.` };
}

/** Monthly payments and completion of stadium projects (all clubs). */
export function processStadiumProjects(world: World, monthly: boolean): void {
  const today = world.meta.currentDate;
  for (const club of Object.values(world.clubs)) {
    const st = world.stadiums[club.stadiumId];
    if (!st) continue;
    for (const p of st.projects) {
      if (p.paid >= p.cost && p.endDate < today) continue;
      if (monthly && p.endDate >= today && p.paid < p.cost) {
        const months = Math.max(1, Math.ceil(diffDays(p.endDate, today) / 30));
        const amount = Math.round((p.cost - p.paid) / months);
        postTransaction(world, club.id, -amount, "stadium_construction", `${p.description}: instalment`, `proj:${p.id}:${today.slice(0, 7)}`);
        p.paid += amount;
      }
      if (p.endDate === today) {
        if (p.paid < p.cost) {
          postTransaction(world, club.id, -(p.cost - p.paid), "stadium_construction", `${p.description}: final payment`, `proj:${p.id}:final`);
          p.paid = p.cost;
        }
        applyProject(st, p);
        if (club.isUser) addNews(world, { category: "stadium", title: "Stadium project completed", body: `${p.description} is complete. Capacity is now ${st.capacity.toLocaleString()}.`, clubIds: [club.id], important: true });
      }
    }
    // keep recent history only
    st.projects = st.projects.filter((p) => p.endDate >= addDays(today, -400));
  }
}

function applyProject(st: Stadium, p: StadiumProject): void {
  switch (p.type) {
    case "expansion": st.capacity += p.capacityDelta; break;
    case "renovation": st.condition = 100; st.facilities = Math.min(5, st.facilities + 1); break;
    case "pitch": st.pitchQuality = p.levelTarget ?? 95; break;
    case "lighting": st.lighting = p.levelTarget ?? st.lighting; break;
    case "hospitality": st.hospitality = p.levelTarget ?? st.hospitality; break;
    case "facilities": st.facilities = p.levelTarget ?? st.facilities; break;
    case "vip": st.vipBoxes += Math.round(-p.capacityDelta / 12); st.capacity += p.capacityDelta; break;
    case "new_stadium": st.capacity = p.levelTarget ?? st.capacity; st.condition = 100; st.facilities = 5; st.hospitality = Math.max(st.hospitality, 4); st.lighting = 5; st.pitchQuality = 95; st.vipBoxes = Math.max(st.vipBoxes, Math.round(st.capacity / 800)); st.name = `${st.name.replace(/ \(New\)$/, "")} (New)`; break;
  }
}

/** Weekly maintenance: cost scales with capacity and chosen level; condition and pitch drift. */
export function weeklyStadiumMaintenance(world: World): void {
  const week = world.meta.currentDate;
  for (const club of Object.values(world.clubs)) {
    const st = world.stadiums[club.stadiumId];
    if (!st) continue;
    const cost = Math.round(st.capacity * 1.1 * st.maintenanceLevel + st.vipBoxes * 300);
    postTransaction(world, club.id, -cost, "stadium_maintenance", "Stadium maintenance", `maint:${club.id}:${week}`);
    st.condition = clamp(st.condition + (st.maintenanceLevel - 2) * 0.3 - 0.08, 20, 100);
    st.pitchQuality = clamp(st.pitchQuality + st.maintenanceLevel * 0.6 - 0.2, 20, 100);
  }
}
