import { ATTRIBUTE_KEYS } from "@/engine/core/types";
import { datasetSchema, type Dataset } from "./schema";

export interface ImportIssue {
  level: "error" | "warning";
  entity: string;
  id?: string;
  path?: string;
  message: string;
}

export interface ImportReport {
  ok: boolean;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  counts: Record<string, number>;
  coverage: { leagues: number; clubsWithFullSquad: number; clubs: number; clubsWithStaff: number; playersWithContracts: number; players: number };
  datasetId?: string;
  datasetName?: string;
}

const MAX_ISSUES = 500;

/** RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((c) => c !== "")) rows.push(row);
  }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const num = (v: string | undefined): number | undefined => (v === undefined || v === "" ? undefined : Number(v));
const nullableNum = (v: string | undefined): number | null => (v === undefined || v === "" ? null : Number(v));
const str = (v: string | undefined): string | undefined => (v === undefined || v === "" ? undefined : v);
const nullableStr = (v: string | undefined): string | null => (v === undefined || v === "" ? null : v);

function csvPlayer(r: Record<string, string>): unknown {
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, num(r[k])]));
  return {
    id: r.id, firstName: r.firstName ?? "", lastName: r.lastName, dob: r.dob, nationId: r.nationId, clubId: nullableStr(r.clubId), position: r.position,
    altPositions: r.altPositions ? r.altPositions.split("|").map((x) => x.trim()).filter(Boolean) : [], foot: str(r.foot), heightCm: num(r.heightCm),
    attributes, potential: num(r.potential),
    contract: r.wage ? { wage: num(r.wage), endDate: r.contractEnd, releaseClause: nullableNum(r.releaseClause) } : null,
  };
}

function csvClub(r: Record<string, string>): unknown {
  return {
    id: r.id, name: r.name, shortName: r.shortName || r.name, code: r.code, nationId: r.nationId, leagueId: nullableStr(r.leagueId), reputation: num(r.reputation),
    founded: nullableNum(r.founded), colors: { primary: r.primaryColor, secondary: r.secondaryColor }, stadiumId: r.stadiumId,
    facilities: { training: num(r.training), youth: num(r.youth), youthRecruitment: num(r.youthRecruitment), medical: num(r.medical) },
    finance: { balance: num(r.balance), transferBudget: num(r.transferBudget), wageBudget: num(r.wageBudget), debt: num(r.debt) ?? 0, ticketPrice: num(r.ticketPrice) ?? 30 },
    strategy: str(r.strategy),
  };
}

function csvStadium(r: Record<string, string>): unknown {
  return { id: r.id, name: r.name, city: r.city ?? "", capacity: num(r.capacity), seatedRatio: num(r.seatedRatio), pitchQuality: num(r.pitchQuality), lighting: num(r.lighting), facilities: num(r.facilities), hospitality: num(r.hospitality), vipBoxes: num(r.vipBoxes) };
}

function csvNation(r: Record<string, string>): unknown {
  return { id: r.id, name: r.name, code: r.code, continent: r.continent, reputation: num(r.reputation), youthRating: num(r.youthRating), namePool: str(r.namePool) };
}

function csvStaff(r: Record<string, string>): unknown {
  const keys = ["coaching", "attacking", "defending", "goalkeeping", "fitness", "youth", "tactical", "setPieces", "judgingAbility", "judgingPotential", "medical", "manManagement"];
  return {
    id: r.id, firstName: r.firstName ?? "", lastName: r.lastName, dob: r.dob, nationId: r.nationId, clubId: nullableStr(r.clubId), role: r.role,
    attributes: Object.fromEntries(keys.map((k) => [k, num(r[k])])), experience: num(r.experience), reputation: num(r.reputation), specialisation: r.specialisation ?? "",
    contract: r.wage ? { wage: num(r.wage), endDate: r.contractEnd } : null, preferredFormation: nullableStr(r.preferredFormation),
  };
}

function csvSponsor(r: Record<string, string>): unknown {
  return { id: r.id, name: r.name, industry: r.industry || "General", wealth: num(r.wealth), minReputation: num(r.minReputation) };
}

/**
 * Build a raw dataset object from uploaded files.
 * Supported: one full JSON package, OR meta.json + competitions.json + CSV files
 * (nations, clubs, stadiums, players, staff, sponsors). When a `base` dataset is
 * supplied the CSV rows upsert into it by id (used for update packages).
 */
export function assembleFromFiles(files: { name: string; text: string }[], base?: unknown): { raw: unknown; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const byName = new Map(files.map((f) => [f.name.toLowerCase().split(/[\\/]/).pop()!, f.text]));
  const fullJson = files.find((f) => f.name.toLowerCase().endsWith(".json") && !["meta.json", "competitions.json", "qualifiers.json"].includes(f.name.toLowerCase().split(/[\\/]/).pop()!));
  if (fullJson && files.filter((f) => f.name.toLowerCase().endsWith(".csv")).length === 0) {
    try {
      return { raw: JSON.parse(fullJson.text), issues };
    } catch (e) {
      issues.push({ level: "error", entity: "file", message: `${fullJson.name}: invalid JSON (${(e as Error).message})` });
      return { raw: null, issues };
    }
  }
  const raw: Record<string, unknown> = base ? JSON.parse(JSON.stringify(base)) : { format: "touchline-dataset", formatVersion: 1, nations: [], competitions: [], stadiums: [], clubs: [], players: [], staff: [], sponsors: [], initialQualifiers: {} };
  const readJson = (n: string): unknown => {
    const t = byName.get(n);
    if (t === undefined) return undefined;
    try {
      return JSON.parse(t);
    } catch (e) {
      issues.push({ level: "error", entity: "file", message: `${n}: invalid JSON (${(e as Error).message})` });
      return undefined;
    }
  };
  const meta = readJson("meta.json");
  if (meta) raw.meta = meta;
  const comps = readJson("competitions.json");
  if (comps) raw.competitions = comps;
  const quals = readJson("qualifiers.json");
  if (quals) raw.initialQualifiers = quals;
  const tables: [string, string, (r: Record<string, string>) => unknown][] = [
    ["nations.csv", "nations", csvNation], ["stadiums.csv", "stadiums", csvStadium], ["clubs.csv", "clubs", csvClub],
    ["players.csv", "players", csvPlayer], ["staff.csv", "staff", csvStaff], ["sponsors.csv", "sponsors", csvSponsor],
  ];
  for (const [file, key, conv] of tables) {
    const t = byName.get(file);
    if (t === undefined) continue;
    const rows = parseCSV(t);
    const existing = (raw[key] as { id: string }[]) ?? [];
    const index = new Map(existing.map((e, i) => [e.id, i]));
    for (const r of rows) {
      const obj = conv(r) as { id: string };
      const at = index.get(obj.id);
      if (at !== undefined) existing[at] = obj;
      else {
        index.set(obj.id, existing.length);
        existing.push(obj);
      }
    }
    raw[key] = existing;
  }
  for (const f of files) {
    const n = f.name.toLowerCase().split(/[\\/]/).pop()!;
    if (!["meta.json", "competitions.json", "qualifiers.json", ...tables.map((t) => t[0])].includes(n)) issues.push({ level: "warning", entity: "file", message: `${f.name}: not a recognised import file and was ignored.` });
  }
  return { raw, issues };
}

/** Validate a raw dataset: schema, duplicates, referential integrity, coverage. */
export function validateDataset(raw: unknown, preIssues: ImportIssue[] = []): { report: ImportReport; dataset: Dataset | null } {
  const errors: ImportIssue[] = preIssues.filter((i) => i.level === "error");
  const warnings: ImportIssue[] = preIssues.filter((i) => i.level === "warning");
  const emptyCoverage = { leagues: 0, clubsWithFullSquad: 0, clubs: 0, clubsWithStaff: 0, playersWithContracts: 0, players: 0 };
  if (raw === null || typeof raw !== "object") {
    errors.push({ level: "error", entity: "dataset", message: "The file does not contain a dataset object." });
    return { report: { ok: false, errors, warnings, counts: {}, coverage: emptyCoverage }, dataset: null };
  }
  const parsed = datasetSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, MAX_ISSUES)) {
      const path = issue.path.join(".");
      const [entity, idx] = issue.path as (string | number)[];
      let entId: string | undefined;
      if (typeof idx === "number") {
        const arr = (raw as Record<string, unknown>)[entity as string];
        if (Array.isArray(arr)) entId = (arr[idx] as { id?: string })?.id;
      }
      errors.push({ level: "error", entity: String(entity ?? "dataset"), id: entId, path, message: issue.code === "invalid_type" && /undefined/.test(issue.message) ? `Missing required field "${String(issue.path[issue.path.length - 1])}"` : issue.message });
    }
    return { report: { ok: false, errors, warnings, counts: {}, coverage: emptyCoverage }, dataset: null };
  }
  const d = parsed.data;
  const dupCheck = (entity: string, list: { id: string }[]) => {
    const seen = new Set<string>();
    for (const e of list) {
      if (seen.has(e.id)) errors.push({ level: "error", entity, id: e.id, message: `Duplicate id "${e.id}".` });
      seen.add(e.id);
    }
    return seen;
  };
  const nations = dupCheck("nations", d.nations);
  const comps = dupCheck("competitions", d.competitions);
  const stadiums = dupCheck("stadiums", d.stadiums);
  const clubs = dupCheck("clubs", d.clubs);
  dupCheck("players", d.players);
  dupCheck("staff", d.staff);
  dupCheck("sponsors", d.sponsors);
  const allIds = new Map<string, string>();
  for (const [entity, list] of [["players", d.players], ["staff", d.staff]] as const) {
    for (const e of list) {
      if (allIds.has(e.id)) errors.push({ level: "error", entity, id: e.id, message: `Id "${e.id}" is also used by a ${allIds.get(e.id)} record.` });
      allIds.set(e.id, entity);
    }
  }
  const compById = new Map(d.competitions.map((c) => [c.id, c]));
  const ref = (entity: string, eid: string, field: string, value: string | null, set: Set<string>) => {
    if (value !== null && !set.has(value)) errors.push({ level: "error", entity, id: eid, path: field, message: `References unknown ${field.replace(/Id$/, "")} "${value}".` });
  };
  for (const c of d.competitions) {
    ref("competitions", c.id, "nationId", c.nationId, nations);
    if (c.type === "league" && !c.league) errors.push({ level: "error", entity: "competitions", id: c.id, message: "League competitions need `league` rules." });
    if (c.type !== "league" && !c.cup) errors.push({ level: "error", entity: "competitions", id: c.id, message: "Cup competitions need `cup` rules." });
    if (c.league) {
      if (c.league.promotion) ref("competitions", c.id, "promotion.toCompetitionId", c.league.promotion.toCompetitionId, comps);
      if (c.league.relegation) ref("competitions", c.id, "relegation.toCompetitionId", c.league.relegation.toCompetitionId, comps);
      for (const q of c.league.qualification) ref("competitions", c.id, "qualification.competitionId", q.competitionId, comps);
    }
    if (c.cup) {
      for (const l of c.cup.entrantLeagueIds) ref("competitions", c.id, "cup.entrantLeagueIds", l, comps);
      const slots = 2 ** c.cup.rounds.length;
      if (!c.cup.groupStage && c.cup.bracketSize > slots) errors.push({ level: "error", entity: "competitions", id: c.id, message: `bracketSize ${c.cup.bracketSize} needs at least ${Math.ceil(Math.log2(c.cup.bracketSize))} rounds.` });
      if (c.cup.groupStage) {
        const adv = c.cup.groupStage.groups * c.cup.groupStage.advancePerGroup;
        if (2 ** c.cup.rounds.length !== adv) errors.push({ level: "error", entity: "competitions", id: c.id, message: `Group stage sends ${adv} clubs to the knockouts but ${c.cup.rounds.length} rounds need ${2 ** c.cup.rounds.length}.` });
      }
    }
  }
  const playersByClub = new Map<string, number>();
  for (const s of d.stadiums) void s;
  for (const c of d.clubs) {
    ref("clubs", c.id, "nationId", c.nationId, nations);
    ref("clubs", c.id, "stadiumId", c.stadiumId, stadiums);
    if (c.leagueId) {
      const l = compById.get(c.leagueId);
      if (!l) ref("clubs", c.id, "leagueId", c.leagueId, comps);
      else if (l.type !== "league") errors.push({ level: "error", entity: "clubs", id: c.id, message: `leagueId "${c.leagueId}" is not a league competition.` });
    } else warnings.push({ level: "warning", entity: "clubs", id: c.id, message: "Club has no league and will not play league football." });
  }
  const identities = new Set<string>();
  let withContracts = 0;
  for (const p of d.players) {
    ref("players", p.id, "nationId", p.nationId, nations);
    if (p.clubId) {
      ref("players", p.id, "clubId", p.clubId, clubs);
      playersByClub.set(p.clubId, (playersByClub.get(p.clubId) ?? 0) + 1);
      if (!p.contract) warnings.push({ level: "warning", entity: "players", id: p.id, message: "Player has a club but no contract; a default contract will be created." });
    }
    if (p.contract) withContracts++;
    const key = `${p.firstName}|${p.lastName}|${p.dob}`.toLowerCase();
    if (identities.has(key)) warnings.push({ level: "warning", entity: "players", id: p.id, message: `Possible duplicate person: ${p.firstName} ${p.lastName} (${p.dob}).` });
    identities.add(key);
    if (p.contract && p.contract.endDate < d.meta.startDate) warnings.push({ level: "warning", entity: "players", id: p.id, message: "Contract has already expired at the dataset start date." });
  }
  for (const s of d.staff) {
    ref("staff", s.id, "nationId", s.nationId, nations);
    if (s.clubId) ref("staff", s.id, "clubId", s.clubId, clubs);
  }
  for (const [compId, list] of Object.entries(d.initialQualifiers)) {
    ref("initialQualifiers", compId, "competitionId", compId, comps);
    for (const cid of list) ref("initialQualifiers", compId, "clubId", cid, clubs);
  }
  const leagues = d.competitions.filter((c) => c.type === "league");
  for (const l of leagues) {
    const n = d.clubs.filter((c) => c.leagueId === l.id).length;
    if (n < 2) warnings.push({ level: "warning", entity: "competitions", id: l.id, message: `League has only ${n} club(s) and cannot be played.` });
  }
  let full = 0;
  for (const c of d.clubs) {
    const n = playersByClub.get(c.id) ?? 0;
    if (n >= 18) full++;
    else warnings.push({ level: "warning", entity: "clubs", id: c.id, message: `Squad incomplete: only ${n} players imported (18+ recommended). Missing positions will be filled with clearly-marked generated players when a career starts.` });
  }
  const clubsWithStaff = new Set(d.staff.filter((s) => s.clubId).map((s) => s.clubId)).size;
  const counts = { nations: d.nations.length, competitions: d.competitions.length, stadiums: d.stadiums.length, clubs: d.clubs.length, players: d.players.length, staff: d.staff.length, sponsors: d.sponsors.length };
  const report: ImportReport = {
    ok: errors.length === 0,
    errors: errors.slice(0, MAX_ISSUES),
    warnings: warnings.slice(0, MAX_ISSUES),
    counts,
    coverage: { leagues: leagues.length, clubsWithFullSquad: full, clubs: d.clubs.length, clubsWithStaff, playersWithContracts: withContracts, players: d.players.length },
    datasetId: d.meta.id,
    datasetName: d.meta.name,
  };
  return { report, dataset: errors.length === 0 ? d : null };
}

export function importFiles(files: { name: string; text: string }[], base?: unknown): { report: ImportReport; dataset: Dataset | null } {
  const { raw, issues } = assembleFromFiles(files, base);
  return validateDataset(raw, issues);
}
