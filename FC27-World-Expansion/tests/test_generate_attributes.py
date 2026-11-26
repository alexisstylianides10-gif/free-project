import csv
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from generate_attributes import ATTRS, GK_ATTRS, generate  # noqa: E402


def squad():
    rows = []
    for f in ("d1.csv", "d2.csv"):
        with open(ROOT / "data/cyprus/squads" / f, newline="", encoding="utf-8") as fh:
            rows += list(csv.DictReader(fh))
    return rows


class GenerateAttributesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = [generate(p) for p in squad()]

    def test_overall_reproduced_exactly(self):
        for r in self.out:
            self.assertEqual(r["computed_overall"], r["overall"], r["known_as"])

    def test_attribute_range(self):
        for r in self.out:
            for a in ATTRS:
                self.assertTrue(10 <= r[a] <= 99, (r["known_as"], a, r[a]))

    def test_keepers_are_keepers(self):
        for r in self.out:
            gk = sum(r[a] for a in GK_ATTRS) / 5
            if r["position"] == "GK":
                self.assertGreater(gk, r["finishing"])
            else:
                self.assertLess(gk, 40, r["known_as"])

    def test_position_shapes_the_player(self):
        by = {r["known_as"]: r for r in self.out}
        st, cb = by["Stevan Jovetić"], by["Connor Goldson"]
        self.assertGreater(st["finishing"], cb["finishing"])
        self.assertGreater(cb["def_awareness"], st["def_awareness"])

    def test_known_positions_used(self):
        by = {r["known_as"]: r for r in self.out}
        self.assertEqual(by["David Luiz"]["position"], "CB")
        self.assertEqual(by["David Luiz"]["position_source"], "known")

    def test_deterministic(self):
        p = squad()[0]
        self.assertEqual(generate(dict(p)), generate(dict(p)))


if __name__ == "__main__":
    unittest.main()
