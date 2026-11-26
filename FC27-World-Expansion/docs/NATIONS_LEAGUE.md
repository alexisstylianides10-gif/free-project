# UEFA Nations League

Status: **data + engine done; not in the game yet.**

## 2026-27 edition (`data/competitions/nations_league_2026_27.json`)

- All 54 teams, 14 groups (A–C: 4×4, D: 2×3), **all 156 league-phase results**
  (24 Sep – 17 Nov 2026), from Wikipedia. Our engine recomputes every group table from the
  results and matches all 14 published tables, including head-to-head tie-breaks
  (A2: Germany, Netherlands and Greece all on 11 points).
- **Cyprus: League C Group 2, 2nd** (W2 D2 L2, 7:8, 8 pts). Behind Montenegro, ahead of
  Armenia and Latvia.
  - Montenegro 2–1 Cyprus · Latvia 0–0 Cyprus · Cyprus 2–0 Armenia · Cyprus 2–1 Latvia ·
    Armenia 1–1 Cyprus · Cyprus 1–4 Montenegro
- **Next for Cyprus:** the **B/C promotion play-off, March 2027** (two legs), against one of
  Israel, Romania, Georgia or North Macedonia. Win it and Cyprus plays in League B.

## What happens next (engine output, `--next`)

| | |
|---|---|
| Promoted to A | Switzerland, Northern Ireland, Austria, Sweden |
| Relegated from A | Czech Republic, Turkey |
| A/B play-off | Denmark, Croatia, Wales, Serbia v Slovenia, Hungary, Rep. of Ireland, Bosnia |
| Promoted to B | Albania, Montenegro, Slovakia, Iceland |
| B/C play-off | Israel, Romania, Georgia, N. Macedonia v Belarus, **Cyprus**, Faroe Islands, Estonia |
| Promoted to C | all of League D |

**Verify:** applying the rules exactly as Wikipedia states them leaves League D empty and
gives 18/18/18 for A/B/C. That's consistent with 54 teams, but the source doesn't state the
2028-29 format, so check it when UEFA confirms.

Enter play-off results in `playoff_results` (`{"series": "B/C", "winner": "Cyprus", "loser": "Israel"}`)
and `--next` moves everyone.

```
python3 tools/nations_league.py data/competitions/nations_league_2026_27.json --team Cyprus
python3 tools/nations_league.py data/competitions/nations_league_2026_27.json --next
```

## Getting it into FC 27 (the hard part)

1. **National teams.** FC 27 only has some national teams playable. Cyprus probably isn't
   one of them (unverified). Your DB export will show which of the 54 exist. Missing ones
   would be created as new teams from players already in the DB (Cypriot players are in our
   data). This is experimental.
2. **Competition.** Add the Nations League to compdata as an international competition
   (groups, schedule on the real matchday dates, standings, advancement). Compdata changes
   are the riskiest part of FC modding (Career Mode crashes reported). We start in
   **Tournament mode**, then Career Mode once stable.
3. **Career Mode national-team management**: you take the Cyprus job via the Live Editor job
   offer (Office → Job Search → International), then play the Nations League fixtures.
