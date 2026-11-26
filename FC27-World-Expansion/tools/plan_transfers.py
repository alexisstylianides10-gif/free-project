#!/usr/bin/env python3
"""Plan realistic extra transfers for one window: more moves, but only ones that fit.

FC 27's own CPU transfer AI is native code we can't change. This planner adds a
layer on top: it proposes moves you then apply with Live Editor (Teams/Players
editor -> transfer player). Later, once the Live Editor Lua transfer functions are
confirmed on your PC, the same plan can be applied automatically.

A move is only proposed when ALL of these hold:
  * the buyer has a squad hole at that position (vs squad_shape)
  * the player's rating fits the buyer: >= buyer's best - target_ovr_below_club_best,
    and <= buyer's tier cap + target_ovr_above_tier_cap  (no Krasava-buys-Mbappe)
  * the fee fits the buyer's max_fee and remaining transfer budget
  * the player accepts: buyer prestige >= seller prestige - prestige_gap_player_accepts
  * the seller keeps at least squad_shape at that position after the sale
  * a club only sells one of its top-3 players to a club with HIGHER prestige
  * a player moves at most once per window
  * players on loan are never sold (they belong to another club)

Input pool = any squad CSV(s) with club_id, known_as, position, overall, potential,
age/age_basis. Today that is our Cypriot data. With your full FC 27 DB export the
pool becomes every player in the game, and the rules above keep it realistic.

Usage: python3 tools/plan_transfers.py --window summer --seed 2027 data/cyprus/squads/d1.csv data/cyprus/squads/d2.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "cyprus"


def load_json(name: str) -> dict:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def club_econ(club: dict, econ: dict) -> dict:
    e = dict(econ["tier_defaults"][club["tier"]])
    e.update({k: v for k, v in econ["club_overrides"].get(club["id"], {}).items() if not k.startswith("_")})
    return e


def market_value(ovr: int, pot: int, age: int) -> int:
    """Rough fee in EUR for Cypriot-level players (estimate, monotonic in ovr/pot)."""
    base = 15000 * 1.28 ** max(0, ovr - 50)
    youth = 1 + max(0, pot - ovr) * 0.06 if age <= 23 else 1.0
    decline = 0.6 if age >= 31 else 1.0
    return int(round(base * youth * decline, -3))


def age_of(p: dict) -> int:
    raw = str(p.get("age") or "").strip()
    if raw.isdigit():
        return int(raw)
    return {"guess_veteran": 33, "guess_youth": 19, "guess_young": 22}.get(p.get("age_basis", ""), 27)


def plan(players: list[dict], clubs: dict, bands: dict, econ: dict, window: str, seed: int) -> list[dict]:
    rules = econ["recruitment"]
    shape = rules["squad_shape"]
    rng = random.Random(seed)
    players = [dict(p) for p in players]  # never mutate the caller's data

    for p in players:
        p["overall"], p["potential"] = int(p["overall"]), int(p["potential"])
        p["_age"] = age_of(p)
        p["_value"] = market_value(p["overall"], p["potential"], p["_age"])

    squads: dict[str, list[dict]] = defaultdict(list)
    for p in players:
        squads[p["club_id"]].append(p)
    budget = {cid: club_econ(clubs[cid], econ)["transfer_budget_eur"] for cid in squads}

    moves: list[dict] = []
    moved: set[int] = set()
    top3 = {cid: {id(p) for p in sorted(sq, key=lambda p: -p["overall"])[:3]} for cid, sq in squads.items()}
    buyers = sorted(squads)
    rng.shuffle(buyers)
    per_club = rules["transfers_per_window"][window]

    for buyer_id in buyers:
        buyer = clubs[buyer_id]
        be = club_econ(buyer, econ)
        cap = bands["tiers"][buyer["tier"]]["max_player"] + rules["target_ovr_above_tier_cap"]
        best = max(p["overall"] for p in squads[buyer_id])
        floor = best - rules["target_ovr_below_club_best"]
        for _ in range(per_club):
            counts = Counter(p["position"] for p in squads[buyer_id])
            needs = sorted(shape, key=lambda pos: counts[pos] - shape[pos])
            pos = needs[0]
            if counts[pos] >= shape[pos] + 1:  # no real hole -> buy depth for weakest line instead
                pos = min(shape, key=lambda ps: sum(p["overall"] for p in squads[buyer_id] if p["position"] == ps)
                          / max(1, counts[ps]))
            candidates = []
            for seller_id, sq in squads.items():
                if seller_id == buyer_id:
                    continue
                se = club_econ(clubs[seller_id], econ)
                if be["domestic_prestige"] < se["domestic_prestige"] - rules["prestige_gap_player_accepts"]:
                    continue
                if sum(1 for p in sq if p["position"] == pos) <= shape[pos]:
                    continue
                for p in sq:
                    if id(p) in moved or "on loan" in (p.get("notes") or ""):
                        continue
                    if id(p) in top3[seller_id] and be["domestic_prestige"] <= se["domestic_prestige"]:
                        continue
                    if (p["position"] == pos and floor <= p["overall"] <= cap
                            and p["_value"] <= min(be["max_fee_eur"], budget[buyer_id])):
                        fit = p["overall"] + 0.5 * (p["potential"] - p["overall"]) - p["_value"] / 1e6
                        if p["nationality"] in rules["preferred_markets"]:
                            fit += 0.5
                        candidates.append((fit + rng.random(), p, seller_id))
            if not candidates:
                continue
            _, player, seller_id = max(candidates, key=lambda c: c[0])
            moved.add(id(player))
            squads[seller_id].remove(player)
            squads[buyer_id].append(player)
            budget[buyer_id] -= player["_value"]
            moves.append({"window": window, "player": player["known_as"], "position": pos,
                          "overall": player["overall"], "potential": player["potential"],
                          "from": seller_id, "to": buyer_id, "fee_eur": player["_value"]})
            player["club_id"] = buyer_id
    return moves


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--window", choices=["summer", "winter"], default="summer")
    ap.add_argument("--seed", type=int, default=2027)
    ap.add_argument("--out", default=None, help="write the plan as CSV here")
    ap.add_argument("squads", nargs="+")
    args = ap.parse_args()

    clubs = {c["id"]: c for c in load_json("clubs.json")["clubs"]}
    players = []
    for path in args.squads:
        with open(path, newline="", encoding="utf-8") as fh:
            players.extend(csv.DictReader(fh))
    moves = plan(players, clubs, load_json("rating_bands.json"), load_json("club_economics.json"),
                 args.window, args.seed)
    for m in moves:
        print(f"{m['player']:28} {m['position']} {m['overall']}->{m['potential']}  "
              f"{clubs[m['from']]['name']:22} -> {clubs[m['to']]['name']:22} EUR {m['fee_eur']:,}")
    print(f"{len(moves)} transfers planned")
    if args.out:
        with open(args.out, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(moves[0]) if moves else ["player"])
            w.writeheader()
            w.writerows(moves)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
