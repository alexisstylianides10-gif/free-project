# FC 27 World Expansion — Phase 0 Technical Reconnaissance

Status: **research only — no game files modified, nothing built.**

> **Scope update (2026-11-26):** the owner decided this mod is for **personal use only**, not public distribution. Real club badges and kits are allowed for their own install. Ratings follow [`RATINGS_POLICY.md`](RATINGS_POLICY.md).
Date of research: 2026-11-26.

## How to read this report

Every claim carries one of these evidence tags:

| Tag | Meaning |
|---|---|
| **[CONFIRMED-SRC]** | Stated by a primary source (tool's own repo/README/release notes, EA). Not yet verified on a real install by us. |
| **[COMMUNITY]** | Reported by modding forums / third-party sites. Plausible, not verified. |
| **[ASSUMPTION]** | Our inference from how previous FC/FIFA titles worked. Must be tested. |
| **[UNKNOWN]** | No evidence either way. |

Nothing in this report is tagged "tested in game": **no FC 27 installation was available**
(see §1). Nothing can be marked *Implemented* or *Tested in game* until we test on a
Windows PC with the game installed.

---

## 1. FC 27 version and installation compatibility

### What was actually inspected
- The development environment is a **Linux cloud container**. It has no FC 27 installation,
  no Windows, no Wine/.NET, and no EA App. I could not inspect game files, the database,
  or the executable.
- So **the "inspect the game installation" part of Phase 0 still needs to happen on a Windows PC**.
  §12 has a checklist to run there.

### What is known from sources
- Live Editor's `version.json` maps FC 27 PC builds to title updates [CONFIRMED-SRC]:

  | Game build | Title update |
  |---|---|
  | 1.0.140.25370 | v1.0.0 (launch) |
  | 1.0.141.46637 | v1.1.0 |
  | 1.0.142.12546 | v1.2.0 |
  | 1.0.142.20665 | v1.2.1 (newest listed) |

  Live Editor v27.1.9 and v27.2.1 are listed as compatible with 1.0.142.x.
- Live Editor README: "Should work on all platforms, although **EA App is the recommended one**." [CONFIRMED-SRC]
  That matches our EA App target. Steam/Epic are not named explicitly.
- **Every title update can break tools and mods.** FMT's FC 27 pre-release notes say it was
  "rushed out… after EA latest FC 27 updates", and the Paul√ gameplay mod thread reports
  breakage after a patch [CONFIRMED-SRC / COMMUNITY]. Our build pipeline must pin a game build
  and refuse to install on unknown builds (see §11 risk R1).

### Anti-cheat
- FC 27 ships EA Javelin anti-cheat [COMMUNITY; consistent with FC 24–26].
- Live Editor README: "EAAC/EA Javelin Anticheat Bypass — Runs the game without the anticheat.
  **Offline use only.**" [CONFIRMED-SRC]
- **Project position:** we do **not** write, ship, or document any anti-cheat bypass ourselves.
  We depend on the established community tool's offline launch mode and tell users to
  **never enter online modes while modded**. That line is in the install docs and the
  launcher check. Online (FUT, Rush, online seasons, Clubs) is out of scope permanently.

---

## 2. Available modding tools and verified versions

| Tool | Version seen | FC 27 status | Role for us | Evidence |
|---|---|---|---|---|
| **FC 27 Live Editor** (xAranaktu) | public v27.1.0; Patreon tiers up to **v27.2.1** | Supported (build 1.0.142.20665) | **Core runtime**: DB editor, Lua 5.4.6 engine, legacy file add/replace, compdata limits, "unsupported CM leagues" fix, offline launch | [CONFIRMED-SRC] GitHub README, `version.json`, wiki edited 2026-11-24 |
| **Live Editor Lua API v2** | ships with LE | Supported | Scripting: events (`AddEventHandler`, pre/post hooks), DB ops, Player Development Manager, Gameplay Attribulator, Legacy Files, HTTP, filesystem | [CONFIRMED-SRC] wiki "LUA API v2" (function-level list for FC 27 **not yet read**) |
| **FIFA Editor Tool (FET)** | **v2.2.0** "Full FC 27 support" | Public release announced | Asset editing: kits, badges, textures, compiling `.fifamod` | [CONFIRMED-SRC] @FIFAEditorTool on X, ModdingWay |
| **FIFA Mod Manager (FMM)** | ships with FET suite | Assumed with FET 2.2.0 | Applies `.fifamod` packages | [ASSUMPTION] needs checking |
| **Frostbite Modding Tool (FMT)** | stable `FMT-26.10.9654.14105`; **pre-release `FMT.PRE_RELEASE.27.0.9818.36374`** (18 Nov) | **Pre-release only**, "missing planned features", final release TBD | Alternative asset pipeline; FC 27 mods "can be compiled and used with the live editor" | [CONFIRMED-SRC] FMT releases page (notes say they were AI-generated) |
| **FIFA Kit Creator** | — | "Full FC 27 compatibility" (Bulk Generator, Teamkits Editor) | Kit authoring workflow | [COMMUNITY] Footy Headlines |
| DB Master / "DBM Studio" | — | [UNKNOWN] for FC 27 | Offline DB table editing | [COMMUNITY] mentioned in forums |

### ⚠️ Tools to AVOID (likely malware)
The search turned up GitHub repos such as `FC27-Frostbite-Forge` and `FC27-Mod-Studio`
("BepInEx injection", "live database injection"), plus several look-alike
`FC26-Mod-Manager` repos from unrelated accounts. **BepInEx is a Unity/.NET loader and does
not apply to a Frostbite C++ game.** That mismatch is typical of fake "tool" repos that push
malware. **We will not use, link, or recommend them.** We only use tools from their known
authors' official channels (xAranaktu GitHub/Patreon, fifaeditortool.com, FMTDev GitHub).

---

## 3. Supported database and asset formats

| Area | Format / location | Status |
|---|---|---|
| Main DB (players, teams, leagues, teamplayerlinks, leagueteamlinks, manager, formations…) | Frostbite-wrapped `fifa_ng_db` + `.meta` schema, edited live via LE or exported as tables | [ASSUMPTION] carried over from FC 24–26; table names must be checked on FC 27 |
| Competition data ("compdata") | `compobj`, `settings`, `schedule`, `standings`, `tasks`, `advancement`, `objectives`, etc. (text tables) | [COMMUNITY] same family as FC 26; LE exposes "Edit Compdata Limits" [CONFIRMED-SRC] |
| Career-mode internal data | Career save + CM-specific tables | [UNKNOWN] for FC 27 |
| Kits, badges, crests, minifaces | Frostbite textures (DDS inside EBX/RES/chunks); legacy `.rx3`/`.big`-style paths for some | [CONFIRMED-SRC] FET/FKC kit support; legacy add/replace via LE |
| Stadiums | Frostbite meshes/levels | [COMMUNITY] high effort; stadium *assignment* is DB-driven |
| Audio (chants) | Frostbite sound assets | [UNKNOWN] tooling for FC 27 |
| Gameplay tuning | "Attribulator" (attrib DB) via LE `Gameplay Attribulator` Lua object | [CONFIRMED-SRC] exists in Lua API; parameters undocumented |
| Mod packages | `.fifamod` (FET/FMM), `.fbmod` (FMT), LE legacy-files folders + Lua scripts | [CONFIRMED-SRC] |

**Our own source format:** human-editable YAML/CSV in `data/`, validated by JSON Schema,
compiled by our build tool into (a) LE Lua scripts + DB import tables and (b) asset bundles
for FET/FMT. Source data never contains EA files.

---

## 4. Competition and Career Mode integration

**Important finding:** FC 27 already contains **"Liga Cyprus"**. EA's own ratings site has a
Liga Cyprus page, and FUT.GG/FUTBIN/FUTWIZ list it, including in career-mode league lists
[CONFIRMED-SRC: ea.com ratings page; COMMUNITY: fan DBs]. Cyprus also exists as a nation.
I have not yet confirmed how many clubs are included or whether it is fully playable in Manager Career.

Consequence for Phase 2: the First Division is likely an **enhancement** job: fix squads,
ratings, and kits, and add missing clubs. We would not build it from zero, which removes the
largest technical risk for Cyprus. The Second Division and lower leagues, plus the Cup and
Super Cup, are still **additions**.

| Capability | Status | Notes |
|---|---|---|
| Edit existing league/teams/players | Feasible [CONFIRMED-SRC] | LE DB editor + Lua |
| Add new clubs to an existing league | Feasible [COMMUNITY] | Common in FC 24–26 mods |
| Add a new league to Career Mode | **Experimental** | LE advertises a "Solution for 'Unsupported Career Mode Leagues & Teams'" [CONFIRMED-SRC]. Forums report CM crashes from compdata linkage errors [COMMUNITY]. GLE/World Leagues mods show it can be done [COMMUNITY]. |
| Promotion/relegation between Cypriot divisions | Experimental | Needs correct `advancement`/`tasks` compdata. A historical limit of ~5 divisions per nation in CM is reported [COMMUNITY]. |
| Domestic cup + super cup | Experimental | Same compdata machinery as other nations' cups |
| Correct fixture count | Risk | A GLE user reported the Cypriot league playing ~27 instead of ~30+ matches [COMMUNITY]. Cyprus uses a split-season format (regular season + championship/relegation groups), which the engine may not support natively. |

---

## 5. Match simulation modification

Honest status: **this is the hardest goal, and most of it is not directly moddable.**

- The quick-sim / CPU-vs-CPU result engine is **native code inside the game executable**.
  No public API to replace it exists [UNKNOWN → assume none].
- What *is* available:
  1. **DB inputs that the sim reads**: player attributes, team ratings, formations/tactics,
     team "tactical" fields, home-advantage-related fields [ASSUMPTION: sim reads these].
     That is the realistic lever: make inputs accurate and the native sim behaves better.
  2. **Gameplay Attribulator** via Lua: tuning values for *played* matches. Whether any of
     them affect quick-sim is [UNKNOWN].
  3. **LE "Match-Fix upcoming games"** [CONFIRMED-SRC] proves the tool can set fixture
     outcomes. *Theoretically* a Lua model could compute a result from our tactical model and
     write it as a fixed outcome, which would make our model drive real Career Mode results.
     Big unknowns: whether it is scriptable from Lua, whether the generated stats
     (shots/possession/xG) stay consistent, and how it affects player stats/morale.
     **Experimental, research required.**
- We will **not** ship an external simulator and claim it changes Career Mode. If the
  match-fix route fails, the simulation work becomes "input realism + calibration", and the
  docs will say exactly that.

Plan: build an **offline calibration harness**. Simulate a season many times with LE speedhack/
sim, export results, and compare goal distributions, home-win %, and upset rates against real
league data. Every change gets measured, not guessed.

---

## 6. AI behaviour (managers, tactics)

| Lever | Status |
|---|---|
| Per-team formation, starting XI, default tactics/teamsheets | Feasible [CONFIRMED-SRC: LE Teams Editor "formation and starting XI"] |
| Per-team tactical presets (build-up, defensive style, width, depth, player instructions) | Likely feasible via DB tables [ASSUMPTION: FC 24–26 had per-team tactic tables] |
| Manager identity (names, transfers, firing, unsackable) | Feasible [CONFIRMED-SRC: LE Managers Editor] |
| In-match AI adaptation (change shape when losing, protect lead, subs) | **Native AI**. We can only influence it through the presets the AI chooses between [ASSUMPTION]. Scripting the AI mid-match: [UNKNOWN], probably not. |
| Between-match adaptation (opponent-based tactic selection) | Experimental: a Lua handler on career-day/fixture events could swap a CPU team's tactic preset before matches [ASSUMPTION based on LE events] |
| Manager philosophy evolving over seasons | Experimental: same mechanism, plus persistent state in our own Lua-side file |

Realistic deliverable: **distinct tactical identity per club** (data), plus **pre-match
tactic selection by Lua** (experimental). True in-match reasoning AI is not promised.

---

## 7. Seasonal kit system feasibility

| Option | Status |
|---|---|
| Prepared kit packs (home/away/third/GK per club, per season) built with FET/FKC | Feasible [CONFIRMED-SRC tooling] |
| Swap kits at season rollover via Lua + LE legacy-file replace | Experimental [ASSUMPTION: needs an end-of-season event + texture reload] |
| External kit designer app (our tool, outside the game) that exports kit textures | Feasible: we control it fully |
| **Fully interactive in-game kit designer UI** | **Not supported**. Adding new in-game UI screens is not exposed by any known tool [UNKNOWN → treat as no] |
| Historical kit preservation | Feasible as data (archive of previous packs) |

Recommendation: an **external kit designer (web/desktop) → build → seasonal pack**, with
optional automatic swap at season change if the Lua route works.

---

## 8. Feature feasibility matrix

See [`FEATURE_TRACKER.md`](FEATURE_TRACKER.md). Every row starts at *Research required*,
*Technically feasible*, *Experimental*, *Blocked* or *Not supported*. None is *Implemented*.

---

## 9. Recommended architecture

```
FC27-World-Expansion/
  docs/                 research, design docs, install guide, changelog
  data/                 OUR source data (YAML/CSV) – no EA files
    cyprus/ international/ competitions/ tactics/ managers/ kits/
  schemas/              JSON Schemas for every data file
  assets/               original or licensed art only (kits, badges, banners, audio, graphics)
  integrations/
    live-editor/lua/    runtime scripts (events, tactic selection, kit swap)
    fet/                FET/FMM asset project templates
  tools/                Python CLI: validate, build, diff, backup/restore, compat-check
  tests/                schema tests, data sanity tests, Lua unit tests (pure-Lua parts)
  builds/  releases/    build outputs (git-ignored)
```

Principles:
1. **Data-first.** Clubs, squads, tactics, and competitions live in reviewable text. The build compiles them.
2. **One public package, modular source.** The build produces one versioned release
   (`FC27-World-Expansion-vX.Y.Z.zip`) containing LE Lua + DB import tables + `.fifamod`
   assets + installer manifest.
3. **Game build pinning.** The manifest lists the supported game builds. The installer refuses unknown ones.
4. **Non-destructive install.** No original game files are overwritten. LE legacy-file
   redirection and mod-manager virtual overlays are used, and the installer backs up user
   saves before first run.
5. **Recommendation: move this into its own repository.** It currently sits in a folder of an
   unrelated Next.js app repo, kept separate so nothing collides.

---

## 10. Development roadmap

| Phase | Gate to proceed | First deliverables |
|---|---|---|
| **0.5 Hands-on recon (Windows PC)** | Checklist in §12 done | Real table dumps, LE Lua function list, Liga Cyprus content audit |
| 1 Foundation | Approval | Schemas, validators, build CLI, backup/restore, CI tests |
| 2 Cyprus | DB audit done | Fix First Division data → add 2nd Division → Cup/Super Cup → kits (original designs) |
| 3 International | Phase 2 shippable | Squad updates for existing nations; Nations League **prototype** in tournament mode before CM |
| 4 Tactics | — | Per-club tactical identity data for all clubs |
| 5 Simulation | Calibration harness | Measured baseline → input tuning → match-fix experiment |
| 6 Career | — | Lua season-rollover hooks, kit swap, development tweaks |
| 7 Integration | Full test pass | Single release package + install/uninstall docs |

Ship order: a **Cyprus-only v0.1 public release** early. A real, working slice beats a giant unfinished mega mod.

---

## 11. Technical risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Title updates break LE/FET/mods | High | Build pinning, compat check, fast re-test checklist |
| R2 | Dependence on a Patreon-gated tool (LE early versions) | Medium | Target the **public** LE version only |
| R3 | New leagues crash Career Mode | High | Incremental compdata changes, start from working templates, automated compdata linter |
| R4 | Quick-sim not moddable | High | Honest scope; calibration harness; match-fix experiment |
| R5 | Licensing/IP | Low (personal use) | **Scope changed 2026-11-26: personal use only, not publicly distributed.** Real badges/kits/sponsors are fine for the owner's own install. The repo still never contains EA game files; if the project ever goes public again, this risk returns to High. |
| R6 | Account bans if users go online modded | High (for users) | Offline-only, loud warnings, launcher check |
| R7 | Malware-laden fake tools | Medium | Whitelist official tool sources only |
| R8 | Cyprus split-season format unsupported | Medium | Approximate with supported format; document it |
| R9 | Accurate ratings data for 2nd/3rd division Cypriot players | Medium | Community data entry with sources + validator |

---

## 12. Dependencies and installation requirements

**End users (expected):**
- Windows 10/11 PC, EA SPORTS FC 27 via EA App, on a supported game build
- FC 27 Live Editor (public version)
- FIFA Mod Manager (from the FET 2.2.x suite) for asset packages
- Offline play only

**Developers:**
- Python 3.11+ (build/validation tooling), Lua 5.4 (script tests), Node optional (kit designer)
- FET 2.2.x / FMT (asset work, Windows)
- A Windows test machine with the game

**Hands-on recon checklist (needs your PC):**
1. Record the game build from EA App/exe properties.
2. Install the public Live Editor and confirm it launches offline.
3. Export the DB tables: `leagues`, `teams`, `leagueteamlinks`, `players`, `teamplayerlinks`,
   `manager`, `formations`, `default_teamsheets`/tactics tables, `nations`.
4. Export compdata for an existing nation with a cup and two divisions (as a template).
5. Audit Liga Cyprus: list its clubs, squad sizes, and whether it can be picked in Manager Career.
6. Dump the Lua API surface (`LE_VERSION`, available globals, event names).
7. Test whether "Match-Fix" is reachable from Lua.
8. Back up `Documents/FC 27/settings` and career saves before any test.

---

## Sources
- Live Editor: https://github.com/xAranaktu/FC-27-Live-Editor (README, `version.json`, wiki "LUA API v2")
- Live Editor release posts: https://www.patreon.com/xAranaktu/posts/fc-27-live-v27-2-176244709
- FMT: https://github.com/FMTDev/FMT.Releases , https://github.com/FMTDev/FMT.Releases/releases
- FET 2.2.0: https://x.com/FIFAEditorTool/status/2110860687681400945 , https://www.moddingway.com/news/10315/fifa-editor-tool-2-2-0-brings-full-fc-27-support
- Kits: https://www.footyheadlines.com/4667214320/ea-sports-fc-27-kit-editing-is-now-live-via-fifa-kit-creator-fifa-editor-tool.html
- Liga Cyprus: https://www.ea.com/fi/games/ea-sports-fc/ratings/leagues-ratings/liga-cyprus/2210 , https://www.fut.gg/leagues/liga-cyprus/evolutions/ , https://www.futwiz.com/fc27/career-mode/leagues
- Compdata/CM issues: https://soccergaming.com/forums/threads/compdata-changes-not-working-in-career-mode.6476073/latest , https://soccergaming.com/forums/threads/world-leagues-mod-27.6476527/
- Gameplay mod/patch breakage: https://evoweb.uk/threads/paul%E2%88%9A-fc27-gameplay-mod.107554/
- Career Mode FC 27 changes: https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-career-mode-deep-dive
- Anti-cheat (community): https://elocarry.net/blog/ea-fc-27/anti-cheat-and-bans-explained/
