import type { Club, ClubKit, ClubStrategy, Competition, ID, Player, Position, Stadium, Staff, TacticalSystem, World } from "../core/types";
import type { Dataset } from "@/data/schema";
import { Rng, deriveSeed } from "../core/rng";
import { addYears } from "../core/dates";
import { createTactic, FORMATION_PRESETS } from "../tactics/formations";
import { createSeason, setupCompetitionSeasons } from "../competition/season";
import { generatePlayer, randomDob } from "./generate";
import { assignSquadRoles, refreshValues } from "./players";
import { generateBoardObjectives } from "./board";
import { createInitialSponsorDeals } from "./commercial";
import { addNews } from "./news";
import { overall, ratingInPosition } from "../core/ratings";
import { clubPlayers, invalidateSquadIndex } from "./index";

export const GAME_VERSION = "0.1.0";
export const SCHEMA_VERSION = 1;

export interface CreateCareerOptions {
  clubId: ID;
  managerFirstName: string;
  managerLastName: string;
  saveName: string;
  seed?: number;
}

function kitsFor(rng: Rng, club: { colors: { primary: string; secondary: string } }, manufacturer: string, sponsor: string): ClubKit[] {
  const { primary, secondary } = club.colors;
  const pattern = rng.pick(["solid", "solid", "stripes", "hoops", "halves", "sash", "pinstripes"] as const);
  const awayBase = primary === "#ffffff" ? "#1d1d1d" : "#f4f4f4";
  return [
    { slot: "home", primary, secondary, accent: secondary, pattern, collar: rng.pick(["crew", "v", "polo"] as const), sleeves: "matching", shorts: secondary, socks: primary, manufacturer, sponsorText: sponsor },
    { slot: "away", primary: awayBase, secondary: primary, accent: primary, pattern: "solid", collar: "crew", sleeves: "contrast", shorts: awayBase, socks: awayBase, manufacturer, sponsorText: sponsor },
    { slot: "third", primary: secondary, secondary: primary, accent: "#111111", pattern: rng.pick(["chevron", "quarters", "sash"] as const), collar: "v", sleeves: "matching", shorts: primary, socks: secondary, manufacturer, sponsorText: sponsor },
    { slot: "goalkeeper", primary: rng.pick(["#1b9e3e", "#f5a623", "#7b1fa2", "#00bcd4", "#e91e63"]), secondary: "#111111", accent: "#ffffff", pattern: "solid", collar: "crew", sleeves: "matching", shorts: "#111111", socks: "#111111", manufacturer, sponsorText: sponsor },
  ];
}

/**
 * The formation that best suits the players the club actually has (sum of the
 * best XI's ratings in position), with a small bonus for the manager's preference.
 */
export function bestFormationFor(world: World, club: Club, preferred: string | null): string | null {
  const squad = clubPlayers(world, club.id);
  if (squad.length < 11) return null;
  let best: string | null = null;
  let bestScore = -Infinity;
  for (const preset of Object.keys(FORMATION_PRESETS)) {
    const used = new Set<string>();
    let score = 0;
    for (const [, pos] of FORMATION_PRESETS[preset]) {
      let top = 0;
      let pick: string | null = null;
      for (const p of squad) {
        if (used.has(p.id) || (pos === "GK") !== (p.position === "GK")) continue;
        const r = ratingInPosition(p, pos);
        if (r > top) {
          top = r;
          pick = p.id;
        }
      }
      if (pick) used.add(pick);
      score += top;
    }
    if (preset === preferred) score += 6;
    if (score > bestScore) {
      bestScore = score;
      best = preset;
    }
  }
  return best;
}

/** Default AI tactic for a club, derived from its manager's preferred formation and the club strategy. */
export function aiTacticFor(world: World, club: Club, managerFormation: string | null, rng: Rng): TacticalSystem {
  const preset = bestFormationFor(world, club, managerFormation) ?? rng.pick(["4-3-3", "4-2-3-1", "4-1-4-1"]);
  const s: ClubStrategy = club.strategy;
  const team =
    s === "title_contender" ? { mentality: 4, pressing: 4, defensiveLine: 4, tempo: 3, passingRisk: 3, buildUp: "short", width: 4, defensiveTransition: "counter_press", attackingTransition: "balanced" }
    : s === "continental_challenger" ? { mentality: 3, pressing: 4, defensiveLine: 3, tempo: 4, passingRisk: 3, buildUp: "balanced", width: 3, defensiveTransition: "balanced", attackingTransition: "counter" }
    : s === "relegation_battler" || s === "financially_constrained" ? { mentality: 2, pressing: 2, defensiveLine: 2, tempo: 3, passingRisk: 2, buildUp: "direct", width: 3, defensiveTransition: "regroup", attackingTransition: "counter" }
    : s === "youth_development" ? { mentality: 3, pressing: 4, defensiveLine: 3, tempo: 4, passingRisk: 4, buildUp: "short", width: 3, defensiveTransition: "counter_press", attackingTransition: "balanced" }
    : { mentality: 3, pressing: 3, defensiveLine: 3, tempo: 3, passingRisk: 3, buildUp: "balanced", width: 3, defensiveTransition: "balanced", attackingTransition: "balanced" };
  return createTactic(`tac_${club.id}_ai`, club.id, `${preset} (${club.shortName})`, preset, world.meta.currentDate, team as never);
}

function strategyFromReputation(rep: number, tier: number): ClubStrategy {
  if (tier === 1 && rep >= 80) return "title_contender";
  if (tier === 1 && rep >= 70) return "continental_challenger";
  if (rep < 42) return "financially_constrained";
  if (tier === 1 && rep < 60) return "relegation_battler";
  return "mid_table";
}

/**
 * Create an isolated career world from an (immutable) dataset.
 * The dataset object is deep-copied so the source database is never changed.
 */
export function createCareer(datasetIn: Dataset, opts: CreateCareerOptions): World {
  const ds: Dataset = JSON.parse(JSON.stringify(datasetIn));
  const seed = opts.seed ?? deriveSeed(ds.meta.id, opts.clubId, Date.now());
  const rng = new Rng(seed);
  const start = ds.meta.startDate;
  if (!ds.clubs.some((c) => c.id === opts.clubId)) throw new Error("Selected club does not exist in the dataset.");
  const world: World = {
    meta: {
      careerId: `career_${seed.toString(36)}_${Date.now().toString(36)}`,
      saveName: opts.saveName,
      createdAt: new Date().toISOString(),
      gameVersion: GAME_VERSION,
      schemaVersion: SCHEMA_VERSION,
      dataset: { id: ds.meta.id, label: ds.meta.name, isReal: ds.meta.isReal, version: ds.meta.version, coverageNote: ds.meta.coverageNote },
      seed,
      rngState: seed,
      currentDate: start,
      lastProcessedDate: null,
      currentSeasonId: "",
      userClubId: opts.clubId,
      idCounter: 0,
      autosaveEveryDays: 14,
      daysSinceAutosave: 0,
    },
    manager: { staffId: "", name: `${opts.managerFirstName} ${opts.managerLastName}`.trim(), clubId: opts.clubId, contractEnd: addYears(start, 2).slice(0, 4) + "-06-30", wage: 0, reputation: 40, sacked: false, jobOffers: [] },
    nations: {}, clubs: {}, players: {}, staff: {}, stadiums: {}, competitions: {}, seasons: {}, competitionSeasons: {}, fixtures: {}, matches: {}, negotiations: {},
    transfers: [], loans: {}, scouting: {}, scoutedPlayerIds: {}, sponsors: {}, sponsorDeals: {}, sponsorOffers: [], transactions: [], objectives: {}, trophies: [],
    playerHistory: [], clubHistory: [], news: [], youthIntakes: [], development: [], appliedTransactionKeys: {}, qualifiers: {}, career: { awards: [], conversations: [], monthSnap: {} }, savedFormations: [],
  };
  for (const n of ds.nations) world.nations[n.id] = { ...n };
  for (const c of ds.competitions) world.competitions[c.id] = { ...(c as unknown as Competition), source: "dataset" };
  for (const s of ds.stadiums) {
    const st: Stadium = { ...s, condition: 80, maintenanceLevel: 2, namingRightsName: null, projects: [], ownerClubId: null, source: "dataset" };
    world.stadiums[s.id] = st;
  }
  for (const s of ds.sponsors) world.sponsors[s.id] = { ...s, fictional: !ds.meta.isReal };
  if (Object.keys(world.sponsors).length === 0) {
    // Generic placeholder companies (never real brands) when the dataset carries no sponsor data.
    for (let i = 1; i <= 24; i++) world.sponsors[`gsp_${i}`] = { id: `gsp_${i}`, name: `Partner Company ${i}`, industry: "General", wealth: 4 + (i % 14), minReputation: (i * 3) % 80, fictional: true };
  }
  const squadCounts: Record<ID, number> = {};
  for (const p of ds.players) {
    const player: Player = {
      ...generatePlayer(rng, { id: p.id, nationId: p.nationId, namePool: "anglic", position: p.position, overall: 50, potential: p.potential, dob: p.dob, clubId: p.clubId, generated: false }),
      firstName: p.firstName,
      lastName: p.lastName,
      altPositions: p.altPositions,
      foot: p.foot,
      heightCm: p.heightCm,
      attributes: { ...p.attributes },
      potential: Math.max(p.potential, 1),
      source: "dataset",
      generated: false,
    };
    if (p.personality) player.personality = { ...p.personality };
    if (p.clubId) {
      player.contract = p.contract
        ? { wage: p.contract.wage, startDate: p.contract.startDate ?? start, endDate: p.contract.endDate < start ? `${Number(start.slice(0, 4)) + 1}-06-30` : p.contract.endDate, releaseClause: p.contract.releaseClause ?? null, squadRole: "rotation", appearanceBonus: 0, goalBonus: 0, youth: false }
        : { wage: 1000, startDate: start, endDate: `${Number(start.slice(0, 4)) + 1}-06-30`, releaseClause: null, squadRole: "rotation", appearanceBonus: 0, goalBonus: 0, youth: false };
      squadCounts[p.clubId] = (squadCounts[p.clubId] ?? 0) + 1;
    }
    player.potential = Math.max(player.potential, overall(player));
    world.players[p.id] = player;
  }
  for (const s of ds.staff) {
    const st: Staff = { ...s, contract: s.contract ? { wage: s.contract.wage, startDate: start, endDate: s.contract.endDate } : null, isUser: false, source: "dataset" };
    world.staff[s.id] = st;
  }
  const managers = new Map<ID, Staff>();
  for (const s of Object.values(world.staff)) if (s.clubId && s.role === "manager" && !managers.has(s.clubId)) managers.set(s.clubId, s);
  const managerOf = (clubId: ID) => managers.get(clubId);
  for (const c of ds.clubs) {
    const tier = c.leagueId ? (world.competitions[c.leagueId]?.tier ?? 1) : 1;
    const club: Club = {
      id: c.id, name: c.name, shortName: c.shortName, code: c.code, nationId: c.nationId, leagueId: c.leagueId, reputation: c.reputation,
      strategy: c.strategy ?? strategyFromReputation(c.reputation, tier), founded: c.founded ?? null, colors: { ...c.colors }, stadiumId: c.stadiumId, tempStadiumId: null,
      facilities: { ...c.facilities },
      finance: { balance: c.finance.balance, transferBudget: c.finance.transferBudget, wageBudget: c.finance.wageBudget, debt: c.finance.debt, loans: [], overdraftLimit: Math.round(c.reputation * 150_000), ticketPrice: c.finance.ticketPrice, seasonTicketHolders: 0, revenueSeason: {}, expenseSeason: {} },
      kits: [], tactics: [], selection: null, training: { focus: "balanced", intensity: 3, youthIntensity: 3 }, managerId: null, boardConfidence: 65, supporterMood: 65,
      isUser: c.id === opts.clubId, aiTransferActivity: { windowKey: "", signings: 0, sales: 0 }, youthIntakeDate: `03-${String(1 + rng.int(0, 27)).padStart(2, "0")}`,
      source: "dataset",
      dataCoverage: { squad: (squadCounts[c.id] ?? 0) >= 18, staff: !!managerOf(c.id), stadium: !!world.stadiums[c.stadiumId], finance: true },
    };
    world.stadiums[c.stadiumId].ownerClubId = c.id;
    world.clubs[c.id] = club;
  }
  invalidateSquadIndex(world);
  // Fill incomplete squads with clearly-marked generated players.
  const NEED: Position[] = ["GK", "GK", "LB", "RB", "CB", "CB", "CB", "DM", "CM", "CM", "AM", "LM", "RM", "LW", "RW", "ST", "ST", "CM"];
  for (const club of Object.values(world.clubs)) {
    const squad = clubPlayers(world, club.id);
    if (squad.length >= 18) continue;
    let count = squad.length;
    const nation = world.nations[club.nationId];
    const have = squad.map((p) => p.position);
    for (const pos of NEED) {
      const idx = have.indexOf(pos);
      if (idx >= 0) {
        have.splice(idx, 1);
        continue;
      }
      if (count >= 18) break;
      count++;
      const age = rng.int(18, 30);
      const ovr = Math.round(40 + club.reputation * 0.33);
      const p = generatePlayer(rng, { id: `gen_${club.id}_${pos}_${rng.int(0, 1e9).toString(36)}`, nationId: club.nationId, namePool: nation?.namePool ?? "anglic", position: pos, overall: ovr, potential: ovr + rng.int(0, 8), dob: randomDob(rng, start, age), clubId: club.id, generated: true });
      p.contract = { wage: 1500, startDate: start, endDate: `${Number(start.slice(0, 4)) + 2}-06-30`, releaseClause: null, squadRole: "backup", appearanceBonus: 0, goalBonus: 0, youth: false };
      world.players[p.id] = p;
    }
  }
  invalidateSquadIndex(world);
  // User manager replaces the club's existing manager (who becomes unattached).
  const old = managerOf(opts.clubId);
  if (old) {
    managers.delete(opts.clubId);
    old.clubId = null;
    old.contract = null;
  }
  const userClub = world.clubs[opts.clubId];
  const mgr: Staff = {
    id: "st_user_manager", firstName: opts.managerFirstName, lastName: opts.managerLastName, dob: "1985-01-01", nationId: userClub.nationId, clubId: opts.clubId, role: "manager",
    attributes: { coaching: 12, attacking: 12, defending: 12, goalkeeping: 8, fitness: 10, youth: 11, tactical: 14, setPieces: 10, judgingAbility: 12, judgingPotential: 12, medical: 5, manManagement: 12 },
    experience: 5, reputation: 40, specialisation: "User manager", contract: { wage: Math.round(2000 + userClub.reputation * 400), startDate: start, endDate: world.manager.contractEnd! }, preferredFormation: null, isUser: true, source: "generated",
  };
  world.staff[mgr.id] = mgr;
  world.manager.staffId = mgr.id;
  world.manager.wage = mgr.contract!.wage;
  world.manager.reputation = Math.round(20 + userClub.reputation / 3);
  // Club setup: manager, tactics, kits, sponsors
  const sponsorList = Object.values(world.sponsors);
  for (const club of Object.values(world.clubs)) {
    const m = managerOf(club.id);
    club.managerId = club.isUser ? mgr.id : m?.id ?? null;
    const tactic = aiTacticFor(world, club, m?.preferredFormation ?? null, rng);
    if (club.isUser) {
      tactic.id = `tac_${club.id}_1`;
      tactic.name = "Main tactic";
    }
    club.tactics = [tactic];
    const manufacturer = sponsorList.filter((s) => s.industry === "Sportswear")[0]?.name ?? "Generic Kits";
    const shirt = sponsorList.filter((s) => s.industry !== "Sportswear" && s.minReputation <= club.reputation);
    club.kits = kitsFor(rng, club, manufacturer, shirt.length ? rng.pick(shirt).name : "");
  }
  createInitialSponsorDeals(world, rng);
  // Season & competitions
  world.qualifiers = { ...ds.initialQualifiers };
  const season = createSeason(world, start);
  world.meta.currentSeasonId = season.id;
  setupCompetitionSeasons(world, season, rng);
  world.qualifiers = {};
  refreshValues(world);
  for (const club of Object.values(world.clubs)) assignSquadRoles(world, club.id);
  // the user's own league is fully known to the scouting department
  for (const p of Object.values(world.players)) {
    const c = p.clubId ? world.clubs[p.clubId] : null;
    if (c && c.leagueId === userClub.leagueId) world.scoutedPlayerIds[p.id] = start;
  }
  generateBoardObjectives(world, userClub.id);
  world.meta.rngState = rng.state;
  addNews(world, { category: "board", title: `${world.manager.name} appointed ${userClub.name} manager`, body: `The board of ${userClub.name} have appointed ${world.manager.name} as the club's new manager on a contract until ${world.manager.contractEnd}. ${ds.meta.isReal ? "" : "Note: this career uses the fictional development dataset."}`, clubIds: [userClub.id], important: true });
  return world;
}
