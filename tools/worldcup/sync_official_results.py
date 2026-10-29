#!/usr/bin/env python3
"""Sync official IMC results without executing upstream JavaScript.

Existing scores, especially Chris's England reports, are never overwritten.
A bad individual result is held for review; source/schema failures remain fatal.
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import json5
import requests
from bs4 import BeautifulSoup

try:
    from collect_scorecards import canonical_url, collect
except ModuleNotFoundError:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from collect_scorecards import canonical_url, collect

SOURCE = "https://worldcup.windiesmasters.org/fixtures-results/"
ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / "tournaments/wc2026/index.html"
STATUS = ROOT / "assets/data/worldcup-sync-status.json"
TEAMS = {
    "west indies": "westindies", "australia": "australia", "canada": "canada",
    "south africa": "southafrica", "new zealand": "newzealand", "scotland": "scotland",
    "usa": "usa", "england": "england", "india": "india", "pakistan": "pakistan",
    "rest of the world": "row", "rest of world": "row", "row": "row",
    "rest of the caribbean": "rotc", "rotc": "rotc", "wales": "wales",
    "namibia": "namibia", "colombia": "colombia",
}


def literal(text, start):
    """Find one balanced object/array, respecting strings and JS comments."""
    while start < len(text) and text[start].isspace():
        start += 1
    if start >= len(text) or text[start] not in "{[":
        raise ValueError("Expected a data object/array")
    stack, quote, escaped, comment = [], None, False, None
    i = start
    while i < len(text):
        c = text[i]
        n = text[i + 1:i + 2]
        if comment == "line":
            if c == "\n":
                comment = None
        elif comment == "block":
            if c == "*" and n == "/":
                comment = None
                i += 1
        elif quote:
            if escaped:
                escaped = False
            elif c == "\\":
                escaped = True
            elif c == quote:
                quote = None
        elif c in "\"'":
            quote = c
        elif c == "/" and n in ("/", "*"):
            comment = "line" if n == "/" else "block"
            i += 1
        elif c in "{[":
            stack.append(c)
        elif c in "}]":
            if not stack or stack.pop() != ("{" if c == "}" else "["):
                raise ValueError("Unbalanced data object")
            if not stack:
                return start, i + 1
        i += 1
    raise ValueError("Unterminated data object")


def assigned(text, name):
    matches = list(re.finditer(r"\b(?:const|let|var)\s+" + re.escape(name) + r"\s*=\s*", text))
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one {name} declaration")
    a, b = literal(text, matches[0].end())
    raw = re.sub(r"(?m)^(\s*)(\d+)(\s*:)", r'\1"\2"\3', text[a:b])
    return json5.loads(raw, allow_duplicate_keys=False)


def wc_data(page):
    m = re.search(r"\bvar\s+WC\s*=\s*", page)
    if not m:
        raise ValueError("WC data not found; refusing to modify page")
    a, b = literal(page, m.end())
    wc = json5.loads(page[a:b], allow_duplicate_keys=False)
    region = page[a:b]
    m = re.search(r"\bresults\s*:\s*", region)
    if not m:
        raise ValueError("Local results data not found")
    x, y = literal(region, m.end())
    return wc, a + x, a + y


def team(name):
    try:
        return TEAMS[str(name).strip().lower()]
    except KeyError:
        raise ValueError(f"Unknown team: {name}") from None


def innings(row):
    match = re.fullmatch(r"(\d{1,4})/(\d{1,2})", str(row.get("score", "")))
    ov = re.fullmatch(r"(\d{1,2})(?:\.([0-5]))?", str(row.get("overs", "")))
    if not match or not ov:
        raise ValueError(f"Invalid/missing score or cricket overs: {row}")
    runs, wickets = map(int, match.groups())
    balls = int(ov.group(1)) * 6 + int(ov.group(2) or 0)
    if not 0 <= wickets <= 10 or not 0 < balls <= 270:
        raise ValueError(f"Score/overs outside a standard 45-over match: {row}")
    return {"team": team(row["team"]), "runs": runs, "wickets": wickets,
            "overs": f"{balls // 6}.{balls % 6}", "balls": balls}


def core(result):
    # Display notation (45 vs 45.0) is not a result conflict.
    values = [result.get("result")]
    if result.get("result") == "nr":
        return tuple(values)
    for side in ("home", "away"):
        score = re.match(r"^(\d+)/(\d+)", str(result.get(side + "Score", "")))
        if not score:
            raise ValueError("Stored result lacks runs/wickets")
        values.extend([int(score[1]), int(score[2]), result.get(side + "Runs"),
                       float(result.get(side + "Overs"))])
    return tuple(values)


def is_play_cricket_scorecard(url):
    """Validate a supplied Play-Cricket result URL; never invent a match ID."""
    parsed = urlparse(str(url or ""))
    host = parsed.hostname or ""
    return bool(parsed.scheme == "https" and not parsed.username
                and (host == "play-cricket.com" or host.endswith(".play-cricket.com"))
                and re.fullmatch(r"/website/results/\d+/?", parsed.path))


def candidate(wc, fixture, result, links, match_id, date):
    """Validate a final without assuming the official innings list is chronological."""
    home, away = team(fixture["home"]), team(fixture["away"])
    key = f"ALL_{home}_{away}"
    if key not in wc["schedule"]:
        reverse = f"ALL_{away}_{home}"
        if reverse not in wc["schedule"]:
            raise ValueError("fixture absent from the local schedule")
        key, home, away = reverse, away, home
    local_date = datetime.strptime(wc["schedule"][key]["date"], "%d %b %Y").date().isoformat()
    if local_date != date:
        raise ValueError("local and official fixture dates differ")
    scorecard = links.get(match_id, {}).get("scorecard", "")
    if scorecard.startswith("cricheroes.com/scorecard/"):
        scorecard = "https://" + scorecard
    parsed = urlparse(scorecard)
    england_match = "england" in (home, away)
    official_card = (parsed.scheme == "https" and parsed.hostname == "cricheroes.com"
                     and parsed.path.startswith("/scorecard/"))
    if not official_card and not (england_match and is_play_cricket_scorecard(scorecard)):
        raise ValueError("missing/unrecognised official scorecard link")
    # Other-team source evidence is unchanged. England's published link must be
    # supplied Play-Cricket, or remain empty while Chris is asked for that URL.
    published_card = scorecard if not england_match or is_play_cricket_scorecard(scorecard) else ""
    decision = str(result.get("decision", "")).strip()
    if re.fullmatch(r"(?:no result|abandoned(?: due to rain)?)", decision, re.I):
        return key, {"result": "nr", "scorecardURL": published_card}, decision
    margin = re.fullmatch(r"won by (\d+) (runs?|wickets?)", decision, re.I)
    tied = bool(re.fullmatch(r"(?:match )?tied|tie", decision, re.I))
    if (not margin and not tied) or not isinstance(result.get("innings"), list) or len(result["innings"]) != 2:
        raise ValueError("nonstandard/incomplete result requires manual review")
    rows = [innings(x) for x in result["innings"]]
    if {x["team"] for x in rows} != {home, away}:
        raise ValueError("innings teams disagree with fixture")
    if tied:
        if rows[0]["runs"] != rows[1]["runs"]:
            raise ValueError("tied result inconsistent with innings")
        outcome = "tie"
    else:
        winner = team(result.get("winner", ""))
        if winner not in (home, away):
            raise ValueError("unknown winner")
        winning = next(x for x in rows if x["team"] == winner)
        losing = next(x for x in rows if x["team"] != winner)
        value = int(margin[1])
        if margin[2].lower().startswith("run"):
            valid = winning["runs"] - losing["runs"] == value and value > 0
        else:
            valid = (winning["runs"] > losing["runs"] and 10 - winning["wickets"] == value and 1 <= value <= 10)
        if not valid:
            raise ValueError("winner/margin inconsistent with innings")
        outcome = "home" if winner == home else "away"
    h = next(x for x in rows if x["team"] == home)
    a = next(x for x in rows if x["team"] == away)
    record = {
        "homeScore": f"{h['runs']}/{h['wickets']} ({h['overs']})",
        "homeRuns": h["runs"], "homeOvers": float(h["overs"]),
        "awayScore": f"{a['runs']}/{a['wickets']} ({a['overs']})",
        "awayRuns": a["runs"], "awayOvers": float(a["overs"]),
        "result": outcome, "scorecardURL": published_card,
    }
    return key, record, decision


def build(page, source_html, now=None, extra_results=None, extra_links=None, collection_report=None):
    now = now or datetime.now(ZoneInfo("America/Guyana"))
    wc, region_start, region_end = wc_data(page)
    soup = BeautifulSoup(source_html, "html.parser")
    nodes = soup.select("[data-imcf-data]")
    if len(nodes) != 1:
        raise ValueError("Official fixture schema changed: expected one schedule data block")
    schedule = json.loads(nodes[0].get_text())
    fixtures = {str(x["id"]): x for x in schedule["fixtures"]}
    scripts = "\n".join(x.get_text() for x in soup.find_all("script") if not x.get("src"))
    finals = assigned(scripts, "MATCH_RESULTS")
    links = assigned(scripts, "MATCH_LINKS")
    if not isinstance(finals, dict) or len(finals) < 9 or not isinstance(links, dict):
        raise ValueError("Official completed results unexpectedly empty/incomplete; no changes")
    if len(fixtures) != len(schedule["fixtures"]):
        raise ValueError("Duplicate official fixture IDs")
    if extra_results:
        finals = {**finals, **extra_results}
    if extra_links:
        links = {**links, **extra_links}
    updated = dict(wc["results"])
    added, linked, preserved, skipped, held = [], [], [], [], []
    receipts = []
    england_cards_requested = []
    for match_id, result in finals.items():
        match_id = str(match_id)
        fixture = fixtures.get(match_id)
        try:
            if fixture is None:
                raise ValueError("unknown official fixture ID")
            date = f"2026-10-{int(fixture['day']):02d}"
            if date > now.date().isoformat():
                raise ValueError("Future fixture incorrectly marked completed")
            if fixture["stage"] != "League":
                skipped.append({"match": match_id, "reason": "Knockout result collected separately; excluded from league NRR", "result": result})
                continue
            home, away = team(fixture["home"]), team(fixture["away"])
            key = f"ALL_{home}_{away}"
            reverse = f"ALL_{away}_{home}"
            existing_key = key if key in updated else reverse if reverse in updated else None
            if "england" in (home, away) and existing_key:
                preserved.append(match_id)
                if not is_play_cricket_scorecard(updated[existing_key].get("scorecardURL")):
                    england_cards_requested.append({"match": match_id, "key": existing_key,
                        "reason": "Ask Chris for the England Play-Cricket scorecard URL; no alternative link will be published"})
                continue
            key, record, decision = candidate(wc, fixture, result, links, match_id, date)
            if "england" in (home, away) and not record["scorecardURL"]:
                england_cards_requested.append({"match": match_id, "key": key,
                    "reason": "Ask Chris for the England Play-Cricket scorecard URL; verified result retained without a link"})
            if key in updated:
                if core(updated[key]) != core(record):
                    raise ValueError(f"official score conflicts with existing {key}; existing result retained")
                if not updated[key].get("scorecardURL"):
                    updated[key] = {**updated[key], "scorecardURL": record["scorecardURL"]}
                    linked.append(key)
            else:
                updated[key] = record
                added.append(key)
            receipts.append({"match": int(match_id), "date": date, "key": key,
                             "result": f"{result.get('winner', '')} {decision}".strip(), "scorecard": record["scorecardURL"]})
        except (ValueError, KeyError, TypeError) as exc:
            held.append({"match": match_id, "teams": f"{fixture.get('home', '?')} v {fixture.get('away', '?')}" if fixture else "Unknown fixture",
                         "reason": str(exc), "officialResult": result,
                         "scorecard": links.get(match_id, {}).get("scorecard", "")})
    region = page[region_start:region_end]
    for key in linked:
        entry = re.search(r"['\"]" + re.escape(key) + r"['\"]\s*:\s*", region)
        x, y = literal(region, entry.end())
        old = region[x:y]
        new, count = re.subn(r"(?:\"scorecardURL\"|scorecardURL)\s*:\s*(['\"])\1",
                            '"scorecardURL": ' + json.dumps(updated[key]["scorecardURL"]), old)
        if count != 1:
            raise ValueError("Unable to safely fill existing empty scorecard link")
        region = region[:x] + new + region[y:]
    if added:
        insert = region.rfind("}")
        body = region[:insert].rstrip()
        if body[-1] != ",":
            body += ","
        blocks = []
        for key in added:
            values = json.dumps(updated[key], indent=2, ensure_ascii=False)
            blocks.append("    " + json.dumps(key) + ": " + values.replace("\n", "\n    "))
        region = body + "\n    /* Verified official results; updated by tools/worldcup/sync_official_results.py. */\n" + ",\n".join(blocks) + "\n  }"
    changed_page = page[:region_start] + region + page[region_end:]
    check, _, _ = wc_data(changed_page)
    for key, record in wc["results"].items():
        if core(check["results"][key]) != core(record):
            raise ValueError("Existing match result changed unexpectedly")
        if "england" in key and check["results"][key] != record:
            raise ValueError("Manual England result changed unexpectedly")
    report = {"source": SOURCE, "checkedAtGuyana": now.isoformat(timespec="seconds"),
              "officialCompletedMatches": len(finals), "otherTeamMatchesVerified": len([r for r in receipts if 'england' not in r['key']]),
              "matchesVerified": len(receipts), "englandMatchesPreserved": preserved,
              "newResults": added, "scorecardLinksAdded": linked,
              "englandScorecardsRequested": england_cards_requested,
              "heldForReview": held, "excluded": skipped, "matches": receipts}
    report.update(collection_report or {})
    return changed_page, report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--apply", action="store_true")
    p.add_argument("--source-file", type=Path, help="Use a captured official page for deterministic tests")
    p.add_argument("--report-file", type=Path, help="Also save the full receipt for workflow review")
    p.add_argument("--collect-scorecards", action="store_true", help="Collect missing finals from officially linked scorecards")
    args = p.parse_args()
    try:
        if args.source_file:
            source = args.source_file.read_text()
        else:
            session = requests.Session()
            adapter = requests.adapters.HTTPAdapter(max_retries=2)
            session.mount("https://", adapter)
            response = session.get(SOURCE, timeout=(15, 45), headers={"User-Agent": "EnglandOver40s-ResultsSync/1.1"})
            response.raise_for_status()
            if len(response.content) > 5_000_000:
                raise ValueError("Unexpectedly large official page")
            source = response.text
        original = PAGE.read_text()
        now = datetime.now(ZoneInfo("America/Guyana"))
        # Validate the source contract before allowing any linked-card requests.
        build(original, source, now)
        extra, extra_links, collection_report = {}, {}, {}
        if args.collect_scorecards:
            soup = BeautifulSoup(source, "html.parser")
            fixture_rows = json.loads(soup.select_one("[data-imcf-data]").get_text())["fixtures"]
            scripts = "\n".join(n.get_text() for n in soup.find_all("script") if not n.get("src"))
            links = assigned(scripts, "MATCH_LINKS")
            wc, _, _ = wc_data(original)
            extra, extra_links, collection_report = collect({str(f['id']): f for f in fixture_rows}, links, wc['results'], now, team)
        updated, report = build(original, source, now, extra, extra_links, collection_report)
        changed = updated != original
        print(json.dumps({**report, "changed": changed, "applied": changed and args.apply}, indent=2))
        if args.report_file:
            args.report_file.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
        if args.apply:
            if changed:
                PAGE.write_text(updated)
            # Record every completed check, including a no-change run with held matches.
            STATUS.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
        summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary:
            with open(summary, "a") as f:
                f.write(f"## Official World Cup results check\n\nGuyana time: {report['checkedAtGuyana']}. "
                        f"Collected {report['officialCompletedMatches']} completed results; "
                        f"added {len(report['newResults'])} league results; "
                        f"preserved {len(report['englandMatchesPreserved'])} England fixtures.\n\n")
                if report["heldForReview"]:
                    f.write("### Held for review — existing scores retained\n\n")
                    for item in report["heldForReview"]:
                        f.write(f"- M{item['match']} {item['teams']}: {item['reason']}\n")
                if report["excluded"]:
                    f.write("\nKnockout results are collected in the receipt but do not enter league NRR.\n")
                if report.get("pendingScorecards"):
                    f.write("\n### Scorecard collection awaiting completion/review\n\n")
                    for item in report["pendingScorecards"]:
                        f.write(f"- M{item['match']}: {item['reason']}\n")
        for item in report["heldForReview"]:
            print(f"::warning::M{item['match']}: result held for review; existing data retained.", file=sys.stderr)
    except Exception as exc:
        print(f"Results sync stopped safely: {exc}", file=sys.stderr)
        print("::error::Official source/schema unavailable; existing website data left unchanged.", file=sys.stderr)
        if args.report_file:
            args.report_file.write_text(json.dumps({"source": SOURCE, "error": str(exc), "checkedAtGuyana": datetime.now(ZoneInfo('America/Guyana')).isoformat()}) + "\n")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
