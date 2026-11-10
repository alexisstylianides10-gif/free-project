/**
 * Core domain model for the football world.
 *
 * The whole career world lives in memory as plain serialisable objects while
 * the game is running. The persistence layer (src/db) maps it onto normalised
 * SQLite tables defined by prisma/schema.prisma.
 */

export type ID = string;
/** ISO calendar date, `YYYY-MM-DD` (UTC, no time). */
export type ISODate = string;

export const POSITIONS = ["GK", "LB", "CB", "RB", "LWB", "RWB", "DM", "LM", "CM", "RM", "AM", "LW", "RW", "ST"] as const;
export type Position = (typeof POSITIONS)[number];

export const ATTRIBUTE_KEYS = [
  // technical
  "crossing", "dribbling", "finishing", "firstTouch", "heading", "longShots", "marking", "passing",
  "tackling", "technique", "freeKicks", "penalties",
  // mental
  "aggression", "anticipation", "composure", "decisions", "positioning", "offTheBall", "vision",
  "workRate", "teamwork", "leadership",
  // physical
  "pace", "acceleration", "agility", "stamina", "strength", "jumping", "naturalFitness",
  // goalkeeping
  "reflexes", "handling", "oneOnOnes", "aerialReach", "commandOfArea", "kicking",
] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
/** All attributes are on a 1–20 scale. */
export type Attributes = Record<AttributeKey, number>;

export const ATTRIBUTE_GROUPS: Record<"technical" | "mental" | "physical" | "goalkeeping", AttributeKey[]> = {
  technical: ["crossing", "dribbling", "finishing", "firstTouch", "heading", "longShots", "marking", "passing", "tackling", "technique", "freeKicks", "penalties"],
  mental: ["aggression", "anticipation", "composure", "decisions", "positioning", "offTheBall", "vision", "workRate", "teamwork", "leadership"],
  physical: ["pace", "acceleration", "agility", "stamina", "strength", "jumping", "naturalFitness"],
  goalkeeping: ["reflexes", "handling", "oneOnOnes", "aerialReach", "commandOfArea", "kicking"],
};

export interface Personality {
  professionalism: number; // 1-20
  ambition: number;
  temperament: number;
  consistency: number;
  injuryProneness: number;
}

export type SquadRole = "key" | "first_team" | "rotation" | "backup" | "prospect";
export type TransferStatus = "none" | "listed" | "loan_listed" | "untouchable";

export interface Contract {
  wage: number; // per week
  startDate: ISODate;
  endDate: ISODate;
  releaseClause: number | null;
  squadRole: SquadRole;
  appearanceBonus: number;
  goalBonus: number;
  youth: boolean;
}

export interface SeasonStats {
  apps: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  cleanSheets: number;
  ratingSum: number; // sum of match ratings (avg = ratingSum / apps)
  xg: number;
  shots: number;
  passes: number;
  passesCompleted: number;
  tackles: number;
  interceptions: number;
  saves: number;
}

export interface Suspension {
  competitionId: ID | null; // null => all competitions
  matches: number;
  reason: string;
}

export interface Player {
  id: ID;
  firstName: string;
  lastName: string;
  dob: ISODate;
  nationId: ID;
  clubId: ID | null;
  /** Parent club when on loan; clubId is the club currently using the player. */
  loanParentClubId: ID | null;
  position: Position;
  altPositions: Position[];
  foot: "L" | "R" | "B";
  heightCm: number;
  attributes: Attributes;
  potential: number; // estimated peak overall 1-100 (true hidden value)
  personality: Personality;
  contract: Contract | null;
  squadStatus: TransferStatus;
  askingPrice: number | null;
  // condition
  fitness: number; // 0-100 match fitness / condition
  fatigue: number; // 0-100 accumulated fatigue
  morale: number; // 0-100
  form: number; // rolling average match rating (e.g. 6.0-8.0)
  sharpness: number; // 0-100
  tacticalFamiliarity: number; // 0-100 with current club system
  injury: { type: string; until: ISODate } | null;
  suspensions: Suspension[];
  yellowAccumulation: Record<ID, number>; // competitionId -> yellow cards counted toward bans
  seasonStats: Record<ID, SeasonStats>; // competitionId -> stats for the current season
  /** Individual training focus. */
  trainingFocus: TrainingFocus;
  retrainPosition: Position | null;
  retired: boolean;
  generated: boolean; // created by youth intake / regen (not from source dataset)
  /** Real/imported data provenance. */
  source: "dataset" | "generated";
  value: number; // cached market value
  happiness: number; // 0-100
}

export type TrainingFocus = "balanced" | "technical" | "mental" | "physical" | "goalkeeping" | "attacking" | "defending" | "set_pieces";

export const STAFF_ROLES = [
  "manager", "assistant", "attacking_coach", "defensive_coach", "goalkeeping_coach", "fitness_coach",
  "youth_coach", "set_piece_coach", "scout", "head_of_recruitment", "physio",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface StaffAttributes {
  coaching: number; // general coaching quality 1-20
  attacking: number;
  defending: number;
  goalkeeping: number;
  fitness: number;
  youth: number;
  tactical: number;
  setPieces: number;
  judgingAbility: number;
  judgingPotential: number;
  medical: number;
  manManagement: number;
}

export interface Staff {
  id: ID;
  firstName: string;
  lastName: string;
  dob: ISODate;
  nationId: ID;
  clubId: ID | null;
  role: StaffRole;
  attributes: StaffAttributes;
  experience: number; // 1-20
  reputation: number; // 1-100
  specialisation: string;
  contract: { wage: number; startDate: ISODate; endDate: ISODate } | null;
  preferredFormation: string | null;
  isUser: boolean;
  source: "dataset" | "generated";
}

export interface Nation {
  id: ID;
  name: string;
  code: string; // 3-letter code
  continent: string;
  reputation: number; // 1-100
  youthRating: number; // 1-20
  namePool: string; // key into name generator pools
}

export type ClubStrategy = "title_contender" | "continental_challenger" | "mid_table" | "relegation_battler" | "youth_development" | "financially_constrained";

export interface ClubFinance {
  balance: number;
  transferBudget: number;
  wageBudget: number; // weekly
  debt: number;
  loans: FinanceLoan[];
  overdraftLimit: number;
  ticketPrice: number;
  seasonTicketHolders: number;
  revenueSeason: Record<string, number>;
  expenseSeason: Record<string, number>;
}

export interface FinanceLoan {
  id: ID;
  principal: number;
  remaining: number;
  interestRate: number; // annual
  monthlyPayment: number;
  startDate: ISODate;
  endDate: ISODate;
}

export type KitSlot = "home" | "away" | "third" | "goalkeeper";
export type KitPattern = "solid" | "stripes" | "hoops" | "halves" | "sash" | "chevron" | "pinstripes" | "quarters";

export interface ClubKit {
  slot: KitSlot;
  primary: string;
  secondary: string;
  accent: string;
  pattern: KitPattern;
  collar: "crew" | "v" | "polo";
  sleeves: "matching" | "contrast";
  shorts: string;
  socks: string;
  manufacturer: string;
  sponsorText: string;
}

export type SponsorSlot = "shirt" | "sleeve" | "kit_manufacturer" | "stadium_naming" | "commercial";

export interface SponsorDeal {
  id: ID;
  clubId: ID;
  sponsorId: ID;
  slot: SponsorSlot;
  annualValue: number;
  startDate: ISODate;
  endDate: ISODate;
  bonusLeagueTitle: number;
  bonusTopFour: number;
  bonusCupWin: number;
}

export interface SponsorCompany {
  id: ID;
  name: string;
  industry: string;
  wealth: number; // 1-20 how much they can pay
  minReputation: number;
  fictional: boolean;
}

export interface Facilities {
  training: number; // 1-20
  youth: number; // academy facilities 1-20
  youthRecruitment: number; // 1-20
  medical: number; // 1-20
}

export interface TrainingSchedule {
  focus: "balanced" | "attacking" | "defending" | "tactical" | "physical" | "set_pieces" | "recovery" | "match_prep";
  intensity: 1 | 2 | 3 | 4 | 5;
  youthIntensity: 1 | 2 | 3 | 4 | 5;
}

export interface Selection {
  tacticId: ID;
  /** slotId -> playerId */
  starters: Record<string, ID>;
  bench: ID[];
  captainId: ID | null;
  penaltyTakerId: ID | null;
  freeKickTakerId: ID | null;
  cornerTakerId: ID | null;
  /** If true the assistant fills gaps (injury, suspension) automatically before a match. */
  autoFill: boolean;
}

export interface Club {
  id: ID;
  name: string;
  shortName: string;
  code: string;
  nationId: ID;
  leagueId: ID | null; // current domestic league competition
  reputation: number; // 1-100
  strategy: ClubStrategy;
  founded: number | null;
  colors: { primary: string; secondary: string };
  stadiumId: ID;
  /** Temporary home ground while the club's stadium is being rebuilt. */
  tempStadiumId: ID | null;
  facilities: Facilities;
  finance: ClubFinance;
  kits: ClubKit[];
  tactics: TacticalSystem[];
  selection: Selection | null;
  training: TrainingSchedule;
  managerId: ID | null;
  boardConfidence: number; // 0-100
  supporterMood: number; // 0-100
  isUser: boolean;
  aiTransferActivity: { windowKey: string; signings: number; sales: number };
  youthIntakeDate: string; // MM-DD
  source: "dataset" | "generated";
  dataCoverage: { squad: boolean; staff: boolean; stadium: boolean; finance: boolean };
}

export interface StadiumProject {
  id: ID;
  type: "expansion" | "renovation" | "new_stadium" | "pitch" | "lighting" | "hospitality" | "vip" | "facilities";
  description: string;
  cost: number;
  startDate: ISODate;
  endDate: ISODate;
  capacityDelta: number;
  /** Capacity unavailable while the works are running. */
  capacityReduction: number;
  requiresRelocation: boolean;
  levelTarget: number | null;
  paid: number;
}

export interface Stadium {
  id: ID;
  name: string;
  city: string;
  capacity: number;
  seatedRatio: number; // 0-1
  pitchQuality: number; // 0-100
  lighting: number; // 1-5
  facilities: number; // 1-5 (concessions/toilets etc.)
  hospitality: number; // 1-5
  vipBoxes: number;
  condition: number; // 0-100 structural condition
  maintenanceLevel: 1 | 2 | 3; // budget level
  namingRightsName: string | null;
  projects: StadiumProject[];
  ownerClubId: ID | null;
  source: "dataset" | "generated";
}

// ---------------------------------------------------------------------------
// Tactics
// ---------------------------------------------------------------------------

export type Duty = "defend" | "support" | "attack";

export interface PlayerInstructions {
  /** -1 = less, 0 = default, 1 = more */
  passRisk: -1 | 0 | 1;
  dribble: -1 | 0 | 1;
  shoot: -1 | 0 | 1;
  cross: -1 | 0 | 1;
  press: -1 | 0 | 1;
  forwardRuns: -1 | 0 | 1;
  /** -1 = cut inside / narrow, 1 = stay wide */
  width: -1 | 0 | 1;
  tackleHarder: boolean;
  markTighter: boolean;
  holdPosition: boolean;
}

export interface TacticSlot {
  id: string;
  /** Natural position label used for familiarity checks. */
  position: Position;
  role: string; // RoleId (see tactics/roles.ts)
  duty: Duty;
  /** Coordinates on a 0–100 grid; x = own goal (0) → opponent goal (100), y = left (0) → right (100). */
  inPossession: { x: number; y: number };
  outOfPossession: { x: number; y: number };
  instructions: PlayerInstructions;
}

export type Level = 1 | 2 | 3 | 4 | 5;

export interface TeamInstructions {
  mentality: Level;
  pressing: Level;
  defensiveLine: Level;
  width: Level;
  tempo: Level;
  passingRisk: Level;
  buildUp: "short" | "balanced" | "direct";
  focus: "left" | "balanced" | "centre" | "right";
  attackingTransition: "counter" | "balanced" | "hold_shape";
  defensiveTransition: "counter_press" | "balanced" | "regroup";
  offsideTrap: boolean;
  timeWasting: boolean;
  gkDistribution: "short" | "balanced" | "long" | "quick";
  crossStyle: "low" | "mixed" | "high";
}

export interface SetPieceInstructions {
  cornerDelivery: "near" | "far" | "short" | "mixed";
  playersForwardOnCorners: "few" | "normal" | "many";
  freeKickApproach: "shoot" | "mixed" | "cross";
  defendCorners: "zonal" | "man" | "mixed";
  playersBackForCounter: 1 | 2 | 3;
}

export interface TacticalSystem {
  id: ID;
  clubId: ID;
  name: string;
  formationLabel: string;
  slots: TacticSlot[];
  team: TeamInstructions;
  setPieces: SetPieceInstructions;
  familiarity: number; // 0-100 squad familiarity with this system
  createdDate: ISODate;
}

// ---------------------------------------------------------------------------
// Competitions
// ---------------------------------------------------------------------------

export type Tiebreaker = "points" | "goal_difference" | "goals_for" | "head_to_head_points" | "head_to_head_goal_difference" | "wins" | "away_goals_for";

export interface LeagueRules {
  rounds: number; // number of times each pair meets (2 = home & away)
  points: { win: number; draw: number; loss: number };
  tiebreakers: Tiebreaker[];
  promotion: { toCompetitionId: ID; places: number } | null;
  relegation: { toCompetitionId: ID; places: number } | null;
  /** Qualification spots awarded at season end. */
  qualification: { competitionId: ID; fromPosition: number; toPosition: number }[];
  prizeMoneyTop: number; // prize for champion, linearly scaled down
  tvMoneyPerClub: number; // season TV distribution
}

export interface KnockoutRoundRule {
  name: string;
  legs: 1 | 2;
}

export interface GroupStageRule {
  groups: number;
  teamsPerGroup: number;
  rounds: number;
  advancePerGroup: number;
}

export interface CupRules {
  /** Which competitions' clubs enter (all their member clubs) – for domestic cups. */
  entrantLeagueIds: ID[];
  groupStage: GroupStageRule | null;
  rounds: KnockoutRoundRule[];
  extraTime: boolean;
  penalties: boolean;
  awayGoals: boolean;
  homeAdvantageToLowerTier: boolean;
  prizeMoneyWinner: number;
  /** Max number of entrants (bracket size); extra clubs get byes into round 1 when fewer. */
  bracketSize: number;
}

export interface Competition {
  id: ID;
  name: string;
  shortName: string;
  type: "league" | "cup" | "continental";
  nationId: ID | null;
  tier: number; // 1 = top flight
  reputation: number;
  league: LeagueRules | null;
  cup: CupRules | null;
  matchday: { substitutes: number; benchSize: number };
  yellowCardBanThreshold: number; // e.g. 5 yellows => 1 match ban
  /** Weekday preference for scheduling (0 = Sunday). */
  preferredWeekday: number;
  source: "dataset" | "generated";
}

export interface TableRow {
  clubId: ID;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: ("W" | "D" | "L")[];
}

export interface CupTie {
  id: ID;
  roundIndex: number;
  homeClubId: ID; // home in first leg
  awayClubId: ID;
  fixtureIds: ID[];
  winnerId: ID | null;
  decidedBy: "normal" | "aggregate" | "extra_time" | "penalties" | "walkover" | null;
}

export interface CompetitionSeason {
  id: ID;
  competitionId: ID;
  seasonId: ID;
  clubIds: ID[];
  /** For leagues: standings; for cups with groups: group tables. */
  groups: { name: string; clubIds: ID[] }[];
  ties: CupTie[];
  currentRound: number;
  /** Planned dates per knockout round: [leg1, leg2?]. Group / league dates live on fixtures. */
  roundDates: ISODate[][];
  /** Stage the competition is in: group stage (if any) or knockout round index. */
  stage: "league" | "groups" | "knockout";
  status: "scheduled" | "in_progress" | "completed";
  championId: ID | null;
  finalPositions: ID[]; // filled at season end for leagues
}

export interface Season {
  id: ID;
  label: string; // "2026/27"
  startDate: ISODate;
  endDate: ISODate;
  transferWindows: { start: ISODate; end: ISODate }[];
  status: "active" | "completed";
}

export interface Fixture {
  id: ID;
  competitionSeasonId: ID;
  competitionId: ID;
  seasonId: ID;
  date: ISODate;
  round: number;
  roundName: string;
  homeClubId: ID;
  awayClubId: ID;
  stadiumId: ID | null;
  /** For cup ties. */
  tieId: ID | null;
  leg: 1 | 2 | null;
  groupIndex: number | null;
  status: "scheduled" | "played";
  matchId: ID | null;
  /** Knockout single-leg or 2nd leg: needs a winner. */
  requiresWinner: boolean;
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export type MatchEventType =
  | "kickoff" | "pass" | "pass_fail" | "dribble" | "dribble_fail" | "tackle" | "interception" | "press_win" | "cross" | "cross_fail"
  | "shot" | "shot_saved" | "shot_off" | "shot_blocked" | "goal" | "offside" | "foul" | "yellow" | "red" | "second_yellow"
  | "corner" | "free_kick" | "penalty" | "penalty_miss" | "penalty_saved" | "injury" | "substitution" | "tactic_change"
  | "half_time" | "full_time" | "extra_time" | "shootout_goal" | "shootout_miss" | "clearance" | "save_claim" | "counter";

export interface MatchEvent {
  minute: number;
  second: number;
  type: MatchEventType;
  side: 0 | 1; // 0 = home, 1 = away
  playerId: ID | null;
  otherPlayerId: ID | null;
  /** Ball position after the event, from home perspective (x: 0 home goal → 100 away goal). */
  x: number;
  y: number;
  xg?: number;
  text: string;
}

export interface TeamMatchStats {
  possession: number; // %
  shots: number;
  shotsOnTarget: number;
  xg: number;
  passes: number;
  passesCompleted: number;
  tackles: number;
  interceptions: number;
  fouls: number;
  corners: number;
  offsides: number;
  saves: number;
  yellow: number;
  red: number;
  crosses: number;
  dribbles: number;
  pressWins: number;
}

export interface PlayerMatchLine {
  playerId: ID;
  side: 0 | 1;
  started: boolean;
  minutes: number;
  position: Position;
  rating: number;
  goals: number;
  assists: number;
  shots: number;
  xg: number;
  passes: number;
  passesCompleted: number;
  tackles: number;
  interceptions: number;
  saves: number;
  yellow: number;
  red: number;
  fatigueEnd: number;
}

export interface MatchRecord {
  id: ID;
  fixtureId: ID;
  date: ISODate;
  homeClubId: ID;
  awayClubId: ID;
  homeGoals: number;
  awayGoals: number;
  extraTime: boolean;
  penalties: { home: number; away: number } | null;
  attendance: number;
  stats: [TeamMatchStats, TeamMatchStats];
  lines: PlayerMatchLine[];
  /** Key events (goals, cards, subs, injuries) for every match; full log only when detailed. */
  events: MatchEvent[];
  detailed: boolean;
  seed: number;
  playerOfMatchId: ID | null;
  /** Starting shapes for replaying a detailed match on the 2D pitch. */
  shapes?: { side: 0 | 1; playerId: ID; ip: { x: number; y: number }; op: { x: number; y: number } }[];
}

// ---------------------------------------------------------------------------
// Transfers & contracts
// ---------------------------------------------------------------------------

export interface TransferOffer {
  fee: number;
  upfrontPct: number; // 0-100, rest paid in 12 months
  addOnAppearances: number; // paid after 25 appearances
  addOnGoals: number; // paid after 10 goals
  sellOnPct: number; // 0-50
  exchangePlayerIds: ID[];
  type: "permanent" | "loan" | "loan_with_option";
  loanFee: number;
  loanWageSharePct: number; // % of wages paid by the borrowing club
  optionToBuyFee: number;
  loanEndDate: ISODate | null;
}

export interface ContractOffer {
  wage: number;
  years: number;
  signingBonus: number;
  appearanceBonus: number;
  goalBonus: number;
  releaseClause: number | null;
  squadRole: SquadRole;
}

export type NegotiationStatus = "open" | "club_agreed" | "contract_stage" | "completed" | "rejected" | "withdrawn" | "expired";

export interface NegotiationRound {
  date: ISODate;
  by: "user" | "ai";
  kind: "transfer" | "contract";
  transfer?: TransferOffer;
  contract?: ContractOffer;
  response: "pending" | "accepted" | "rejected" | "countered";
  message: string;
}

export interface Negotiation {
  id: ID;
  playerId: ID;
  buyingClubId: ID;
  sellingClubId: ID | null; // null => free agent
  kind: "transfer" | "renewal" | "free_agent" | "staff";
  staffId: ID | null;
  status: NegotiationStatus;
  rounds: NegotiationRound[];
  agreedTransfer: TransferOffer | null;
  agreedContract: ContractOffer | null;
  counterTransfer: TransferOffer | null;
  counterContract: ContractOffer | null;
  createdDate: ISODate;
  updatedDate: ISODate;
  /** User is the seller (incoming AI bid on user's player). */
  incoming: boolean;
  patience: number; // rounds left before talks collapse
}

export interface TransferRecord {
  id: ID;
  playerId: ID;
  fromClubId: ID | null;
  toClubId: ID | null;
  date: ISODate;
  fee: number;
  type: "permanent" | "loan" | "loan_return" | "free" | "release" | "youth_promotion" | "retirement" | "loan_option_exercised";
  seasonId: ID;
  sellOnPct: number;
  sellOnBeneficiaryClubId: ID | null;
  /** Pending conditional payments. */
  addOns: { kind: "appearances" | "goals" | "installment"; threshold: number; amount: number; paid: boolean; dueDate?: ISODate; payerClubId?: ID; payeeClubId?: ID }[];
  /** Appearances / goals made for the buying club since the transfer (for add-ons). */
  appsSince?: number;
  goalsSince?: number;
}

export interface Loan {
  id: ID;
  playerId: ID;
  parentClubId: ID;
  loanClubId: ID;
  startDate: ISODate;
  endDate: ISODate;
  wageSharePct: number;
  optionToBuyFee: number | null;
  fee: number;
  active: boolean;
}

export interface ScoutingAssignment {
  id: ID;
  clubId: ID;
  scoutId: ID | null;
  target: { kind: "player"; playerId: ID } | { kind: "nation"; nationId: ID } | { kind: "competition"; competitionId: ID };
  startDate: ISODate;
  endDate: ISODate;
  status: "active" | "completed";
  reportPlayerIds: ID[];
}

// ---------------------------------------------------------------------------
// Finance, board, history, news
// ---------------------------------------------------------------------------

export type TransactionCategory =
  | "transfer_fee_in" | "transfer_fee_out" | "loan_fee_in" | "loan_fee_out" | "player_wages" | "staff_wages" | "ticket_sales"
  | "hospitality" | "tv_revenue" | "prize_money" | "sponsorship" | "merchandise" | "stadium_maintenance" | "stadium_construction"
  | "training_costs" | "youth_costs" | "loan_received" | "loan_repayment" | "interest" | "compensation" | "signing_bonus"
  | "add_on" | "sell_on" | "scouting" | "bonus" | "other";

export interface FinancialTransaction {
  id: ID;
  clubId: ID;
  date: ISODate;
  amount: number; // positive = income, negative = expense
  category: TransactionCategory;
  description: string;
  balanceAfter: number;
  /** Unique key that prevents applying the same transaction twice. */
  idempotencyKey: string;
}

export interface BoardObjective {
  id: ID;
  clubId: ID;
  seasonId: ID;
  kind: "league_position" | "cup_round" | "wage_budget" | "youth_minutes" | "continental_round" | "net_spend";
  competitionId: ID | null;
  target: number;
  description: string;
  importance: "low" | "medium" | "high" | "critical";
  status: "pending" | "met" | "failed";
  progress: number | null;
}

export interface Trophy {
  id: ID;
  clubId: ID;
  competitionId: ID;
  seasonId: ID;
  seasonLabel: string;
}

export interface PlayerCareerEntry {
  id: ID;
  playerId: ID;
  seasonId: ID;
  seasonLabel: string;
  clubId: ID | null;
  apps: number;
  goals: number;
  assists: number;
  avgRating: number;
  overall: number;
  potential: number;
  value: number;
}

export interface ClubSeasonEntry {
  id: ID;
  clubId: ID;
  seasonId: ID;
  seasonLabel: string;
  competitionId: ID | null;
  position: number | null;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  cupResults: { competitionId: ID; reached: string }[];
  revenue: number;
  expenses: number;
  managerId: ID | null;
}

export interface NewsItem {
  id: ID;
  date: ISODate;
  category: "match" | "transfer" | "injury" | "board" | "finance" | "youth" | "staff" | "competition" | "contract" | "general" | "stadium" | "sponsor";
  title: string;
  body: string;
  clubIds: ID[];
  playerIds: ID[];
  read: boolean;
  important: boolean;
}

export interface YouthIntakeRecord {
  id: ID;
  clubId: ID;
  date: ISODate;
  playerIds: ID[];
}

export interface DevelopmentSnapshot {
  playerId: ID;
  date: ISODate;
  overall: number;
  potential: number;
}

export interface UserManager {
  staffId: ID;
  name: string;
  clubId: ID | null;
  contractEnd: ISODate | null;
  wage: number;
  reputation: number;
  sacked: boolean;
  jobOffers: ID[];
}

export interface WorldMeta {
  careerId: ID;
  saveName: string;
  createdAt: string;
  gameVersion: string;
  schemaVersion: number;
  dataset: { id: string; label: string; isReal: boolean; version: string; coverageNote: string };
  seed: number;
  rngState: number;
  currentDate: ISODate;
  lastProcessedDate: ISODate | null;
  currentSeasonId: ID;
  userClubId: ID;
  idCounter: number;
  autosaveEveryDays: number;
  daysSinceAutosave: number;
}

// ---------------------------------------------------------------------------
// Career-mode layer: awards, player conversations
// ---------------------------------------------------------------------------

export type AwardKind = "player_of_month" | "manager_of_month" | "golden_boot" | "player_of_season" | "young_player" | "team_of_season" | "golden_ball" | "club_player_of_season";

export interface Award {
  id: ID;
  kind: AwardKind;
  competitionId: ID | null;
  seasonId: ID;
  /** "September 2026" or "2026/27". */
  label: string;
  playerId: ID | null;
  clubId: ID | null;
  note: string;
}

export type ConversationTopic = "playing_time" | "contract" | "wants_move";

export interface ConversationOption {
  id: string;
  text: string;
  hint: string;
}

export interface PlayerConversation {
  id: ID;
  date: ISODate;
  playerId: ID;
  topic: ConversationTopic;
  message: string;
  options: ConversationOption[];
  status: "open" | "resolved" | "expired";
  chosen: string | null;
  outcome: string | null;
  /** A playing-time promise: start at least `target` of the club's next `window` matches. */
  promise: { target: number; window: number; startsAtPromise: number; matchesAtPromise: number } | null;
}

export interface CareerState {
  awards: Award[];
  conversations: PlayerConversation[];
  /** Per-player stat snapshot at the start of the month (league only): goals, assists, apps, ratingSum, cleanSheets. */
  monthSnap: Record<ID, [number, number, number, number, number]>;
}

export interface World {
  meta: WorldMeta;
  manager: UserManager;
  nations: Record<ID, Nation>;
  clubs: Record<ID, Club>;
  players: Record<ID, Player>;
  staff: Record<ID, Staff>;
  stadiums: Record<ID, Stadium>;
  competitions: Record<ID, Competition>;
  seasons: Record<ID, Season>;
  competitionSeasons: Record<ID, CompetitionSeason>;
  fixtures: Record<ID, Fixture>;
  matches: Record<ID, MatchRecord>;
  negotiations: Record<ID, Negotiation>;
  transfers: TransferRecord[];
  loans: Record<ID, Loan>;
  scouting: Record<ID, ScoutingAssignment>;
  /** player ids the user's club has full knowledge of (scouted / own league). */
  scoutedPlayerIds: Record<ID, ISODate>;
  sponsors: Record<ID, SponsorCompany>;
  sponsorDeals: Record<ID, SponsorDeal>;
  sponsorOffers: SponsorDeal[];
  transactions: FinancialTransaction[];
  objectives: Record<ID, BoardObjective>;
  trophies: Trophy[];
  playerHistory: PlayerCareerEntry[];
  clubHistory: ClubSeasonEntry[];
  news: NewsItem[];
  youthIntakes: YouthIntakeRecord[];
  development: DevelopmentSnapshot[];
  /** Idempotency keys already applied to finances. */
  appliedTransactionKeys: Record<string, true>;
  /** Qualified clubs for next season's continental competitions, computed at season end. */
  qualifiers: Record<ID, ID[]>;
  /** Career-mode extras (awards, player conversations). */
  career: CareerState;
  /** User-saved formation templates (reusable across tactical systems). */
  savedFormations: SavedFormation[];
}

export interface SavedFormation {
  id: ID;
  name: string;
  slots: TacticSlot[];
  createdDate: ISODate;
}
