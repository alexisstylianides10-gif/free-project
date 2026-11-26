import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from select_tactic import load, load_squads, select  # noqa: E402


class SelectTacticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.squads = load_squads()
        cls.clubs = list(load("club_profiles.json")["clubs"])
        cls.roles = load("roles.json")

    def test_every_club_fields_valid_xi(self):
        for club in self.clubs:
            plan = select(club, "apoel" if club != "apoel" else "omonia", True, None, self.squads)
            names = [s["player"] for s in plan["lineup"]]
            self.assertEqual(len(names), 11, club)
            self.assertEqual(len(set(names)), 11, club)
            self.assertEqual(sum(1 for s in plan["lineup"] if s["slot"] == "GK"), 1, club)

    def test_every_role_maps_to_fc_role(self):
        known = {r for rs in self.roles["fc_iq_roles_known"].values() for r in rs}
        for club in self.clubs:
            for s in select(club, "omonia", False, None, self.squads)["lineup"]:
                self.assertIn(s["fc_role"], known)

    def test_underdog_sits_deeper_than_favourite(self):
        weak = select("krasava", "apoel", False, None, self.squads)
        strong = select("apoel", "krasava", True, None, self.squads)
        self.assertEqual(weak["situation"], "underdog")
        self.assertEqual(strong["situation"], "favourite")
        self.assertLess(weak["team"]["line_height"], strong["team"]["line_height"])

    def test_red_card_leaves_ten(self):
        plan = select("aek_larnaca", "pafos", True, "red_card", self.squads)
        self.assertEqual(len(plan["lineup"]), 10)

    def test_protect_lead_drops_line(self):
        base = select("apoel", "omonia", True, None, self.squads)
        lead = select("apoel", "omonia", True, "protect_lead", self.squads)
        self.assertLess(lead["team"]["line_height"], base["team"]["line_height"])
        self.assertEqual(lead["team"]["defensive_approach"], "Deep")

    def test_clubs_do_not_all_play_the_same(self):
        shapes = {(select(c, c, True, None, self.squads)["formation"],
                   load("club_profiles.json")["clubs"][c]["philosophy"]) for c in self.clubs}
        self.assertGreaterEqual(len({f for f, _ in shapes}), 4)


if __name__ == "__main__":
    unittest.main()
