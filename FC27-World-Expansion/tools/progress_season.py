#!/usr/bin/env python3
"""Age every player by one season: young players grow, old players decline, some retire.

FC 27 Career Mode already ages players with its own native system. This model is
ours: it previews what a realistic decline looks like, drives our tools across
seasons (ratings, transfers, tactics), and gives the numbers to write into the
game via Live Editor (player editor / the Growth Profile setting added in Live
Editor v27.2.1, once we confirm what it controls).

Overall change per season, by age (before random spread):
    <=21  +3..+6  (toward potential, faster for regular starters)
    22-24 +1..+4
    25-28  0..+2
    29-30 -1..+1
    31-32 -3..-1
    33-34 -4..-2
    35    -5..-3
    36+   -7..-4   <- the cliff
Growth never passes a player's potential. Once a player is past his peak,
potential falls with his overall.

Which attributes go first when declining: pace (acceleration, sprint speed) at
about 2x the overall drop, then stamina, agility and jumping at 1.5x; reactions,
vision, composure and positioning hold up (0.3x). Growing players gain more in
the attributes their position uses.

Retirement chance at season end: 34: 5%, 35: 15%, 36: 30%, 37: 50%, 38+: 75%.

Usage:
  python3 tools/progress_season.py --seasons 3                 # preview 3 seasons
  python3 tools/progress_season.py --seasons 3 --player "Stevan Jovetić"
  python3 tools/progress_season.py --seasons 1 --out data/cyprus/squads/season_2027_28.csv
"""
from __future__ import annotations

import argparse
import csv
import hashlib
from pathlib import Path

from generate_attributes import ATTRS, GK_ATTRS, SIDE, WEIGHTS, weighted

ROOT = Path(__file__).resolve().parent.parent
SQUADS = ROOT / "data" / "cyprus" / "squads"

CURVE = [(21, 3, 6), (24, 1, 4), (28, 0, 2), (30, -1, 1), (32, -3, -1), (34, -4, -2), (35, -5, -3), (99, -7, -4)]
RETIRE = {34: 5, 35: 15, 36: 30, 37: 50}
DECLINE_FACTOR = {"acceleration": 2.0, "sprint_speed": 2.0, "stamina": 1.5, "agility": 1.5, "jumping": 1.5,
                  "balance": 1.2, "strength": 1.0, "reactions": 0.3, "vision": 0.3, "composure": 0.3,
                  "positioning": 0.3, "def_awareness": 0.4, "gk_positioning": 0.4, "short_passing": 0.6,
                  "long_passing": 0.6, "fk_accuracy": 0.5, "penalties": 0.5, "curve": 0.5,
                  "gk_reflexes": 1.3, "gk_diving": 1.3}


def roll(key: str, lo: int, hi: int) -> int:
    return lo + int(hashlib.sha1(key.encode("utf-8")).hexdigest(), 16) % (hi - lo + 1)


def overall_change(p: dict, season: int, starter: bool) -> int:
    age = p["age"]
    for max_age, lo, hi in CURVE:
        if age <= max_age:
            break
    delta = roll(f"ovr:{season}:{p['known_as']}", lo, hi)
    if delta > 0 and starter:
        delta += 1  # regular minutes speed up development
    if delta > 0:
        delta = min(delta, max(0, p["potential"] - p["overall"]))
    return max(delta, 40 - p["overall"])  # floor: nobody drops below 40


def retires(p: dict, season: int) -> bool:
    age = p["age"]
    chance = 75 if age >= 38 else RETIRE.get(age, 0)
    return roll(f"retire:{season}:{p['known_as']}", 1, 100) <= chance


def age_attributes(attrs: dict, kind: str, new_ovr: int, delta: int) -> dict:
    """Spread the overall change over attributes, then re-tune to the exact overall."""
    used = WEIGHTS[kind]
    out = {}
    for a in ATTRS:
        if a in GK_ATTRS and kind != "GK":
            out[a] = attrs[a]
            continue
        if delta < 0:
            f = DECLINE_FACTOR.get(a, 1.0)
        else:
            f = 1.3 if a in used else 0.6
        out[a] = max(10, min(99, round(attrs[a] + delta * f)))
    order = sorted(used, key=lambda a: -used[a])
    for step in range(300):
        diff = new_ovr - round(weighted(out, kind))
        if diff == 0:
            break
        a = order[step % len(order)]
        if delta < 0 and diff < 0 and DECLINE_FACTOR.get(a, 1.0) < 0.5:
            continue  # declining: don't take the extra point from the skills that age well
        out[a] = max(10, min(99, out[a] + (1 if diff > 0 else -1)))
    return out


def load_players() -> list[dict]:
    attrs = {}
    with open(SQUADS / "attributes.csv", newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            attrs[(r["club_id"], r["known_as"])] = r
    players = []
    for f in ("d1.csv", "d2.csv"):
        with open(SQUADS / f, newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                a = attrs[(r["club_id"], r["known_as"])]
                age = int(r["age"]) if str(r["age"]).isdigit() else \
                    {"guess_veteran": 33, "guess_youth": 19, "guess_young": 22}.get(r["age_basis"], 27)
                players.append({"club_id": r["club_id"], "known_as": r["known_as"], "position": a["position"],
                                "age": age, "age_basis": r["age_basis"], "overall": int(r["overall"]),
                                "potential": int(r["potential"]),
                                "attrs": {k: int(a[k]) for k in ATTRS}})
    return players


def progress(players: list[dict], season: int) -> tuple[list[dict], list[dict]]:
    """One season. Returns (players still playing, retirements)."""
    starters = set()
    by_club: dict[str, list[dict]] = {}
    for p in players:
        by_club.setdefault(p["club_id"], []).append(p)
    for sq in by_club.values():
        starters |= {p["known_as"] for p in sorted(sq, key=lambda p: -p["overall"])[:11]}

    staying, retired = [], []
    for p in players:
        p = {**p, "attrs": dict(p["attrs"])}
        delta = overall_change(p, season, p["known_as"] in starters)
        kind = SIDE.get(p["position"], p["position"])
        p["overall"] += delta
        p["attrs"] = age_attributes(p["attrs"], kind, p["overall"], delta)
        if delta < 0 or p["age"] >= 30:
            p["potential"] = p["overall"]  # past the peak: no headroom left
        p["potential"] = max(p["potential"], p["overall"])
        p["last_change"] = delta
        leaving = retires(p, season)  # decided on the age he played this season at
        p["age"] += 1
        (retired if leaving else staying).append(p)
    return staying, retired


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seasons", type=int, default=1)
    ap.add_argument("--player")
    ap.add_argument("--out")
    args = ap.parse_args()

    players = load_players()
    history = {p["known_as"]: [(p["age"], p["overall"], "")] for p in players}
    for s in range(1, args.seasons + 1):
        players, retired = progress(players, s)
        for p in players:
            history[p["known_as"]].append((p["age"], p["overall"], f"{p['last_change']:+d}"))
        for p in retired:
            history[p["known_as"]].append((p["age"], p["overall"], f"{p['last_change']:+d} RETIRED"))
        print(f"Season +{s}: {len(retired)} retired"
              + (f" ({', '.join(p['known_as'] for p in retired[:8])}{'…' if len(retired) > 8 else ''})" if retired else ""))

    names = [args.player] if args.player else \
        ["David Luiz", "Stevan Jovetić", "Filip Đuričić", "Connor Goldson", "Yoram Zague", "David Gerasimou"]
    for n in names:
        if n in history:
            path = "  ->  ".join(f"{ovr} (age {age}{', ' + note if note else ''})" for age, ovr, note in history[n])
            print(f"{n}: {path}")
    if args.out:
        with open(args.out, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=["club_id", "known_as", "position", "age", "overall", "potential", *ATTRS])
            w.writeheader()
            for p in players:
                w.writerow({k: p[k] for k in ("club_id", "known_as", "position", "age", "overall", "potential")} | p["attrs"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
