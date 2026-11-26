# Transfers: More Moves, Realistic Ones

Goal: more transfer activity in Career Mode, but every move fits the buying club.
Krasava does not buy Mbappé.

## What we can and can't change

| Lever | Status | How |
|---|---|---|
| FC 27's own CPU transfer AI (who it targets, how often) | **Not moddable**: native code. EA says FC 27 has a rebuilt market with "smarter AI decisions". No frequency setting found. | — |
| Club **transfer budget** | Feasible (Live Editor Teams Editor has it) | `data/cyprus/club_economics.json` |
| Club **prestige** (decides who agrees to join) | Likely feasible (prestige fields existed in every recent FC/FIFA DB; check the FC 27 export) | same file |
| **Extra realistic transfers each window** | Feasible now, applied by hand | `tools/plan_transfers.py` |
| Applying the plan automatically | Research: Live Editor's Lua transfer functions aren't documented; needs your PC | — |

## Club economics (`club_economics.json`)

Estimates, since no public source gives Cypriot budgets:

| Tier | Prestige (domestic) | Transfer budget | Max fee |
|---|---|---|---|
| APOEL / Omonia | 9 | €4.0M | €2.5M |
| Pafos | 9 | €6.0M | €3.5M |
| AEK / Aris | 8 | €3.5M | €2.0M |
| Apollon / Anorthosis / AEL | 7 (Anorthosis 8) | €1.5M | €0.8M |
| Olympiakos / Aradippou / Nea Salamina | 5 | €0.5M | €0.25M |
| Krasava / Karmiotissa / Omonia 29M | 3 | €250k | €120k |
| Second Division | 2 | €80k | €40k |

## Transfer planner rules

A move happens only if **all** of these hold:
1. The buyer has a gap at that position (target shape 3 GK / 8 DF / 8 MF / 5 FW).
2. The player's rating fits: no worse than the buyer's best minus 6, no better than the
   buyer's tier cap plus 2. **Krasava can't sign anyone above 67.**
3. The buyer can afford him (max fee and remaining budget).
4. The player accepts: buyer prestige ≥ seller prestige − 1. A Second Division club can't
   prise players from APOEL.
5. Clubs only sell one of their **top 3** players to a club with **higher** prestige.
6. Loan players are never sold, and nobody moves twice in one window.
7. Cyprus's usual markets (Greece, Portugal, Spain, Balkans, Brazil, West Africa) get a slight preference.

Result on our data: about **30+ moves per window** across 27 clubs. Examples: AEK's
van der Hoorn goes to Pafos (the biggest spender), and Krasava picks up 56–60 rated keepers and
defenders for under €100k.

Usage:
```
python3 tools/plan_transfers.py --window summer --seed 2027 --out plan.csv data/cyprus/squads/d1.csv data/cyprus/squads/d2.csv
```
Then in Live Editor: Players editor → the player → transfer to the club in the plan.
Change `--seed` each season for a different (still realistic) market.

**With your full game DB export** the pool becomes every player in FC 27, so Cypriot
clubs can sign from Greece, Portugal and elsewhere, under the same rules.
