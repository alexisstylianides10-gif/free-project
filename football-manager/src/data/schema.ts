import { z } from "zod";
import { ATTRIBUTE_KEYS, POSITIONS, STAFF_ROLES } from "@/engine/core/types";
import { isValidISODate } from "@/engine/core/dates";

/**
 * Offline football data package format ("touchline-dataset" v1).
 *
 * A dataset is an immutable base database. Careers copy it into their own
 * save, so imports never mutate running careers.
 */
const isoDate = z.string().refine(isValidISODate, { message: "must be a valid YYYY-MM-DD date" });
const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_\-.:]+$/, "ids may only contain letters, digits, _ - . :");
const rating20 = z.number().int().min(1).max(20);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #RRGGBB colour");

export const attributesSchema = z.object(Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, rating20])) as Record<(typeof ATTRIBUTE_KEYS)[number], typeof rating20>);

export const nationSchema = z.object({
  id,
  name: z.string().min(1),
  code: z.string().min(2).max(3),
  continent: z.string().min(1),
  reputation: z.number().int().min(1).max(100),
  youthRating: rating20.default(10),
  namePool: z.string().default("anglic"),
});

export const competitionSchema = z.object({
  id,
  name: z.string().min(1),
  shortName: z.string().min(1).max(12),
  type: z.enum(["league", "cup", "continental"]),
  nationId: id.nullable(),
  tier: z.number().int().min(1).max(20),
  reputation: z.number().int().min(1).max(100),
  league: z.object({
    rounds: z.number().int().min(1).max(4),
    points: z.object({ win: z.number().int(), draw: z.number().int(), loss: z.number().int() }),
    tiebreakers: z.array(z.enum(["points", "goal_difference", "goals_for", "head_to_head_points", "head_to_head_goal_difference", "wins", "away_goals_for"])).min(1),
    promotion: z.object({ toCompetitionId: id, places: z.number().int().min(1) }).nullable(),
    relegation: z.object({ toCompetitionId: id, places: z.number().int().min(1) }).nullable(),
    qualification: z.array(z.object({ competitionId: id, fromPosition: z.number().int().min(1), toPosition: z.number().int().min(1) })),
    prizeMoneyTop: z.number().min(0),
    tvMoneyPerClub: z.number().min(0),
  }).nullable(),
  cup: z.object({
    entrantLeagueIds: z.array(id),
    groupStage: z.object({ groups: z.number().int().min(1), teamsPerGroup: z.number().int().min(2), rounds: z.number().int().min(1).max(2), advancePerGroup: z.number().int().min(1).max(2) }).nullable(),
    rounds: z.array(z.object({ name: z.string(), legs: z.union([z.literal(1), z.literal(2)]) })).min(1),
    extraTime: z.boolean(),
    penalties: z.boolean(),
    awayGoals: z.boolean(),
    homeAdvantageToLowerTier: z.boolean(),
    prizeMoneyWinner: z.number().min(0),
    bracketSize: z.number().int().min(2),
  }).nullable(),
  matchday: z.object({ substitutes: z.number().int().min(0).max(11), benchSize: z.number().int().min(0).max(15) }),
  yellowCardBanThreshold: z.number().int().min(1).max(20),
  preferredWeekday: z.number().int().min(0).max(6),
});

export const stadiumSchema = z.object({
  id,
  name: z.string().min(1),
  city: z.string().default(""),
  capacity: z.number().int().min(100).max(150_000),
  seatedRatio: z.number().min(0).max(1).default(1),
  pitchQuality: z.number().min(0).max(100).default(75),
  lighting: z.number().int().min(1).max(5).default(3),
  facilities: z.number().int().min(1).max(5).default(3),
  hospitality: z.number().int().min(1).max(5).default(2),
  vipBoxes: z.number().int().min(0).default(0),
});

export const clubSchema = z.object({
  id,
  name: z.string().min(1),
  shortName: z.string().min(1),
  code: z.string().min(2).max(4),
  nationId: id,
  leagueId: id.nullable(),
  reputation: z.number().int().min(1).max(100),
  founded: z.number().int().min(1800).max(2100).nullable().default(null),
  colors: z.object({ primary: hex, secondary: hex }),
  stadiumId: id,
  facilities: z.object({ training: rating20, youth: rating20, youthRecruitment: rating20, medical: rating20 }),
  finance: z.object({ balance: z.number(), transferBudget: z.number().min(0), wageBudget: z.number().min(0), debt: z.number().min(0).default(0), ticketPrice: z.number().min(0).default(30) }),
  strategy: z.enum(["title_contender", "continental_challenger", "mid_table", "relegation_battler", "youth_development", "financially_constrained"]).optional(),
});

export const playerSchema = z.object({
  id,
  firstName: z.string(),
  lastName: z.string().min(1),
  dob: isoDate,
  nationId: id,
  clubId: id.nullable(),
  position: z.enum(POSITIONS),
  altPositions: z.array(z.enum(POSITIONS)).default([]),
  foot: z.enum(["L", "R", "B"]).default("R"),
  heightCm: z.number().int().min(140).max(220).default(180),
  attributes: attributesSchema,
  potential: z.number().int().min(1).max(100),
  personality: z.object({ professionalism: rating20, ambition: rating20, temperament: rating20, consistency: rating20, injuryProneness: rating20 }).optional(),
  contract: z.object({ wage: z.number().min(0), endDate: isoDate, releaseClause: z.number().min(0).nullable().default(null), startDate: isoDate.optional() }).nullable(),
});

export const staffSchema = z.object({
  id,
  firstName: z.string(),
  lastName: z.string().min(1),
  dob: isoDate,
  nationId: id,
  clubId: id.nullable(),
  role: z.enum(STAFF_ROLES),
  attributes: z.object({
    coaching: rating20, attacking: rating20, defending: rating20, goalkeeping: rating20, fitness: rating20, youth: rating20, tactical: rating20,
    setPieces: rating20, judgingAbility: rating20, judgingPotential: rating20, medical: rating20, manManagement: rating20,
  }),
  experience: rating20,
  reputation: z.number().int().min(1).max(100),
  specialisation: z.string().default(""),
  contract: z.object({ wage: z.number().min(0), endDate: isoDate }).nullable(),
  preferredFormation: z.string().nullable().default(null),
});

export const sponsorSchema = z.object({
  id,
  name: z.string().min(1),
  industry: z.string().default("General"),
  wealth: rating20,
  minReputation: z.number().int().min(0).max(100),
});

export const datasetMetaSchema = z.object({
  id,
  name: z.string().min(1),
  version: z.string().min(1),
  season: z.string().regex(/^\d{4}\/\d{2}$/, "season must look like 2026/27"),
  startDate: isoDate,
  isReal: z.boolean(),
  license: z.string().min(1),
  source: z.string().min(1),
  coverageNote: z.string().default(""),
});

export const datasetSchema = z.object({
  format: z.literal("touchline-dataset"),
  formatVersion: z.literal(1),
  meta: datasetMetaSchema,
  nations: z.array(nationSchema).min(1),
  competitions: z.array(competitionSchema).min(1),
  stadiums: z.array(stadiumSchema),
  clubs: z.array(clubSchema).min(2),
  players: z.array(playerSchema),
  staff: z.array(staffSchema).default([]),
  sponsors: z.array(sponsorSchema).default([]),
  /** Initial entrants for continental competitions in the starting season. */
  initialQualifiers: z.record(z.string(), z.array(id)).default({}),
});

export type Dataset = z.infer<typeof datasetSchema>;
export type DatasetInput = z.input<typeof datasetSchema>;
export type DatasetPlayer = z.infer<typeof playerSchema>;
export type DatasetClub = z.infer<typeof clubSchema>;
