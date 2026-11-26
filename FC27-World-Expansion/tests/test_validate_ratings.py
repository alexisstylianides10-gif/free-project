import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
from validate_ratings import load_config, validate_rows  # noqa: E402


def row(club, ovr, pot=None, override="", name="Test Player"):
    return {"club_id": club, "player_name": name, "position": "ST", "age": "25",
            "overall": str(ovr), "potential": str(pot if pot is not None else ovr),
            "source": "test", "override_reason": override}


class RatingValidatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bands, cls.clubs = load_config()

    def check(self, rows):
        return validate_rows(rows, self.bands, self.clubs)

    def test_krasava_90_rejected(self):
        errors, _ = self.check([row("krasava", 90)])
        self.assertTrue(any("hard cap" in e for e in errors))

    def test_krasava_70_rejected_without_override(self):
        errors, _ = self.check([row("krasava", 70)])
        self.assertTrue(errors)

    def test_krasava_65_ok(self):
        errors, _ = self.check([row("krasava", 65)])
        self.assertEqual(errors, [])

    def test_override_allows_small_bump_only(self):
        ok, _ = self.check([row("krasava", 67, override="ex-Greek SL veteran")])
        bad, _ = self.check([row("krasava", 68, override="ex-Greek SL veteran")])
        self.assertEqual(ok, [])
        self.assertTrue(bad)

    def test_apoel_matches_ea_anchor(self):
        errors, _ = self.check([row("apoel", 75, 75, name="Filip Djuricic")])
        self.assertEqual(errors, [])

    def test_hard_cap_beats_override(self):
        errors, _ = self.check([row("apoel", 78, override="please")])
        self.assertTrue(any("hard cap" in e for e in errors))

    def test_potential_ceiling(self):
        errors, _ = self.check([row("krasava", 60, 90)])
        self.assertTrue(any("potential ceiling" in e for e in errors))

    def test_small_club_kid_can_have_high_potential(self):
        errors, _ = self.check([row("krasava", 58, 80)])
        self.assertEqual(errors, [])

    def test_unknown_club(self):
        errors, _ = self.check([row("real_madrid", 60)])
        self.assertTrue(any("unknown club" in e for e in errors))

    def test_squad_average_warning(self):
        _, warnings = self.check([row("krasava", 65), row("krasava", 65), row("krasava", 65)])
        self.assertTrue(any("squad avg" in w for w in warnings))


if __name__ == "__main__":
    unittest.main()
