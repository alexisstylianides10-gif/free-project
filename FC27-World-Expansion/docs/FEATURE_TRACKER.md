# Feature Tracker

Statuses: Research required · Technically feasible · In development · Implemented ·
Tested in game · Experimental · Blocked · Not supported.

Rule: nothing moves to *Implemented* or *Tested in game* without evidence (commit + test
log/screenshot on a named game build). As of 2026-11-26 **nothing has been tested in game.**

| ID | Feature | Status | Evidence / blocker | Main tool |
|---|---|---|---|---|
| CY-01 | Cypriot First Division playable | In development | Real 2026-27 line-up + 14 squads in `data/cyprus/` (385 players); Liga Cyprus in FC 27 has only APOEL/Omonia; import not yet built | LE DB |
| CY-02 | Accurate squads, positions, ratings, attributes | In development | 712 players rated (EA anchors + tier curve), 0 validator errors; 34 generated FC attributes each, overall reproduced exactly; ~80 known positions, rest generated; missing: full names, real ages, EA attributes | LE DB + our data |
| CY-03 | Cypriot Second Division | Experimental | Data ready: 16 clubs, 13 squads (327 players), format documented; league creation via compdata untested | LE compdata |
| CY-04 | Lower divisions | Research required | Reported ~5-division-per-nation CM limit (older titles) | LE compdata |
| CY-05 | Promotion/relegation | Experimental | Depends on CY-03 | compdata |
| CY-06 | Cyprus Cup | Experimental | compdata cup template | compdata |
| CY-07 | Super Cup | Experimental | compdata | compdata |
| CY-08 | Split-season format (championship/relegation groups) | Research required | Engine support unknown | compdata |
| CY-09 | Badges (real, personal use) | In development | `tools/fetch_badges.py` downloads crests (untested here: Wikipedia rate-limited the cloud machine) | FET |
| CY-10 | Home/away/third/GK kits | Technically feasible | Colours/manufacturer/sponsor partly in `clubs.json`; textures to be made in Kit Creator | FET/FKC |
| CY-11 | Stadium assignment | Technically feasible | DB field | LE DB |
| CY-12 | New stadium models | Research required | Very high effort | FMT/FET |
| CY-13 | Cyprus in Manager Career | Research required | Gated on CY-01 audit | LE |
| INT-01 | Updated national squads | Technically feasible | DB editing | LE DB |
| INT-02 | Add missing national teams | Experimental | New teams + nation links | LE DB |
| INT-03 | Euro / World Cup | Research required | Licensing: real tournaments not in base game | compdata |
| INT-04 | Qualifiers | Research required | compdata complexity | compdata |
| INT-05 | International friendlies in CM | Research required | — | Lua/compdata |
| UNL-01 | Nations League A–D groups/fixtures/standings | In development | 2026-27 data (54 teams, 156 results) + engine reproduces all 14 published tables; not in game | compdata |
| UNL-02 | Nations League promo/relegation | In development | Engine applies 2026-27 rules incl. cross-group ranking + play-offs; 2028-29 format unverified | tools |
| UNL-03 | Nations League in Career Mode | Research required | Highest risk | compdata+Lua |
| TAC-01 | Per-club formation & starting XI | Technically feasible | LE Teams Editor | LE DB |
| TAC-02 | Per-club tactical presets (styles, instructions, roles) | Research required | Table names unverified on FC 27 | LE DB |
| TAC-03 | New formations (3-2-4-1, asymmetric) | In development | Built as FC base formation + roles (`formations.json`) | data |
| TAC-04 | Separate in/out-of-possession shapes | Research required | Depends on FC 27 native tactics | — |
| AI-01 | Distinct club tactical identity | In development | 14 club profiles, 7 philosophies, 6 selector tests | data |
| AI-02 | Pre-match opponent-aware tactic choice | In development | `tools/select_tactic.py` (opponent, venue, game state); in-game application manual | tools/Lua |
| AI-03 | In-match adaptation / subs logic | Not supported (direct) | Native AI; only via presets | — |
| AI-04 | Philosophy evolving over seasons | Experimental | Lua persistent state | Lua |
| SIM-01 | Calibration harness (measure sim vs real data) | Technically feasible | Our tooling + LE export | tools |
| SIM-02 | Better sim via realistic inputs | Technically feasible | Indirect; measured by SIM-01 | data |
| SIM-03 | Tactical model drives results via Match-Fix | Experimental | LE has Match-Fix; Lua access unverified | Lua |
| SIM-04 | Replace native sim engine | Not supported | Native code, no API | — |
| SIM-05 | Custom stats (xG, pressing) in sim | Research required | Stat writeback unknown | — |
| CM-01 | Transfer realism tweaks | In development | Club budgets/prestige (`club_economics.json`, estimates) + `tools/plan_transfers.py` (6 tests); native AI frequency not moddable; auto-apply needs undocumented LE Lua | LE/Lua |
| CM-07 | Player potential, growth & age decline | In development | Per-player potential (age + talent + overrides, ceiling 88); `tools/progress_season.py` age curve (36+ loses 4–7 a season, pace first) + retirements; FC's native ageing still applies in-game | data |
| CM-02 | Player development/potential | Technically feasible | Lua Player Development Manager exists | Lua |
| CM-03 | Manager changes | Technically feasible | LE Managers Editor; all D1 coaches in `clubs.json` | LE |
| CM-05 | User manager can take any club/national team | Technically feasible | LE GUI 'Create Job Offer' (wiki); Lua automation blocked on undocumented API, discovery script in `integrations/live-editor/lua/` | LE |
| CM-06 | Real manager likeness | Experimental | Minifaces from photos via LE; 3D heads generic only | LE |
| CM-04 | Realistic calendars | Research required | compdata schedule | compdata |
| KIT-01 | Prepared seasonal kit packs | Technically feasible | FET/FKC | FET |
| KIT-02 | Auto kit swap at season rollover | Experimental | Lua event + legacy files | Lua |
| KIT-03 | External kit designer app | Technically feasible | Our own tool | tools |
| KIT-04 | Interactive in-game kit designer | Not supported | No UI modding interface known | — |
| PRES-01 | Banners/tifos/graphics | Research required | Asset tooling FC 27 | FET |
| PRES-02 | Chants/audio | Research required | Audio tooling unknown | — |
| PRES-03 | Menus/scoreboards | Research required | UI assets | FET |
| PKG-01 | Single release package + installer | Technically feasible | Our tooling | tools |
| PKG-02 | Backup/restore of saves & settings | Technically feasible | Our tooling | tools |
| PKG-03 | Game-build compatibility check | Technically feasible | Build IDs known from LE `version.json` | tools |
