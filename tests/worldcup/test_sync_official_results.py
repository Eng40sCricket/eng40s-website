import importlib.util
import json
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("sync", ROOT / "tools/worldcup/sync_official_results.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
NOW = datetime(2026, 10, 19, 16, 0, tzinfo=ZoneInfo("America/Guyana"))
SOURCE = (Path(__file__).parent / "official-results-fixture.html").read_text()


class ResultsSyncTests(unittest.TestCase):
    def setUp(self):
        self.page = sync.PAGE.read_text()
        wc, a, b = sync.wc_data(self.page)
        baseline = {key: value for key, value in wc["results"].items() if key in {
            "ALL_usa_england", "ALL_newzealand_england", "ALL_westindies_australia",
            "ALL_canada_southafrica", "ALL_rotc_pakistan",
        }}
        self.page = self.page[:a] + json.dumps(baseline, indent=2) + self.page[b:]

    def test_data_only_and_idempotent(self):
        before, x, y = sync.wc_data(self.page)
        updated, report = sync.build(self.page, SOURCE, NOW)
        after, a, b = sync.wc_data(updated)
        self.assertEqual(self.page[:x], updated[:a])
        self.assertEqual(self.page[y:], updated[b:])
        self.assertEqual(report["officialCompletedMatches"], 9)
        self.assertEqual(report["otherTeamMatchesVerified"], 7)
        self.assertEqual(len(report["englandMatchesPreserved"]), 2)
        for key in before["results"]:
            if "england" in key:
                self.assertEqual(before["results"][key], after["results"][key])
        self.assertEqual(len(after["results"]), 9)
        again, receipt = sync.build(updated, SOURCE, NOW)
        self.assertEqual(updated, again)
        self.assertEqual(receipt["newResults"], [])
        self.assertEqual(receipt["scorecardLinksAdded"], [])

    def assertHeld(self, source, reason, page=None):
        updated, report = sync.build(page or self.page, source, NOW)
        held = report["heldForReview"]
        self.assertTrue(any(reason in x["reason"] for x in held), held)
        wc, _, _ = sync.wc_data(updated)
        self.assertIn("ALL_india_pakistan", wc["results"], "Independent valid result must still import")
        again, _ = sync.build(updated, source, NOW)
        self.assertEqual(updated, again)
        return wc, report

    def test_invalid_ball_notation(self):
        self.assertHeld(SOURCE.replace('"15.3"', '"15.6"'), "overs")

    def test_margin_conflict_does_not_block_other_matches(self):
        self.assertHeld(SOURCE.replace('"won by 331 runs"', '"won by 330 runs"'), "inconsistent")

    def test_existing_score_conflict_is_preserved(self):
        bad = self.page.replace('"homeRuns": 178', '"homeRuns": 179')
        wc, report = self.assertHeld(SOURCE, "conflicts", bad)
        self.assertEqual(wc["results"]["ALL_westindies_australia"]["homeRuns"], 179)

    def test_missing_schema_is_fatal(self):
        with self.assertRaisesRegex(ValueError, "schema changed"):
            sync.build(self.page, "<html><body>Unavailable</body></html>", NOW)

    def test_missing_overs_is_held(self):
        self.assertHeld(SOURCE.replace('"overs": "15.3"', '"overs": ""'), "overs")

    def test_future_final_is_held(self):
        past = datetime(2026, 10, 17, 20, 0, tzinfo=ZoneInfo("America/Guyana"))
        updated, report = sync.build(self.page, SOURCE, past)
        self.assertTrue(any("Future fixture" in x["reason"] for x in report["heldForReview"]))
        wc, _, _ = sync.wc_data(updated)
        self.assertNotIn("ALL_canada_colombia", wc["results"])

    def test_nonstandard_rain_result_is_held(self):
        self.assertHeld(SOURCE.replace('"won by 331 runs"', '"won by 331 runs (DLS)"'), "manual review")

    def test_no_assumption_about_innings_order(self):
        wc, _, _ = sync.wc_data(self.page)
        result = {"innings": [{"team": "West Indies", "score": "178/10", "overs": "40.1"},
                              {"team": "Australia", "score": "266/5", "overs": "45.0"}],
                  "winner": "Australia", "decision": "won by 88 runs"}
        f = {"home": "West Indies", "away": "Australia"}
        key, r, _ = sync.candidate(wc, f, result, {"1": {"scorecard": "https://cricheroes.com/scorecard/27711058/test/summary"}}, "1", "2026-10-17")
        self.assertEqual(key, "ALL_westindies_australia")
        self.assertEqual(r["result"], "away")
        result["innings"].reverse()
        self.assertEqual(sync.candidate(wc, f, result, {"1": {"scorecard": "https://cricheroes.com/scorecard/27711058/test/summary"}}, "1", "2026-10-17")[1], r)

    def test_missing_england_result_can_import_but_existing_is_immutable(self):
        wc, a, b = sync.wc_data(self.page)
        usa = wc["results"].pop("ALL_usa_england")
        page = self.page[:a] + json.dumps(wc["results"]) + self.page[b:]
        updated, report = sync.build(page, SOURCE, NOW)
        after, _, _ = sync.wc_data(updated)
        self.assertEqual(after["results"]["ALL_usa_england"]["awayRuns"], 264)
        self.assertEqual(after["results"]["ALL_newzealand_england"], wc["results"]["ALL_newzealand_england"])
        self.assertIn("ALL_usa_england", report["newResults"])
        original, _, _ = sync.wc_data(self.page)
        again, _ = sync.build(self.page, SOURCE, NOW)
        current, _, _ = sync.wc_data(again)
        self.assertEqual(current["results"]["ALL_usa_england"], usa)

    def test_england_published_scorecard_is_play_cricket_or_empty(self):
        wc, _, _ = sync.wc_data(self.page)
        fixture = {"home": "USA", "away": "England"}
        result = {"innings": [{"team": "USA", "score": "130/10", "overs": "29.2"},
                              {"team": "England", "score": "264/8", "overs": "45.0"}],
                  "winner": "England", "decision": "won by 134 runs"}
        official = "https://cricheroes.com/scorecard/27711513/test/test/summary"
        pc = "https://englandseniors.play-cricket.com/website/results/7745529"
        for incoming, expected in [(official, ""), (pc, pc)]:
            _, record, _ = sync.candidate(wc, fixture, result,
                {"3": {"scorecard": incoming}}, "3", "2026-10-17")
            self.assertEqual(record["scorecardURL"], expected)
            self.assertEqual(record["awayRuns"], 264)
        for url in ["http://englandseniors.play-cricket.com/website/results/1",
                    "https://play-cricket.com.evil.example/website/results/1",
                    "https://englandseniors.play-cricket.com/website/results/not-a-match"]:
            self.assertFalse(sync.is_play_cricket_scorecard(url))

    def test_missing_england_link_is_requested_without_blocking_valid_result(self):
        wc, a, b = sync.wc_data(self.page)
        del wc["results"]["ALL_usa_england"]
        page = self.page[:a] + json.dumps(wc["results"]) + self.page[b:]
        updated, report = sync.build(page, SOURCE, NOW)
        after, _, _ = sync.wc_data(updated)
        self.assertEqual(after["results"]["ALL_usa_england"]["scorecardURL"], "")
        self.assertTrue(any(x["key"] == "ALL_usa_england" for x in report["englandScorecardsRequested"]))
        self.assertTrue(after["results"]["ALL_india_pakistan"]["scorecardURL"].startswith("https://cricheroes.com/"))

    def test_existing_england_play_cricket_link_is_preserved(self):
        wc, a, b = sync.wc_data(self.page)
        pc = "https://englandseniors.play-cricket.com/website/results/7745529"
        wc["results"]["ALL_usa_england"]["scorecardURL"] = pc
        page = self.page[:a] + json.dumps(wc["results"]) + self.page[b:]
        updated, _ = sync.build(page, SOURCE, NOW)
        after, _, _ = sync.wc_data(updated)
        self.assertEqual(after["results"]["ALL_usa_england"], wc["results"]["ALL_usa_england"])

    def test_organiser_confirmed_closed_innings_flag_is_preserved(self):
        wc, a, b = sync.wc_data(self.page)
        # Isolated metadata-preservation fixture, not a correction to the USA score.
        wc["results"]["ALL_usa_england"]["awayAllOut"] = True
        page = self.page[:a] + json.dumps(wc["results"]) + self.page[b:]
        updated, _ = sync.build(page, SOURCE, NOW)
        after, _, _ = sync.wc_data(updated)
        self.assertEqual(after["results"]["ALL_usa_england"], wc["results"]["ALL_usa_england"])

    def test_balanced_extractor_respects_comments_and_strings(self):
        s = " {'text': 'literal } brace', /* } */ 'a': [1, 2]} trailing"
        a, b = sync.literal(s, 0)
        self.assertEqual(sync.json5.loads(s[a:b])["a"], [1, 2])


if __name__ == "__main__":
    unittest.main()
