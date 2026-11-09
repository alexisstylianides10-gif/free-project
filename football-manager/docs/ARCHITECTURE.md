# Architecture

```
football-manager/
├── prisma/                 Canonical relational schema + generated SQL migrations
├── public/data/            Bundled FICTIONAL development dataset (JSON)
├── scripts/                Dataset generator, validators, calibration, season sim, screenshots
├── src/
│   ├── engine/             Pure TypeScript game logic (no React, no DOM) — testable in Node
│   │   ├── core/           Types, seeded RNG, dates, ids, rating & value models
│   │   ├── match/          Match engine (possession chains) + explicit xG model
│   │   ├── tactics/        Roles, formations/shapes, selection & validation
│   │   ├── competition/    Scheduling, tables & tie-breakers, cups, groups, knockouts
│   │   ├── transfers/      Valuation, bid/contract evaluation, transfers, loans, releases
│   │   ├── finance/        Ledger (only place balances change), loans, forecasts
│   │   ├── development/    Training, development, youth intake, retirements
│   │   ├── club/           Staff, stadium projects, scouting
│   │   ├── ai/             AI clubs: transfers, renewals, staff, sackings, finances
│   │   └── world/          Career creation, calendar/day processing, matchday, board, sponsors, news
│   ├── data/               Dataset schema (Zod), CSV/JSON import & validation, dataset library
│   ├── db/                 SQLite (sql.js), migration runner, serializer, save manager, storage backends
│   ├── store/              Zustand store: loaded career, advancing time, autosave, toasts
│   ├── components/         UI primitives (shadcn/ui style) and game components (pitches, kits, dialogs)
│   └── app/                Next.js routes (static export)
├── src-tauri/              Desktop shell: atomic local file storage commands
├── tests/                  Vitest unit + integration tests
└── e2e/                    Playwright end-to-end tests
```

## Runtime model

- The whole career world is held in memory as plain objects (`World`, see
  `src/engine/core/types.ts`) while playing. Engine functions mutate it deterministically.
- Saving serialises the world into a **SQLite database file** (one file per career) whose tables
  are defined by `prisma/schema.prisma` (≈45 tables with foreign keys, indexes and unique
  constraints, e.g. one match per fixture, unique fixture per round/home/away, unique
  transaction idempotency keys). The write is one SQL transaction followed by
  `PRAGMA integrity_check` and `PRAGMA foreign_key_check`; inconsistent worlds are refused.
- **Why sql.js instead of Prisma Client at runtime:** the game runs inside a Tauri webview with
  no Node.js process. Prisma Client needs Node (or a sidecar). Prisma is therefore used for what
  it is best at here — the schema and migration generation — and `src/db/migrate.ts` applies the
  generated SQL migrations to save files with SQLite compiled to WebAssembly. `npm run db:check`
  and a unit test prove the migrations equal the schema.
- Storage backends (`src/db/storage.ts`): Tauri commands writing real files with temp-file +
  rename (desktop), IndexedDB (browser/dev/e2e), memory (tests).

## Determinism

- `Rng` (mulberry32) has a single 32-bit state persisted in the save (`Career.rngState`).
- Each match is seeded from `hash(worldSeed, fixtureId)`, so a fixture always plays the same
  way for the same inputs (useful to reproduce bugs) and live/instant modes are consistent.
- Day processing iterates entities in sorted order. `lastProcessedDate` makes re-processing a
  date impossible (`CalendarError`). A test runs two worlds side by side and asserts identical
  state, and another asserts a saved-then-loaded world has the same future.

## Match engine (`src/engine/match/engine.ts`)

Action-based possession chains on a 105×68 m pitch (0–100 grid):

1. Player positions come from each slot's **in-possession** / **out-of-possession** coordinates,
   shifted with the ball, scaled by team width, pushed by defensive line and mentality. After a
   turnover the losing side is caught in its attacking shape for a few actions (transitions).
2. Before each action the defending side may press: engagement height depends on pressing
   level; success depends on the presser's work rate/anticipation/tackling vs. the carrier's
   composure/first touch/technique; fouls and cards follow aggression/temperament.
3. The carrier chooses pass / dribble / shoot / cross / hold-up / clear by weighted utility
   (attributes, role modifiers, duty, individual instructions, team instructions, game state).
4. Passes pick a receiver by openness, role (playmakers attract the ball), build-up style,
   tempo, risk, width and focus; success depends on passer/receiver attributes, distance,
   pressure, lane interception by defenders' positions, marking and team cohesion. Through balls
   can be caught offside (offside trap and line height matter) or create big chances.
5. Shots use the explicit xG model (`xg.ts`), then finishing/composure vs. goalkeeper skill
   adjust the probability; blocks, saves, parries, rebounds and corners are resolved.
6. Per minute: fatigue (pressing, tempo, stamina, natural fitness), injuries, AI substitutions
   and late tactical changes. Supports extra time, penalty shootouts, aggregate scores, red
   cards (teams play short), goalkeeper sendings-off, and live user control.

Effective attribute = base × condition × morale × form × positional familiarity × tactical
cohesion × home advantage. Overall rating is never the deciding input. Calibration
(`npm run calibrate`) gives ≈1.4 goals, ≈11 shots, ≈77 % passing, ≈9 fouls per team per match;
tests assert that pressing, width, build-up, offside trap, mentality and counter-pressing each
change the simulated statistics in the expected direction.

## World progression (`src/engine/world/calendar.ts`)

Daily: user match (detailed) then all other fixtures, training & recovery, scouting, transfer
installments/add-ons, AI transfer market, stadium works, loan expiry, negotiations expiry.
Weekly (Mon): wages, training/academy costs, stadium maintenance, player development, values,
happiness. Monthly: sponsorship, TV money, merchandise, bank loans & interest, board reviews,
AI renewals/sackings/finances. Annually: youth intakes per club, season end (prizes,
promotion/relegation, qualification, history, retirements, contract expiry, budgets, new
season fixtures and objectives).

## Performance

The dev world (128 clubs, ~3,500 players, ~2,100 matches/season) simulates a season in ~30 s
headless. A club→players index avoids full scans; AI-vs-AI matches keep only aggregate stats
and key events; AI clubs act on a rotating schedule; the UI processes days in chunks and yields
to the browser between days (with a Pause button). Larger worlds scale roughly linearly in the
number of matches; a Web Worker for simulation is a natural next step (see status report).
