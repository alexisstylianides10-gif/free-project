-- CreateTable
CREATE TABLE "SchemaMigration" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "appliedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GameVersion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameVersion" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "savedAt" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Career" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveName" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "datasetLabel" TEXT NOT NULL,
    "datasetIsReal" BOOLEAN NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "coverageNote" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "rngState" INTEGER NOT NULL,
    "currentDate" TEXT NOT NULL,
    "lastProcessedDate" TEXT,
    "currentSeasonId" TEXT NOT NULL,
    "userClubId" TEXT NOT NULL,
    "idCounter" INTEGER NOT NULL,
    "autosaveEveryDays" INTEGER NOT NULL,
    "daysSinceAutosave" INTEGER NOT NULL,
    "qualifiersJson" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserManager" (
    "staffId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "clubId" TEXT,
    "contractEnd" TEXT,
    "wage" INTEGER NOT NULL,
    "reputation" INTEGER NOT NULL,
    "sacked" BOOLEAN NOT NULL,
    "jobOffersJson" TEXT NOT NULL,
    CONSTRAINT "UserManager_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserManager_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Nation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "continent" TEXT NOT NULL,
    "reputation" INTEGER NOT NULL,
    "youthRating" INTEGER NOT NULL,
    "namePool" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Stadium" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "seatedRatio" REAL NOT NULL,
    "pitchQuality" REAL NOT NULL,
    "lighting" INTEGER NOT NULL,
    "facilities" INTEGER NOT NULL,
    "hospitality" INTEGER NOT NULL,
    "vipBoxes" INTEGER NOT NULL,
    "condition" REAL NOT NULL,
    "maintenanceLevel" INTEGER NOT NULL,
    "namingRightsName" TEXT,
    "ownerClubId" TEXT,
    "source" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "StadiumProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stadiumId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "capacityDelta" INTEGER NOT NULL,
    "capacityReduction" INTEGER NOT NULL,
    "requiresRelocation" BOOLEAN NOT NULL,
    "levelTarget" INTEGER,
    "paid" INTEGER NOT NULL,
    CONSTRAINT "StadiumProject_stadiumId_fkey" FOREIGN KEY ("stadiumId") REFERENCES "Stadium" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nationId" TEXT,
    "tier" INTEGER NOT NULL,
    "reputation" INTEGER NOT NULL,
    "cupJson" TEXT,
    "matchdayJson" TEXT NOT NULL,
    "yellowCardBanThreshold" INTEGER NOT NULL,
    "preferredWeekday" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    CONSTRAINT "Competition_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "League" (
    "competitionId" TEXT NOT NULL PRIMARY KEY,
    "rounds" INTEGER NOT NULL,
    "pointsJson" TEXT NOT NULL,
    "tiebreakersJson" TEXT NOT NULL,
    "promotionJson" TEXT,
    "relegationJson" TEXT,
    "qualificationJson" TEXT NOT NULL,
    "prizeMoneyTop" INTEGER NOT NULL,
    "tvMoneyPerClub" INTEGER NOT NULL,
    CONSTRAINT "League_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nationId" TEXT NOT NULL,
    "leagueId" TEXT,
    "reputation" INTEGER NOT NULL,
    "strategy" TEXT NOT NULL,
    "founded" INTEGER,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "stadiumId" TEXT NOT NULL,
    "tempStadiumId" TEXT,
    "boardConfidence" REAL NOT NULL,
    "supporterMood" REAL NOT NULL,
    "isUser" BOOLEAN NOT NULL,
    "aiActivityJson" TEXT NOT NULL,
    "youthIntakeDate" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "coverageJson" TEXT NOT NULL,
    "selectionJson" TEXT,
    CONSTRAINT "Club_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Club_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "Competition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Club_stadiumId_fkey" FOREIGN KEY ("stadiumId") REFERENCES "Stadium" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Club_tempStadiumId_fkey" FOREIGN KEY ("tempStadiumId") REFERENCES "Stadium" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingFacility" (
    "clubId" TEXT NOT NULL PRIMARY KEY,
    "training" INTEGER NOT NULL,
    "youth" INTEGER NOT NULL,
    "youthRecruitment" INTEGER NOT NULL,
    "medical" INTEGER NOT NULL,
    CONSTRAINT "TrainingFacility_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingSchedule" (
    "clubId" TEXT NOT NULL PRIMARY KEY,
    "focus" TEXT NOT NULL,
    "intensity" INTEGER NOT NULL,
    "youthIntensity" INTEGER NOT NULL,
    CONSTRAINT "TrainingSchedule_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClubFinance" (
    "clubId" TEXT NOT NULL PRIMARY KEY,
    "balance" INTEGER NOT NULL,
    "transferBudget" INTEGER NOT NULL,
    "wageBudget" INTEGER NOT NULL,
    "debt" INTEGER NOT NULL,
    "overdraftLimit" INTEGER NOT NULL,
    "ticketPrice" INTEGER NOT NULL,
    "seasonTicketHolders" INTEGER NOT NULL,
    "revenueSeasonJson" TEXT NOT NULL,
    "expenseSeasonJson" TEXT NOT NULL,
    CONSTRAINT "ClubFinance_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClubLoan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "principal" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "interestRate" REAL NOT NULL,
    "monthlyPayment" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    CONSTRAINT "ClubLoan_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClubKit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "primary" TEXT NOT NULL,
    "secondary" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "collar" TEXT NOT NULL,
    "sleeves" TEXT NOT NULL,
    "shorts" TEXT NOT NULL,
    "socks" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "sponsorText" TEXT NOT NULL,
    CONSTRAINT "ClubKit_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "nationId" TEXT NOT NULL,
    "clubId" TEXT,
    "loanParentClubId" TEXT,
    "position" TEXT NOT NULL,
    "altPositionsJson" TEXT NOT NULL,
    "foot" TEXT NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "attributesJson" TEXT NOT NULL,
    "potential" INTEGER NOT NULL,
    "personalityJson" TEXT NOT NULL,
    "squadStatus" TEXT NOT NULL,
    "askingPrice" INTEGER,
    "fitness" REAL NOT NULL,
    "fatigue" REAL NOT NULL,
    "morale" REAL NOT NULL,
    "form" REAL NOT NULL,
    "sharpness" REAL NOT NULL,
    "tacticalFamiliarity" REAL NOT NULL,
    "yellowAccJson" TEXT NOT NULL,
    "seasonStatsJson" TEXT NOT NULL,
    "trainingFocus" TEXT NOT NULL,
    "retrainPosition" TEXT,
    "retired" BOOLEAN NOT NULL,
    "generated" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "happiness" REAL NOT NULL,
    CONSTRAINT "Player_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Player_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Player_loanParentClubId_fkey" FOREIGN KEY ("loanParentClubId") REFERENCES "Club" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "playerId" TEXT NOT NULL PRIMARY KEY,
    "wage" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "releaseClause" INTEGER,
    "squadRole" TEXT NOT NULL,
    "appearanceBonus" INTEGER NOT NULL,
    "goalBonus" INTEGER NOT NULL,
    "youth" BOOLEAN NOT NULL,
    CONSTRAINT "Contract_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Injury" (
    "playerId" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "until" TEXT NOT NULL,
    CONSTRAINT "Injury_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Suspension" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "competitionId" TEXT,
    "matches" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    CONSTRAINT "Suspension_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Suspension_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "nationId" TEXT NOT NULL,
    "clubId" TEXT,
    "role" TEXT NOT NULL,
    "attributesJson" TEXT NOT NULL,
    "experience" INTEGER NOT NULL,
    "reputation" INTEGER NOT NULL,
    "specialisation" TEXT NOT NULL,
    "contractWage" INTEGER,
    "contractStart" TEXT,
    "contractEnd" TEXT,
    "preferredFormation" TEXT,
    "isUser" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    CONSTRAINT "Staff_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Staff_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Manager" (
    "clubId" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    CONSTRAINT "Manager_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Manager_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TacticalSystem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formationLabel" TEXT NOT NULL,
    "teamJson" TEXT NOT NULL,
    "setPiecesJson" TEXT NOT NULL,
    "familiarity" REAL NOT NULL,
    "createdDate" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    CONSTRAINT "TacticalSystem_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TacticalInstruction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tacticId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "duty" TEXT NOT NULL,
    "ipX" REAL NOT NULL,
    "ipY" REAL NOT NULL,
    "opX" REAL NOT NULL,
    "opY" REAL NOT NULL,
    "instructionsJson" TEXT NOT NULL,
    CONSTRAINT "TacticalInstruction_tacticId_fkey" FOREIGN KEY ("tacticId") REFERENCES "TacticalSystem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedFormation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slotsJson" TEXT NOT NULL,
    "createdDate" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "windowsJson" TEXT NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CompetitionSeason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "clubIdsJson" TEXT NOT NULL,
    "groupsJson" TEXT NOT NULL,
    "tiesJson" TEXT NOT NULL,
    "currentRound" INTEGER NOT NULL,
    "roundDatesJson" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "championId" TEXT,
    "finalPositionsJson" TEXT NOT NULL,
    CONSTRAINT "CompetitionSeason_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompetitionSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitionSeasonId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "roundName" TEXT NOT NULL,
    "homeClubId" TEXT NOT NULL,
    "awayClubId" TEXT NOT NULL,
    "stadiumId" TEXT,
    "tieId" TEXT,
    "leg" INTEGER,
    "groupIndex" INTEGER,
    "status" TEXT NOT NULL,
    "matchId" TEXT,
    "requiresWinner" BOOLEAN NOT NULL,
    CONSTRAINT "Fixture_competitionSeasonId_fkey" FOREIGN KEY ("competitionSeasonId") REFERENCES "CompetitionSeason" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Fixture_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Fixture_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Fixture_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Fixture_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "homeClubId" TEXT NOT NULL,
    "awayClubId" TEXT NOT NULL,
    "homeGoals" INTEGER NOT NULL,
    "awayGoals" INTEGER NOT NULL,
    "extraTime" BOOLEAN NOT NULL,
    "penaltiesJson" TEXT,
    "attendance" INTEGER NOT NULL,
    "statsJson" TEXT NOT NULL,
    "linesJson" TEXT NOT NULL,
    "detailed" BOOLEAN NOT NULL,
    "seed" INTEGER NOT NULL,
    "playerOfMatchId" TEXT,
    "shapesJson" TEXT,
    CONSTRAINT "Match_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "second" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "side" INTEGER NOT NULL,
    "playerId" TEXT,
    "otherPlayerId" TEXT,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "xg" REAL,
    "text" TEXT NOT NULL,
    CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "fromClubId" TEXT,
    "toClubId" TEXT,
    "date" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "sellOnPct" REAL NOT NULL,
    "sellOnBeneficiaryClubId" TEXT,
    "addOnsJson" TEXT NOT NULL,
    "appsSince" INTEGER,
    "goalsSince" INTEGER,
    CONSTRAINT "Transfer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_fromClubId_fkey" FOREIGN KEY ("fromClubId") REFERENCES "Club" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transfer_toClubId_fkey" FOREIGN KEY ("toClubId") REFERENCES "Club" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "parentClubId" TEXT NOT NULL,
    "loanClubId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "wageSharePct" REAL NOT NULL,
    "optionToBuyFee" INTEGER,
    "fee" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL,
    CONSTRAINT "Loan_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Loan_parentClubId_fkey" FOREIGN KEY ("parentClubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Loan_loanClubId_fkey" FOREIGN KEY ("loanClubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Negotiation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "buyingClubId" TEXT NOT NULL,
    "sellingClubId" TEXT,
    "kind" TEXT NOT NULL,
    "staffId" TEXT,
    "status" TEXT NOT NULL,
    "roundsJson" TEXT NOT NULL,
    "agreedTransferJson" TEXT,
    "agreedContractJson" TEXT,
    "counterTransferJson" TEXT,
    "counterContractJson" TEXT,
    "createdDate" TEXT NOT NULL,
    "updatedDate" TEXT NOT NULL,
    "incoming" BOOLEAN NOT NULL,
    "patience" INTEGER NOT NULL,
    CONSTRAINT "Negotiation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_buyingClubId_fkey" FOREIGN KEY ("buyingClubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoutingAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "scoutId" TEXT,
    "targetJson" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reportJson" TEXT NOT NULL,
    CONSTRAINT "ScoutingAssignment_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoutedPlayer" (
    "playerId" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    CONSTRAINT "ScoutedPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "wealth" INTEGER NOT NULL,
    "minReputation" INTEGER NOT NULL,
    "fictional" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "SponsorDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "annualValue" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "bonusLeagueTitle" INTEGER NOT NULL,
    "bonusTopFour" INTEGER NOT NULL,
    "bonusCupWin" INTEGER NOT NULL,
    "isOffer" BOOLEAN NOT NULL,
    CONSTRAINT "SponsorDeal_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SponsorDeal_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    CONSTRAINT "FinancialTransaction_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppliedTransactionKey" (
    "key" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "BoardObjective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "competitionId" TEXT,
    "target" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "importance" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER,
    CONSTRAINT "BoardObjective_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BoardObjective_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trophy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    CONSTRAINT "Trophy_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trophy_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trophy_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerCareerHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "clubId" TEXT,
    "apps" INTEGER NOT NULL,
    "goals" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "avgRating" REAL NOT NULL,
    "overall" INTEGER NOT NULL,
    "potential" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    CONSTRAINT "PlayerCareerHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClubSeasonHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "competitionId" TEXT,
    "position" INTEGER,
    "points" INTEGER NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "cupResultsJson" TEXT NOT NULL,
    "revenue" INTEGER NOT NULL,
    "expenses" INTEGER NOT NULL,
    "managerId" TEXT,
    CONSTRAINT "ClubSeasonHistory_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "clubIdsJson" TEXT NOT NULL,
    "playerIdsJson" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL,
    "important" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "YouthIntake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "playerIdsJson" TEXT NOT NULL,
    CONSTRAINT "YouthIntake_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerDevelopment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "potential" INTEGER NOT NULL,
    CONSTRAINT "PlayerDevelopment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Stadium_ownerClubId_idx" ON "Stadium"("ownerClubId");

-- CreateIndex
CREATE INDEX "StadiumProject_stadiumId_idx" ON "StadiumProject"("stadiumId");

-- CreateIndex
CREATE INDEX "Club_leagueId_idx" ON "Club"("leagueId");

-- CreateIndex
CREATE INDEX "Club_nationId_idx" ON "Club"("nationId");

-- CreateIndex
CREATE INDEX "ClubLoan_clubId_idx" ON "ClubLoan"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubKit_clubId_slot_key" ON "ClubKit"("clubId", "slot");

-- CreateIndex
CREATE INDEX "Player_clubId_idx" ON "Player"("clubId");

-- CreateIndex
CREATE INDEX "Player_nationId_idx" ON "Player"("nationId");

-- CreateIndex
CREATE INDEX "Player_position_idx" ON "Player"("position");

-- CreateIndex
CREATE INDEX "Player_lastName_firstName_dob_idx" ON "Player"("lastName", "firstName", "dob");

-- CreateIndex
CREATE INDEX "Contract_endDate_idx" ON "Contract"("endDate");

-- CreateIndex
CREATE INDEX "Suspension_playerId_idx" ON "Suspension"("playerId");

-- CreateIndex
CREATE INDEX "Staff_clubId_idx" ON "Staff"("clubId");

-- CreateIndex
CREATE INDEX "Staff_role_idx" ON "Staff"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_staffId_key" ON "Manager"("staffId");

-- CreateIndex
CREATE INDEX "TacticalSystem_clubId_idx" ON "TacticalSystem"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "TacticalInstruction_tacticId_slotId_key" ON "TacticalInstruction"("tacticId", "slotId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionSeason_competitionId_seasonId_key" ON "CompetitionSeason"("competitionId", "seasonId");

-- CreateIndex
CREATE INDEX "Fixture_date_idx" ON "Fixture"("date");

-- CreateIndex
CREATE INDEX "Fixture_homeClubId_idx" ON "Fixture"("homeClubId");

-- CreateIndex
CREATE INDEX "Fixture_awayClubId_idx" ON "Fixture"("awayClubId");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_competitionSeasonId_round_homeClubId_awayClubId_key" ON "Fixture"("competitionSeasonId", "round", "homeClubId", "awayClubId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_fixtureId_key" ON "Match"("fixtureId");

-- CreateIndex
CREATE INDEX "Match_date_idx" ON "Match"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MatchEvent_matchId_seq_key" ON "MatchEvent"("matchId", "seq");

-- CreateIndex
CREATE INDEX "Transfer_playerId_idx" ON "Transfer"("playerId");

-- CreateIndex
CREATE INDEX "Transfer_date_idx" ON "Transfer"("date");

-- CreateIndex
CREATE INDEX "Loan_playerId_idx" ON "Loan"("playerId");

-- CreateIndex
CREATE INDEX "Negotiation_playerId_idx" ON "Negotiation"("playerId");

-- CreateIndex
CREATE INDEX "Negotiation_status_idx" ON "Negotiation"("status");

-- CreateIndex
CREATE INDEX "SponsorDeal_clubId_idx" ON "SponsorDeal"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_idempotencyKey_key" ON "FinancialTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialTransaction_clubId_date_idx" ON "FinancialTransaction"("clubId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Trophy_competitionId_seasonId_key" ON "Trophy"("competitionId", "seasonId");

-- CreateIndex
CREATE INDEX "PlayerCareerHistory_playerId_idx" ON "PlayerCareerHistory"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSeasonHistory_clubId_seasonId_key" ON "ClubSeasonHistory"("clubId", "seasonId");

-- CreateIndex
CREATE INDEX "NewsItem_date_idx" ON "NewsItem"("date");

-- CreateIndex
CREATE INDEX "PlayerDevelopment_playerId_idx" ON "PlayerDevelopment"("playerId");
