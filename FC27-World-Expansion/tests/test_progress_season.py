import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from generate_attributes import SIDE, weighted  # noqa: E402
from progress_season import load_players, progress  # noqa: E402


class ProgressSeasonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.before = {p["known_as"]: p for p in load_players()}
        staying, retired = progress(list(cls.before.values()), 1)
        cls.after = {p["known_as"]: p for p in staying + retired}

    def test_36_plus_decline_hard(self):
        olds = [n for n, p in self.before.items() if p["age"] >= 36]
        self.assertTrue(olds)
        for n in olds:
            self.assertLessEqual(self.after[n]["last_change"], -4, n)

    def test_31_plus_never_improve(self):
        for n, p in self.before.items():
            if p["age"] >= 31:
                self.assertLess(self.after[n]["last_change"], 0, n)

    def test_growth_never_passes_potential(self):
        for n, p in self.after.items():
            self.assertLessEqual(p["overall"], max(p["potential"], self.before[n]["potential"]), n)

    def test_pace_goes_first(self):
        b, a = self.before["Stevan Jovetić"], self.after["Stevan Jovetić"]
        pace_drop = b["attrs"]["sprint_speed"] - a["attrs"]["sprint_speed"]
        vision_drop = b["attrs"]["vision"] - a["attrs"]["vision"]
        self.assertGreater(pace_drop, vision_drop)

    def test_attributes_still_match_overall(self):
        for n, p in self.after.items():
            kind = SIDE.get(p["position"], p["position"])
            self.assertEqual(round(weighted(p["attrs"], kind)), p["overall"], n)

    def test_everyone_ages_one_year(self):
        for n, p in self.after.items():
            self.assertEqual(p["age"], self.before[n]["age"] + 1)

    def test_deterministic(self):
        again, _ = progress(list(self.before.values()), 1)
        first, _ = progress(list(self.before.values()), 1)
        self.assertEqual([p["overall"] for p in again], [p["overall"] for p in first])


if __name__ == "__main__":
    unittest.main()
