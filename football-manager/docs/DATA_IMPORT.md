# Football data import

Touchline Manager plays on an **installed dataset** (a base database). Datasets are imported
offline; nothing is scraped or downloaded. A career copies the dataset when it starts, so
importing or updating a dataset never changes careers that already exist.

The repository includes only the fictional *Development World*. To play with real 2026/27
data you need a source you are licensed to use (e.g. your own compilation or a commercial
licence). Do **not** set `"isReal": true` on data that is not real and accurate — the UI uses
that flag to tell players what they are looking at.

## Accepted inputs

1. **One JSON package** (`*.json`) in the `touchline-dataset` v1 format below, or
2. **A bundle**: `meta.json` + `competitions.json` (+ optional `qualifiers.json`) together with
   CSV files `nations.csv`, `stadiums.csv`, `clubs.csv`, `players.csv`, `staff.csv`, `sponsors.csv`.
3. **An update**: CSV files applied on top of an installed dataset ("Apply CSV files as an update
   to …"). Rows are upserted by `id`; the result is installed as a new dataset version (change
   `meta.json`'s `id`/`version` if you include it).

Validation runs before anything is stored. The import is all-or-nothing: if there is at least
one error, nothing is installed (rollback). Warnings (e.g. incomplete squads) are reported but
do not block the import.

### Checks performed

- Schema / types / ranges with field-level messages (e.g. `Missing required field "lastName"`).
- Duplicate ids per entity, and ids shared between players and staff.
- Possible duplicate people (same first name, last name and date of birth) — warning.
- Referential integrity: nations, leagues, stadiums, clubs, competition links (promotion,
  relegation, qualification, cup entrants), initial continental qualifiers.
- Competition structure sanity (bracket size vs. rounds, group-stage sizes).
- Coverage report: leagues, clubs with ≥18 players, clubs with staff, players with contracts.

CLI: `npm run data:validate -- file1 file2 ...` (exit code 1 on errors).

## JSON format (`touchline-dataset` v1)

```jsonc
{
  "format": "touchline-dataset",
  "formatVersion": 1,
  "meta": {
    "id": "my-dataset-2026",          // [A-Za-z0-9_-.:]
    "name": "My 2026/27 database",
    "version": "1.0.0",
    "season": "2026/27",
    "startDate": "2026-07-01",        // career start date
    "isReal": true,                    // only for accurate real-world data
    "license": "…",                    // who may use it and how
    "source": "…",
    "coverageNote": "…"               // shown in the UI
  },
  "nations": [ { "id", "name", "code", "continent", "reputation" (1-100), "youthRating" (1-20), "namePool" } ],
  "competitions": [ /* see below */ ],
  "stadiums": [ { "id", "name", "city", "capacity", "seatedRatio"?, "pitchQuality"?, "lighting"?, "facilities"?, "hospitality"?, "vipBoxes"? } ],
  "clubs": [ {
      "id", "name", "shortName", "code", "nationId", "leagueId" | null, "reputation" (1-100), "founded"?,
      "colors": { "primary": "#RRGGBB", "secondary": "#RRGGBB" }, "stadiumId",
      "facilities": { "training", "youth", "youthRecruitment", "medical" },      // 1-20
      "finance": { "balance", "transferBudget", "wageBudget" /* weekly */, "debt"?, "ticketPrice"? },
      "strategy"?: "title_contender" | "continental_challenger" | "mid_table" | "relegation_battler" | "youth_development" | "financially_constrained"
  } ],
  "players": [ {
      "id", "firstName", "lastName", "dob" (YYYY-MM-DD), "nationId", "clubId" | null,
      "position": "GK|LB|CB|RB|LWB|RWB|DM|LM|CM|RM|AM|LW|RW|ST", "altPositions"?: [...],
      "foot"?: "L|R|B", "heightCm"?, "potential" (1-100, estimated peak overall),
      "attributes": { /* all 34 keys below, integers 1-20 */ },
      "personality"?: { "professionalism", "ambition", "temperament", "consistency", "injuryProneness" },
      "contract": { "wage" /* weekly */, "endDate", "releaseClause"? } | null
  } ],
  "staff": [ { "id", "firstName", "lastName", "dob", "nationId", "clubId" | null, "role", "attributes": { … 12 keys … }, "experience", "reputation", "specialisation"?, "contract": { "wage", "endDate" } | null, "preferredFormation"? } ],
  "sponsors": [ { "id", "name", "industry", "wealth" (1-20), "minReputation" } ],
  "initialQualifiers": { "<continental competition id>": ["club ids", …] }
}
```

Player attribute keys (1–20): `crossing dribbling finishing firstTouch heading longShots marking
passing tackling technique freeKicks penalties aggression anticipation composure decisions
positioning offTheBall vision workRate teamwork leadership pace acceleration agility stamina
strength jumping naturalFitness reflexes handling oneOnOnes aerialReach commandOfArea kicking`.

Staff roles: `manager assistant attacking_coach defensive_coach goalkeeping_coach fitness_coach
youth_coach set_piece_coach scout head_of_recruitment physio`.
Staff attribute keys (1–20): `coaching attacking defending goalkeeping fitness youth tactical
setPieces judgingAbility judgingPotential medical manManagement`.

### Competitions (configurable rules — nothing is hard-coded to one country)

```jsonc
{
  "id": "eng1", "name": "…", "shortName": "…", "type": "league" | "cup" | "continental",
  "nationId": "…" | null, "tier": 1, "reputation": 90,
  "league": {                                   // leagues only
    "rounds": 2,                                // 2 = home and away
    "points": { "win": 3, "draw": 1, "loss": 0 },
    "tiebreakers": ["points", "goal_difference", "goals_for"],   // also head_to_head_points, head_to_head_goal_difference, wins, away_goals_for
    "promotion": { "toCompetitionId": "…", "places": 3 } | null,
    "relegation": { "toCompetitionId": "…", "places": 3 } | null,
    "qualification": [ { "competitionId": "…", "fromPosition": 1, "toPosition": 4 } ],
    "prizeMoneyTop": 30000000, "tvMoneyPerClub": 40000000
  },
  "cup": {                                      // cups & continental
    "entrantLeagueIds": ["…"],                  // domestic cups: all clubs of these leagues enter
    "groupStage": { "groups": 8, "teamsPerGroup": 4, "rounds": 2, "advancePerGroup": 2 } | null,
    "rounds": [ { "name": "Round of 16", "legs": 2 }, { "name": "Final", "legs": 1 } ],
    "extraTime": true, "penalties": true, "awayGoals": false, "homeAdvantageToLowerTier": true,
    "prizeMoneyWinner": 5000000, "bracketSize": 32
  },
  "matchday": { "substitutes": 5, "benchSize": 9 },
  "yellowCardBanThreshold": 5,
  "preferredWeekday": 6                         // 0 Sunday … 6 Saturday
}
```

**Missing data is never invented silently.** If a club has fewer than 18 players, the career
fills the gaps with generated players that are flagged `Generated` in every list. Starting
league positions are not imported (the season starts from 0 points) and fixtures are generated
from the rules because no licensed fixture list is included.

## CSV columns

- `nations.csv`: `id,name,code,continent,reputation,youthRating,namePool`
- `stadiums.csv`: `id,name,city,capacity,seatedRatio,pitchQuality,lighting,facilities,hospitality,vipBoxes`
- `clubs.csv`: `id,name,shortName,code,nationId,leagueId,reputation,founded,primaryColor,secondaryColor,stadiumId,training,youth,youthRecruitment,medical,balance,transferBudget,wageBudget,debt,ticketPrice,strategy`
- `players.csv`: `id,firstName,lastName,dob,nationId,clubId,position,altPositions,foot,heightCm,potential,wage,contractEnd,releaseClause,` + the 34 attribute columns. `altPositions` is `|`-separated; leave `wage` empty for free agents.
- `staff.csv`: `id,firstName,lastName,dob,nationId,clubId,role,experience,reputation,specialisation,wage,contractEnd,preferredFormation,` + the 12 staff attribute columns.
- `sponsors.csv`: `id,name,industry,wealth,minReputation`

CSV is RFC 4180 (quoted fields, `""` escapes, UTF-8, optional BOM).

## Branding

Kits and crests are drawn generically (colours, patterns, initials). Do not include logos or
trademarks you are not licensed to use; sponsor names in a dataset are displayed as text only.
