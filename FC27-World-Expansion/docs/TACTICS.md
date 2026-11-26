# Tactics System

Status: **data + selector done; applying it in-game is manual for now.**

## Pieces (`data/tactics/`)

| File | What |
|---|---|
| `roles.json` | Our 22 roles → FC 27 FC IQ roles (exact or approximate) |
| `formations.json` | 4-3-3, 4-2-3-1, 4-4-2, 3-5-2, 3-4-3, 4-1-4-1, 4-2-2-2 native; **3-2-4-1** and **asymmetric 4-3-3** built from roles |
| `philosophies.json` | Possession, positional, gegenpress, direct, counter, low block, balanced + game-state changes |
| `club_profiles.json` | Each First Division club's style, coach and flexibility |

## Role mapping highlights
- Exact matches: false 9, target man (Target Forward), inverted winger (Inside Forward),
  inverted fullback (Falseback), overlapping fullback (Attacking Wingback), DLP, box-to-box,
  ball-playing defender, sweeper keeper, wingback.
- Approximate: ball-winning midfielder → Holding, anchor → Centre-Half, underlapping
  fullback → Inverted Wingback.
- FC 27 has 37 roles. Tactics sites are blocked from our build machine, so the list is based on
  FC 25/26 plus the confirmed FC 27 additions. **Check every role in-game once.**

## Club identities (estimates, edit freely)

| Club | Coach | Style | Default shape |
|---|---|---|---|
| APOEL | Papadopoulos | Possession | 4-3-3 |
| Omonia | Berg | Balanced | 4-2-3-1 |
| Pafos | Sá Pinto | Gegenpress | 3-4-3 |
| AEK Larnaca | Sellés | Positional | 3-2-4-1 |
| Aris | Radzkow | Balanced | 4-2-3-1 |
| Apollon | Losada | Gegenpress | 4-3-3 |
| Anorthosis | Yitzhaki | Balanced | 4-3-3 |
| AEL | Martins | Possession | 4-3-3 |
| Olympiakos | Kostis | Counter | 3-5-2 |
| Omonia Aradippou | Okkas | Counter | 4-4-2 |
| Nea Salamina | Avgousti | Direct | 4-4-2 |
| Karmiotissa | Garpozis | Low block | 4-1-4-1 |
| Omonia 29M | Buyse | Counter | 4-4-2 |
| Krasava | Chyhrynskyi | Low block | 3-5-2 |

## Match selector (`tools/select_tactic.py`)
- Picks a formation from the coach's preferences by **how good an XI the squad can field**
  in it, + a bonus for compact shapes as **underdog** and more forwards as **favourite**.
- Home advantage, opponent strength, and the coach's **flexibility** shape the line height
  and defensive approach. Example: Krasava away at APOEL sits in a 3-5-2 low block with the line
  at 21, while APOEL at home plays 4-3-3 possession with the line at 73.
- Game states: `protect_lead` (deeper, wide mids, target man), `chasing` (higher,
  aggressive, overlapping fullbacks), `red_card` (drop a forward, keep the back line).

## Honest limits
- **In-match AI is FC's native code.** We can set each club's formation, XI, team settings
  and roles (Live Editor + tactics screen). We can't script live in-match decisions.
  Pre-match tactic selection by Lua is the next experiment.
- Positions in our data are only GK/DF/MF/FW, so the selector can put an attacking
  midfielder at CDM (it did with Đuričić). Real positions from your DB export fix this.
