import type { ID, Player, SquadRole, World } from "../core/types";
import { ageOn } from "../core/dates";
import { marketValue, overall } from "../core/ratings";
import { clubPlayers } from "./index";

export function playerAge(world: World, p: Player): number {
  return ageOn(p.dob, world.meta.currentDate);
}

export function fullName(p: { firstName: string; lastName: string }): string {
  return p.firstName ? `${p.firstName} ${p.lastName}` : p.lastName;
}

export function leagueReputationOfClub(world: World, clubId: ID | null): number {
  if (!clubId) return 50;
  const c = world.clubs[clubId];
  const l = c?.leagueId ? world.competitions[c.leagueId] : null;
  return l?.reputation ?? 50;
}

export function refreshValues(world: World): void {
  const today = world.meta.currentDate;
  for (const id in world.players) {
    const p = world.players[id];
    if (p.retired) {
      p.value = 0;
      continue;
    }
    p.value = marketValue(p, today, leagueReputationOfClub(world, p.loanParentClubId ?? p.clubId));
  }
}

/** Rank the squad and assign contractual squad roles (key / first team / rotation / backup / prospect). */
export function assignSquadRoles(world: World, clubId: ID): void {
  const squad = clubPlayers(world, clubId).filter((p) => p.contract && !p.loanParentClubId);
  squad.sort((a, b) => overall(b) - overall(a));
  squad.forEach((p, i) => {
    let role: SquadRole = i < 4 ? "key" : i < 11 ? "first_team" : i < 17 ? "rotation" : "backup";
    if (i >= 11 && playerAge(world, p) <= 20) role = "prospect";
    if (p.contract) p.contract.squadRole = role;
  });
}

/** Expected share of matches a squad role implies (used for happiness). */
export function rolePlayingTimeExpectation(role: SquadRole): number {
  return role === "key" ? 0.8 : role === "first_team" ? 0.6 : role === "rotation" ? 0.35 : role === "prospect" ? 0.1 : 0.15;
}

export function squadStrength(world: World, clubId: ID): number {
  const squad = clubPlayers(world, clubId);
  const top = squad.map((p) => overall(p)).sort((a, b) => b - a).slice(0, 14);
  if (!top.length) return 0;
  return Math.round(top.reduce((a, b) => a + b, 0) / top.length);
}
