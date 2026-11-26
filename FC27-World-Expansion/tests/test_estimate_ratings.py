import csv
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from estimate_ratings import estimate  # noqa: E402
from validate_ratings import load_config, validate_rows  # noqa: E402
import json  # noqa: E402


class EstimateRatingsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bands, clubs = load_config()
        cls.clubs = clubs
        cls.anchors = json.loads((ROOT / "data/cyprus/rating_anchors.json").read_text(encoding="utf-8"))

    def run_file(self, name):
        with open(ROOT / "data/cyprus/squads" / name, newline="", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        return estimate(rows, self.bands, self.clubs, self.anchors)

    def test_generated_squads_pass_validator(self):
        for name in ("d1_raw.csv", "d2_raw.csv"):
            out = self.run_file(name)
            errors, warnings = validate_rows(out, self.bands, self.clubs)
            self.assertEqual(errors, [], name)
            self.assertEqual(warnings, [], name)

    def test_ea_anchors_kept(self):
        out = {r["known_as"]: r for r in self.run_file("d1_raw.csv")}
        self.assertEqual(out["Filip Đuričić"]["overall"], 75)
        self.assertEqual(out["Filip Đuričić"]["rating_source"], "ea")
        self.assertEqual(out["Loïc Négo"]["overall"], 73)

    def test_no_krasava_superstar(self):
        out = [r for r in self.run_file("d1_raw.csv") if r["club_id"] == "krasava"]
        self.assertLessEqual(max(r["overall"] for r in out), 65)

    def test_key_player_is_club_best(self):
        out = [r for r in self.run_file("d1_raw.csv") if r["club_id"] == "ael"]
        best = max(out, key=lambda r: r["overall"])
        self.assertEqual(best["known_as"], "Stevan Jovetić")

    def test_deterministic(self):
        self.assertEqual(self.run_file("d2_raw.csv"), self.run_file("d2_raw.csv"))

    def test_youth_has_growth_veteran_does_not(self):
        out = self.run_file("d1_raw.csv")
        youth = [r for r in out if r["age_basis"] == "guess_youth"]
        self.assertTrue(youth)
        for r in youth:  # at least +9, unless the tier's potential cap stops it
            cap = self.bands["tiers"][self.clubs[r["club_id"]]["tier"]]["max_potential"]
            self.assertGreaterEqual(r["potential"], min(r["overall"] + 9, cap), r["known_as"])
        vets = [r for r in out if r["age_basis"] == "guess_veteran"]
        self.assertTrue(vets)
        self.assertTrue(all(r["potential"] == r["overall"] for r in vets))

    def test_real_age_used(self):
        rows = [{"club_id": "krasava", "shirt_number": "1", "known_as": "Test Kid", "position": "MF",
                 "nationality": "ESP", "notes": "", "age": "18"}]
        out = estimate(rows, self.bands, self.clubs, self.anchors)[0]
        self.assertEqual(out["age_basis"], "real")
        self.assertGreaterEqual(out["potential"] - out["overall"], 9)

    def test_potential_never_above_tier_cap(self):
        for name in ("d1_raw.csv", "d2_raw.csv"):
            for r in self.run_file(name):
                cap = self.bands["tiers"][self.clubs[r["club_id"]]["tier"]]["max_potential"]
                self.assertLessEqual(r["potential"], cap)


if __name__ == "__main__":
    unittest.main()
