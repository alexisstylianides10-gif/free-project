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

| Tier | Example clubs | Season-1 max player | Top-3 avg | Squad avg |
|---|---|---|---|---|
| ea_native | APOEL, Omonia | 76 | 70–74 | 62–68 |
| title_contender | Pafos, AEK Larnaca, Aris | 76 | 70–74 | 62–68 |
| upper_mid | Apollon, Anorthosis, AEL | 72 | 67–70 | 60–65 |
| lower_mid | Olympiakos, Omonia Aradippou, Nea Salamina | 68 | 64–67 | 56–62 |
| promoted_small | **Krasava ENY Ypsonas**, Karmiotissa, Omonia 29M | **65** | 61–64 | 52–59 |
| second_division | — | 62 | 57–61 | 48–56 |
| third_division | — | 56 | 51–55 | 45–52 |

- **League hard cap: 77** on starting ratings. Nobody in any Cypriot league starts above it.
- **Override:** a player can go up to **tier max + 2**, and only with a written reason
  (e.g. an ex-Greek Super League veteran with a known EA rating). So the best a Krasava
  player can **start** at is **67**.
- **These caps are for the STARTING ratings of season 1 only.** After that, players grow
  toward their own potential and can pass their club's cap. A Krasava kid can become a
  75 and move to APOEL.
- **Potential is per player, not per club** (age + talent). Global ceiling: **88**.

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

## Potential (player growth in Career Mode)

FC grows players toward their **potential** with playing time and training. Potential
therefore depends mostly on **age**:

| Age | Potential = overall + |
|---|---|
| ≤19 | 9–15 |
| 20–21 | 6–11 |
| 22–23 | 3–7 |
| 24–26 | 1–4 |
| 27–29 | 0–2 |
| 30+ | 0 (they decline instead) |

Potential is **not** capped by club. Only the global ceiling of 88 applies. Extras:
- Young players (≤23) on loan from big clubs (PSG, Sporting, Monaco, Panathinaikos…) get **+3** talent.
- `data/cyprus/potential_overrides.json`: set any player's real age or potential yourself.
  Example: Yoram Zague (PSG loanee, age 20) 66 → 78.

**Ages are guesses until we get real birth dates** (`age_basis` column):
- `guess_veteran`: on our known-32+ list → no growth
- `guess_youth`: Cypriot in the bottom 40% of his squad → treated as 19
- `guess_young`: Cypriot in the 40–60% band → 22
- `guess_prime`: everyone else → 27
- `real`: an actual age was supplied

The guess is wrong for some players (e.g. an established Cypriot international who is a
squad player gets treated as a kid). Real birth dates from the Live Editor DB export
replace every guess automatically: fill the `age` column and re-run `tools/estimate_ratings.py`.

## Ageing and decline (`tools/progress_season.py`)

Every season each player ages one year and his overall moves by age:

| Age | Change per season |
|---|---|
| ≤21 | +3 to +6 (+1 more if he's a regular starter), never past potential |
| 22–24 | +1 to +4 |
| 25–28 | 0 to +2 |
| 29–30 | −1 to +1 |
| 31–32 | −3 to −1 |
| 33–34 | −4 to −2 |
| 35 | −5 to −3 |
| **36+** | **−7 to −4** |

- When declining, **pace goes first** (about 2× the overall drop), then stamina, agility and
  jumping. Vision, composure, positioning and reactions hold up. Attributes are re-tuned so
  they still give exactly the new overall.
- Past the peak, potential falls with the overall.
- Retirement chance at season end: 34: 5% · 35: 15% · 36: 30% · 37: 50% · 38+: 75%.
- Known veterans now have their real ages (`potential_overrides.json`, general knowledge,
  verify): David Luiz 39, Fabiano 38, Jovetić 37, Miramón 37, Belec 36, Narsingh 36…

Example: Jovetić 69 at 37 → 63 at 38 (retires). Đuričić 75 → 72 → 67, retiring at 36.
A kid like Gerasimou goes 63 → 67 → 73 → 77.

In-game, FC 27 Career Mode ages players with its own system. This model previews a
realistic curve and supplies the numbers we write in through Live Editor (its player
editor, and the new Growth Profile setting once we confirm what it controls).
