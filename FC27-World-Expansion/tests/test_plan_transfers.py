import csv
import json
import sys
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from plan_transfers import club_econ, plan  # noqa: E402


def load(name):
    return json.loads((ROOT / "data/cyprus" / name).read_text(encoding="utf-8"))


class PlanTransfersTests(unittest.TestCase):
    def setUp(self):
        self.clubs = {c["id"]: c for c in load("clubs.json")["clubs"]}
        self.bands = load("rating_bands.json")
        self.econ = load("club_economics.json")
        self.players = []
        for f in ("d1.csv", "d2.csv"):
            with open(ROOT / "data/cyprus/squads" / f, newline="", encoding="utf-8") as fh:
                self.players.extend(csv.DictReader(fh))
        self.moves = plan(self.players, self.clubs, self.bands, self.econ, "summer", 2027)

    def test_there_are_transfers(self):
        self.assertGreaterEqual(len(self.moves), 20)

    def test_nobody_moves_twice(self):
        counts = Counter(m["player"] + m["from"] for m in self.moves)
        self.assertEqual(max(Counter(m["player"] for m in self.moves).values()), 1, counts)

    def test_buyer_can_afford_and_player_fits_level(self):
        for m in self.moves:
            buyer = self.clubs[m["to"]]
            e = club_econ(buyer, self.econ)
            self.assertLessEqual(m["fee_eur"], e["max_fee_eur"], m)
            cap = self.bands["tiers"][buyer["tier"]]["max_player"] + 2
            self.assertLessEqual(m["overall"], cap, m)

    def test_no_superstar_to_krasava(self):
        for m in self.moves:
            if m["to"] == "krasava":
                self.assertLessEqual(m["overall"], 67)

    def test_loanees_not_sold(self):
        loaned = {p["known_as"] for p in self.players if "on loan" in (p.get("notes") or "")}
        self.assertFalse(loaned & {m["player"] for m in self.moves})

    def test_deterministic(self):
        again = plan(self.players, self.clubs, self.bands, self.econ, "summer", 2027)
        self.assertEqual([m["player"] for m in again], [m["player"] for m in self.moves])


if __name__ == "__main__":
    unittest.main()
