# Daily World Cup results and standings sync

The existing GitHub automation collects completed results from the [official IMC fixture page](https://worldcup.windiesmasters.org/fixtures-results/). When its result list lags, the importer also reads completed scorecards linked by that official page. It publishes validated missing league results into the existing World Cup website, whose standings automatically recalculate.

## Schedule

One daily check is scheduled for **8 pm Guyana time (America/Guyana, UTC−4)** through **31 October 2026**. This is **00:00 UTC on the following date**. The workflow has an explicit 2026 tournament-window guard; it does no collection outside that window. There is only one workflow, not a second duplicate automation. GitHub scheduled runs are best-effort and can start later than 8 pm.

Manage or run manually at [World Cup official results sync](https://github.com/Eng40sCricket/eng40s-website/actions/workflows/worldcup-results-sync.yml).

## Collection and publication

The official schedule identifies fixture dates, teams and scorecard URLs. The scorecard fallback checks completed status, tournament identity, date, team identities, 45-over quota, runs, wickets, actual overs and winner/margin. At most two public scorecards are requested concurrently. Only inert embedded JSON is parsed; upstream JavaScript is never executed. Embedded tokens, personal/player data and unrelated fields are not saved.

The importer does not assume the source lists innings in batting order. Winning-team totals and wickets are used to validate the result. Actual overs remain in the website display; the existing NRR engine counts all-out innings against the full 45-over quota and interprets the final digit as balls, not a decimal fraction.

All existing result scores are preserved. In particular, Chris's confirmed England records are immutable. A fully validated England result can be added only if no existing result is recorded. An individual incomplete, rain-adjusted, conflicting or invalid result is held for review, without blocking independently verified matches. A source/schema integrity failure stops the batch without changing website data.

The public receipt at `assets/data/worldcup-sync-status.json` records every completed check and identifies collected/added results, retained England records, and held or pending matches. Each run also has a readable Actions summary and a downloadable `worldcup-results-sync-receipt` artifact, retained for 30 days. A timestamp-only receipt change creates a small daily commit so the latest check can be verified publicly. Source failure is visible as a failed Actions run; no additional email/Outlook notification is configured.

The workflow uses GitHub's short-lived workflow token, not a personal token. It validates all standings, commits only tournament result data and the receipt, and requests the existing GitHub Pages rebuild. Concurrent human changes cause a safe push failure, never a force-push.

## Knockouts

Knockout results are collected into the receipt separately and **never included in league points or NRR**. Automatic updates to the knockout bracket are not configured here: the existing bracket mapping differs from the official revised draw and must be reconciled before safe bracket publication. This does not block league results or standings updates.

## Verification

```bash
pip install -r tools/worldcup/requirements.txt
python -m unittest discover -s tests/worldcup -p 'test_*.py' -v
node tests/worldcup/check_standings.cjs
python tools/worldcup/sync_official_results.py --collect-scorecards --report-file /tmp/worldcup-sync-report.json
python tools/worldcup/sync_official_results.py --collect-scorecards --apply --report-file /tmp/worldcup-sync-report.json
node tests/worldcup/check_standings.cjs
```

The 17–18 October official snapshot and one minimal completed scorecard are regression fixtures. Production runs fetch fresh source pages. The daily collection gathers only missing scorecards, preserves existing results, and retries unresolved/missing finals on the next check.
