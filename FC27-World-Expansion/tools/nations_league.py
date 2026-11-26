#!/usr/bin/env python3
"""UEFA Nations League engine: group tables, promotion/relegation, next edition.

Data: data/competitions/nations_league_<edition>.json  (groups + results + rules)

Tie-breakers (UEFA Nations League regulations, group stage, simplified to what
our data can show): 1 points, 2 head-to-head points, 3 head-to-head goal
difference, 4 head-to-head goals, 5 overall goal difference, 6 overall goals,
7 away goals, 8 wins. Fair-play / coefficient steps are not modelled; ties
that deep are flagged.

Usage:
  python3 tools/nations_league.py data/competitions/nations_league_2026_27.json            # tables
  python3 tools/nations_league.py data/competitions/nations_league_2026_27.json --next     # next edition's leagues
  python3 tools/nations_league.py data/competitions/nations_league_2026_27.json --team Cyprus
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path


def _blank() -> dict:
    return {"p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "pts": 0, "away_gf": 0}


def _add(row: dict, gf: int, ga: int, away: bool) -> None:
    row["p"] += 1
    row["gf"] += gf
    row["ga"] += ga
    if away:
        row["away_gf"] += gf
    if gf > ga:
        row["w"] += 1
        row["pts"] += 3
    elif gf == ga:
        row["d"] += 1
        row["pts"] += 1
    else:
        row["l"] += 1


def table(teams: list[str], results: list[dict]) -> list[dict]:
    rows = {t: _blank() for t in teams}
    played = [r for r in results if r.get("home_goals") is not None and r["home"] in rows and r["away"] in rows]
    for r in played:
        _add(rows[r["home"]], r["home_goals"], r["away_goals"], False)
        _add(rows[r["away"]], r["away_goals"], r["home_goals"], True)

    def overall_key(t: str):
        x = rows[t]
        return (x["gf"] - x["ga"], x["gf"], x["away_gf"], x["w"])

    def h2h_key(t: str, tied: set[str]):
        h = _blank()
        for r in played:
            if r["home"] in tied and r["away"] in tied:
                if r["home"] == t:
                    _add(h, r["home_goals"], r["away_goals"], False)
                elif r["away"] == t:
                    _add(h, r["away_goals"], r["home_goals"], True)
        return (h["pts"], h["gf"] - h["ga"], h["gf"])

    by_pts: dict[int, list[str]] = defaultdict(list)
    for t in teams:
        by_pts[rows[t]["pts"]].append(t)
    order: list[str] = []
    for pts in sorted(by_pts, reverse=True):
        group = by_pts[pts]
        tied = set(group)
        order += sorted(group, key=lambda t: (h2h_key(t, tied), overall_key(t)), reverse=True)

    out = []
    for pos, t in enumerate(order, start=1):
        row = {"pos": pos, "team": t, **rows[t]}
        row["gd"] = row["gf"] - row["ga"]
        out.append(row)
    for a, b in zip(out, out[1:]):  # flag ties our tie-breakers can't separate
        ka = (a["pts"], h2h_key(a["team"], {a["team"], b["team"]}), overall_key(a["team"]))
        kb = (b["pts"], h2h_key(b["team"], {a["team"], b["team"]}), overall_key(b["team"]))
        if ka == kb:
            a["unresolved_tie"] = b["unresolved_tie"] = True
    return out


def all_tables(data: dict) -> dict[str, dict[str, list[dict]]]:
    out: dict[str, dict[str, list[dict]]] = {}
    for league, groups in data["groups"].items():
        out[league] = {}
        for gname, teams in groups.items():
            res = [r for r in data["results"] if r["league"] == league and r["group"] == gname]
            out[league][gname] = table(teams, res)
    return out


def _cross_rank(rows: list[dict]) -> list[dict]:
    """Rank same-position teams from different groups: points, goal difference, goals."""
    return sorted(rows, key=lambda r: (r["pts"], r["gd"], r["gf"]), reverse=True)


def next_edition(data: dict, tables: dict) -> dict:
    """Apply data['movement'] and data['playoff_results'] to get next edition's leagues.

    Play-off teams are 'pending' until their result is in playoff_results
    ({"series": "B/C", "winner": ..., "loser": ...}); the winner plays in the
    higher league, the loser in the lower one.
    """
    leagues = list(data["groups"])
    up = {lg: leagues[i - 1] if i else lg for i, lg in enumerate(leagues)}
    down = {lg: leagues[i + 1] if i + 1 < len(leagues) else lg for i, lg in enumerate(leagues)}
    nxt: dict[str, set[str]] = {lg: set() for lg in leagues}
    pending: dict[str, dict[str, list[str]]] = {}

    def at(lg: str, pos: int) -> list[dict]:
        return [r for rows in tables[lg].values() for r in rows if r["pos"] == pos]

    placed: dict[str, str] = {}
    for lg in leagues:
        rule = data["movement"].get(lg, {})
        for pos in rule.get("promote_positions", []):
            for r in at(lg, pos):
                placed[r["team"]] = up[lg]
        if rule.get("promote_all"):
            for rows in tables[lg].values():
                for r in rows:
                    placed[r["team"]] = up[lg]
        if "relegate_worst" in rule:
            rw = rule["relegate_worst"]
            for r in _cross_rank(at(lg, rw["position"]))[-rw["count"]:]:
                placed[r["team"]] = down[lg]
        for spec in rule.get("playoff_down", []):
            ranked = _cross_rank([r for r in at(lg, spec["position"]) if r["team"] not in placed])
            pick = ranked if spec.get("all") else ranked[-spec["worst"]:] if "worst" in spec else ranked[:spec["best"]]
            series = f"{lg}/{down[lg]}"
            for r in pick:
                pending.setdefault(series, {"higher": [], "lower": []})["higher"].append(r["team"])
                placed[r["team"]] = "pending"
        for pos in rule.get("playoff_up", []):
            series = f"{up[lg]}/{lg}"
            for r in at(lg, pos):
                pending.setdefault(series, {"higher": [], "lower": []})["lower"].append(r["team"])
                placed[r["team"]] = "pending"

    for res in data.get("playoff_results", []):
        a, b = res["series"].split("/")
        placed[res["winner"]] = a
        placed[res["loser"]] = b
        for side in pending.get(res["series"], {}).values():
            for t in (res["winner"], res["loser"]):
                if t in side:
                    side.remove(t)

    for lg in leagues:
        for rows in tables[lg].values():
            for r in rows:
                dest = placed.get(r["team"], lg)
                if dest != "pending":
                    nxt[dest].add(r["team"])
    return {"leagues": {lg: sorted(t) for lg, t in nxt.items()}, "pending_playoffs": pending}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("data")
    ap.add_argument("--next", action="store_true")
    ap.add_argument("--team")
    args = ap.parse_args()
    data = json.loads(Path(args.data).read_text(encoding="utf-8"))
    tables = all_tables(data)

    if args.next:
        nxt = next_edition(data, tables)
        for lg, teams in nxt["leagues"].items():
            print(f"League {lg} next edition, confirmed ({len(teams)}): {', '.join(teams)}")
        for series, sides in nxt["pending_playoffs"].items():
            print(f"Play-off {series} (Mar 2027) pending: higher-league side {sides['higher']} "
                  f"v lower-league side {sides['lower']}")
        return 0
    for lg, groups in tables.items():
        for gname, rows in groups.items():
            if args.team and args.team not in [r["team"] for r in rows]:
                continue
            print(f"League {lg} Group {gname}")
            for r in rows:
                flag = " *tie" if r.get("unresolved_tie") else ""
                print(f"  {r['pos']}. {r['team']:24} {r['p']} {r['w']}-{r['d']}-{r['l']} "
                      f"{r['gf']}:{r['ga']} ({r['gd']:+}) {r['pts']} pts{flag}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
