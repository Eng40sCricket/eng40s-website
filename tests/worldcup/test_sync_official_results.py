import copy
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
        self.assertNotIn("ALL_colombia_namibia", after["results"])
        self.assertNotIn("ALL_row_scotland", after["results"])

    def test_invalid_ball_notation(self):
        bad = SOURCE.replace('"15.3"', '"15.6"')
        with self.assertRaisesRegex(ValueError, "overs"):
            sync.build(self.page, bad, NOW)

    def test_margin_conflict(self):
        bad = SOURCE.replace('"won by 331 runs"', '"won by 330 runs"')
        with self.assertRaisesRegex(ValueError, "inconsistent"):
            sync.build(self.page, bad, NOW)

    def test_existing_score_conflict(self):
        bad = self.page.replace("homeRuns: 178", "homeRuns: 179")
        if bad == self.page:
            bad = self.page.replace('"homeRuns": 178', '"homeRuns": 179')
        with self.assertRaisesRegex(ValueError, "conflicts"):
            sync.build(bad, SOURCE, NOW)

    def test_missing_schema(self):
        with self.assertRaisesRegex(ValueError, "schema changed"):
            sync.build(self.page, "<html><body>Unavailable</body></html>", NOW)

    def test_missing_overs(self):
        bad = SOURCE.replace('"overs": "15.3"', '"overs": ""')
        with self.assertRaisesRegex(ValueError, "overs"):
            sync.build(self.page, bad, NOW)

    def test_future_final(self):
        past = datetime(2026, 10, 17, 20, 0, tzinfo=ZoneInfo("America/Guyana"))
        with self.assertRaisesRegex(ValueError, "Future fixture"):
            sync.build(self.page, SOURCE, past)

    def test_nonstandard_rain_result(self):
        bad = SOURCE.replace('"won by 331 runs"', '"won by 331 runs (DLS)"')
        with self.assertRaisesRegex(ValueError, "manual review"):
            sync.build(self.page, bad, NOW)

    def test_balanced_extractor_respects_comments_and_strings(self):
        s = " {'text': 'literal } brace', /* } */ 'a': [1, 2]} trailing"
        a, b = sync.literal(s, 0)
        self.assertEqual(sync.json5.loads(s[a:b])["a"], [1, 2])


if __name__ == "__main__":
    unittest.main()
