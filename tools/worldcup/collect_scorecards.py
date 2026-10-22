"""Read public CricHeroes result JSON from officially linked summary pages.

Only inert JSON payloads are parsed. No website JavaScript is executed; no
cookies, embedded tokens, player data or other unrelated fields are persisted.
"""
import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup


def canonical_url(url):
    if isinstance(url, str) and url.startswith("cricheroes.com/scorecard/"):
        url = "https://" + url
    p = urlparse(url or "")
    if p.scheme != "https" or p.hostname != "cricheroes.com" or p.port not in (None, 443) or p.username:
        raise ValueError("Unrecognised official scorecard destination")
    m = re.fullmatch(r"/scorecard/(\d+)/([^/]+)/([^/]+)(?:/(?:live|summary|scorecard))?/?", p.path)
    if not m:
        raise ValueError("Unrecognised scorecard path")
    return "https://cricheroes.com/scorecard/" + "/".join(m.groups()) + "/summary", int(m[1])


def embedded_records(html):
    """Decode Next.js JSON chunks as data, never eval/exec or browser scripts."""
    soup = BeautifulSoup(html, "html.parser")
    decoder = json.JSONDecoder()
    chunks = []
    for node in soup.find_all("script"):
        if node.get("src"):
            continue
        text = node.get_text()
        for match in re.finditer(r"self\.__next_f\.push\(", text):
            value, _ = decoder.raw_decode(text, match.end())
            if isinstance(value, list) and len(value) > 1 and value[0] == 1 and isinstance(value[1], str):
                chunks.append(value[1])
    records = []

    def walk(value):
        if isinstance(value, dict):
            if ("match_id" in value and "match_result" in value
                    and isinstance(value.get("team_a"), dict) and isinstance(value.get("team_b"), dict)):
                records.append(value)
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    for line in "".join(chunks).splitlines():
        try:
            value = json.loads(line.split(":", 1)[1])
        except (ValueError, IndexError):
            continue
        walk(value)
    return records


def parse_scorecard(html, fixture, url, team_key):
    url, expected_id = canonical_url(url)
    records = [r for r in embedded_records(html) if str(r.get("match_id")) == str(expected_id)]
    if not records:
        raise ValueError("Scorecard result schema unavailable")
    result = records[0]
    if str(result.get("tournament_id")) != "2234020":
        raise ValueError("Wrong tournament in scorecard")
    date = datetime.fromisoformat(result["start_datetime"].replace("Z", "+00:00")).astimezone(ZoneInfo("America/Guyana")).date().isoformat()
    if date != f"2026-10-{int(fixture['day']):02d}":
        raise ValueError("Scorecard date differs from official fixture")
    if result.get("status") != "past" or result.get("match_result") != "resulted":
        raise ValueError("Scorecard is not a completed standard result")
    if result.get("match_type") != "Limited Overs" or int(result.get("overs", 0)) != 45:
        raise ValueError("Nonstandard innings quota requires review")
    if any(result.get(k) for k in ("is_dl", "is_vjd", "over_reduce", "is_in_review", "is_super_over")):
        raise ValueError("Rain-adjusted/review/super-over result requires review")
    rows = []
    for side in ("team_a", "team_b"):
        t = result[side]
        if len(t.get("innings", [])) != 1:
            raise ValueError("Incomplete or multiple innings")
        i = t["innings"][0]
        if any(i.get(k) for k in ("revised_target", "revised_overs", "is_forfeited", "is_declare")):
            raise ValueError("Revised innings requires review")
        runs, wickets = i.get("total_run"), i.get("total_wicket")
        if not isinstance(runs, int) or not isinstance(wickets, int):
            raise ValueError("Missing numeric score")
        score = f"{runs}/{wickets}"
        if t.get("summary") != score or i.get("summary", {}).get("score") != score:
            raise ValueError("Scorecard summary and innings totals conflict")
        rows.append({"team": t["name"], "score": score, "overs": str(i.get("overs_played", ""))})
    if fixture["stage"] == "League" and {team_key(x["team"]) for x in rows} != {team_key(fixture["home"]), team_key(fixture["away"])}:
        raise ValueError("Scorecard teams differ from official fixture")
    normalized = {"innings": rows, "winner": result["winning_team"], "decision": "won by " + result["win_by"]}
    # Multiple matching payloads must agree on critical fields.
    for other in records[1:]:
        if any(other.get(k) != result.get(k) for k in ("winning_team", "win_by", "team_a", "team_b")):
            raise ValueError("Duplicate scorecard payloads conflict")
    return normalized, url


def fetch_html(url):
    response = requests.get(url, timeout=(15, 35), headers={"User-Agent": "Mozilla/5.0 (compatible; EnglandOver40s-ResultsSync/1.1)"})
    response.raise_for_status()
    if len(response.content) > 5_000_000 or urlparse(response.url).hostname != "cricheroes.com":
        raise ValueError("Unexpected scorecard response")
    return response.text


def collect(fixtures, links, existing, now, team_key, fetch=fetch_html):
    targets, pending = [], []
    for match_id, f in fixtures.items():
        if int(f["day"]) > now.day:
            continue
        if f["stage"] == "League":
            try:
                h, a = team_key(f["home"]), team_key(f["away"])
            except ValueError:
                pending.append({"match": match_id, "reason": "Unknown fixture teams"})
                continue
            if f"ALL_{h}_{a}" in existing or f"ALL_{a}_{h}" in existing:
                continue
        url = links.get(match_id, {}).get("scorecard", "")
        if url:
            targets.append((match_id, f, url))
        elif f["stage"] == "League":
            pending.append({"match": match_id, "teams": f"{f['home']} v {f['away']}", "reason": "Official scorecard link not published yet"})

    def work(item):
        match_id, fixture, url = item
        try:
            canonical, _ = canonical_url(url)
            result, canonical = parse_scorecard(fetch(canonical), fixture, canonical, team_key)
            return match_id, result, canonical, None
        except (ValueError, KeyError, TypeError, requests.RequestException) as exc:
            return match_id, None, None, {"match": match_id, "teams": f"{fixture['home']} v {fixture['away']}", "reason": str(exc)}

    results, verified_links, receipts = {}, {}, []
    with ThreadPoolExecutor(max_workers=2) as pool:
        for match_id, result, url, error in pool.map(work, targets):
            if error:
                pending.append(error)
            else:
                results[match_id] = result
                verified_links[match_id] = {"scorecard": url}
                receipts.append({"match": match_id, "source": url})
    return results, verified_links, {"scorecardsChecked": len(targets), "scorecardsVerified": receipts, "pendingScorecards": pending}
