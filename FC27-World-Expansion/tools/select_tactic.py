#!/usr/bin/env python3
"""Pick a match tactic for a club: formation, team settings, starting XI with FC IQ roles.

Inputs: the club's tactical profile (philosophy + flexibility), its squad, the
opponent's squad, home/away and an optional game state (protect_lead, chasing,
red_card). Output: a plan you set in FC with Live Editor (formation + starting XI are
confirmed Live Editor fields) or in the tactics screen (team settings and roles).

What it decides:
  * formation: the philosophy's preferred shapes, scored by how good the XI the squad
    can field in that shape is, + a bonus for the coach's first choices, + a bonus
    for compact shapes when the club is the underdog (more FW when favourite)
  * roles: philosophy role preferences on standard shapes; custom shapes
    (3-2-4-1, asymmetric) keep their designed roles
  * team settings: philosophy defaults, adjusted by opponent strength and game
    state, scaled by the coach's flexibility

Usage:
  python3 tools/select_tactic.py --club krasava --opponent apoel --away
  python3 tools/select_tactic.py --club apoel --opponent krasava --state protect_lead
  python3 tools/select_tactic.py --all --out data/tactics/generated   # default plan per club
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TACTICS = ROOT / "data" / "tactics"
SQUADS = [ROOT / "data" / "cyprus" / "squads" / "d1.csv", ROOT / "data" / "cyprus" / "squads" / "d2.csv"]

SLOT_LINE = {"GK": "GK"}
SLOT_LINE.update({s: "DF" for s in ("LB", "RB", "LCB", "RCB", "CB")})
SLOT_LINE.update({s: "MF" for s in ("CDM", "LDM", "RDM", "LCM", "RCM", "LM", "RM", "CAM", "LAM", "RAM", "LWB", "RWB")})
SLOT_LINE.update({s: "FW" for s in ("LW", "RW", "ST", "LS", "RS")})
SLOT_KIND = {"GK": "GK", "LCB": "CB", "RCB": "CB", "CB": "CB", "LB": "FB", "RB": "FB",
             "CDM": "DM", "LDM": "DM", "RDM": "DM", "LW": "W", "RW": "W", "LM": "W", "RM": "W",
             "ST": "ST", "LS": "ST", "RS": "ST"}
HOME_ADVANTAGE = 2.0


def load(name: str) -> dict:
    return json.loads((TACTICS / name).read_text(encoding="utf-8"))


ATTRIBUTES = ROOT / "data" / "cyprus" / "squads" / "attributes.csv"
OUT_OF_POSITION = 5  # rating penalty when a slot isn't one of the player's natural positions
SLOT_POS = {"GK": "GK", "LCB": "CB", "RCB": "CB", "CB": "CB", "LB": "LB", "RB": "RB",
            "LWB": "LWB", "RWB": "RWB", "CDM": "CDM", "LDM": "CDM", "RDM": "CDM",
            "LCM": "CM", "RCM": "CM", "CAM": "CAM", "LAM": "CAM", "RAM": "CAM",
            "LM": "LM", "RM": "RM", "LW": "LW", "RW": "RW", "ST": "ST", "LS": "ST", "RS": "ST"}
# Fill the hardest-to-cover slots first.
SLOT_ORDER = ["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "ST", "CAM", "LW", "RW", "LM", "RM", "CM"]


def load_squads(paths=SQUADS, attributes=ATTRIBUTES) -> dict[str, list[dict]]:
    extra = {}
    if attributes.exists():
        with open(attributes, newline="", encoding="utf-8") as fh:
            for a in csv.DictReader(fh):
                extra[(a["club_id"], a["known_as"])] = a
    squads: dict[str, list[dict]] = {}
    for path in paths:
        with open(path, newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                r["overall"] = int(r["overall"])
                a = extra.get((r["club_id"], r["known_as"]))
                if a:
                    r["main_pos"] = a["position"]
                    r["natural"] = {a["position"], *filter(None, a["alt_positions"].split("|"))}
                    r["pos_rating"] = {k: int(v) for k, v in (x.split(":") for x in a["position_ratings"].split("|"))}
                squads.setdefault(r["club_id"], []).append(r)
    return squads


def fit(p: dict, pos: str) -> int:
    """How well a player plays a position: his rating there, minus a penalty if it isn't natural."""
    if "pos_rating" not in p:  # no detailed data: fall back to broad lines
        line = {"GK": "GK", "CB": "DF", "LB": "DF", "RB": "DF", "LWB": "DF", "RWB": "DF"}.get(pos)
        line = line or ("FW" if pos in ("ST", "LW", "RW") else "MF")
        return p["overall"] - (0 if p["position"] == line else OUT_OF_POSITION * 2)
    if pos == "GK" or p.get("main_pos") == "GK":
        return p["overall"] if pos == p.get("main_pos") else 0
    rating = p["pos_rating"].get(pos, p["overall"] - 15)
    return rating if pos in p["natural"] else rating - OUT_OF_POSITION


def assign(squad: list[dict], slots: list[str]) -> list[tuple[str, dict, int]] | None:
    """Greedy slot filling, hardest positions first: best available fit for each slot."""
    order = sorted(range(len(slots)), key=lambda i: SLOT_ORDER.index(SLOT_POS[slots[i]]))
    used: set[int] = set()
    filled: dict[int, tuple[str, dict, int]] = {}
    for i in order:
        pos = SLOT_POS[slots[i]]
        best = max((p for p in squad if id(p) not in used), key=lambda p: fit(p, pos), default=None)
        if best is None or fit(best, pos) <= 0:
            return None
        used.add(id(best))
        filled[i] = (slots[i], best, fit(best, pos))
    xi = [filled[i] for i in range(len(slots))]
    return improve(xi, [p for p in squad if id(p) not in used])


def improve(xi: list, bench: list[dict]) -> list:
    """Swap pairs (slot<->slot, slot<->bench) while the team's total fit goes up."""
    xi = list(xi)
    bench = list(bench)
    changed = True
    while changed:
        changed = False
        for i in range(len(xi)):
            for j in range(i + 1, len(xi)):
                (si, pi, fi), (sj, pj, fj) = xi[i], xi[j]
                a, b = fit(pj, SLOT_POS[si]), fit(pi, SLOT_POS[sj])
                if a > 0 and b > 0 and a + b > fi + fj:
                    xi[i], xi[j] = (si, pj, a), (sj, pi, b)
                    changed = True
            for k, q in enumerate(bench):
                si, pi, fi = xi[i]
                a = fit(q, SLOT_POS[si])
                if a > fi:
                    xi[i], bench[k] = (si, q, a), pi
                    changed = True
    return xi


STRENGTH_SLOTS = ["GK", "LB", "LCB", "RCB", "RB", "LM", "LCM", "RCM", "RM", "LS", "RS"]


def strength(squad: list[dict]) -> float:
    xi = assign(squad, STRENGTH_SLOTS)
    if not xi:
        return sum(sorted((p["overall"] for p in squad), reverse=True)[:11]) / 11
    return sum(f for _, _, f in xi) / len(xi)


def score_formation(name: str, rank: int, xi: list, situation: str, formations: dict) -> float:
    total = sum(f for _, _, f in xi)
    bonus = [3.0, 2.0, 1.0][rank] if rank < 3 else 0.0
    lines = formations[name]["lines"]
    if situation == "underdog":
        bonus += 1.5 * (lines["DF"] + lines["MF"] - 8)
    elif situation == "favourite":
        bonus += 1.5 * (lines["FW"] - 2)
    return total + bonus


def adjust_team(team: dict, deltas: list[tuple[dict, float]]) -> dict:
    out = dict(team)
    for delta, weight in deltas:
        if "line_height_delta" in delta:
            out["line_height"] = round(out["line_height"] + delta["line_height_delta"] * weight)
        for key in ("defensive_approach", "build_up"):
            if key in delta and weight >= 0.5:
                out[key] = delta[key]
    out["line_height"] = max(1, min(100, out["line_height"]))
    return out


def select(club: str, opponent: str, home: bool, state: str | None, squads: dict) -> dict:
    profiles = load("club_profiles.json")["clubs"]
    phil_data = load("philosophies.json")
    formations = load("formations.json")["formations"]
    roles = load("roles.json")["our_roles"]

    prof = profiles[club]
    phil = phil_data["philosophies"][prof["philosophy"]]
    flex = prof["flexibility"]
    squad = squads[club]

    diff = strength(squad) - strength(squads[opponent]) + (HOME_ADVANTAGE if home else -HOME_ADVANTAGE)
    situation = "underdog" if diff < -3 else "favourite" if diff > 3 else "even"

    candidates = []
    for rank, name in enumerate(phil["formations"]):
        slots = [slot for slot, _ in formations[name]["slots"]]
        if state == "red_card":  # lose a forward (or a midfielder if there's only one striker)
            fw = [s_ for s_ in slots if SLOT_LINE[s_] == "FW"]
            slots.remove(fw[-1] if len(fw) > 1 else [s_ for s_ in slots if SLOT_LINE[s_] == "MF"][-1])
        xi = assign(squad, slots)
        if xi:
            candidates.append((score_formation(name, rank, xi, situation, formations), name, xi))
    if not candidates:
        raise ValueError(f"{club}: squad can't field any of {phil['formations']}")
    _, fname, xi = max(candidates, key=lambda c: c[0])
    form = formations[fname]
    slot_role = dict(form["slots"])

    swaps = {}
    for s in ([state] if state in phil_data["game_states"] else []):
        swaps.update(phil_data["game_states"][s].get("swap", {}))

    lineup = []
    used: set[str | None] = set()
    for slot, player, rating in xi:
        default_role = slot_role[slot]
        kind = SLOT_KIND.get(slot)
        role = default_role
        # Philosophy role on the first striker only: strike pairs keep their designed
        # partner role (e.g. target man + poacher) instead of two identical roles.
        if form["fc_native"] and kind in phil["role_prefs"] and not (kind == "ST" and "ST" in used):
            role = phil["role_prefs"][kind]
        used.add(kind)
        role = swaps.get(kind, role)
        pos = SLOT_POS[slot]
        lineup.append({"slot": slot, "player": player["known_as"], "overall": player["overall"],
                       "rating_here": rating, "natural": pos in player.get("natural", {pos}),
                       "main_position": player.get("main_pos", player["position"]),
                       "role": role, "fc_role": roles[role]["fc_role"]})

    deltas = []
    if situation != "even":
        deltas.append((phil_data["game_states"][situation], flex))
    if state:
        deltas.append((phil_data["game_states"][state], 1.0))
    return {"club": club, "opponent": opponent, "venue": "home" if home else "away",
            "situation": situation, "strength_diff": round(diff, 1), "game_state": state or "start",
            "philosophy": prof["philosophy"], "formation": fname, "fc_base_formation": form["base"],
            "team": adjust_team(phil["team"], deltas), "lineup": lineup,
            "note": form.get("note", "")}


def print_plan(plan: dict) -> None:
    print(f"{plan['club']} vs {plan['opponent']} ({plan['venue']}, {plan['situation']}, "
          f"diff {plan['strength_diff']:+}) state={plan['game_state']}")
    print(f"  {plan['philosophy']}: {plan['formation']} (FC base {plan['fc_base_formation']})  "
          f"build-up {plan['team']['build_up']}, defence {plan['team']['defensive_approach']}, "
          f"line {plan['team']['line_height']}")
    for s in plan["lineup"]:
        flag = "" if s["natural"] else f"  (out of position, normally {s['main_position']})"
        print(f"    {s['slot']:4} {s['player']:28} {s['rating_here']:3}  {s['fc_role']}{flag}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--club")
    ap.add_argument("--opponent")
    ap.add_argument("--away", action="store_true")
    ap.add_argument("--state", choices=["protect_lead", "chasing", "red_card"])
    ap.add_argument("--all", action="store_true", help="default plan (neutral, home) for every club with a profile")
    ap.add_argument("--out")
    args = ap.parse_args()
    squads = load_squads()

    if args.all:
        out = Path(args.out or TACTICS / "generated")
        out.mkdir(parents=True, exist_ok=True)
        for club in load("club_profiles.json")["clubs"]:
            plan = select(club, club, True, None, squads)
            plan["opponent"], plan["situation"] = "neutral", "even"
            (out / f"{club}.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"{club:20} {plan['formation']:10} {plan['philosophy']}")
        return 0
    plan = select(args.club, args.opponent, not args.away, args.state, squads)
    print_plan(plan)
    if args.out:
        Path(args.out).write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
