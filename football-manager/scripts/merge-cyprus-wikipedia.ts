/**
 * Adds the Cypriot First and Second Division (2026/27) to a dataset package, from an
 * intermediate JSON built from English Wikipedia club and player pages (CC BY-SA 4.0).
 *
 *   npx tsx scripts/merge-cyprus-wikipedia.ts <cyprus.json> <in-dataset.json> <out-dataset.json>
 *
 * REAL (from Wikipedia): clubs, divisions, promoted/relegated sides, stadiums & capacities, squads,
 * names, nationalities, positions, dates of birth & heights where the player has an article.
 * ESTIMATED: ratings (from club level and age), ages of players without an article, wages,
 * finances, colours of smaller clubs, staff. Clubs without a published squad get generated players.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Rng, hashString } from "../src/engine/core/rng";
import { generatePlayer, generatePersonality, generateStaff, randomDob } from "../src/engine/world/generate";
import { overall } from "../src/engine/core/ratings";
import { validateDataset } from "../src/data/importer";
import type { Position, StaffRole } from "../src/engine/core/types";
import type { DatasetInput } from "../src/data/schema";

interface WPlayer { name: string; nat: string; positions: Position[]; dob: string | null; height: number | null; hasArticle: boolean }
interface WClub { name: string; tier: 1 | 2; city: string; stadium: string; capacity: number; base: number; founded: number | null; players: WPlayer[] }

const [cyFile, inFile, outFile] = process.argv.slice(2);
const cy = JSON.parse(readFileSync(cyFile, "utf8")) as { clubs: WClub[] };
const ds = JSON.parse(readFileSync(inFile, "utf8")) as DatasetInput;
const rng = new Rng(357);
const START = ds.meta.startDate;
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase().slice(0, 40) || "x";
const nationId = (name: string): string => {
  const id = `n_${slug(name)}`;
  if (!ds.nations.some((n) => n.id === id)) ds.nations.push({ id, name, code: name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X"), continent: "Europe", reputation: 45, youthRating: 9, namePool: "anglic" });
  return id;
};
const CY = nationId("Cyprus");
const cyNation = ds.nations.find((n) => n.id === CY)!;
Object.assign(cyNation, { continent: "Europe", reputation: 60, youthRating: 9, namePool: "hellenic" });

// remove an earlier Cyprus merge so the script can be re-run
const old = new Set(ds.clubs.filter((c) => c.id.startsWith("club_cy_")).map((c) => c.id));
ds.clubs = ds.clubs.filter((c) => !old.has(c.id));
ds.players = ds.players.filter((p) => !p.id.startsWith("wp_"));
ds.staff = (ds.staff ?? []).filter((s) => !(s.clubId && old.has(s.clubId)) && !s.id.startsWith("st_cy_"));
ds.stadiums = ds.stadiums.filter((s) => !s.id.startsWith("std_cy_"));
ds.competitions = ds.competitions.filter((c) => !["l_zyp1", "l_zyp2", "cup_zyp"].includes(c.id));

const COLORS: Record<string, [string, string]> = {
  APOEL: ["#f7d417", "#0b3d91"], "Omonia Nicosia": ["#00843d", "#ffffff"], "Anorthosis Famagusta": ["#1b4ea3", "#ffffff"], "AEK Larnaca": ["#f2c300", "#00843d"],
  "Apollon Limassol": ["#1d5fbf", "#ffffff"], "AEL Limassol": ["#f2c300", "#0b3d91"],
};
const PALETTE = ["#c8102e", "#0a2e8a", "#111111", "#f2c300", "#00843d", "#6cace4", "#7a263a", "#ff6a13", "#5b2c83", "#00a3ad"];

dataset();
function dataset() {
  ds.competitions.push(
    { id: "l_zyp1", name: "Cypriot First Division", shortName: "ZYP1", type: "league", nationId: CY, tier: 1, reputation: 60,
      league: { rounds: 2, points: { win: 3, draw: 1, loss: 0 }, tiebreakers: ["points", "head_to_head_points", "head_to_head_goal_difference", "goal_difference", "goals_for"], promotion: null, relegation: { toCompetitionId: "l_zyp2", places: 3 }, qualification: [{ competitionId: "c_ucl", fromPosition: 1, toPosition: 1 }], prizeMoneyTop: 3_000_000, tvMoneyPerClub: 2_000_000 },
      cup: null, matchday: { substitutes: 5, benchSize: 9 }, yellowCardBanThreshold: 4, preferredWeekday: 6 },
    { id: "l_zyp2", name: "Cypriot Second Division", shortName: "ZYP2", type: "league", nationId: CY, tier: 2, reputation: 40,
      league: { rounds: 2, points: { win: 3, draw: 1, loss: 0 }, tiebreakers: ["points", "head_to_head_points", "head_to_head_goal_difference", "goal_difference", "goals_for"], promotion: { toCompetitionId: "l_zyp1", places: 3 }, relegation: null, qualification: [], prizeMoneyTop: 400_000, tvMoneyPerClub: 250_000 },
      cup: null, matchday: { substitutes: 5, benchSize: 9 }, yellowCardBanThreshold: 4, preferredWeekday: 6 },
    { id: "cup_zyp", name: "Cypriot Cup", shortName: "CY Cup", type: "cup", nationId: CY, tier: 1, reputation: 50, league: null,
      cup: { entrantLeagueIds: ["l_zyp1", "l_zyp2"], groupStage: null, rounds: [{ name: "First round", legs: 1 }, { name: "Round of 16", legs: 1 }, { name: "Quarter-final", legs: 1 }, { name: "Semi-final", legs: 2 }, { name: "Final", legs: 1 }], extraTime: true, penalties: true, awayGoals: false, homeAdvantageToLowerTier: true, prizeMoneyWinner: 800_000, bracketSize: 32 },
      matchday: { substitutes: 5, benchSize: 9 }, yellowCardBanThreshold: 3, preferredWeekday: 3 },
  );
  const existingByIdentity = new Map(ds.players.map((p) => [`${p.firstName} ${p.lastName}`.toLowerCase().trim() + "|" + p.dob, p]));
  let moved = 0, created = 0, generated = 0;
  for (const c of cy.clubs) {
    const id = `club_cy_${slug(c.name)}`;
    const stadiumName = c.stadium.split(/\s*[(,]/)[0].replace(/"/g, "").trim() || `${c.name} Ground`;
    const stadiumId = `std_cy_${slug(stadiumName)}`;
    if (!ds.stadiums.some((s) => s.id === stadiumId)) ds.stadiums.push({ id: stadiumId, name: stadiumName, city: c.city.split(",")[0], capacity: Math.max(500, c.capacity || 1500), seatedRatio: 1, pitchQuality: c.tier === 1 ? 72 : 60, lighting: c.tier === 1 ? 4 : 2, facilities: c.tier === 1 ? 3 : 2, hospitality: c.base >= 68 ? 3 : 2, vipBoxes: c.base >= 68 ? 12 : 2 });
    const rep = Math.round(c.tier === 1 ? 30 + (c.base - 58) * 2.2 : 18 + (c.base - 48) * 1.5);
    const h = hashString(c.name);
    const [primary, secondary] = COLORS[c.name] ?? [PALETTE[h % PALETTE.length], "#ffffff"];
    const leagueId = c.tier === 1 ? "l_zyp1" : "l_zyp2";
    const fac = Math.max(3, Math.min(14, Math.round(rep / 5)));
    ds.clubs.push({ id, name: c.name, shortName: c.name.replace(/ (FC|Nicosia|Limassol)$/, "").slice(0, 22), code: c.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase(), nationId: CY, leagueId, reputation: rep, founded: c.founded,
      colors: { primary, secondary }, stadiumId, facilities: { training: fac, youth: fac, youthRecruitment: fac, medical: fac },
      finance: { balance: Math.round(rep * rep * 2500 / 100_000) * 100_000, transferBudget: Math.round(rep * rep * 700 / 100_000) * 100_000, wageBudget: 0, debt: 0, ticketPrice: c.tier === 1 ? 15 + Math.round(rep / 5) : 8 },
      strategy: (rep >= 55 ? "continental_challenger" : c.tier === 2 ? "financially_constrained" : "mid_table") as never });
    let wages = 0;
    const roster = c.players.length ? c.players : [];
    for (const wp of roster) {
      const parts = wp.name.replace(/\s+\(.*\)$/, "").split(/\s+/);
      const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
      const lastName = parts[parts.length - 1];
      const key = `${firstName} ${lastName}`.toLowerCase().trim() + "|" + wp.dob;
      const existing = wp.dob ? existingByIdentity.get(key) : undefined;
      if (existing) { // already in the base database (e.g. on loan from a bigger club): move him
        existing.clubId = id;
        moved++;
        wages += existing.contract?.wage ?? 0;
        continue;
      }
      const pos = (wp.positions[0] ?? "CM") as Position;
      const age = wp.dob ? Number(START.slice(0, 4)) - Number(wp.dob.slice(0, 4)) : 18 + (hashString(wp.name) % 15);
      const ageAdj = age < 19 ? -9 : age < 21 ? -5 : age < 23 ? -2 : age > 33 ? -4 : age > 30 ? -1 : 0;
      const noise = ((hashString(wp.name + c.name) % 9) - 4);
      const ovr = Math.max(38, Math.min(82, c.base + ageAdj + noise + (wp.hasArticle ? 2 : -2)));
      const pot = age <= 21 ? ovr + 4 + (hashString(wp.name) % 10) : age <= 24 ? ovr + (hashString(wp.name) % 4) : ovr;
      const dob = wp.dob ?? randomDob(rng, START, age);
      const nat = nationId(wp.nat || "Cyprus");
      const g = generatePlayer(rng, { id: `wp_${slug(wp.name)}_${slug(c.name).slice(0, 8)}`, nationId: nat, namePool: "hellenic", position: pos, overall: ovr, potential: pot, dob, clubId: id, generated: false });
      const real = overall(g);
      const wage = Math.max(300, Math.round((250 * Math.pow(1.09, real - 40) * (0.6 + rep / 120)) / 50) * 50);
      wages += wage;
      ds.players.push({ id: g.id, firstName, lastName, dob, nationId: nat, clubId: id, position: pos, altPositions: [...new Set(wp.positions.slice(1))].filter((x) => x !== pos).slice(0, 2) as Position[],
        foot: g.foot, heightCm: wp.height && wp.height > 150 && wp.height < 215 ? wp.height : g.heightCm, attributes: g.attributes, potential: Math.max(pot, real), personality: generatePersonality(rng),
        contract: { wage, endDate: `${2027 + (hashString(wp.name) % 3)}-06-30`, releaseClause: null } });
      created++;
    }
    // clubs without a published squad: clearly generated players (flagged by the career builder: fewer than 18 imported)
    if (!roster.length) generated++;
    const club = ds.clubs[ds.clubs.length - 1];
    club.finance.wageBudget = Math.round((Math.max(wages, 20_000) * 1.1) / 1000) * 1000;
    const roles: StaffRole[] = ["manager", "assistant", "goalkeeping_coach", "fitness_coach", "youth_coach", "scout", "physio"];
    for (const role of roles) {
      const q = Math.round(5 + rep / 8 + rng.normal(0, 1.5));
      const s = generateStaff(rng, { id: `st_cy_${slug(c.name)}_${role}`, nationId: CY, namePool: "hellenic", role, quality: q, today: START, clubId: id });
      ds.staff!.push({ ...s, contract: { wage: Math.round((200 + q * q * (role === "manager" ? 60 : 15)) / 50) * 50, endDate: "2028-06-30" } });
    }
  }
  ds.meta.version = `${ds.meta.version}+cy-wikipedia`;
  ds.meta.name = "Real world 2026 + Cyprus";
  ds.meta.coverageNote += " CYPRUS: First Division (14 clubs) and Second Division (16 clubs) 2026/27 from English Wikipedia (CC BY-SA 4.0): clubs, stadiums, squads, nationalities, positions, birth dates where available. Cypriot player ratings are estimated from club level and age; 3 Second Division clubs had no published squad and use generated players.";
  const { report } = validateDataset(ds);
  if (!report.ok) {
    console.error(report.errors.slice(0, 15));
    process.exit(1);
  }
  writeFileSync(outFile, JSON.stringify(ds));
  console.log({ moved, created, clubsWithoutSquad: generated, warnings: report.warnings.length, counts: report.counts });
}
