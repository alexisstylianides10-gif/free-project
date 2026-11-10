# Touchline Manager

An offline, single-player football management simulator. Pick an existing club from an
installed football database and manage it across seasons — squad, tactics, transfers, staff,
training, stadium, kits, sponsors, finances and the board — while every other club is run by AI.

> **Data:** one fictional database is bundled; a real-world one can be generated and imported privately.
> - **Real world 2026** (personal use, *not* committed or deployed — import it on the Data page): 528 real clubs in 31 top
>   divisions and 18,542 real players, converted from the open
>   [transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets) snapshot of
>   6 July 2026 (for personal use). Real: clubs, league membership (2025/26), stadiums and seats,
>   names, birth dates, nationalities, positions, contract expiries where known, market values.
>   **Estimated:** player ratings (from market value, age and position), wages, finances, colours,
>   most staff, cup formats. No second divisions exist in the source, so there is no promotion
>   or relegation in this database. Regenerate with
>   `npx tsx scripts/import-transfermarkt-datasets.ts <csv dir> real-world-2026.json`, then import the file in the app.
> - **Development World** (`public/data/dev-world.json`): entirely fictional, used by the tests.

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Feature completion report & known limitations: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)

## Stack

Tauri 2 (desktop shell) · Next.js 15 static export · React 19 · TypeScript (strict) ·
Tailwind CSS with shadcn/ui-style components (Radix primitives) · Zustand · Zod · Recharts ·
Lucide · SQLite (sql.js/WebAssembly) with a Prisma-defined schema and Prisma-generated SQL
migrations · Vitest · Playwright.

## Requirements

- Node.js 20+ (tested with 22) and npm
- For the desktop app: Rust (stable, tested 1.97) and the
  [Tauri 2 system prerequisites](https://v2.tauri.app/start/prerequisites/)
  (on Debian/Ubuntu: `libwebkit2gtk-4.1-dev build-essential libssl-dev libayatana-appindicator3-dev librsvg2-dev`).

## Install

```bash
cd football-manager
npm install          # also copies the SQLite WebAssembly binary into public/
```

## Run (development)

```bash
npm run dev          # browser version at http://localhost:3210 (saves go to IndexedDB)
npm run desktop:dev  # native desktop window (saves go to the OS app-data folder)
```

## Create a career

1. Main menu → **New career**.
2. Pick a database (the fictional Development World unless you imported one).
3. Browse by country / league or search; select a club to see reputation, stadium, budgets,
   squad strength and expected finish.
4. Enter your manager name → **Take charge**. The career gets its own copy of the database;
   the source database is never modified.
5. Use **Continue** (1 day), **Week** or **Next match** in the top bar. On match days you choose
   **Play live** (2D view, commentary, pause/speed, substitutions and touchline changes) or
   **Instant result**.

## Import football data

Main menu → **Data & import** → choose files. Accepted: one JSON package, or `meta.json` +
`competitions.json` + CSV files. Everything is validated (schema, duplicates, references,
coverage) and only installed if there are no errors. Full format: [docs/DATA_IMPORT.md](docs/DATA_IMPORT.md).

Command-line validation: `npm run data:validate -- path/to/dataset.json`
Regenerate the fictional dev dataset: `npm run data:dev`

## Saves & backups

- **Manual save:** the *Save* button (top bar). **Autosave:** every 14 in-game days and at season end.
- Each save keeps up to 2 rolling automatic backups of its previous version.
- **Load career** screen: load, create a manual backup, restore any backup (the current file is
  backed up first), export a save as a `.sqlite` file, import a `.sqlite` save, delete.
- Desktop saves are SQLite files in the OS app-data directory
  (Linux `~/.local/share/app.touchline.manager/saves`, Windows `%APPDATA%\app.touchline.manager\saves`,
  macOS `~/Library/Application Support/app.touchline.manager/saves`). Copy that folder to back
  everything up. Writes are atomic (temp file + rename).
- If a save is damaged, loading falls back to the newest backup that passes the integrity check.
  After a reload/crash the game reopens the last saved state of the active career.

## Tests

```bash
npm run typecheck     # strict TypeScript
npm test              # Vitest: 48 unit + integration tests (incl. a full simulated season)
npm run build         # static export to out/
npm run test:e2e      # Playwright end-to-end tests against out/ (build first)
npm run db:check      # verifies the SQL migrations match prisma/schema.prisma
cargo test --manifest-path src-tauri/Cargo.toml   # Rust storage tests
```

## Build the desktop application

```bash
npm run desktop:build                 # all bundle formats for the current OS
npx tauri build --bundles deb         # e.g. only a .deb on Linux
```

Output: `src-tauri/target/release/bundle/`. Building for Windows/macOS must be done on those
systems (Tauri does not cross-compile installers).

## Database schema changes

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate:new > prisma/migrations/000N_name/migration.sql`
3. `npm run db:embed` (embeds migrations for the runtime migrator) and `npm run db:check`.
Older saves are migrated automatically when they are opened.

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run calibrate -- 300 70 70` | Match-engine statistics over N simulated matches |
| `npm run sim:season -- 370` | Headless simulation of a whole season with timings |
| `node scripts/screenshots.mjs` | Screenshots of the main screens (needs `npx serve out -l 3211`) |
