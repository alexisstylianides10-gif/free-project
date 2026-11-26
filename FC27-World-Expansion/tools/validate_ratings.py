#!/usr/bin/env python3
"""Validate Cypriot squad ratings against data/cyprus/rating_bands.json.

Squad CSV columns:
    club_id,player_name,position,age,overall,potential,source,override_reason

Errors (exit code 1):
  - club_id not in clubs.json
  - overall above the club tier's max_player (unless override_reason is set
    and overall <= max_player + override_allowance)
  - overall above league_hard_cap (no override possible)
  - potential above tier max_potential (same override rule, +override_allowance)
  - potential below overall
Warnings:
  - top-3 average or squad average outside the tier band

Usage: python3 tools/validate_ratings.py data/cyprus/squads/*.csv
"""
from __future__ import annotations

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANDS_PATH = ROOT / "data" / "cyprus" / "rating_bands.json"
CLUBS_PATH = ROOT / "data" / "cyprus" / "clubs.json"


def load_config(bands_path: Path = BANDS_PATH, clubs_path: Path = CLUBS_PATH):
    bands = json.loads(bands_path.read_text(encoding="utf-8"))
    clubs = json.loads(clubs_path.read_text(encoding="utf-8"))["clubs"]
    return bands, {c["id"]: c for c in clubs}


def validate_rows(rows, bands, clubs):
    errors: list[str] = []
    warnings: list[str] = []
    hard_cap = bands["league_hard_cap"]
    allowance = bands["override_allowance"]
    by_club: dict[str, list[int]] = defaultdict(list)

    for i, row in enumerate(rows, start=2):  # line 1 is the header
        where = f"line {i} ({row.get('known_as') or row.get('player_name', '?')})"
        club = clubs.get(row.get("club_id", ""))
        if club is None:
            errors.append(f"{where}: unknown club_id '{row.get('club_id')}'")
            continue
        tier = bands["tiers"][club["tier"]]
        try:
            ovr = int(row["overall"])
            pot = int(row["potential"])
        except (KeyError, ValueError):
            errors.append(f"{where}: overall/potential must be integers")
            continue
        has_override = bool((row.get("override_reason") or "").strip())

        if ovr > hard_cap:
            errors.append(f"{where}: OVR {ovr} > league hard cap {hard_cap} ({club['name']})")
        elif ovr > tier["max_player"]:
            limit = tier["max_player"] + allowance
            if not has_override:
                errors.append(f"{where}: OVR {ovr} > {club['name']} tier max {tier['max_player']}")
            elif ovr > limit:
                errors.append(f"{where}: OVR {ovr} > override limit {limit} for {club['name']}")

        if pot < ovr:
            errors.append(f"{where}: potential {pot} < overall {ovr}")
        if pot > tier["max_potential"]:
            if not has_override or pot > tier["max_potential"] + allowance:
                errors.append(f"{where}: POT {pot} > {club['name']} tier max potential {tier['max_potential']}")

        by_club[club["id"]].append(ovr)

    for club_id, ovrs in by_club.items():
        club = clubs[club_id]
        tier = bands["tiers"][club["tier"]]
        top3 = sorted(ovrs, reverse=True)[:3]
        top3_avg = sum(top3) / len(top3)
        squad_avg = sum(ovrs) / len(ovrs)
        lo, hi = tier["top3_avg"]
        if not lo <= top3_avg <= hi:
            warnings.append(f"{club['name']}: top-3 avg {top3_avg:.1f} outside {lo}-{hi}")
        lo, hi = tier["squad_avg"]
        if not lo <= squad_avg <= hi:
            warnings.append(f"{club['name']}: squad avg {squad_avg:.1f} outside {lo}-{hi}")
    return errors, warnings


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    bands, clubs = load_config()
    rows = []
    for path in argv:
        with open(path, newline="", encoding="utf-8") as fh:
            rows.extend(csv.DictReader(fh))
    errors, warnings = validate_rows(rows, bands, clubs)
    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"{len(rows)} players checked: {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
