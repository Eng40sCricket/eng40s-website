#!/usr/bin/env python3
"""Import completed IMC league results without executing upstream JavaScript.

Manual England results, fixtures and standings/rendering logic are preserved.
Unknown schemas, collisions, rain-adjusted results and missing overs fail closed.
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
        elif c == "/" and n in "/ *".replace(" ", ""):
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
    # JavaScript permits numeric object keys, unlike JSON5. The official
    # schema places each numeric match ID at the beginning of its own line.
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
    for side in ("home", "away"):
        score = re.match(r"^(\d+)/(\d+)", str(result.get(side + "Score", "")))
        if not score:
            raise ValueError("Stored result lacks runs/wickets")
        values.extend([int(score[1]), int(score[2]), result.get(side + "Runs"),
                       float(result.get(side + "Overs"))])
    return tuple(values)


def build(page, source_html, now=None):
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
    if not finals or len(finals) < 9:
        raise ValueError("Official completed results unexpectedly empty/incomplete; no changes")
    if len(fixtures) != len(schedule["fixtures"]):
        raise ValueError("Duplicate official fixture IDs")
    updated = dict(wc["results"])
    added, linked, preserved, skipped = [], [], [], []
    receipts = []
    for match_id, result in finals.items():
        match_id = str(match_id)
        if match_id not in fixtures:
            raise ValueError(f"Unknown official fixture ID: {match_id}")
        fixture = fixtures[match_id]
        if fixture["stage"] != "League":
            skipped.append({"match": match_id, "reason": "Knockouts excluded from league NRR"})
            continue
        date = f"2026-10-{int(fixture['day']):02d}"
        if date > now.date().isoformat():
            raise ValueError(f"Future fixture incorrectly marked completed: M{match_id}")
        home, away = team(fixture["home"]), team(fixture["away"])
        if "england" in (home, away):
            preserved.append(match_id)
            continue
        decision = str(result.get("decision", ""))
        margin = re.fullmatch(r"won by (\d+) (runs?|wickets?)", decision, re.I)
        if not margin or not isinstance(result.get("innings"), list) or len(result["innings"]) != 2:
            raise ValueError(f"M{match_id}: nonstandard/incomplete result requires manual review")
        rows = [innings(x) for x in result["innings"]]
        if {x["team"] for x in rows} != {home, away}:
            raise ValueError(f"M{match_id}: innings teams disagree with fixture")
        winner = team(result.get("winner", ""))
        if winner not in (home, away):
            raise ValueError(f"M{match_id}: unknown winner")
        first, second = rows
        value = int(margin[1])
        if margin[2].lower().startswith("run"):
            valid = winner == first["team"] and first["runs"] - second["runs"] == value and value > 0
        else:
            valid = (winner == second["team"] and second["runs"] > first["runs"]
                     and 10 - second["wickets"] == value and 1 <= value <= 10)
        if not valid:
            raise ValueError(f"M{match_id}: winner/margin inconsistent with innings")
        key = f"ALL_{home}_{away}"
        if key not in wc["schedule"]:
            reverse = f"ALL_{away}_{home}"
            if reverse not in wc["schedule"]:
                raise ValueError(f"M{match_id}: fixture absent from the local schedule")
            key, home, away = reverse, away, home
        local_date = datetime.strptime(wc["schedule"][key]["date"], "%d %b %Y").date().isoformat()
        if local_date != date:
            raise ValueError(f"M{match_id}: local and official fixture dates differ")
        scorecard = links.get(match_id, {}).get("scorecard", "")
        parsed = urlparse(scorecard)
        if not scorecard or parsed.scheme != "https" or parsed.hostname != "cricheroes.com" or not parsed.path.startswith("/scorecard/"):
            raise ValueError(f"M{match_id}: missing/unrecognised official scorecard link")
        h = next(x for x in rows if x["team"] == home)
        a = next(x for x in rows if x["team"] == away)
        candidate = {
            "homeScore": f"{h['runs']}/{h['wickets']} ({h['overs']})",
            "homeRuns": h["runs"], "homeOvers": float(h["overs"]),
            "awayScore": f"{a['runs']}/{a['wickets']} ({a['overs']})",
            "awayRuns": a["runs"], "awayOvers": float(a["overs"]),
            "result": "home" if winner == home else "away", "scorecardURL": scorecard,
        }
        if key in updated:
            if core(updated[key]) != core(candidate):
                raise ValueError(f"M{match_id}: official score conflicts with existing {key}; manual review required")
            if not updated[key].get("scorecardURL"):
                updated[key] = {**updated[key], "scorecardURL": scorecard}
                linked.append(key)
        else:
            updated[key] = candidate
            added.append(key)
        receipts.append({"match": int(match_id), "date": date, "key": key,
                         "result": f"{result['winner']} {decision}", "scorecard": scorecard})
    # Append only missing entries and fill only confirmed-empty non-England links.
    # Existing manual data, comments and all code outside results remain byte-identical.
    region = page[region_start:region_end]
    for key in linked:
        entry = re.search(r"['\"]" + re.escape(key) + r"['\"]\s*:\s*", region)
        x, y = literal(region, entry.end())
        old = region[x:y]
        new, count = re.subn(r"scorecardURL\s*:\s*(['\"])\1", "scorecardURL: " + json.dumps(updated[key]["scorecardURL"]), old)
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
    for key in wc["results"]:
        if "england" in key:
            if check["results"][key] != wc["results"][key]:
                raise ValueError("Manual England result changed unexpectedly")
    report = {"source": SOURCE, "checkedAtGuyana": now.isoformat(timespec="seconds"),
              "officialCompletedMatches": len(finals), "otherTeamMatchesVerified": len(receipts),
              "englandMatchesPreserved": preserved, "newResults": added, "scorecardLinksAdded": linked,
              "excluded": skipped, "matches": receipts}
    return changed_page, report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--apply", action="store_true")
    p.add_argument("--source-file", type=Path, help="Use a captured official page for deterministic tests")
    args = p.parse_args()
    try:
        if args.source_file:
            source = args.source_file.read_text()
        else:
            response = requests.get(SOURCE, timeout=45, headers={"User-Agent": "EnglandOver40s-ResultsSync/1.0"})
            response.raise_for_status()
            if len(response.content) > 5_000_000:
                raise ValueError("Unexpectedly large official page")
            source = response.text
        original = PAGE.read_text()
        updated, report = build(original, source)
        changed = updated != original
        print(json.dumps({**report, "changed": changed, "applied": changed and args.apply}, indent=2))
        if changed and args.apply:
            PAGE.write_text(updated)
            STATUS.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
        summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary:
            with open(summary, "a") as f:
                f.write(f"## Official World Cup results check\n\nVerified {report['officialCompletedMatches']} completed matches. "
                        f"Added {len(report['newResults'])} new results and {len(report['scorecardLinksAdded'])} scorecard links. "
                        f"Preserved {len(report['englandMatchesPreserved'])} England fixtures. "
                        f"{'Updated data ready for publication.' if changed else 'No change; no commit needed.'}\n")
    except Exception as exc:
        print(f"Results sync stopped safely: {exc}", file=sys.stderr)
        print("::error::Official results require review; existing website data left unchanged.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
