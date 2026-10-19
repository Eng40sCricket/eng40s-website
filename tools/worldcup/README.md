# Official World Cup results update

The daily check reads the completed-results data embedded in the [official IMC fixtures page](https://worldcup.windiesmasters.org/fixtures-results/) and imports verified non-England league results into the existing World Cup page. The existing standings and rendering engine remains unchanged.

## Approved timing

Chris approved one check daily at **8 pm Guyana time**, from 19 through 31 October 2026. Guyana is UTC−4 throughout this period, so the GitHub schedule runs at **00:00 UTC on the following date**: 20–31 October and 1 November. An explicit 2026 tournament-window guard prevents checks outside those dates. GitHub schedules can start later than their nominal time; this is not a guaranteed real-time score feed.

The workflow can also be run manually from the repository’s Actions page. It uses the repository’s temporary workflow token, not a separate stored personal token. It requests a rebuild of the existing branch-source Pages site after a result-data commit because a bot push does not normally trigger another workflow automatically.

## What changes

- Completed non-England league results, including runs, wickets and actual overs/balls.
- Verified scorecard links where an existing non-England result has no link.
- A provenance receipt at `assets/data/worldcup-sync-status.json` when data changes.
- Standings automatically recalculate from all recorded league results.

Manual England results, fixture dates, grounds, links, match schedules, page design, points rules and the standings engine are preserved. Warm-ups, live matches and scheduled matches do not enter the table. Knockout results are not included in league standings and are left for the existing manual bracket workflow.

For NRR the existing engine applies the full 45-over allocation to **both denominators associated with an all-out innings**. Actual innings overs are retained in match display. Cricket notation is parsed as balls: 34.3 is 34 overs and 3 balls, not 34.3 decimal overs.

## Safety and failure handling

The importer never executes JavaScript from the official site. It parses only the expected data objects and checks their structure, team identities, fixture dates, runs, wickets, overs, winner, margin and scorecard link domain. A repeat run with identical results is a no-op and makes no commit.

A missing score/overs value, changed source structure, unrecognised team or result, rain-adjusted result, conflict with existing data, or concurrent repository update stops publication. Existing results are never overwritten with guessed values. GitHub marks the run as failed for review; repository notification delivery depends on Chris’s GitHub notification settings. There is no separate email or Outlook alert configured by this workflow.

Review runs at: https://github.com/Eng40sCricket/eng40s-website/actions/workflows/worldcup-results-sync.yml

## Manual verification

```bash
pip install -r tools/worldcup/requirements.txt
python -m unittest discover -s tests/worldcup -p 'test_*.py' -v
node tests/worldcup/check_standings.cjs
python tools/worldcup/sync_official_results.py        # inspect, no changes
python tools/worldcup/sync_official_results.py --apply
node tests/worldcup/check_standings.cjs
```

The recorded 17–18 October source snapshot is used for deterministic regression tests; production checks always fetch the official page afresh. The public status receipt records when **data changed**, not every successful no-change check. Each workflow run has a summary of its own check.
