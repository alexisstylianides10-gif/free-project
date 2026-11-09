import type { Database } from "sql.js";
import type {
  Club, Competition, CompetitionSeason, Fixture, MatchRecord, Negotiation, Player, Season, Staff, Stadium, TacticSlot, TacticalSystem, World,
} from "@/engine/core/types";
import { queryAll, transaction } from "./sqlite";
import { runMigrations } from "./migrate";

type Row = Record<string, string | number | null>;
type Val = string | number | boolean | null | undefined;

const j = (v: unknown): string => JSON.stringify(v ?? null);
const pj = <T>(v: unknown): T => (v === null || v === undefined ? (null as T) : (JSON.parse(String(v)) as T));
const b = (v: unknown): boolean => v === 1 || v === true || v === "1";
const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const ns = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const n = (v: unknown): number => Number(v ?? 0);
const nn = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

function insertMany(db: Database, table: string, columns: string[], rows: Val[][]): void {
  if (!rows.length) return;
  const sql = `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(",")}) VALUES (${columns.map(() => "?").join(",")})`;
  const stmt = db.prepare(sql);
  try {
    for (const r of rows) {
      stmt.run(r.map((v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v)) as never);
    }
  } catch (e) {
    throw new Error(`Saving ${table} failed: ${(e as Error).message}`);
  } finally {
    stmt.free();
  }
}

/** Tables in foreign-key dependency order (parents first). */
export const TABLE_ORDER = [
  "GameVersion", "Career", "Nation", "Stadium", "StadiumProject", "Competition", "League", "Club", "TrainingFacility", "TrainingSchedule", "ClubFinance", "ClubLoan",
  "ClubKit", "Staff", "Manager", "UserManager", "Player", "Contract", "Injury", "Suspension", "TacticalSystem", "TacticalInstruction", "SavedFormation", "Season",
  "CompetitionSeason", "Fixture", "Match", "MatchEvent", "Transfer", "Loan", "Negotiation", "ScoutingAssignment", "ScoutedPlayer", "Sponsor", "SponsorDeal",
  "FinancialTransaction", "AppliedTransactionKey", "BoardObjective", "Trophy", "PlayerCareerHistory", "ClubSeasonHistory", "NewsItem", "YouthIntake", "PlayerDevelopment",
];

/** Write the full world into the database (single transaction; all-or-nothing). */
export function writeWorld(db: Database, world: World): void {
  runMigrations(db);
  transaction(db, () => {
    for (const t of [...TABLE_ORDER].reverse()) db.run(`DELETE FROM "${t}"`);
    const m = world.meta;
    insertMany(db, "GameVersion", ["id", "gameVersion", "schemaVersion", "savedAt"], [[1, m.gameVersion, m.schemaVersion, new Date().toISOString()]]);
    insertMany(db, "Career", ["id", "saveName", "createdAt", "datasetId", "datasetLabel", "datasetIsReal", "datasetVersion", "coverageNote", "seed", "rngState", "currentDate", "lastProcessedDate", "currentSeasonId", "userClubId", "idCounter", "autosaveEveryDays", "daysSinceAutosave", "qualifiersJson"],
      [[m.careerId, m.saveName, m.createdAt, m.dataset.id, m.dataset.label, m.dataset.isReal, m.dataset.version, m.dataset.coverageNote, m.seed, m.rngState, m.currentDate, m.lastProcessedDate, m.currentSeasonId, m.userClubId, m.idCounter, m.autosaveEveryDays, m.daysSinceAutosave, j(world.qualifiers)]]);
    insertMany(db, "Nation", ["id", "name", "code", "continent", "reputation", "youthRating", "namePool"], Object.values(world.nations).map((x) => [x.id, x.name, x.code, x.continent, x.reputation, x.youthRating, x.namePool]));
    const stadiums = Object.values(world.stadiums);
    insertMany(db, "Stadium", ["id", "name", "city", "capacity", "seatedRatio", "pitchQuality", "lighting", "facilities", "hospitality", "vipBoxes", "condition", "maintenanceLevel", "namingRightsName", "ownerClubId", "source"],
      stadiums.map((x) => [x.id, x.name, x.city, x.capacity, x.seatedRatio, x.pitchQuality, x.lighting, x.facilities, x.hospitality, x.vipBoxes, x.condition, x.maintenanceLevel, x.namingRightsName, x.ownerClubId, x.source]));
    insertMany(db, "StadiumProject", ["id", "stadiumId", "type", "description", "cost", "startDate", "endDate", "capacityDelta", "capacityReduction", "requiresRelocation", "levelTarget", "paid"],
      stadiums.flatMap((st) => st.projects.map((p) => [p.id, st.id, p.type, p.description, p.cost, p.startDate, p.endDate, p.capacityDelta, p.capacityReduction, p.requiresRelocation, p.levelTarget, p.paid])));
    const comps = Object.values(world.competitions);
    insertMany(db, "Competition", ["id", "name", "shortName", "type", "nationId", "tier", "reputation", "cupJson", "matchdayJson", "yellowCardBanThreshold", "preferredWeekday", "source"],
      comps.map((c) => [c.id, c.name, c.shortName, c.type, c.nationId, c.tier, c.reputation, c.cup ? j(c.cup) : null, j(c.matchday), c.yellowCardBanThreshold, c.preferredWeekday, c.source]));
    insertMany(db, "League", ["competitionId", "rounds", "pointsJson", "tiebreakersJson", "promotionJson", "relegationJson", "qualificationJson", "prizeMoneyTop", "tvMoneyPerClub"],
      comps.filter((c) => c.league).map((c) => { const l = c.league!; return [c.id, l.rounds, j(l.points), j(l.tiebreakers), l.promotion ? j(l.promotion) : null, l.relegation ? j(l.relegation) : null, j(l.qualification), l.prizeMoneyTop, l.tvMoneyPerClub]; }));
    const clubs = Object.values(world.clubs);
    insertMany(db, "Club", ["id", "name", "shortName", "code", "nationId", "leagueId", "reputation", "strategy", "founded", "primaryColor", "secondaryColor", "stadiumId", "tempStadiumId", "boardConfidence", "supporterMood", "isUser", "aiActivityJson", "youthIntakeDate", "source", "coverageJson", "selectionJson"],
      clubs.map((c) => [c.id, c.name, c.shortName, c.code, c.nationId, c.leagueId, c.reputation, c.strategy, c.founded, c.colors.primary, c.colors.secondary, c.stadiumId, c.tempStadiumId, c.boardConfidence, c.supporterMood, c.isUser, j(c.aiTransferActivity), c.youthIntakeDate, c.source, j(c.dataCoverage), c.selection ? j(c.selection) : null]));
    insertMany(db, "TrainingFacility", ["clubId", "training", "youth", "youthRecruitment", "medical"], clubs.map((c) => [c.id, c.facilities.training, c.facilities.youth, c.facilities.youthRecruitment, c.facilities.medical]));
    insertMany(db, "TrainingSchedule", ["clubId", "focus", "intensity", "youthIntensity"], clubs.map((c) => [c.id, c.training.focus, c.training.intensity, c.training.youthIntensity]));
    insertMany(db, "ClubFinance", ["clubId", "balance", "transferBudget", "wageBudget", "debt", "overdraftLimit", "ticketPrice", "seasonTicketHolders", "revenueSeasonJson", "expenseSeasonJson"],
      clubs.map((c) => { const f = c.finance; return [c.id, Math.round(f.balance), Math.round(f.transferBudget), Math.round(f.wageBudget), Math.round(f.debt), Math.round(f.overdraftLimit), Math.round(f.ticketPrice), f.seasonTicketHolders, j(f.revenueSeason), j(f.expenseSeason)]; }));
    insertMany(db, "ClubLoan", ["id", "clubId", "principal", "remaining", "interestRate", "monthlyPayment", "startDate", "endDate"], clubs.flatMap((c) => c.finance.loans.map((l) => [l.id, c.id, l.principal, l.remaining, l.interestRate, l.monthlyPayment, l.startDate, l.endDate])));
    insertMany(db, "ClubKit", ["id", "clubId", "slot", "primary", "secondary", "accent", "pattern", "collar", "sleeves", "shorts", "socks", "manufacturer", "sponsorText"],
      clubs.flatMap((c) => c.kits.map((k) => [`${c.id}:${k.slot}`, c.id, k.slot, k.primary, k.secondary, k.accent, k.pattern, k.collar, k.sleeves, k.shorts, k.socks, k.manufacturer, k.sponsorText])));
    const staff = Object.values(world.staff);
    insertMany(db, "Staff", ["id", "firstName", "lastName", "dob", "nationId", "clubId", "role", "attributesJson", "experience", "reputation", "specialisation", "contractWage", "contractStart", "contractEnd", "preferredFormation", "isUser", "source"],
      staff.map((x) => [x.id, x.firstName, x.lastName, x.dob, x.nationId, x.clubId, x.role, j(x.attributes), x.experience, x.reputation, x.specialisation, x.contract?.wage ?? null, x.contract?.startDate ?? null, x.contract?.endDate ?? null, x.preferredFormation, x.isUser, x.source]));
    insertMany(db, "Manager", ["clubId", "staffId"], clubs.filter((c) => c.managerId && world.staff[c.managerId]).map((c) => [c.id, c.managerId]));
    const um = world.manager;
    insertMany(db, "UserManager", ["staffId", "name", "clubId", "contractEnd", "wage", "reputation", "sacked", "jobOffersJson"], [[um.staffId, um.name, um.clubId, um.contractEnd, um.wage, um.reputation, um.sacked, j(um.jobOffers)]]);
    const players = Object.values(world.players);
    insertMany(db, "Player", ["id", "firstName", "lastName", "dob", "nationId", "clubId", "loanParentClubId", "position", "altPositionsJson", "foot", "heightCm", "attributesJson", "potential", "personalityJson", "squadStatus", "askingPrice", "fitness", "fatigue", "morale", "form", "sharpness", "tacticalFamiliarity", "yellowAccJson", "seasonStatsJson", "trainingFocus", "retrainPosition", "retired", "generated", "source", "value", "happiness"],
      players.map((p) => [p.id, p.firstName, p.lastName, p.dob, p.nationId, p.clubId, p.loanParentClubId, p.position, j(p.altPositions), p.foot, p.heightCm, j(p.attributes), p.potential, j(p.personality), p.squadStatus, p.askingPrice, p.fitness, p.fatigue, p.morale, p.form, p.sharpness, p.tacticalFamiliarity, j(p.yellowAccumulation), j(p.seasonStats), p.trainingFocus, p.retrainPosition, p.retired, p.generated, p.source, Math.round(p.value), p.happiness]));
    insertMany(db, "Contract", ["playerId", "wage", "startDate", "endDate", "releaseClause", "squadRole", "appearanceBonus", "goalBonus", "youth"],
      players.filter((p) => p.contract).map((p) => { const c = p.contract!; return [p.id, Math.round(c.wage), c.startDate, c.endDate, c.releaseClause, c.squadRole, c.appearanceBonus, c.goalBonus, c.youth]; }));
    insertMany(db, "Injury", ["playerId", "type", "until"], players.filter((p) => p.injury).map((p) => [p.id, p.injury!.type, p.injury!.until]));
    insertMany(db, "Suspension", ["id", "playerId", "competitionId", "matches", "reason"], players.flatMap((p) => p.suspensions.map((x, i) => [`${p.id}:${i}`, p.id, x.competitionId, x.matches, x.reason])));
    const tactics: [TacticalSystem, number][] = clubs.flatMap((c) => c.tactics.map((t, i) => [t, i] as [TacticalSystem, number]));
    insertMany(db, "TacticalSystem", ["id", "clubId", "name", "formationLabel", "teamJson", "setPiecesJson", "familiarity", "createdDate", "ordering"], tactics.map(([t, i]) => [t.id, t.clubId, t.name, t.formationLabel, j(t.team), j(t.setPieces), t.familiarity, t.createdDate, i]));
    insertMany(db, "TacticalInstruction", ["id", "tacticId", "slotId", "ordering", "position", "role", "duty", "ipX", "ipY", "opX", "opY", "instructionsJson"],
      tactics.flatMap(([t]) => t.slots.map((sl, i) => [`${t.id}:${sl.id}`, t.id, sl.id, i, sl.position, sl.role, sl.duty, sl.inPossession.x, sl.inPossession.y, sl.outOfPossession.x, sl.outOfPossession.y, j(sl.instructions)])));
    insertMany(db, "SavedFormation", ["id", "name", "slotsJson", "createdDate"], world.savedFormations.map((f) => [f.id, f.name, j(f.slots), f.createdDate]));
    insertMany(db, "Season", ["id", "label", "startDate", "endDate", "windowsJson", "status"], Object.values(world.seasons).map((x) => [x.id, x.label, x.startDate, x.endDate, j(x.transferWindows), x.status]));
    insertMany(db, "CompetitionSeason", ["id", "competitionId", "seasonId", "clubIdsJson", "groupsJson", "tiesJson", "currentRound", "roundDatesJson", "stage", "status", "championId", "finalPositionsJson"],
      Object.values(world.competitionSeasons).map((c) => [c.id, c.competitionId, c.seasonId, j(c.clubIds), j(c.groups), j(c.ties), c.currentRound, j(c.roundDates), c.stage, c.status, c.championId, j(c.finalPositions)]));
    insertMany(db, "Fixture", ["id", "competitionSeasonId", "competitionId", "seasonId", "date", "round", "roundName", "homeClubId", "awayClubId", "stadiumId", "tieId", "leg", "groupIndex", "status", "matchId", "requiresWinner"],
      Object.values(world.fixtures).map((f) => [f.id, f.competitionSeasonId, f.competitionId, f.seasonId, f.date, f.round, f.roundName, f.homeClubId, f.awayClubId, f.stadiumId, f.tieId, f.leg, f.groupIndex, f.status, f.matchId, f.requiresWinner]));
    const matches = Object.values(world.matches);
    insertMany(db, "Match", ["id", "fixtureId", "date", "homeClubId", "awayClubId", "homeGoals", "awayGoals", "extraTime", "penaltiesJson", "attendance", "statsJson", "linesJson", "detailed", "seed", "playerOfMatchId", "shapesJson"],
      matches.map((x) => [x.id, x.fixtureId, x.date, x.homeClubId, x.awayClubId, x.homeGoals, x.awayGoals, x.extraTime, x.penalties ? j(x.penalties) : null, x.attendance, j(x.stats), j(x.lines), x.detailed, x.seed, x.playerOfMatchId, x.shapes ? j(x.shapes) : null]));
    insertMany(db, "MatchEvent", ["id", "matchId", "seq", "minute", "second", "type", "side", "playerId", "otherPlayerId", "x", "y", "xg", "text"],
      matches.flatMap((x) => x.events.map((e, i) => [`${x.id}:${i}`, x.id, i, e.minute, e.second, e.type, e.side, e.playerId, e.otherPlayerId, e.x, e.y, e.xg ?? null, e.text])));
    insertMany(db, "Transfer", ["id", "playerId", "fromClubId", "toClubId", "date", "fee", "type", "seasonId", "sellOnPct", "sellOnBeneficiaryClubId", "addOnsJson", "appsSince", "goalsSince"],
      world.transfers.map((t) => [t.id, t.playerId, t.fromClubId, t.toClubId, t.date, Math.round(t.fee), t.type, t.seasonId, t.sellOnPct, t.sellOnBeneficiaryClubId, j(t.addOns), t.appsSince ?? null, t.goalsSince ?? null]));
    insertMany(db, "Loan", ["id", "playerId", "parentClubId", "loanClubId", "startDate", "endDate", "wageSharePct", "optionToBuyFee", "fee", "active"],
      Object.values(world.loans).map((l) => [l.id, l.playerId, l.parentClubId, l.loanClubId, l.startDate, l.endDate, l.wageSharePct, l.optionToBuyFee, l.fee, l.active]));
    insertMany(db, "Negotiation", ["id", "playerId", "buyingClubId", "sellingClubId", "kind", "staffId", "status", "roundsJson", "agreedTransferJson", "agreedContractJson", "counterTransferJson", "counterContractJson", "createdDate", "updatedDate", "incoming", "patience"],
      Object.values(world.negotiations).map((x) => [x.id, x.playerId, x.buyingClubId, x.sellingClubId, x.kind, x.staffId, x.status, j(x.rounds), x.agreedTransfer ? j(x.agreedTransfer) : null, x.agreedContract ? j(x.agreedContract) : null, x.counterTransfer ? j(x.counterTransfer) : null, x.counterContract ? j(x.counterContract) : null, x.createdDate, x.updatedDate, x.incoming, x.patience]));
    insertMany(db, "ScoutingAssignment", ["id", "clubId", "scoutId", "targetJson", "startDate", "endDate", "status", "reportJson"],
      Object.values(world.scouting).map((x) => [x.id, x.clubId, x.scoutId, j(x.target), x.startDate, x.endDate, x.status, j(x.reportPlayerIds)]));
    insertMany(db, "ScoutedPlayer", ["playerId", "date"], Object.entries(world.scoutedPlayerIds).filter(([id]) => world.players[id]).map(([id, d]) => [id, d]));
    insertMany(db, "Sponsor", ["id", "name", "industry", "wealth", "minReputation", "fictional"], Object.values(world.sponsors).map((x) => [x.id, x.name, x.industry, x.wealth, x.minReputation, x.fictional]));
    const deals = [...Object.values(world.sponsorDeals).map((d) => [d, false] as const), ...world.sponsorOffers.map((d) => [d, true] as const)];
    insertMany(db, "SponsorDeal", ["id", "clubId", "sponsorId", "slot", "annualValue", "startDate", "endDate", "bonusLeagueTitle", "bonusTopFour", "bonusCupWin", "isOffer"],
      deals.map(([d, offer]) => [d.id, d.clubId, d.sponsorId, d.slot, Math.round(d.annualValue), d.startDate, d.endDate, d.bonusLeagueTitle, d.bonusTopFour, d.bonusCupWin, offer]));
    insertMany(db, "FinancialTransaction", ["id", "clubId", "date", "amount", "category", "description", "balanceAfter", "idempotencyKey"],
      world.transactions.map((t) => [t.id, t.clubId, t.date, t.amount, t.category, t.description, t.balanceAfter, t.idempotencyKey]));
    insertMany(db, "AppliedTransactionKey", ["key"], Object.keys(world.appliedTransactionKeys).map((k) => [k]));
    insertMany(db, "BoardObjective", ["id", "clubId", "seasonId", "kind", "competitionId", "target", "description", "importance", "status", "progress"],
      Object.values(world.objectives).map((o) => [o.id, o.clubId, o.seasonId, o.kind, o.competitionId, Math.round(o.target), o.description, o.importance, o.status, o.progress === null ? null : Math.round(o.progress)]));
    insertMany(db, "Trophy", ["id", "clubId", "competitionId", "seasonId", "seasonLabel"], world.trophies.map((t) => [t.id, t.clubId, t.competitionId, t.seasonId, t.seasonLabel]));
    insertMany(db, "PlayerCareerHistory", ["id", "playerId", "seasonId", "seasonLabel", "clubId", "apps", "goals", "assists", "avgRating", "overall", "potential", "value"],
      world.playerHistory.map((h) => [h.id, h.playerId, h.seasonId, h.seasonLabel, h.clubId, h.apps, h.goals, h.assists, h.avgRating, h.overall, h.potential, Math.round(h.value)]));
    insertMany(db, "ClubSeasonHistory", ["id", "clubId", "seasonId", "seasonLabel", "competitionId", "position", "points", "goalsFor", "goalsAgainst", "cupResultsJson", "revenue", "expenses", "managerId"],
      world.clubHistory.map((h) => [h.id, h.clubId, h.seasonId, h.seasonLabel, h.competitionId, h.position, h.points, h.goalsFor, h.goalsAgainst, j(h.cupResults), Math.round(h.revenue), Math.round(h.expenses), h.managerId]));
    insertMany(db, "NewsItem", ["id", "date", "category", "title", "body", "clubIdsJson", "playerIdsJson", "read", "important"], world.news.map((x) => [x.id, x.date, x.category, x.title, x.body, j(x.clubIds), j(x.playerIds), x.read, x.important]));
    insertMany(db, "YouthIntake", ["id", "clubId", "date", "playerIdsJson"], world.youthIntakes.map((y) => [y.id, y.clubId, y.date, j(y.playerIds)]));
    insertMany(db, "PlayerDevelopment", ["id", "playerId", "date", "overall", "potential"], world.development.filter((d) => world.players[d.playerId]).map((d, i) => [`dev_${i}`, d.playerId, d.date, d.overall, d.potential]));
  });
}

const all = (db: Database, table: string, order = ""): Row[] => queryAll<Row>(db, `SELECT * FROM "${table}" ${order}`);

/** Rebuild a world from a save database. */
export function readWorld(db: Database): World {
  runMigrations(db);
  const career = all(db, "Career")[0];
  if (!career) throw new Error("The save file does not contain a career.");
  const gv = all(db, "GameVersion")[0];
  const um = all(db, "UserManager")[0];
  const world: World = {
    meta: {
      careerId: s(career.id), saveName: s(career.saveName), createdAt: s(career.createdAt), gameVersion: s(gv?.gameVersion), schemaVersion: n(gv?.schemaVersion),
      dataset: { id: s(career.datasetId), label: s(career.datasetLabel), isReal: b(career.datasetIsReal), version: s(career.datasetVersion), coverageNote: s(career.coverageNote) },
      seed: n(career.seed), rngState: n(career.rngState), currentDate: s(career.currentDate), lastProcessedDate: ns(career.lastProcessedDate), currentSeasonId: s(career.currentSeasonId),
      userClubId: s(career.userClubId), idCounter: n(career.idCounter), autosaveEveryDays: n(career.autosaveEveryDays), daysSinceAutosave: n(career.daysSinceAutosave),
    },
    manager: { staffId: s(um.staffId), name: s(um.name), clubId: ns(um.clubId), contractEnd: ns(um.contractEnd), wage: n(um.wage), reputation: n(um.reputation), sacked: b(um.sacked), jobOffers: pj(um.jobOffersJson) ?? [] },
    nations: {}, clubs: {}, players: {}, staff: {}, stadiums: {}, competitions: {}, seasons: {}, competitionSeasons: {}, fixtures: {}, matches: {}, negotiations: {}, transfers: [], loans: {},
    scouting: {}, scoutedPlayerIds: {}, sponsors: {}, sponsorDeals: {}, sponsorOffers: [], transactions: [], objectives: {}, trophies: [], playerHistory: [], clubHistory: [], news: [],
    youthIntakes: [], development: [], appliedTransactionKeys: {}, qualifiers: pj(career.qualifiersJson) ?? {}, savedFormations: [],
  };
  for (const r of all(db, "Nation")) world.nations[s(r.id)] = { id: s(r.id), name: s(r.name), code: s(r.code), continent: s(r.continent), reputation: n(r.reputation), youthRating: n(r.youthRating), namePool: s(r.namePool) };
  const projects = all(db, "StadiumProject", "ORDER BY rowid");
  for (const r of all(db, "Stadium")) {
    const st: Stadium = {
      id: s(r.id), name: s(r.name), city: s(r.city), capacity: n(r.capacity), seatedRatio: n(r.seatedRatio), pitchQuality: n(r.pitchQuality), lighting: n(r.lighting), facilities: n(r.facilities), hospitality: n(r.hospitality),
      vipBoxes: n(r.vipBoxes), condition: n(r.condition), maintenanceLevel: n(r.maintenanceLevel) as 1 | 2 | 3, namingRightsName: ns(r.namingRightsName), ownerClubId: ns(r.ownerClubId), source: s(r.source) as Stadium["source"], projects: [],
    };
    world.stadiums[st.id] = st;
  }
  for (const p of projects) world.stadiums[s(p.stadiumId)]?.projects.push({ id: s(p.id), type: s(p.type) as never, description: s(p.description), cost: n(p.cost), startDate: s(p.startDate), endDate: s(p.endDate), capacityDelta: n(p.capacityDelta), capacityReduction: n(p.capacityReduction), requiresRelocation: b(p.requiresRelocation), levelTarget: nn(p.levelTarget), paid: n(p.paid) });
  const leagues = new Map(all(db, "League").map((r) => [s(r.competitionId), r]));
  for (const r of all(db, "Competition")) {
    const l = leagues.get(s(r.id));
    const c: Competition = {
      id: s(r.id), name: s(r.name), shortName: s(r.shortName), type: s(r.type) as Competition["type"], nationId: ns(r.nationId), tier: n(r.tier), reputation: n(r.reputation),
      league: l ? { rounds: n(l.rounds), points: pj(l.pointsJson), tiebreakers: pj(l.tiebreakersJson), promotion: pj(l.promotionJson), relegation: pj(l.relegationJson), qualification: pj(l.qualificationJson), prizeMoneyTop: n(l.prizeMoneyTop), tvMoneyPerClub: n(l.tvMoneyPerClub) } : null,
      cup: pj(r.cupJson), matchday: pj(r.matchdayJson), yellowCardBanThreshold: n(r.yellowCardBanThreshold), preferredWeekday: n(r.preferredWeekday), source: s(r.source) as Competition["source"],
    };
    world.competitions[c.id] = c;
  }
  const byClub = <T>(rows: Row[], key = "clubId", map: (r: Row) => T): Map<string, T[]> => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const k = s(r[key]);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(map(r));
    }
    return m;
  };
  const fac = new Map(all(db, "TrainingFacility").map((r) => [s(r.clubId), r]));
  const tr = new Map(all(db, "TrainingSchedule").map((r) => [s(r.clubId), r]));
  const fin = new Map(all(db, "ClubFinance").map((r) => [s(r.clubId), r]));
  const loans = byClub(all(db, "ClubLoan", "ORDER BY rowid"), "clubId", (r) => ({ id: s(r.id), principal: n(r.principal), remaining: n(r.remaining), interestRate: n(r.interestRate), monthlyPayment: n(r.monthlyPayment), startDate: s(r.startDate), endDate: s(r.endDate) }));
  const kits = byClub(all(db, "ClubKit", "ORDER BY rowid"), "clubId", (r) => ({ slot: s(r.slot) as never, primary: s(r.primary), secondary: s(r.secondary), accent: s(r.accent), pattern: s(r.pattern) as never, collar: s(r.collar) as never, sleeves: s(r.sleeves) as never, shorts: s(r.shorts), socks: s(r.socks), manufacturer: s(r.manufacturer), sponsorText: s(r.sponsorText) }));
  const slotRows = byClub(all(db, "TacticalInstruction", "ORDER BY tacticId, ordering"), "tacticId", (r): TacticSlot => ({ id: s(r.slotId), position: s(r.position) as never, role: s(r.role), duty: s(r.duty) as never, inPossession: { x: n(r.ipX), y: n(r.ipY) }, outOfPossession: { x: n(r.opX), y: n(r.opY) }, instructions: pj(r.instructionsJson) }));
  const tactics = byClub(all(db, "TacticalSystem", "ORDER BY clubId, ordering"), "clubId", (r): TacticalSystem => ({ id: s(r.id), clubId: s(r.clubId), name: s(r.name), formationLabel: s(r.formationLabel), slots: slotRows.get(s(r.id)) ?? [], team: pj(r.teamJson), setPieces: pj(r.setPiecesJson), familiarity: n(r.familiarity), createdDate: s(r.createdDate) }));
  const managers = new Map(all(db, "Manager").map((r) => [s(r.clubId), s(r.staffId)]));
  for (const r of all(db, "Club")) {
    const id = s(r.id);
    const f = fin.get(id)!;
    const fa = fac.get(id)!;
    const t = tr.get(id)!;
    const c: Club = {
      id, name: s(r.name), shortName: s(r.shortName), code: s(r.code), nationId: s(r.nationId), leagueId: ns(r.leagueId), reputation: n(r.reputation), strategy: s(r.strategy) as Club["strategy"], founded: nn(r.founded),
      colors: { primary: s(r.primaryColor), secondary: s(r.secondaryColor) }, stadiumId: s(r.stadiumId), tempStadiumId: ns(r.tempStadiumId),
      facilities: { training: n(fa.training), youth: n(fa.youth), youthRecruitment: n(fa.youthRecruitment), medical: n(fa.medical) },
      finance: { balance: n(f.balance), transferBudget: n(f.transferBudget), wageBudget: n(f.wageBudget), debt: n(f.debt), loans: loans.get(id) ?? [], overdraftLimit: n(f.overdraftLimit), ticketPrice: n(f.ticketPrice), seasonTicketHolders: n(f.seasonTicketHolders), revenueSeason: pj(f.revenueSeasonJson) ?? {}, expenseSeason: pj(f.expenseSeasonJson) ?? {} },
      kits: kits.get(id) ?? [], tactics: tactics.get(id) ?? [], selection: pj(r.selectionJson), training: { focus: s(t.focus) as never, intensity: n(t.intensity) as never, youthIntensity: n(t.youthIntensity) as never },
      managerId: managers.get(id) ?? null, boardConfidence: n(r.boardConfidence), supporterMood: n(r.supporterMood), isUser: b(r.isUser), aiTransferActivity: pj(r.aiActivityJson),
      youthIntakeDate: s(r.youthIntakeDate), source: s(r.source) as Club["source"], dataCoverage: pj(r.coverageJson),
    };
    world.clubs[id] = c;
  }
  for (const r of all(db, "Staff")) {
    const st: Staff = {
      id: s(r.id), firstName: s(r.firstName), lastName: s(r.lastName), dob: s(r.dob), nationId: s(r.nationId), clubId: ns(r.clubId), role: s(r.role) as Staff["role"], attributes: pj(r.attributesJson),
      experience: n(r.experience), reputation: n(r.reputation), specialisation: s(r.specialisation),
      contract: r.contractWage === null ? null : { wage: n(r.contractWage), startDate: s(r.contractStart), endDate: s(r.contractEnd) }, preferredFormation: ns(r.preferredFormation), isUser: b(r.isUser), source: s(r.source) as Staff["source"],
    };
    world.staff[st.id] = st;
  }
  const contracts = new Map(all(db, "Contract").map((r) => [s(r.playerId), r]));
  const injuries = new Map(all(db, "Injury").map((r) => [s(r.playerId), r]));
  const susp = byClub(all(db, "Suspension", "ORDER BY rowid"), "playerId", (r) => ({ competitionId: ns(r.competitionId), matches: n(r.matches), reason: s(r.reason) }));
  for (const r of all(db, "Player")) {
    const id = s(r.id);
    const c = contracts.get(id);
    const inj = injuries.get(id);
    const p: Player = {
      id, firstName: s(r.firstName), lastName: s(r.lastName), dob: s(r.dob), nationId: s(r.nationId), clubId: ns(r.clubId), loanParentClubId: ns(r.loanParentClubId), position: s(r.position) as never,
      altPositions: pj(r.altPositionsJson), foot: s(r.foot) as never, heightCm: n(r.heightCm), attributes: pj(r.attributesJson), potential: n(r.potential), personality: pj(r.personalityJson),
      contract: c ? { wage: n(c.wage), startDate: s(c.startDate), endDate: s(c.endDate), releaseClause: nn(c.releaseClause), squadRole: s(c.squadRole) as never, appearanceBonus: n(c.appearanceBonus), goalBonus: n(c.goalBonus), youth: b(c.youth) } : null,
      squadStatus: s(r.squadStatus) as never, askingPrice: nn(r.askingPrice), fitness: n(r.fitness), fatigue: n(r.fatigue), morale: n(r.morale), form: n(r.form), sharpness: n(r.sharpness),
      tacticalFamiliarity: n(r.tacticalFamiliarity), injury: inj ? { type: s(inj.type), until: s(inj.until) } : null, suspensions: susp.get(id) ?? [], yellowAccumulation: pj(r.yellowAccJson) ?? {},
      seasonStats: pj(r.seasonStatsJson) ?? {}, trainingFocus: s(r.trainingFocus) as never, retrainPosition: ns(r.retrainPosition) as never, retired: b(r.retired), generated: b(r.generated),
      source: s(r.source) as never, value: n(r.value), happiness: n(r.happiness),
    };
    world.players[id] = p;
  }
  for (const r of all(db, "SavedFormation", "ORDER BY rowid")) world.savedFormations.push({ id: s(r.id), name: s(r.name), slots: pj(r.slotsJson), createdDate: s(r.createdDate) });
  for (const r of all(db, "Season")) {
    const x: Season = { id: s(r.id), label: s(r.label), startDate: s(r.startDate), endDate: s(r.endDate), transferWindows: pj(r.windowsJson), status: s(r.status) as never };
    world.seasons[x.id] = x;
  }
  for (const r of all(db, "CompetitionSeason")) {
    const x: CompetitionSeason = { id: s(r.id), competitionId: s(r.competitionId), seasonId: s(r.seasonId), clubIds: pj(r.clubIdsJson), groups: pj(r.groupsJson), ties: pj(r.tiesJson), currentRound: n(r.currentRound), roundDates: pj(r.roundDatesJson), stage: s(r.stage) as never, status: s(r.status) as never, championId: ns(r.championId), finalPositions: pj(r.finalPositionsJson) };
    world.competitionSeasons[x.id] = x;
  }
  for (const r of all(db, "Fixture", "ORDER BY rowid")) {
    const f: Fixture = { id: s(r.id), competitionSeasonId: s(r.competitionSeasonId), competitionId: s(r.competitionId), seasonId: s(r.seasonId), date: s(r.date), round: n(r.round), roundName: s(r.roundName), homeClubId: s(r.homeClubId), awayClubId: s(r.awayClubId), stadiumId: ns(r.stadiumId), tieId: ns(r.tieId), leg: nn(r.leg) as never, groupIndex: nn(r.groupIndex), status: s(r.status) as never, matchId: ns(r.matchId), requiresWinner: b(r.requiresWinner) };
    world.fixtures[f.id] = f;
  }
  const events = byClub(all(db, "MatchEvent", "ORDER BY matchId, seq"), "matchId", (r) => {
    const e = { minute: n(r.minute), second: n(r.second), type: s(r.type) as never, side: n(r.side) as 0 | 1, playerId: ns(r.playerId), otherPlayerId: ns(r.otherPlayerId), x: n(r.x), y: n(r.y), xg: nn(r.xg) ?? undefined, text: s(r.text) };
    if (e.xg === undefined) delete (e as { xg?: number }).xg;
    return e;
  });
  for (const r of all(db, "Match", "ORDER BY rowid")) {
    const m: MatchRecord = { id: s(r.id), fixtureId: s(r.fixtureId), date: s(r.date), homeClubId: s(r.homeClubId), awayClubId: s(r.awayClubId), homeGoals: n(r.homeGoals), awayGoals: n(r.awayGoals), extraTime: b(r.extraTime), penalties: pj(r.penaltiesJson), attendance: n(r.attendance), stats: pj(r.statsJson), lines: pj(r.linesJson), events: events.get(s(r.id)) ?? [], detailed: b(r.detailed), seed: n(r.seed), playerOfMatchId: ns(r.playerOfMatchId) };
    if (r.shapesJson !== null) m.shapes = pj(r.shapesJson);
    world.matches[m.id] = m;
  }
  for (const r of all(db, "Transfer", "ORDER BY rowid")) {
    const t = { id: s(r.id), playerId: s(r.playerId), fromClubId: ns(r.fromClubId), toClubId: ns(r.toClubId), date: s(r.date), fee: n(r.fee), type: s(r.type) as never, seasonId: s(r.seasonId), sellOnPct: n(r.sellOnPct), sellOnBeneficiaryClubId: ns(r.sellOnBeneficiaryClubId), addOns: pj<never[]>(r.addOnsJson) } as World["transfers"][number];
    if (r.appsSince !== null) t.appsSince = n(r.appsSince);
    if (r.goalsSince !== null) t.goalsSince = n(r.goalsSince);
    world.transfers.push(t);
  }
  for (const r of all(db, "Loan")) world.loans[s(r.id)] = { id: s(r.id), playerId: s(r.playerId), parentClubId: s(r.parentClubId), loanClubId: s(r.loanClubId), startDate: s(r.startDate), endDate: s(r.endDate), wageSharePct: n(r.wageSharePct), optionToBuyFee: nn(r.optionToBuyFee), fee: n(r.fee), active: b(r.active) };
  for (const r of all(db, "Negotiation")) {
    const x: Negotiation = { id: s(r.id), playerId: s(r.playerId), buyingClubId: s(r.buyingClubId), sellingClubId: ns(r.sellingClubId), kind: s(r.kind) as never, staffId: ns(r.staffId), status: s(r.status) as never, rounds: pj(r.roundsJson), agreedTransfer: pj(r.agreedTransferJson), agreedContract: pj(r.agreedContractJson), counterTransfer: pj(r.counterTransferJson), counterContract: pj(r.counterContractJson), createdDate: s(r.createdDate), updatedDate: s(r.updatedDate), incoming: b(r.incoming), patience: n(r.patience) };
    world.negotiations[x.id] = x;
  }
  for (const r of all(db, "ScoutingAssignment")) world.scouting[s(r.id)] = { id: s(r.id), clubId: s(r.clubId), scoutId: ns(r.scoutId), target: pj(r.targetJson), startDate: s(r.startDate), endDate: s(r.endDate), status: s(r.status) as never, reportPlayerIds: pj(r.reportJson) };
  for (const r of all(db, "ScoutedPlayer")) world.scoutedPlayerIds[s(r.playerId)] = s(r.date);
  for (const r of all(db, "Sponsor")) world.sponsors[s(r.id)] = { id: s(r.id), name: s(r.name), industry: s(r.industry), wealth: n(r.wealth), minReputation: n(r.minReputation), fictional: b(r.fictional) };
  for (const r of all(db, "SponsorDeal", "ORDER BY rowid")) {
    const d = { id: s(r.id), clubId: s(r.clubId), sponsorId: s(r.sponsorId), slot: s(r.slot) as never, annualValue: n(r.annualValue), startDate: s(r.startDate), endDate: s(r.endDate), bonusLeagueTitle: n(r.bonusLeagueTitle), bonusTopFour: n(r.bonusTopFour), bonusCupWin: n(r.bonusCupWin) };
    if (b(r.isOffer)) world.sponsorOffers.push(d);
    else world.sponsorDeals[d.id] = d;
  }
  for (const r of all(db, "FinancialTransaction", "ORDER BY rowid")) world.transactions.push({ id: s(r.id), clubId: s(r.clubId), date: s(r.date), amount: n(r.amount), category: s(r.category) as never, description: s(r.description), balanceAfter: n(r.balanceAfter), idempotencyKey: s(r.idempotencyKey) });
  for (const r of all(db, "AppliedTransactionKey")) world.appliedTransactionKeys[s(r.key)] = true;
  for (const r of all(db, "BoardObjective")) world.objectives[s(r.id)] = { id: s(r.id), clubId: s(r.clubId), seasonId: s(r.seasonId), kind: s(r.kind) as never, competitionId: ns(r.competitionId), target: n(r.target), description: s(r.description), importance: s(r.importance) as never, status: s(r.status) as never, progress: nn(r.progress) };
  for (const r of all(db, "Trophy", "ORDER BY rowid")) world.trophies.push({ id: s(r.id), clubId: s(r.clubId), competitionId: s(r.competitionId), seasonId: s(r.seasonId), seasonLabel: s(r.seasonLabel) });
  for (const r of all(db, "PlayerCareerHistory", "ORDER BY rowid")) world.playerHistory.push({ id: s(r.id), playerId: s(r.playerId), seasonId: s(r.seasonId), seasonLabel: s(r.seasonLabel), clubId: ns(r.clubId), apps: n(r.apps), goals: n(r.goals), assists: n(r.assists), avgRating: n(r.avgRating), overall: n(r.overall), potential: n(r.potential), value: n(r.value) });
  for (const r of all(db, "ClubSeasonHistory", "ORDER BY rowid")) world.clubHistory.push({ id: s(r.id), clubId: s(r.clubId), seasonId: s(r.seasonId), seasonLabel: s(r.seasonLabel), competitionId: ns(r.competitionId), position: nn(r.position), points: n(r.points), goalsFor: n(r.goalsFor), goalsAgainst: n(r.goalsAgainst), cupResults: pj(r.cupResultsJson), revenue: n(r.revenue), expenses: n(r.expenses), managerId: ns(r.managerId) });
  for (const r of all(db, "NewsItem", "ORDER BY rowid")) world.news.push({ id: s(r.id), date: s(r.date), category: s(r.category) as never, title: s(r.title), body: s(r.body), clubIds: pj(r.clubIdsJson), playerIds: pj(r.playerIdsJson), read: b(r.read), important: b(r.important) });
  for (const r of all(db, "YouthIntake", "ORDER BY rowid")) world.youthIntakes.push({ id: s(r.id), clubId: s(r.clubId), date: s(r.date), playerIds: pj(r.playerIdsJson) });
  for (const r of all(db, "PlayerDevelopment", "ORDER BY rowid")) world.development.push({ playerId: s(r.playerId), date: s(r.date), overall: n(r.overall), potential: n(r.potential) });
  return world;
}

/** Database-level integrity checks (foreign keys + SQLite structure). */
export function integrityCheck(db: Database): string[] {
  const problems: string[] = [];
  const ic = queryAll<{ integrity_check: string }>(db, "PRAGMA integrity_check");
  if (ic[0]?.integrity_check !== "ok") problems.push(`SQLite integrity: ${ic.map((r) => r.integrity_check).join("; ")}`);
  const fk = queryAll<Row>(db, "PRAGMA foreign_key_check");
  for (const r of fk.slice(0, 20)) problems.push(`Broken reference in ${r.table} (row ${r.rowid}) → ${r.parent}`);
  return problems;
}
