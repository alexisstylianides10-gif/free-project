/**
 * Converts the open "transfermarkt-datasets" CSV export (github.com/dcaribou/transfermarkt-datasets,
 * snapshot up to 6 July 2026) into a touchline-dataset package.
 *
 *   npx tsx scripts/import-transfermarkt-datasets.ts <dir with competitions.csv clubs.csv players.csv countries.csv> [out.json]
 *
 * REAL fields: clubs, leagues, league membership (2025/26), stadium names & seats, player names, dates of
 * birth, nationalities, positions, preferred foot, height, contract expiry dates, market values, coaches.
 * ESTIMATED / GENERATED fields (clearly not real): player attributes & potential (derived from market value,
 * age and position), personalities, wages, club finances & reputations, club colours, non-head-coach staff,
 * sponsors, facilities, cup/continental formats.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseCSV } from "../src/data/importer";
import { validateDataset } from "../src/data/importer";
import { Rng, hashString } from "../src/engine/core/rng";
import { generatePlayer, generateStaff, generatePersonality } from "../src/engine/world/generate";
import { overall } from "../src/engine/core/ratings";
import type { Position, StaffRole } from "../src/engine/core/types";
import type { DatasetInput } from "../src/data/schema";

const dir = process.argv[2];
const out = process.argv[3] ?? path.resolve(__dirname, "../public/data/real-world-2026.json");
if (!dir) throw new Error("usage: import-transfermarkt-datasets.ts <csv dir> [out.json]");
const read = (f: string) => parseCSV(readFileSync(path.join(dir, f), "utf8"));
const rng = new Rng(20260706);
const START = "2026-07-01";

const comps = read("competitions.csv").filter((c) => c.type === "domestic_league" && c.sub_type === "first_tier");
const clubsRaw = read("clubs.csv").filter((c) => ["2025", "2026"].includes(c.last_season) && comps.some((x) => x.competition_id === c.domestic_competition_id));
const clubIds = new Set(clubsRaw.map((c) => c.club_id));
const playersRaw = read("players.csv").filter((p) => clubIds.has(p.current_club_id) && ["2025", "2026"].includes(p.last_season));

const POOL: Record<string, string> = {};
for (const n of ["England", "Scotland", "Wales", "Northern Ireland", "Ireland", "United States", "Australia", "Canada", "Jamaica", "New Zealand", "Nigeria", "Ghana", "South Africa"]) POOL[n] = "anglic";
for (const n of ["Spain", "Argentina", "Mexico", "Colombia", "Uruguay", "Chile", "Paraguay", "Peru", "Ecuador", "Venezuela", "Bolivia", "Costa Rica", "Honduras"]) POOL[n] = "iberic";
for (const n of ["Portugal", "Brazil", "Angola", "Cape Verde", "Mozambique"]) POOL[n] = "lusitan";
for (const n of ["Italy"]) POOL[n] = "italic";
for (const n of ["Germany", "Austria", "Switzerland", "Netherlands", "Belgium"]) POOL[n] = "germanic";
for (const n of ["France", "Senegal", "Ivory Coast", "Cote d'Ivoire", "Cameroon", "Mali", "Morocco", "Algeria", "Tunisia", "DR Congo", "Guinea"]) POOL[n] = "franco";
for (const n of ["Denmark", "Norway", "Sweden", "Finland", "Iceland"]) POOL[n] = "nordic";
for (const n of ["Poland", "Croatia", "Serbia", "Czech Republic", "Slovakia", "Slovenia", "Ukraine", "Russia", "Bosnia-Herzegovina", "Montenegro", "North Macedonia", "Bulgaria", "Romania", "Greece", "Türkiye", "Turkey", "Hungary"]) POOL[n] = "slavic";

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase().slice(0, 40) || "x";
const nations = new Map<string, { id: string; name: string; code: string; continent: string; reputation: number; youthRating: number; namePool: string }>();
const nationId = (name: string, confed = "Other"): string => {
  const n = (name || "Unknown").trim();
  const id = `n_${slug(n)}`;
  if (!nations.has(id)) nations.set(id, { id, name: n, code: n.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X"), continent: confed, reputation: 50, youthRating: 10, namePool: POOL[n] ?? "anglic" });
  return id;
};
const CONFED: Record<string, string> = { europa: "Europe", amerika: "Americas", asien: "Asia", afrika: "Africa" };

// ---------------------------------------------------------------- market value → estimated ability
const MV_TABLE: [number, number][] = [[0, 40], [50_000, 44], [150_000, 49], [300_000, 53], [600_000, 57], [1_000_000, 60], [2_000_000, 64], [4_000_000, 68], [8_000_000, 72], [15_000_000, 75], [30_000_000, 79], [60_000_000, 84], [100_000_000, 88], [180_000_000, 92]];
function abilityFromValue(mv: number, age: number): number {
  let a = MV_TABLE[MV_TABLE.length - 1][1];
  for (let i = 1; i < MV_TABLE.length; i++) {
    const [v1, a1] = MV_TABLE[i];
    if (mv <= v1) {
      const [v0, a0] = MV_TABLE[i - 1];
      const t = (Math.log10(mv + 1) - Math.log10(v0 + 1)) / (Math.log10(v1 + 1) - Math.log10(v0 + 1));
      a = a0 + (a1 - a0) * Math.max(0, Math.min(1, t));
      break;
    }
  }
  if (age < 23) a -= (23 - age) * 1.3; // young players' values include potential
  if (age > 29) a += Math.min(6, (age - 29) * 1.1); // older players' values are depressed by age
  return Math.round(Math.max(38, Math.min(94, a)));
}

const POS: Record<string, Position> = {
  Goalkeeper: "GK", "Centre-Back": "CB", "Left-Back": "LB", "Right-Back": "RB", "Defensive Midfield": "DM", "Central Midfield": "CM", "Attacking Midfield": "AM",
  "Left Midfield": "LM", "Right Midfield": "RM", "Left Winger": "LW", "Right Winger": "RW", "Centre-Forward": "ST", "Second Striker": "ST",
};
const POS_FALLBACK: Record<string, Position> = { Goalkeeper: "GK", Defender: "CB", Midfield: "CM", Attack: "ST" };
const ALT: Partial<Record<Position, Position[]>> = { LB: ["LWB"], RB: ["RWB"], LW: ["LM"], RW: ["RM"], LM: ["LW"], RM: ["RW"], DM: ["CM"], AM: ["CM"], CM: ["DM"] };

const COLORS = ["#c8102e", "#0a2e8a", "#ffffff", "#111111", "#f2c300", "#00843d", "#6cace4", "#7a263a", "#ff6a13", "#5b2c83", "#00a3ad", "#8b0000", "#1d428a", "#e4002b", "#2e7d32"];

const dataset: DatasetInput = {
  format: "touchline-dataset",
  formatVersion: 1,
  meta: {
    id: "tm-open-2026",
    name: "Real world 2026 (Transfermarkt open data)",
    version: "2026.07.06",
    season: "2026/27",
    startDate: START,
    isReal: true,
    license: "Personal use. Derived from the open transfermarkt-datasets project (github.com/dcaribou/transfermarkt-datasets), which is built from Transfermarkt data.",
    source: "transfermarkt-datasets snapshot of 6 July 2026",
    coverageNote: "REAL: clubs, 31 top divisions, stadiums and seats, player names, birth dates, nationalities, positions, contract expiry dates (where known) and market values (as of 6 July 2026). League line-ups are 2025/26. ESTIMATED/GENERATED: player ratings (from market value, age and position), wages, unknown or lapsed contract end dates (spread over 2027-2029), finances, club colours, most staff, sponsors, cup formats. No second divisions are included in the source.",
  },
  nations: [], competitions: [], stadiums: [], clubs: [], players: [], staff: [], sponsors: [], initialQualifiers: {},
};

// ---------------------------------------------------------------- clubs, stadiums
const playersByClub = new Map<string, typeof playersRaw>();
for (const p of playersRaw) {
  const l = playersByClub.get(p.current_club_id) ?? [];
  l.push(p);
  playersByClub.set(p.current_club_id, l);
}
const clubValue = (id: string) => (playersByClub.get(id) ?? []).reduce((s, p) => s + Number(p.market_value_in_eur || 0), 0);
const leagueValue = new Map<string, number>();
for (const c of clubsRaw) leagueValue.set(c.domestic_competition_id, (leagueValue.get(c.domestic_competition_id) ?? 0) + clubValue(c.club_id));
const leagueRep = (id: string) => Math.round(Math.max(35, Math.min(95, 10 + 16 * Math.log10((leagueValue.get(id) ?? 1e8) / 1e6))));

for (const c of comps) {
  const nId = nationId(c.country_name, CONFED[c.confederation] ?? "Other");
  const n = nations.get(nId)!;
  n.reputation = leagueRep(c.competition_id);
  n.youthRating = Math.max(6, Math.min(18, Math.round(n.reputation / 5.5)));
  const members = clubsRaw.filter((x) => x.domestic_competition_id === c.competition_id);
  const size = members.length;
  const prettyName = c.name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").replace(/\bBp\b/, "BP").replace(/\bMx\b/, "MX");
  const lid = `l_${c.competition_id.toLowerCase()}`;
  dataset.competitions.push({
    id: lid, name: `${prettyName} (${c.country_name})`, shortName: c.competition_id, type: "league", nationId: nId, tier: 1, reputation: leagueRep(c.competition_id),
    league: { rounds: size > 20 ? 1 : 2, points: { win: 3, draw: 1, loss: 0 }, tiebreakers: ["points", "goal_difference", "goals_for"], promotion: null, relegation: null, qualification: [], prizeMoneyTop: Math.round((leagueValue.get(c.competition_id) ?? 1e8) * 0.02), tvMoneyPerClub: Math.round(((leagueValue.get(c.competition_id) ?? 1e8) * 0.05) / Math.max(1, size)) },
    cup: null, matchday: { substitutes: 5, benchSize: 9 }, yellowCardBanThreshold: 5, preferredWeekday: 6,
  });
  const rounds = Math.ceil(Math.log2(size));
  const names = ["Final", "Semi-final", "Quarter-final", "Round of 16", "Round of 32", "Round of 64"];
  dataset.competitions.push({
    id: `cup_${c.competition_id.toLowerCase()}`, name: `${c.country_name} Cup`, shortName: `${c.competition_id} Cup`, type: "cup", nationId: nId, tier: 1, reputation: Math.max(30, leagueRep(c.competition_id) - 10), league: null,
    cup: { entrantLeagueIds: [lid], groupStage: null, rounds: Array.from({ length: rounds }, (_, i) => ({ name: names[rounds - 1 - i], legs: 1 as const })), extraTime: true, penalties: true, awayGoals: false, homeAdvantageToLowerTier: false, prizeMoneyWinner: Math.round((leagueValue.get(c.competition_id) ?? 1e8) * 0.003), bracketSize: 2 ** rounds },
    matchday: { substitutes: 5, benchSize: 9 }, yellowCardBanThreshold: 3, preferredWeekday: 3,
  });
  for (const club of members) {
    const value = clubValue(club.club_id);
    const rep = Math.round(Math.max(20, Math.min(96, 15 + 25 * Math.log10(Math.max(value, 1e6) / 1e6))));
    const stadiumId = `std_${club.club_id}`;
    const seats = Number(club.stadium_seats) || Math.round(5000 + rep * 300);
    dataset.stadiums.push({ id: stadiumId, name: club.stadium_name || `${club.name} Stadium`, city: c.country_name, capacity: Math.max(1000, Math.min(150000, seats)), seatedRatio: 1, pitchQuality: 65 + Math.round(rep / 4), lighting: rep > 60 ? 4 : 3, facilities: rep > 75 ? 5 : rep > 55 ? 4 : 3, hospitality: rep > 80 ? 5 : rep > 60 ? 4 : 2, vipBoxes: Math.round(rep / 1.5) });
    const h = hashString(club.name);
    const primary = COLORS[h % COLORS.length];
    let secondary = COLORS[(h >>> 5) % COLORS.length];
    if (secondary === primary) secondary = primary === "#ffffff" ? "#111111" : "#ffffff";
    const fac = Math.max(3, Math.min(20, Math.round(rep / 5)));
    const balance = Math.round((value * 0.12) / 100_000) * 100_000;
    const short = club.name.replace(/\b(FC|AFC|CF|SC|AC|SSC|FK|SK|SV|CD|SD|UD|RC|RCD|CA|AS|SS|US|AJ|OGC|1\.|VfB|VfL|TSG|BV|KRC|KAA|PSV)\b/g, "").replace(/\s+/g, " ").trim() || club.name;
    const strategy = rep >= 85 ? "title_contender" : rep >= 72 ? "continental_challenger" : rep < 40 ? "financially_constrained" : "mid_table";
    dataset.clubs.push({
      id: `club_${club.club_id}`, name: club.name, shortName: short.slice(0, 24), code: short.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X"), nationId: nId, leagueId: lid, reputation: rep, founded: null,
      colors: { primary, secondary }, stadiumId, facilities: { training: fac, youth: fac, youthRecruitment: fac, medical: fac },
      finance: { balance, transferBudget: Math.round((value * 0.1) / 100_000) * 100_000, wageBudget: 0, debt: 0, ticketPrice: 15 + Math.round(rep / 2) },
      strategy: strategy as never,
    });
    if (club.coach_name) {
      const parts = club.coach_name.trim().split(/\s+/);
      const s = generateStaff(rng, { id: `st_coach_${club.club_id}`, nationId: nId, namePool: n.namePool, role: "manager", quality: Math.round(6 + rep / 8), today: START, clubId: `club_${club.club_id}` });
      dataset.staff!.push({ ...s, firstName: parts.length > 1 ? parts.slice(0, -1).join(" ") : "", lastName: parts[parts.length - 1], contract: { wage: Math.round(rep * rep * 6), endDate: "2028-06-30" } });
    }
  }
}

// ---------------------------------------------------------------- players
const seenPeople = new Set<string>();
for (const p of playersRaw) {
  const dob = (p.date_of_birth || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) continue;
  const key = `${p.name}|${dob}`;
  if (seenPeople.has(key)) continue;
  seenPeople.add(key);
  const age = 2026 - Number(dob.slice(0, 4));
  const pos = POS[p.sub_position] ?? POS_FALLBACK[p.position] ?? "CM";
  const mv = Number(p.market_value_in_eur || 0);
  const club = dataset.clubs.find((c) => c.id === `club_${p.current_club_id}`)!;
  const ovr = mv > 0 ? abilityFromValue(mv, age) : Math.round(36 + club.reputation * 0.3);
  const pot = age <= 21 ? Math.min(96, ovr + Math.round((22 - age) * 3 + rng.range(2, 8))) : age <= 24 ? ovr + rng.int(0, 5) : ovr;
  const nId = nationId(p.country_of_citizenship || p.country_of_birth);
  const g = generatePlayer(rng, { id: `tm_${p.player_id}`, nationId: nId, namePool: "anglic", position: pos, overall: ovr, potential: pot, dob, clubId: club.id, generated: false });
  const real = overall(g);
  const wage = Math.max(500, Math.round((400 * Math.pow(1.095, real - 40) * (0.6 + club.reputation / 120)) / 50) * 50);
  const exp = (p.contract_expiration_date || "").slice(0, 10);
  dataset.players.push({
    id: g.id, firstName: p.first_name || "", lastName: p.last_name || p.name, dob, nationId: nId, clubId: club.id, position: pos,
    altPositions: (ALT[pos] ?? []).slice(0, p.sub_position === "Second Striker" ? 0 : 1).concat(p.sub_position === "Second Striker" ? ["AM" as Position] : []),
    foot: p.foot === "left" ? "L" : p.foot === "both" ? "B" : "R", heightCm: Math.max(150, Math.min(210, Number(p.height_in_cm) || 180)),
    attributes: g.attributes, potential: Math.max(pot, real), personality: generatePersonality(rng),
    contract: { wage, endDate: /^\d{4}-\d{2}-\d{2}$/.test(exp) && exp >= START ? exp : `${2027 + (hashString(p.player_id) % 3)}-06-30`, releaseClause: null },
  });
}
for (const c of dataset.clubs) {
  const wages = dataset.players.filter((p) => p.clubId === c.id).reduce((s, p) => s + (p.contract?.wage ?? 0), 0);
  c.finance.wageBudget = Math.round((wages * 1.1) / 1000) * 1000;
}

// ---------------------------------------------------------------- staff (generated, except head coaches above)
const ROLES: StaffRole[] = ["manager", "assistant", "attacking_coach", "defensive_coach", "goalkeeping_coach", "fitness_coach", "youth_coach", "scout", "physio"];
let sid = 0;
for (const c of dataset.clubs) {
  const n = nations.get(c.nationId)!;
  for (const role of ROLES) {
    if (role === "manager" && dataset.staff!.some((s) => s.clubId === c.id && s.role === "manager")) continue;
    const q = Math.round(4 + c.reputation / 7 + rng.normal(0, 1.5));
    const s = generateStaff(rng, { id: `st_gen_${++sid}`, nationId: c.nationId, namePool: n.namePool, role, quality: q, today: START, clubId: c.id });
    dataset.staff!.push({ ...s, contract: { wage: Math.round((300 + q * q * (role === "manager" ? 120 : 30)) / 50) * 50, endDate: `${rng.int(2027, 2029)}-06-30` } });
  }
}
for (let i = 0; i < 150; i++) {
  const n = rng.pick([...nations.values()]);
  const s = generateStaff(rng, { id: `st_gen_${++sid}`, nationId: n.id, namePool: n.namePool, role: rng.pick(["manager", "manager", "assistant", "attacking_coach", "defensive_coach", "goalkeeping_coach", "fitness_coach", "youth_coach", "set_piece_coach", "scout", "head_of_recruitment", "physio"] as StaffRole[]), quality: rng.int(6, 17), today: START, clubId: null });
  dataset.staff!.push({ ...s, contract: null });
}

// ---------------------------------------------------------------- continental competition (Europe), 32 clubs
const euroLeagues = dataset.competitions.filter((c) => c.type === "league" && nations.get(c.nationId!)!.continent === "Europe").sort((a, b) => b.reputation - a.reputation);
const quota = (rank: number) => (rank < 4 ? 4 : rank < 6 ? 3 : rank < 10 ? 2 : 1);
const qualifiers: string[] = [];
euroLeagues.forEach((l, rank) => {
  const top = dataset.clubs.filter((c) => c.leagueId === l.id).sort((a, b) => b.reputation - a.reputation).slice(0, quota(rank));
  qualifiers.push(...top.map((c) => c.id));
  l.league!.qualification = [{ competitionId: "c_ucl", fromPosition: 1, toPosition: quota(rank) }];
});
dataset.competitions.push({
  id: "c_ucl", name: "Champions League", shortName: "UCL", type: "continental", nationId: null, tier: 1, reputation: 98, league: null,
  cup: { entrantLeagueIds: [], groupStage: { groups: 8, teamsPerGroup: 4, rounds: 2, advancePerGroup: 2 }, rounds: [{ name: "Round of 16", legs: 2 }, { name: "Quarter-final", legs: 2 }, { name: "Semi-final", legs: 2 }, { name: "Final", legs: 1 }], extraTime: true, penalties: true, awayGoals: false, homeAdvantageToLowerTier: false, prizeMoneyWinner: 80_000_000, bracketSize: 32 },
  matchday: { substitutes: 5, benchSize: 12 }, yellowCardBanThreshold: 3, preferredWeekday: 2,
});
dataset.initialQualifiers = { c_ucl: qualifiers.slice(0, 32) };

// ---------------------------------------------------------------- sponsors (generic, generated)
const WORDS = ["Nova", "Vertex", "Halcyon", "Orbis", "Zephyr", "Lumen", "Aurelia", "Kestrel", "Meridian", "Quanta", "Brightwave", "Northstar", "Bluepeak", "Cobalt", "Helix", "Kinetic", "Monarch", "Nimbus", "Pinnacle", "Zenith", "Arcadia", "Boreal", "Cascade", "Elevate"];
WORDS.forEach((w, i) => dataset.sponsors!.push({ id: `sp_${i + 1}`, name: `${w} ${i % 4 === 0 ? "Athletics" : "Group"}`, industry: i % 4 === 0 ? "Sportswear" : "General", wealth: 6 + (i % 14), minReputation: (i * 7) % 85 }));

dataset.nations = [...nations.values()];
const { report } = validateDataset(dataset);
if (!report.ok) {
  console.error(JSON.stringify(report.errors.slice(0, 20), null, 2));
  process.exit(1);
}
writeFileSync(out, JSON.stringify(dataset));
console.log(`Wrote ${out}`, report.counts, `warnings ${report.warnings.length}`);
