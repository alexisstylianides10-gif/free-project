#!/usr/bin/env python3
"""Fill overall/potential for raw squad CSVs, inside each club's tier band.

Order of precedence per player:
  1. EA FC 27 rating from data/cyprus/rating_anchors.json  -> rating_source=ea
  2. Club's key players (anchors file), in listed order    -> top of the curve, rating_source=estimate_key
  3. Everyone else                                         -> rest of the curve, rating_source=estimate

The curve is linear and solved so that the club's top-3 average and squad
average land in the middle of the tier bands from rating_bands.json. Every
value is clamped to the tier max, so no small club can get a superstar.

Usage: python3 tools/estimate_ratings.py data/cyprus/squads/d1_raw.csv data/cyprus/squads/d1.csv
"""
from __future__ import annotations

import csv
import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "cyprus"
OUT_FIELDS = ["club_id", "shirt_number", "known_as", "full_name", "position", "nationality",
              "age", "overall", "potential", "rating_source", "override_reason", "notes"]
FLOOR = 45


def curve(n: int, top3: float, avg: float) -> list[float]:
    if n <= 3:
        return [top3] * n
    slope = 2 * (top3 - avg) / (n - 3)
    start = top3 + slope
    return [start - slope * i for i in range(n)]


def stable_key(name: str) -> str:
    return hashlib.sha1(name.encode("utf-8")).hexdigest()


def estimate(rows: list[dict], bands: dict, clubs: dict, anchors: dict) -> list[dict]:
    by_club: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_club[r["club_id"]].append(r)

    out = []
    for club_id, players in by_club.items():
        tier = bands["tiers"][clubs[club_id]["tier"]]
        cap = tier["max_player"]
        ea = anchors["ea"].get(club_id, {})
        key = anchors["key_players"].get(club_id, [])

        slots = curve(len(players), sum(tier["top3_avg"]) / 2, sum(tier["squad_avg"]) / 2)
        slots = sorted((min(cap, max(FLOOR, round(v))) for v in slots), reverse=True)

        anchored = [p for p in players if p["known_as"] in ea]
        for p in anchored:  # consume the nearest slot so the club average stays on target
            v = ea[p["known_as"]]
            slots.remove(min(slots, key=lambda s: abs(s - v)))

        rest = [p for p in players if p["known_as"] not in ea]
        rest.sort(key=lambda p: (key.index(p["known_as"]) if p["known_as"] in key else len(key),
                                 stable_key(p["known_as"])))

        for p in players:
            p.setdefault("full_name", "")
            p.setdefault("age", "")
            p["override_reason"] = ""
        for p in anchored:
            p["overall"] = ea[p["known_as"]]
            p["rating_source"] = "ea"
        for p, v in zip(rest, slots):
            p["overall"] = v
            p["rating_source"] = "estimate_key" if p["known_as"] in key else "estimate"
        for p in players:
            # Ages are unknown, so potential = overall until real ages are added.
            p["potential"] = p["overall"]
            out.append({k: p.get(k, "") for k in OUT_FIELDS})
    return out


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    bands = json.loads((DATA / "rating_bands.json").read_text(encoding="utf-8"))
    clubs = {c["id"]: c for c in json.loads((DATA / "clubs.json").read_text(encoding="utf-8"))["clubs"]}
    anchors = json.loads((DATA / "rating_anchors.json").read_text(encoding="utf-8"))
    with open(argv[0], newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    out = estimate(rows, bands, clubs, anchors)
    with open(argv[1], "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=OUT_FIELDS)
        w.writeheader()
        w.writerows(out)
    print(f"wrote {len(out)} players to {argv[1]}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
