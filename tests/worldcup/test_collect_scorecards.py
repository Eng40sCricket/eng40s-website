import copy
import importlib.util
import json
import sys
import unittest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/worldcup'))
import collect_scorecards as cards
import sync_official_results as sync

FIXTURE = json.loads((Path(__file__).parent / 'scorecard-result-fixture.json').read_text())
URL = 'https://cricheroes.com/scorecard/27800459/imc-over-40s-world-cup-2026-guyana/canada-vs-wales/summary'
MATCH = {'id': 18, 'home': 'Canada', 'away': 'Wales', 'day': 21, 'stage': 'League'}


def html_for(record):
    flight = '1:' + json.dumps({'props': {'data': record}}) + '\n'
    return '<script>self.__next_f.push(' + json.dumps([1, flight]) + ')</script>'


class ScorecardTests(unittest.TestCase):
    def test_minimal_completed_result(self):
        result, url = cards.parse_scorecard(html_for(FIXTURE), MATCH, URL, sync.team)
        self.assertEqual(result['winner'], 'CANADA')
        self.assertEqual(result['decision'], 'won by 208 runs')
        self.assertEqual(result['innings'][0]['score'], '393/7')
        self.assertEqual(result['innings'][1]['score'], '185/7')
        self.assertEqual(result['innings'][1]['overs'], '45.0')

    def assert_rejected(self, field, value, reason):
        r = copy.deepcopy(FIXTURE);r[field] = value
        with self.assertRaisesRegex(ValueError, reason):
            cards.parse_scorecard(html_for(r), MATCH, URL, sync.team)

    def test_in_progress_not_imported(self):
        self.assert_rejected('status', 'live', 'completed')

    def test_wrong_tournament_not_imported(self):
        self.assert_rejected('tournament_id', '9999', 'Wrong tournament')

    def test_rain_adjustment_held(self):
        self.assert_rejected('is_dl', 1, 'Rain-adjusted')

    def test_wrong_date_not_imported(self):
        self.assert_rejected('start_datetime', '2026-10-20T13:30:00Z', 'date')

    def test_wrong_teams_not_imported(self):
        r=copy.deepcopy(FIXTURE);r['team_b']['name']='India'
        with self.assertRaisesRegex(ValueError, 'teams'):
            cards.parse_scorecard(html_for(r), MATCH, URL, sync.team)

    def test_score_conflict_not_imported(self):
        r=copy.deepcopy(FIXTURE);r['team_a']['summary']='390/7'
        with self.assertRaisesRegex(ValueError, 'conflict'):
            cards.parse_scorecard(html_for(r), MATCH, URL, sync.team)

    def test_untrusted_destination_rejected(self):
        for url in ['https://evil.example/scorecard/27800459/test/test', 'https://cricheroes.com.evil/scorecard/27800459/test/test', 'http://cricheroes.com/scorecard/27800459/test/test']:
            with self.assertRaises(ValueError):cards.canonical_url(url)

    def test_missing_scheme_normalised_only_for_known_host(self):
        self.assertTrue(cards.canonical_url('cricheroes.com/scorecard/27800459/test/test/')[0].startswith('https://'))

    def test_missing_match_collected_but_existing_skipped(self):
        now=datetime(2026,10,22,2,0,tzinfo=ZoneInfo('America/Guyana'))
        results, links, report=cards.collect({'18':MATCH}, {'18':{'scorecard':URL}}, {}, now, sync.team, fetch=lambda u:html_for(FIXTURE))
        self.assertIn('18',results);self.assertEqual(report['scorecardsChecked'],1)
        results, links, report=cards.collect({'18':MATCH}, {'18':{'scorecard':URL}}, {'ALL_canada_wales':{}}, now, sync.team, fetch=lambda u:html_for(FIXTURE))
        self.assertEqual(results,{});self.assertEqual(report['scorecardsChecked'],0)


if __name__ == '__main__':
    unittest.main()
