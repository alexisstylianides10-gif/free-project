import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from nations_league import all_tables, next_edition, table  # noqa: E402

DATA = json.loads((ROOT / "data/competitions/nations_league_2026_27.json").read_text(encoding="utf-8"))


class NationsLeagueTests(unittest.TestCase):
    def setUp(self):
        self.tables = all_tables(DATA)

    def test_156_matches(self):
        self.assertEqual(len(DATA["results"]), 156)

    def test_engine_reproduces_published_tables(self):
        # Covers head-to-head tie-breaks, e.g. A2 Germany/Netherlands/Greece all on 11 pts.
        for lg, groups in DATA["published_order"].items():
            for g, order in groups.items():
                self.assertEqual([r["team"] for r in self.tables[lg][g]], order, f"{lg}{g}")

    def test_cyprus_second_in_c2(self):
        row = next(r for r in self.tables["C"]["2"] if r["team"] == "Cyprus")
        self.assertEqual((row["pos"], row["pts"], row["gf"], row["ga"]), (2, 8, 7, 8))

    def test_relegated_from_a(self):
        nxt = next_edition(DATA, self.tables)
        self.assertIn("Czech Republic", nxt["leagues"]["B"])
        self.assertIn("Turkey", nxt["leagues"]["B"])

    def test_playoff_sides(self):
        p = next_edition(DATA, self.tables)["pending_playoffs"]
        self.assertEqual(sorted(p["A/B"]["higher"]), ["Croatia", "Denmark", "Serbia", "Wales"])
        self.assertIn("Cyprus", p["B/C"]["lower"])

    def test_cyprus_promoted_if_playoff_won(self):
        data = copy.deepcopy(DATA)
        data["playoff_results"] = [{"series": "B/C", "winner": "Cyprus", "loser": "Israel"}]
        nxt = next_edition(data, all_tables(data))
        self.assertIn("Cyprus", nxt["leagues"]["B"])
        self.assertIn("Israel", nxt["leagues"]["C"])
        self.assertNotIn("Cyprus", nxt["pending_playoffs"]["B/C"]["lower"])

    def test_all_54_accounted_for(self):
        nxt = next_edition(DATA, self.tables)
        placed = sum(len(t) for t in nxt["leagues"].values())
        pend = sum(len(v) for s in nxt["pending_playoffs"].values() for v in s.values())
        self.assertEqual(placed + pend, 54)

    def test_head_to_head_beats_goal_difference(self):
        # A and B both finish on 4 pts. B has the far better goal difference (+5 v 0),
        # but A won their meeting, so A must rank above B.
        res = [{"home": "A", "away": "B", "home_goals": 1, "away_goals": 0},
               {"home": "B", "away": "C", "home_goals": 6, "away_goals": 0},
               {"home": "C", "away": "A", "home_goals": 1, "away_goals": 0},
               {"home": "A", "away": "C", "home_goals": 0, "away_goals": 0},
               {"home": "C", "away": "B", "home_goals": 0, "away_goals": 0}]
        t = {r["team"]: r for r in table(["A", "B", "C"], res)}
        self.assertEqual(t["A"]["pts"], t["B"]["pts"])
        self.assertGreater(t["B"]["gd"], t["A"]["gd"])
        self.assertLess(t["A"]["pos"], t["B"]["pos"])

if __name__ == "__main__":
    unittest.main()
