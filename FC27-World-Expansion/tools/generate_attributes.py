#!/usr/bin/env python3
"""Generate FC-style attributes for players EA doesn't have (all values marked generated).

For every player in the rated squad CSVs:
  1. detailed position  - from the broad GK/DF/MF/FW, spread over realistic squad
                          proportions (deterministic per player) unless one is supplied
  2. 34 attributes       - position profile + age effect + per-player variety
  3. exact overall       - attributes are shifted until FC's position-weighted formula
                          reproduces the player's overall rating exactly
  4. face stats          - PAC/SHO/PAS/DRI/DEF/PHY (or GK DIV/HAN/KIC/REF/SPD/POS)
  5. extras              - preferred foot, weak foot, skill moves, height

The position weights and face-stat formulas are the community-documented
approximations of EA's, not EA's official numbers. Real EA attributes from the
FC 27 database export always replace these for players EA already has.

Usage: python3 tools/generate_attributes.py   (reads d1.csv/d2.csv, writes attributes.csv)
"""
from __future__ import annotations

import csv
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SQUADS = ROOT / "data" / "cyprus" / "squads"

ATTRS = [
    "acceleration", "sprint_speed",
    "positioning", "finishing", "shot_power", "long_shots", "volleys", "penalties",
    "vision", "crossing", "fk_accuracy", "short_passing", "long_passing", "curve",
    "agility", "balance", "reactions", "ball_control", "dribbling", "composure",
    "interceptions", "heading_accuracy", "def_awareness", "standing_tackle", "sliding_tackle",
    "jumping", "stamina", "strength", "aggression",
    "gk_diving", "gk_handling", "gk_kicking", "gk_positioning", "gk_reflexes",
]
GK_ATTRS = ATTRS[-5:]

# Share of each detailed position inside a broad group (typical squad make-up).
SPLIT = {
    "GK": [("GK", 1.0)],
    "DF": [("CB", 0.55), ("LB", 0.2), ("RB", 0.25)],
    "MF": [("CDM", 0.25), ("CM", 0.35), ("CAM", 0.2), ("LM", 0.1), ("RM", 0.1)],
    "FW": [("ST", 0.5), ("LW", 0.25), ("RW", 0.25)],
}
SIDE = {"LB": "FB", "RB": "FB", "LM": "WM", "RM": "WM", "LW": "W", "RW": "W"}

# Overall formula weights per position (normalised in code).
WEIGHTS = {
    "GK":  {"gk_diving": 21, "gk_handling": 21, "gk_positioning": 21, "gk_reflexes": 21, "gk_kicking": 5, "reactions": 11},
    "CB":  {"def_awareness": 17, "standing_tackle": 17, "sliding_tackle": 13, "heading_accuracy": 10, "strength": 10,
            "interceptions": 13, "aggression": 7, "reactions": 5, "short_passing": 5, "ball_control": 4, "jumping": 3},
    "FB":  {"sliding_tackle": 14, "standing_tackle": 11, "interceptions": 12, "def_awareness": 8, "crossing": 9,
            "short_passing": 7, "ball_control": 7, "reactions": 8, "stamina": 8, "sprint_speed": 7, "acceleration": 5, "heading_accuracy": 4},
    "CDM": {"short_passing": 14, "long_passing": 10, "interceptions": 14, "def_awareness": 14, "standing_tackle": 12,
            "sliding_tackle": 5, "ball_control": 10, "reactions": 7, "stamina": 6, "strength": 4, "aggression": 5, "vision": 4},
    "CM":  {"short_passing": 17, "long_passing": 13, "vision": 13, "ball_control": 14, "dribbling": 7, "reactions": 8,
            "interceptions": 5, "positioning": 6, "standing_tackle": 5, "stamina": 6, "long_shots": 4},
    "CAM": {"short_passing": 16, "vision": 14, "ball_control": 15, "dribbling": 13, "positioning": 9, "reactions": 7,
            "finishing": 7, "long_shots": 5, "agility": 3, "shot_power": 3, "acceleration": 4},
    "WM":  {"crossing": 10, "dribbling": 15, "ball_control": 13, "short_passing": 11, "vision": 7, "reactions": 7,
            "stamina": 5, "acceleration": 7, "sprint_speed": 6, "positioning": 8, "finishing": 6, "long_shots": 5},
    "W":   {"crossing": 9, "dribbling": 16, "ball_control": 14, "short_passing": 9, "finishing": 10, "positioning": 9,
            "long_shots": 4, "vision": 6, "reactions": 7, "agility": 3, "acceleration": 7, "sprint_speed": 6},
    "ST":  {"finishing": 18, "positioning": 13, "heading_accuracy": 10, "shot_power": 10, "reactions": 8, "dribbling": 7,
            "ball_control": 10, "volleys": 2, "long_shots": 3, "acceleration": 4, "sprint_speed": 5, "strength": 5, "short_passing": 5},
}

# Attribute offsets from the player's overall, by position (everything unlisted: -8,
# outfield GK skills: -55, GK outfield skills: see GK row).
OFFSETS = {
    "GK":  {"gk_diving": 1, "gk_handling": 0, "gk_kicking": -6, "gk_positioning": 0, "gk_reflexes": 2, "reactions": -4,
            "_default": -42, "strength": -10, "jumping": -12, "composure": -20, "short_passing": -30, "long_passing": -30},
    "CB":  {"def_awareness": 3, "standing_tackle": 3, "sliding_tackle": 1, "heading_accuracy": 2, "strength": 4, "interceptions": 1,
            "aggression": 2, "jumping": 2, "finishing": -30, "volleys": -30, "dribbling": -18, "agility": -14, "curve": -22,
            "fk_accuracy": -25, "long_shots": -24, "positioning": -28, "vision": -18, "crossing": -20, "acceleration": -10, "sprint_speed": -8},
    "FB":  {"sprint_speed": 4, "acceleration": 4, "stamina": 5, "crossing": 0, "sliding_tackle": 1, "standing_tackle": 0,
            "interceptions": 0, "finishing": -22, "volleys": -24, "heading_accuracy": -8, "positioning": -14, "fk_accuracy": -18, "long_shots": -18},
    "CDM": {"interceptions": 3, "def_awareness": 2, "standing_tackle": 3, "stamina": 3, "aggression": 3, "short_passing": 1,
            "finishing": -18, "volleys": -20, "positioning": -14, "acceleration": -8, "sprint_speed": -8, "agility": -6},
    "CM":  {"short_passing": 3, "long_passing": 2, "vision": 2, "ball_control": 2, "stamina": 3, "composure": 1,
            "def_awareness": -10, "sliding_tackle": -14, "heading_accuracy": -12},
    "CAM": {"vision": 4, "short_passing": 3, "ball_control": 3, "dribbling": 3, "agility": 3, "curve": 0, "composure": 1,
            "def_awareness": -30, "standing_tackle": -28, "sliding_tackle": -32, "interceptions": -26, "strength": -12, "heading_accuracy": -18},
    "WM":  {"crossing": 3, "dribbling": 2, "acceleration": 5, "sprint_speed": 5, "stamina": 3, "agility": 3,
            "def_awareness": -22, "standing_tackle": -20, "sliding_tackle": -24, "heading_accuracy": -16, "strength": -10},
    "W":   {"dribbling": 4, "ball_control": 2, "acceleration": 7, "sprint_speed": 6, "agility": 6, "balance": 4, "finishing": 0,
            "def_awareness": -35, "standing_tackle": -32, "sliding_tackle": -36, "interceptions": -30, "heading_accuracy": -20, "strength": -12},
    "ST":  {"finishing": 4, "positioning": 3, "shot_power": 2, "heading_accuracy": 0, "strength": 1, "reactions": 1,
            "def_awareness": -38, "standing_tackle": -34, "sliding_tackle": -40, "interceptions": -34, "vision": -8, "crossing": -12, "long_passing": -18},
}
OUTFIELD_GK = -55
HEIGHT = {"GK": (183, 196), "CB": (182, 194), "FB": (170, 182), "CDM": (175, 188), "CM": (170, 184),
          "CAM": (168, 182), "WM": (168, 181), "W": (166, 180), "ST": (175, 191)}


def h(key: str, mod: int) -> int:
    return int(hashlib.sha1(key.encode("utf-8")).hexdigest(), 16) % mod


KNOWN_POS = __import__("json").loads(
    (ROOT / "data" / "cyprus" / "positions.json").read_text(encoding="utf-8"))["players"]


def detailed_position(p: dict) -> str:
    if p.get("detailed_position"):
        return p["detailed_position"]
    if p["known_as"] in KNOWN_POS:
        return KNOWN_POS[p["known_as"]]
    roll = h("pos:" + p["known_as"], 1000) / 1000
    acc = 0.0
    for pos, share in SPLIT[p["position"]]:
        acc += share
        if roll < acc:
            return pos
    return SPLIT[p["position"]][-1][0]


def age_years(p: dict) -> int:
    raw = str(p.get("age") or "").strip()
    if raw.isdigit():
        return int(raw)
    return {"guess_veteran": 33, "guess_youth": 19, "guess_young": 22}.get(p.get("age_basis", ""), 27)


def weighted(attrs: dict, kind: str) -> float:
    w = WEIGHTS[kind]
    return sum(attrs[a] * v for a, v in w.items()) / sum(w.values())


def generate(p: dict) -> dict:
    ovr = int(p["overall"])
    pos = detailed_position(p)
    kind = SIDE.get(pos, pos)
    offs = OFFSETS[kind]
    age = age_years(p)
    attrs = {}
    for a in ATTRS:
        if a in GK_ATTRS and kind != "GK":
            base = ovr + OUTFIELD_GK
        else:
            base = ovr + offs.get(a, offs.get("_default", -8))
        base += h(f"{p['known_as']}:{a}", 9) - 4  # player variety, -4..+4
        if age >= 31:
            base += {"acceleration": -6, "sprint_speed": -6, "stamina": -4, "agility": -3,
                     "reactions": 3, "composure": 4, "vision": 2, "def_awareness": 2}.get(a, 0)
        elif age <= 21:
            base += {"acceleration": 3, "sprint_speed": 3, "stamina": 2,
                     "composure": -5, "reactions": -3, "def_awareness": -3}.get(a, 0)
        attrs[a] = base

    # Shift every attribute until the position formula gives exactly the overall.
    for _ in range(40):
        clamped = {a: max(10, min(99, v)) for a, v in attrs.items()}
        diff = ovr - round(weighted(clamped, kind))
        if diff == 0:
            attrs = clamped
            break
        attrs = {a: v + diff for a, v in attrs.items()}
    else:
        attrs = {a: max(10, min(99, v)) for a, v in attrs.items()}
    # Fine-tune: whole shifts can overshoot after rounding, so nudge the
    # heaviest-weighted attributes one point at a time until it's exact.
    order = sorted(WEIGHTS[kind], key=lambda a: -WEIGHTS[kind][a])
    for step in range(200):
        diff = ovr - round(weighted(attrs, kind))
        if diff == 0:
            break
        a = order[step % len(order)]
        attrs[a] = max(10, min(99, attrs[a] + (1 if diff > 0 else -1)))

    face = face_stats(attrs, kind)
    lo, hi = HEIGHT[kind]
    foot = "Left" if pos in ("LB", "LM", "LW") and h("foot:" + p["known_as"], 10) < 7 else \
           ("Left" if h("foot:" + p["known_as"], 100) < 22 else "Right")
    skill_base = {"W": 3, "CAM": 3, "WM": 3, "ST": 3, "CM": 2, "FB": 2, "CDM": 2, "CB": 2, "GK": 1}[kind]
    skill = max(1, min(4, skill_base + (1 if attrs["dribbling"] >= 72 else 0) + (h("sm:" + p["known_as"], 3) - 1)))
    if kind == "GK":
        skill = 1
    return {"club_id": p["club_id"], "known_as": p["known_as"], "position": pos,
            "preferred_foot": foot, "weak_foot": 2 + h("wf:" + p["known_as"], 3),
            "skill_moves": skill, "height_cm": lo + h("ht:" + p["known_as"], hi - lo + 1),
            "overall": ovr, "computed_overall": round(weighted(attrs, kind)), **face, **attrs,
            "position_source": "known" if p["known_as"] in KNOWN_POS else "generated",
            "source": "generated"}


def face_stats(a: dict, kind: str) -> dict:
    if kind == "GK":
        return {"face1": a["gk_diving"], "face2": a["gk_handling"], "face3": a["gk_kicking"],
                "face4": a["gk_reflexes"], "face5": round(0.45 * a["acceleration"] + 0.55 * a["sprint_speed"]),
                "face6": a["gk_positioning"], "face_labels": "DIV HAN KIC REF SPD POS"}
    pac = 0.45 * a["acceleration"] + 0.55 * a["sprint_speed"]
    sho = (0.45 * a["finishing"] + 0.20 * a["long_shots"] + 0.20 * a["shot_power"]
           + 0.05 * a["positioning"] + 0.05 * a["volleys"] + 0.05 * a["penalties"])
    pas = (0.35 * a["short_passing"] + 0.20 * a["vision"] + 0.20 * a["crossing"]
           + 0.15 * a["long_passing"] + 0.05 * a["curve"] + 0.05 * a["fk_accuracy"])
    dri = (0.50 * a["dribbling"] + 0.35 * a["ball_control"] + 0.10 * a["agility"]
           + 0.05 * a["balance"])
    dfn = (0.30 * a["def_awareness"] + 0.30 * a["standing_tackle"] + 0.20 * a["interceptions"]
           + 0.10 * a["heading_accuracy"] + 0.10 * a["sliding_tackle"])
    phy = 0.50 * a["strength"] + 0.25 * a["stamina"] + 0.20 * a["aggression"] + 0.05 * a["jumping"]
    return {"face1": round(pac), "face2": round(sho), "face3": round(pas), "face4": round(dri),
            "face5": round(dfn), "face6": round(phy), "face_labels": "PAC SHO PAS DRI DEF PHY"}


def main() -> int:
    out = []
    for f in ("d1.csv", "d2.csv"):
        with open(SQUADS / f, newline="", encoding="utf-8") as fh:
            out += [generate(p) for p in csv.DictReader(fh)]
    with open(SQUADS / "attributes.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)
    off = [r for r in out if r["computed_overall"] != r["overall"]]
    print(f"wrote {len(out)} players; overall reproduced exactly for {len(out) - len(off)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
