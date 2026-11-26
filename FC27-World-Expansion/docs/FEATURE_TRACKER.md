# Feature Tracker

Statuses: Research required · Technically feasible · In development · Implemented ·
Tested in game · Experimental · Blocked · Not supported.

Rule: nothing moves to *Implemented* or *Tested in game* without evidence (commit + test
log/screenshot on a named game build). As of 2026-11-26 **nothing has been tested in game.**

| ID | Feature | Status | Evidence / blocker | Main tool |
|---|---|---|---|---|
| CY-01 | Cypriot First Division playable | Technically feasible | Liga Cyprus already in FC 27 (EA ratings site); club count/CM status unverified | LE DB |
| CY-02 | Accurate squads, positions, ratings | Technically feasible | DB editing confirmed in LE | LE DB + our data |
| CY-03 | Cypriot Second Division | Experimental | Needs new league + compdata; CM crash reports | LE compdata |
| CY-04 | Lower divisions | Research required | Reported ~5-division-per-nation CM limit (older titles) | LE compdata |
| CY-05 | Promotion/relegation | Experimental | Depends on CY-03 | compdata |
| CY-06 | Cyprus Cup | Experimental | compdata cup template | compdata |
| CY-07 | Super Cup | Experimental | compdata | compdata |
| CY-08 | Split-season format (championship/relegation groups) | Research required | Engine support unknown | compdata |
| CY-09 | Badges | Technically feasible (tech) / **IP risk** | FET textures; real badges are trademarks | FET |
| CY-10 | Home/away/third/GK kits | Technically feasible | FET 2.2.0 + Kit Creator support FC 27 | FET/FKC |
| CY-11 | Stadium assignment | Technically feasible | DB field | LE DB |
| CY-12 | New stadium models | Research required | Very high effort | FMT/FET |
| CY-13 | Cyprus in Manager Career | Research required | Gated on CY-01 audit | LE |
| INT-01 | Updated national squads | Technically feasible | DB editing | LE DB |
| INT-02 | Add missing national teams | Experimental | New teams + nation links | LE DB |
| INT-03 | Euro / World Cup | Research required | Licensing: real tournaments not in base game | compdata |
| INT-04 | Qualifiers | Research required | compdata complexity | compdata |
| INT-05 | International friendlies in CM | Research required | — | Lua/compdata |
| UNL-01 | Nations League A–D groups/fixtures/standings | Experimental | New competition; prototype in tournament mode first | compdata |
| UNL-02 | Nations League promo/relegation | Research required | Multi-season state | Lua |
| UNL-03 | Nations League in Career Mode | Research required | Highest risk | compdata+Lua |
| TAC-01 | Per-club formation & starting XI | Technically feasible | LE Teams Editor | LE DB |
| TAC-02 | Per-club tactical presets (styles, instructions, roles) | Research required | Table names unverified on FC 27 | LE DB |
| TAC-03 | New formations (3-2-4-1, asymmetric) | Research required | Formation table editable? | LE DB |
| TAC-04 | Separate in/out-of-possession shapes | Research required | Depends on FC 27 native tactics | — |
| AI-01 | Distinct club tactical identity | Technically feasible | Data-driven via TAC-01/02 | data |
| AI-02 | Pre-match opponent-aware tactic choice | Experimental | LE Lua events | Lua |
| AI-03 | In-match adaptation / subs logic | Not supported (direct) | Native AI; only via presets | — |
| AI-04 | Philosophy evolving over seasons | Experimental | Lua persistent state | Lua |
| SIM-01 | Calibration harness (measure sim vs real data) | Technically feasible | Our tooling + LE export | tools |
| SIM-02 | Better sim via realistic inputs | Technically feasible | Indirect; measured by SIM-01 | data |
| SIM-03 | Tactical model drives results via Match-Fix | Experimental | LE has Match-Fix; Lua access unverified | Lua |
| SIM-04 | Replace native sim engine | Not supported | Native code, no API | — |
| SIM-05 | Custom stats (xG, pressing) in sim | Research required | Stat writeback unknown | — |
| CM-01 | Transfer realism tweaks | Research required | FC 27 rebuilt transfer market | LE/Lua |
| CM-02 | Player development/potential | Technically feasible | Lua Player Development Manager exists | Lua |
| CM-03 | Manager changes | Technically feasible | LE Managers Editor | LE |
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
