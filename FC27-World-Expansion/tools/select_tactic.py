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


def load_squads(paths=SQUADS) -> dict[str, list[dict]]:
    squads: dict[str, list[dict]] = {}
    for path in paths:
        with open(path, newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                r["overall"] = int(r["overall"])
                squads.setdefault(r["club_id"], []).append(r)
    return squads


def pick_xi(squad: list[dict], lines: dict[str, int]) -> dict[str, list[dict]] | None:
    """Best players per line. A short line borrows from the next line's surplus."""
    by_line = {k: sorted((p for p in squad if p["position"] == k), key=lambda p: -p["overall"])
               for k in ("GK", "DF", "MF", "FW")}
    if not by_line["GK"]:
        return None
    xi = {"GK": by_line["GK"][:1]}
    spare: list[dict] = []
    for line in ("DF", "MF", "FW"):
        need = lines.get(line, 0)
        pool = by_line[line] + spare
        pool.sort(key=lambda p: -p["overall"])
        if len(pool) < need:
            return None
        xi[line] = pool[:need]
        spare = pool[need:]
    return xi


def strength(squad: list[dict]) -> float:
    xi = pick_xi(squad, {"DF": 4, "MF": 4, "FW": 2})
    players = [p for line in xi.values() for p in line] if xi else squad[:11]
    return sum(p["overall"] for p in players) / len(players)


def score_formation(name: str, rank: int, xi: dict, situation: str, formations: dict) -> float:
    total = sum(p["overall"] for line in xi.values() for p in line)
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
        lines = dict(formations[name]["lines"])
        if state == "red_card":
            drop = "FW" if lines["FW"] > 1 else "MF"
            lines[drop] -= 1
        xi = pick_xi(squad, lines)
        if xi:
            candidates.append((score_formation(name, rank, xi, situation, formations), name, xi, lines))
    if not candidates:
        raise ValueError(f"{club}: squad can't field any of {phil['formations']}")
    _, fname, xi, lines = max(candidates, key=lambda c: c[0])
    form = formations[fname]

    swaps = {}
    for s in ([state] if state in phil_data["game_states"] else []):
        swaps.update(phil_data["game_states"][s].get("swap", {}))

    lineup = []
    used: set[str | None] = set()
    pools = {k: list(v) for k, v in xi.items()}
    for slot, default_role in form["slots"]:
        line = SLOT_LINE[slot]
        if not pools.get(line):
            continue  # red card: this slot is left empty
        player = pools[line].pop(0)
        kind = SLOT_KIND.get(slot)
        role = default_role
        # Philosophy role on the first striker only: strike pairs keep their designed
        # partner role (e.g. target man + poacher) instead of two identical roles.
        if form["fc_native"] and kind in phil["role_prefs"] and not (kind == "ST" and "ST" in used):
            role = phil["role_prefs"][kind]
        used.add(kind)
        role = swaps.get(kind, role)
        lineup.append({"slot": slot, "player": player["known_as"], "overall": player["overall"],
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
        print(f"    {s['slot']:4} {s['player']:28} {s['overall']:3}  {s['fc_role']}")


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
