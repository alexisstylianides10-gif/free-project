# Ratings Policy — Cypriot Football

**Rule zero: EA's own ratings for APOEL and Omonia are the ruler. Every other Cypriot player
is measured against them.** No inflated ratings. A Krasava Ypsonas player is never rated 90.

## Anchors (EA SPORTS FC 27, launch ratings, checked 2026-11-26)

| Club | Best player | Next best | Notes |
|---|---|---|---|
| APOEL | Filip Đuričić **75** | Laifis 72, Marquinhos 71–72, Belec 71 | Squad goes down to the mid-50s (young players) |
| Omonia | Loïc Négo **73** | Fabiano 72, Tănase 72, Tanković 71 | |

FC 27 "Liga Cyprus" currently contains only these two clubs (FUTBIN lists 2 clubs, 62 players).
**We keep EA's numbers for them** and only fix transfers.

So the **best player in Cyprus is about 75**. Everything else scales down from there.

## Tiers

| Tier | Example clubs (draft) | Max player | Top-3 avg | Squad avg | Max potential |
|---|---|---|---|---|---|
| ea_native | APOEL, Omonia | 76 | 70–74 | 62–68 | 82 |
| title_contender | Pafos, AEK Larnaca, Aris | 76 | 70–74 | 62–68 | 82 |
| upper_mid | Apollon, Anorthosis, AEL | 72 | 67–70 | 60–65 | 78 |
| lower_mid | Achna, ENP, Olympiakos, Omonia Aradippou | 68 | 64–67 | 56–62 | 75 |
| promoted_small | **Krasava ENY Ypsonas**, Akritas | **65** | 61–64 | 52–59 | 72 |
| second_division | — | 62 | 57–61 | 48–56 | 70 |
| third_division | — | 56 | 51–55 | 45–52 | 66 |

- **League hard cap: 77.** Nobody in any Cypriot league goes above it. No exceptions.
- **Override:** a player can go up to **tier max + 2**, and only with a written reason
  (e.g. an ex-Greek Super League veteran with a known EA rating). So the best a Krasava
  player can ever be is **67**.
- **Potential is capped too.** No 17-year-old wonderkid with 90 potential at a small club.

## How it's enforced

`tools/validate_ratings.py` checks every squad CSV and fails the build on any violation.
Unit tests in `tests/test_validate_ratings.py` include "Krasava 90 → rejected".

## Data sources for non-EA players (in priority order)

1. If EA has the player at another club or in an earlier FC → use that rating, adjusted for age/form.
2. Ratings from existing community Cyprus mods (GLE etc.) → **rescaled** to these bands, never copied blindly.
3. Real performance data (minutes, goals, Transfermarkt value) → tier slot.

## Open items
- Confirm the 2026-27 First Division line-up and tier assignments (`data/cyprus/clubs.json` is a draft).
- On the PC: export the APOEL/Omonia rows from the real FC 27 DB to replace these web-sourced anchors.
