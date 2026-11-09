/**
 * Generates the FICTIONAL development dataset (public/data/dev-world.json).
 *
 * Every nation, club, stadium, person and company in this file is invented.
 * It exists so the complete game can be played and tested without licensed
 * real-world data. It is labelled `isReal: false` and the UI shows this.
 *
 *   npm run data:dev
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { Rng } from "../src/engine/core/rng";
import { generatePlayer, generateStaff, randomDob } from "../src/engine/world/generate";
import { overall } from "../src/engine/core/ratings";
import type { Position, StaffRole } from "../src/engine/core/types";
import { validateDataset } from "../src/data/importer";
import type { DatasetInput } from "../src/data/schema";

const rng = new Rng(20260701);
const START = "2026-07-01";

interface NationSeed { id: string; name: string; code: string; pool: string; rep: number; youth: number; cities: string[]; prefixes: string[]; suffixes: string[]; leagueNames: [string, string]; cupName: string; tiebreakers: string[] }

const NATIONS: NationSeed[] = [
  {
    id: "n_alb", name: "Albion", code: "ALB", pool: "anglic", rep: 84, youth: 14,
    cities: ["Ashbury", "Bramford", "Carrowmere", "Dunhollow", "Eastmarsh", "Fenmouth", "Gallowmere", "Holmbridge", "Ironcastle", "Kingsreach", "Larkmoor", "Millhaven", "Northwold", "Oakhurst", "Porthaven", "Queensgate", "Ravensmoor", "Stonebridge", "Thornwick", "Westerleigh", "Wolverby", "Yarrowdale", "Blackmere", "Coldharbour", "Redcastle", "Silverton", "Highmoor", "Lowbridge", "Marshfield", "Elmstead", "Foxbury", "Greystone"],
    prefixes: [], suffixes: ["FC", "United", "Athletic", "City", "Rovers", "Town", "Wanderers", "Albion"],
    leagueNames: ["Albion Premier Division", "Albion Championship"], cupName: "Albion Association Cup", tiebreakers: ["points", "goal_difference", "goals_for"],
  },
  {
    id: "n_cas", name: "Castellia", code: "CAS", pool: "iberic", rep: 82, youth: 15,
    cities: ["Aldoria", "Benaval", "Calvera", "Duraneja", "Escoral", "Fuentecilla", "Galvera", "Hontoria", "Illescar", "Lorvedo", "Montejaral", "Navalcruz", "Orvieda", "Puertomar", "Quintanal", "Riberas", "Sotomar", "Torrelaba", "Urdaleta", "Valdemora", "Zarandilla", "Almenar", "Brezales", "Cantorra", "Doñaval", "Estrellar", "Fontalba", "Guadamar", "Hinojal", "Lebrana", "Mirabal", "Peñascal"],
    prefixes: ["Real", "Atlético", "CD", "UD", "SD", "Racing", "Deportivo", "CF"], suffixes: [],
    leagueNames: ["Castellia Primera", "Castellia Segunda"], cupName: "Copa de Castellia", tiebreakers: ["points", "head_to_head_points", "head_to_head_goal_difference", "goal_difference", "goals_for"],
  },
  {
    id: "n_ves", name: "Vesteria", code: "VES", pool: "germanic", rep: 79, youth: 14,
    cities: ["Altenmark", "Brückstadt", "Dornfeld", "Eichenburg", "Falkenau", "Grünhall", "Hohenfurt", "Isenbrück", "Kaltenbach", "Lindenhof", "Mittelheim", "Nordhafen", "Oberwald", "Rabenstein", "Steinhafen", "Talburg", "Ulmenhof", "Wolfsried", "Adlerberg", "Bergenhall", "Dunkelsee", "Eisental", "Feldmark", "Goldbach", "Hirschau", "Kronfeld", "Lauterhall", "Morgenthal", "Neuwarden", "Ostermoor", "Rosenkamp", "Sonnfeld"],
    prefixes: ["FC", "SV", "SC", "TSV", "VfR", "SpVgg"], suffixes: [],
    leagueNames: ["Vesteria Bundesliga", "Vesteria Zweite Liga"], cupName: "Vesterian Pokal", tiebreakers: ["points", "goal_difference", "goals_for", "head_to_head_points"],
  },
  {
    id: "n_val", name: "Valdoria", code: "VAL", pool: "italic", rep: 78, youth: 13,
    cities: ["Albarone", "Belvento", "Castelmora", "Dorsano", "Ferravalle", "Gallinaro", "Lucentia", "Montevera", "Novacchio", "Orsanto", "Portomare", "Roccaverde", "Sanmarzo", "Torrebianca", "Valdastro", "Ventimonte", "Aquilara", "Borgoleone", "Campofiore", "Fiumerosso", "Lagodoro", "Marnetto", "Pietramora", "Rivolenta", "Serravento", "Terrafina", "Vallerossa", "Zafferano", "Collemare", "Ostrella", "Santelmo", "Belcolle"],
    prefixes: ["AC", "US", "SS", "AS"], suffixes: ["Calcio"],
    leagueNames: ["Valdoria Serie Prima", "Valdoria Serie Seconda"], cupName: "Coppa di Valdoria", tiebreakers: ["points", "head_to_head_points", "head_to_head_goal_difference", "goal_difference", "goals_for"],
  },
];
const EXTRA_NATIONS = [
  { id: "n_nor", name: "Nordmark", code: "NMK", pool: "nordic", rep: 62, youth: 12 },
  { id: "n_gal", name: "Gallora", code: "GLR", pool: "franco", rep: 80, youth: 16 },
  { id: "n_lus", name: "Lusitara", code: "LST", pool: "lusitan", rep: 74, youth: 15 },
  { id: "n_sla", name: "Slavonia", code: "SLV", pool: "slavic", rep: 66, youth: 13 },
];

const COLORS = ["#c8102e", "#0a2e8a", "#ffffff", "#111111", "#f2c300", "#00843d", "#6cace4", "#7a263a", "#ff6a13", "#5b2c83", "#00a3ad", "#8b0000", "#1d428a", "#e4002b", "#2e7d32", "#9e9e9e"];
const SQUAD_TEMPLATE: Position[] = ["GK", "GK", "GK", "LB", "LB", "RB", "RB", "CB", "CB", "CB", "CB", "DM", "DM", "CM", "CM", "CM", "AM", "LM", "RM", "LW", "RW", "ST", "ST", "ST", "CM", "CB"];
const STAFF_ROLES: StaffRole[] = ["manager", "assistant", "attacking_coach", "defensive_coach", "goalkeeping_coach", "fitness_coach", "youth_coach", "scout", "physio"];

const dataset: DatasetInput = {
  format: "touchline-dataset",
  formatVersion: 1,
  meta: {
    id: "dev-world-fictional",
    name: "Development World (fictional)",
    version: "1.0.0",
    season: "2026/27",
    startDate: START,
    isReal: false,
    license: "CC0 – entirely fictional development data generated by scripts/generate-dev-dataset.ts",
    source: "Procedurally generated. No real clubs, players, staff, stadiums or companies.",
    coverageNote: "FICTIONAL test world: 4 invented nations, 8 leagues, 4 domestic cups and 1 continental cup. Import a licensed dataset to play with real-world data.",
  },
  nations: [],
  competitions: [],
  stadiums: [],
  clubs: [],
  players: [],
  staff: [],
  sponsors: [],
  initialQualifiers: {},
};

let pid = 0;
let sid = 0;
const continentalId = "c_ccc";
const qualifiers: string[] = [];

for (const n of NATIONS) dataset.nations.push({ id: n.id, name: n.name, code: n.code, continent: "Fictional Continent", reputation: n.rep, youthRating: n.youth, namePool: n.pool });
for (const n of EXTRA_NATIONS) dataset.nations.push({ id: n.id, name: n.name, code: n.code, continent: "Fictional Continent", reputation: n.rep, youthRating: n.youth, namePool: n.pool });
const allNations = [...NATIONS.map((n) => ({ id: n.id, pool: n.pool })), ...EXTRA_NATIONS.map((n) => ({ id: n.id, pool: n.pool }))];

for (const n of NATIONS) {
  const top = `l_${n.code.toLowerCase()}1`;
  const second = `l_${n.code.toLowerCase()}2`;
  const cup = `cup_${n.code.toLowerCase()}`;
  dataset.competitions.push(
    {
      id: top, name: n.leagueNames[0], shortName: `${n.code} 1`, type: "league", nationId: n.id, tier: 1, reputation: n.rep,
      league: { rounds: 2, points: { win: 3, draw: 1, loss: 0 }, tiebreakers: n.tiebreakers as never, promotion: null, relegation: { toCompetitionId: second, places: 3 }, qualification: [{ competitionId: continentalId, fromPosition: 1, toPosition: 4 }], prizeMoneyTop: 30_000_000, tvMoneyPerClub: 40_000_000 },
      cup: null, matchday: { substitutes: 5, benchSize: 9 }, yellowCardBanThreshold: 5, preferredWeekday: 6,
    },
    {
      id: second, name: n.leagueNames[1], shortName: `${n.code} 2`, type: "league", nationId: n.id, tier: 2, reputation: n.rep - 25,
      league: { rounds: 2, points: { win: 3, draw: 1, loss: 0 }, tiebreakers: n.tiebreakers as never, promotion: { toCompetitionId: top, places: 3 }, relegation: null, qualification: [], prizeMoneyTop: 4_000_000, tvMoneyPerClub: 6_000_000 },
      cup: null, matchday: { substitutes: 5, benchSize: 9 }, yellowCardBanThreshold: 5, preferredWeekday: 6,
    },
    {
      id: cup, name: n.cupName, shortName: `${n.code} Cup`, type: "cup", nationId: n.id, tier: 1, reputation: n.rep - 10, league: null,
      cup: { entrantLeagueIds: [top, second], groupStage: null, rounds: [{ name: "Round of 32", legs: 1 }, { name: "Round of 16", legs: 1 }, { name: "Quarter-final", legs: 1 }, { name: "Semi-final", legs: 2 }, { name: "Final", legs: 1 }], extraTime: true, penalties: true, awayGoals: false, homeAdvantageToLowerTier: true, prizeMoneyWinner: 5_000_000, bracketSize: 32 },
      matchday: { substitutes: 5, benchSize: 9 }, yellowCardBanThreshold: 3, preferredWeekday: 3,
    },
  );
  const cities = rng.shuffle(n.cities.slice());
  for (let i = 0; i < 32; i++) {
    const tier = i < 16 ? 1 : 2;
    const leagueId = tier === 1 ? top : second;
    const city = cities[i];
    const nameStr = n.prefixes.length ? `${rng.pick(n.prefixes)} ${city}` : `${city} ${rng.pick(n.suffixes)}`;
    // reputation curve: a few giants, a long tail
    const rank = i % 16;
    const rep = tier === 1 ? Math.round(86 - rank * 2.2 - rng.range(0, 3)) : Math.round(56 - rank * 1.2 - rng.range(0, 3));
    const clubId = `club_${n.code.toLowerCase()}_${String(i + 1).padStart(2, "0")}`;
    const stadiumId = `std_${n.code.toLowerCase()}_${String(i + 1).padStart(2, "0")}`;
    const capacity = Math.round((tier === 1 ? 14_000 + Math.pow(rep - 50, 1.9) * 55 : 5_000 + (rep - 30) * 500) / 100) * 100;
    dataset.stadiums.push({ id: stadiumId, name: `${city} ${rng.pick(["Park", "Stadium", "Arena", "Ground", "Road", "Field"])}`, city, capacity, seatedRatio: tier === 1 ? 1 : 0.8, pitchQuality: 60 + Math.round(rep / 4), lighting: tier === 1 ? 4 : 3, facilities: tier === 1 ? 4 : 2, hospitality: tier === 1 ? 3 + (rep > 75 ? 1 : 0) : 2, vipBoxes: tier === 1 ? Math.round(rep / 2) : 4 });
    const primary = rng.pick(COLORS);
    let secondary = rng.pick(COLORS);
    if (secondary === primary) secondary = primary === "#ffffff" ? "#111111" : "#ffffff";
    const fac = Math.max(1, Math.min(20, Math.round(rep / 5 + rng.normal(0, 1.5))));
    const balance = Math.round((Math.pow(rep, 2.6) * 12) / 100_000) * 100_000;
    const strategy = rep >= 80 ? "title_contender" : rep >= 72 ? "continental_challenger" : tier === 2 && rank < 4 ? "mid_table" : rep < 45 ? "financially_constrained" : rng.chance(0.15) ? "youth_development" : rank > 11 && tier === 1 ? "relegation_battler" : "mid_table";
    const club = {
      id: clubId, name: nameStr, shortName: city, code: city.slice(0, 3).toUpperCase(), nationId: n.id, leagueId, reputation: rep, founded: rng.int(1870, 1965),
      colors: { primary, secondary }, stadiumId, facilities: { training: fac, youth: Math.max(1, Math.min(20, fac + rng.int(-2, 2))), youthRecruitment: Math.max(1, Math.min(20, fac + rng.int(-3, 2))), medical: fac },
      finance: { balance, transferBudget: Math.round(balance * 0.45 / 100_000) * 100_000, wageBudget: 0, debt: rng.chance(0.3) ? Math.round(balance * rng.range(0.1, 0.6) / 100_000) * 100_000 : 0, ticketPrice: tier === 1 ? 25 + Math.round(rep / 3) : 15 + Math.round(rep / 6) },
      strategy: strategy as never,
    };
    if (tier === 1 && rank < 4) qualifiers.push(clubId);
    // squad
    const avg = 42 + rep * 0.36;
    let wages = 0;
    SQUAD_TEMPLATE.forEach((pos, k) => {
      const isStarter = k < 22 && ![1, 2].includes(k);
      const age = k >= 22 ? rng.int(17, 20) : rng.int(19, 34);
      let ovr = Math.round(avg + (isStarter ? rng.normal(1, 3.5) : rng.normal(-5, 3)));
      if (age <= 20) ovr = Math.round(avg - 12 + rng.normal(0, 4));
      if (age >= 32) ovr -= rng.int(0, 3);
      ovr = Math.max(35, Math.min(90, ovr));
      const pot = age <= 21 ? Math.min(94, ovr + rng.int(5, 22)) : age <= 25 ? ovr + rng.int(0, 7) : ovr;
      const nat = rng.chance(0.72) ? { id: n.id, pool: n.pool } : rng.pick(allNations);
      const p = generatePlayer(rng, { id: `pl_${++pid}`, nationId: nat.id, namePool: nat.pool, position: pos, overall: ovr, potential: pot, dob: randomDob(rng, START, age), clubId, generated: false });
      const real = overall(p);
      const wage = Math.max(500, Math.round((400 * Math.pow(1.095, real - 40) * (0.6 + rep / 120)) / 50) * 50);
      wages += wage;
      dataset.players.push({
        id: p.id, firstName: p.firstName, lastName: p.lastName, dob: p.dob, nationId: p.nationId, clubId, position: p.position, altPositions: p.altPositions, foot: p.foot,
        heightCm: p.heightCm, attributes: p.attributes, potential: Math.max(p.potential, real), personality: p.personality,
        contract: { wage, endDate: `${rng.int(2027, 2031)}-06-30`, releaseClause: n.code === "CAS" ? Math.round(wage * 52 * rng.int(8, 20) / 100_000) * 100_000 : null },
      });
    });
    club.finance.wageBudget = Math.round((wages * 1.12) / 1000) * 1000;
    dataset.clubs.push(club);
    for (const role of STAFF_ROLES) {
      const q = Math.round(4 + rep / 7 + rng.normal(0, 1.5));
      const s = generateStaff(rng, { id: `st_${++sid}`, nationId: n.id, namePool: n.pool, role, quality: q, today: START, clubId });
      dataset.staff!.push({ ...s, contract: { wage: Math.round((300 + q * q * (role === "manager" ? 120 : 30)) / 50) * 50, endDate: `${rng.int(2027, 2029)}-06-30` } });
    }
  }
}

// continental competition
dataset.competitions.push({
  id: continentalId, name: "Continental Champions Cup", shortName: "CCC", type: "continental", nationId: null, tier: 1, reputation: 90, league: null,
  cup: { entrantLeagueIds: [], groupStage: { groups: 4, teamsPerGroup: 4, rounds: 2, advancePerGroup: 2 }, rounds: [{ name: "Quarter-final", legs: 2 }, { name: "Semi-final", legs: 2 }, { name: "Final", legs: 1 }], extraTime: true, penalties: true, awayGoals: false, homeAdvantageToLowerTier: false, prizeMoneyWinner: 25_000_000, bracketSize: 16 },
  matchday: { substitutes: 5, benchSize: 12 }, yellowCardBanThreshold: 3, preferredWeekday: 2,
});
dataset.initialQualifiers = { [continentalId]: qualifiers };

// free agents & unattached staff
for (let i = 0; i < 140; i++) {
  const nat = rng.pick(allNations);
  const pos = rng.pick(SQUAD_TEMPLATE);
  const age = rng.int(19, 34);
  const ovr = Math.round(rng.normal(58, 7));
  const p = generatePlayer(rng, { id: `pl_${++pid}`, nationId: nat.id, namePool: nat.pool, position: pos, overall: ovr, potential: age < 23 ? ovr + rng.int(2, 12) : ovr, dob: randomDob(rng, START, age), clubId: null, generated: false });
  dataset.players.push({ id: p.id, firstName: p.firstName, lastName: p.lastName, dob: p.dob, nationId: p.nationId, clubId: null, position: p.position, altPositions: p.altPositions, foot: p.foot, heightCm: p.heightCm, attributes: p.attributes, potential: Math.max(p.potential, overall(p)), personality: p.personality, contract: null });
}
const POOL_ROLES: StaffRole[] = ["manager", "manager", "manager", "assistant", "attacking_coach", "defensive_coach", "goalkeeping_coach", "fitness_coach", "youth_coach", "set_piece_coach", "scout", "scout", "head_of_recruitment", "physio"];
for (let i = 0; i < 90; i++) {
  const nat = rng.pick(allNations);
  const s = generateStaff(rng, { id: `st_${++sid}`, nationId: nat.id, namePool: nat.pool, role: POOL_ROLES[i % POOL_ROLES.length], quality: rng.int(6, 17), today: START, clubId: null });
  dataset.staff!.push({ ...s, contract: null });
}

const INDUSTRIES = ["Telecom", "Airline", "Bank", "Insurance", "Energy", "Automotive", "Betting-free Gaming", "Electronics", "Beverages", "Logistics", "Software", "Sportswear", "Retail", "Tourism", "Construction"];
const SPONSOR_WORDS = ["Nova", "Vertex", "Halcyon", "Orbis", "Zephyr", "Lumen", "Aurelia", "Kestrel", "Meridian", "Solace", "Quanta", "Brightwave", "Northstar", "Ironbark", "Bluepeak", "Cobalt", "Emberline", "Fjordway", "Granite", "Helix", "Juniper", "Kinetic", "Larkspur", "Monarch", "Nimbus", "Obsidian", "Pinnacle", "Redwood", "Saffron", "Tidewater", "Umbra", "Vanguard", "Willow", "Yellowstone Labs", "Zenith", "Arcadia", "Boreal", "Cascade", "Delta Forge", "Elevate"];
SPONSOR_WORDS.forEach((w, i) => {
  const ind = INDUSTRIES[i % INDUSTRIES.length];
  dataset.sponsors!.push({ id: `sp_${i + 1}`, name: `${w} ${ind === "Sportswear" ? "Athletics" : ind === "Bank" ? "Bank" : ind === "Airline" ? "Air" : ind === "Telecom" ? "Mobile" : "Group"}`, industry: ind, wealth: Math.max(4, Math.min(20, 6 + Math.round(rng.normal(5, 4)))), minReputation: rng.int(20, 80) });
});

const { report } = validateDataset(dataset);
if (!report.ok) {
  console.error(JSON.stringify(report.errors.slice(0, 20), null, 2));
  process.exit(1);
}
const out = path.resolve(__dirname, "../public/data/dev-world.json");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(dataset));
console.log(`Wrote ${out}`);
console.log(report.counts, `warnings: ${report.warnings.length}`);
