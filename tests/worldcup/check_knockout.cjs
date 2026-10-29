/*
 * Regression test for the restored 2026 World Cup knockout bracket.
 *
 * Run from the repository root:
 *   node tests/worldcup/check_knockout.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.resolve(__dirname, '../../tournaments/wc2026/index.html');
const text = fs.readFileSync(pagePath, 'utf8');

function sliceOrFail(startMarker, endMarker, from = 0) {
  const start = text.indexOf(startMarker, from);
  assert.notEqual(start, -1, `Could not find source marker: ${startMarker}`);
  const end = text.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Could not find source marker: ${endMarker}`);
  return text.slice(start, end);
}

/*
 * Keep extraction deliberately bounded to this owned page: the data through
 * renderStandings contains WC, the standings/NRR engine, and teamImg without
 * executing the page's DOM initialisation.
 */
const dataAndEngine = sliceOrFail('var WC =', 'function renderStandings');
const knockoutRenderer = sliceOrFail(
  'function renderKnockoutCard',
  '/* ── Main tab switching ── */'
);
const box = {};
vm.createContext(box);
vm.runInContext(dataAndEngine, box, { filename: pagePath, timeout: 1000 });
vm.runInContext(knockoutRenderer, box, { filename: pagePath, timeout: 1000 });

assert.ok(box.WC && box.WC.knockout, 'WC knockout data must be available');
assert.equal(typeof box.calcStandings, 'function', 'Standings engine must be available');
assert.equal(typeof box.calcNRR, 'function', 'NRR engine must be available');
assert.equal(typeof box.renderKnockoutCard, 'function', 'Knockout card renderer must be available');
assert.equal(typeof box.renderKnockout, 'function', 'Knockout renderer must be available');

const knockout = box.WC.knockout;
const fixtureFields = [
  'label', 'date', 'venue', 'note',
  'home', 'away', 'homeScore', 'awayScore', 'result', 'scorecardURL'
];
const resultFields = ['home', 'away', 'homeScore', 'awayScore', 'result', 'scorecardURL'];

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function pick(object, keys) {
  return Object.fromEntries(keys.map(key => [key, object[key]]));
}

function assertPending(matchId, match) {
  assert.ok(match, `${matchId} must be present`);
  for (const field of resultFields) {
    assert.ok(hasOwn(match, field), `${matchId}.${field} must remain available for future results`);
  }
  assert.equal(match.home, null, `${matchId} home team must remain unconfirmed`);
  assert.equal(match.away, null, `${matchId} away team must remain unconfirmed`);
  assert.equal(match.homeScore, null, `${matchId} home score must remain pending`);
  assert.equal(match.awayScore, null, `${matchId} away score must remain pending`);
  assert.equal(match.result, null, `${matchId} result must remain pending`);
  assert.equal(match.scorecardURL, '', `${matchId} scorecard link must remain pending`);
}

function assertAwayConfirmedPendingResult(matchId, match, away) {
  assert.ok(match, `${matchId} must be present`);
  for (const field of resultFields) {
    assert.ok(hasOwn(match, field), `${matchId}.${field} must remain available for future results`);
  }
  assert.equal(match.home, null, `${matchId} home team must remain pending`);
  assert.equal(match.away, away, `${matchId} away team must be confirmed`);
  assert.equal(match.homeScore, null, `${matchId} home score must remain pending`);
  assert.equal(match.awayScore, null, `${matchId} away score must remain pending`);
  assert.equal(match.result, null, `${matchId} result must remain pending`);
  assert.equal(match.scorecardURL, '', `${matchId} scorecard link must remain pending`);
}

function assertPlaceholder(matchId, match, home, away) {
  assert.equal(typeof match.homePlaceholder, 'string', `${matchId} needs a useful home placeholder`);
  assert.equal(typeof match.awayPlaceholder, 'string', `${matchId} needs a useful away placeholder`);
  assert.match(match.homePlaceholder, home, `${matchId} home placeholder must identify its source`);
  assert.match(match.awayPlaceholder, away, `${matchId} away placeholder must identify its source`);
}

function assertNoFabricatedCupDetails(matchId, match, expectedLabels) {
  const card = box.renderKnockoutCard(matchId, match);
  assert.match(card, /\bTBC\b/i, `${matchId} must show a pending venue/team state`);
  for (const label of expectedLabels) {
    assert.match(card, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      `${matchId} must render its useful qualification placeholder: ${label}`);
  }
  assert.doesNotMatch(card, /Guyana National Stadium|Georgetown Cricket Club|Malteenoes|Enmore Community/i,
    `${matchId} must not fabricate a confirmed ground`);
  for (const team of Object.values(box.WC.teams)) {
    assert.doesNotMatch(card, new RegExp(team.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      `${matchId} must not fabricate a confirmed team`);
  }
}

/* Exactly two top-four Cup semi-finals; UC3 and UC4 are obsolete. */
const cupSemiIds = Object.keys(knockout).filter(id => /^UC\d+$/.test(id)).sort();
assert.deepEqual(cupSemiIds, ['UC1', 'UC2'], 'Only UC1 and UC2 may remain as Cup semi-finals');
assert.ok(!hasOwn(knockout, 'UC3'), 'Obsolete Cup Semi-final 3 must be removed');
assert.ok(!hasOwn(knockout, 'UC4'), 'Obsolete Cup Semi-final 4 must be removed');

const expectedPendingUC1 = {
  label: 'Cup Semi-final 1',
  date: '28 Oct 2026',
  venue: 'TBC',
  note: '1st overall league vs 4th overall league'
};
assert.deepEqual(pick(knockout.UC1, Object.keys(expectedPendingUC1)), expectedPendingUC1,
  'UC1 details changed');
assertPending('UC1', knockout.UC1);

const expectedConfirmedUC2 = {
  label: 'Cup Semi-final 2',
  date: '28 Oct 2026',
  venue: 'Guyana National Stadium — Providence',
  note: '2nd overall league vs 3rd overall league — Pakistan won by 2 wickets',
  home: 'pakistan',
  away: 'england',
  homeScore: '206/8 (41.0)',
  awayScore: '205/9 (45.0)',
  result: 'home',
  scorecardURL: 'https://englandseniors.play-cricket.com/website/results/7778862'
};
assert.deepEqual(pick(knockout.UC2, fixtureFields), expectedConfirmedUC2,
  'UC2 confirmed semi-final details changed');

assertPlaceholder('UC1', knockout.UC1, /1st\s*place/i, /4th\s*place/i);
assertPlaceholder('UC2', knockout.UC2, /2nd\s*place/i, /3rd\s*place/i);
assertNoFabricatedCupDetails('UC1', knockout.UC1, ['1st place', '4th place']);

const confirmedUC2Card = box.renderKnockoutCard('UC2', knockout.UC2);
assert.ok(confirmedUC2Card.includes('Pakistan won by 2 wickets'),
  'Rendered UC2 must contain the exact winning margin');
assert.ok(confirmedUC2Card.includes('206/8 (41.0)'),
  'Rendered UC2 must contain Pakistan’s confirmed score');
assert.ok(confirmedUC2Card.includes('205/9 (45.0)'),
  'Rendered UC2 must contain England’s confirmed score');
assert.ok(confirmedUC2Card.includes(expectedConfirmedUC2.scorecardURL),
  'Rendered UC2 must contain the exact scorecard URL');

assert.equal(knockout.UC2.replayURL, 'https://www.youtube.com/watch?v=Xwx2_r0fTX0');
assert.equal(knockout.UC2.backupReplayURL, 'https://www.youtube.com/live/ZqNW5h5RiYo?si=dWc8zGd5-0WPU62r');
assert.equal(knockout.UC2.highlightsURL, '', 'Pending highlights must not receive an invented link');
assert.ok(confirmedUC2Card.includes(knockout.UC2.replayURL));
assert.ok(confirmedUC2Card.includes(knockout.UC2.backupReplayURL));
assert.ok(confirmedUC2Card.indexOf('246Sports Replay') < confirmedUC2Card.indexOf('England Replay (backup)'),
  'The organiser replay must precede the team backup');
assert.doesNotMatch(confirmedUC2Card, />Highlights<|playlist\?/, 'No placeholder highlights or generic playlist');

/* The former placement match 5 is now a distinct third/fourth playoff. */
assert.ok(hasOwn(knockout, 'PM5'), 'PM5 must remain as the third/fourth playoff');
assert.deepEqual(pick(knockout.PM5, ['label', 'date', 'venue']), {
  label: '3rd / 4th Place Playoff',
  date: '30 Oct 2026',
  venue: 'Georgetown Cricket Club (GCC)'
}, 'PM5 must be restored as the third/fourth playoff');
assert.match(knockout.PM5.note, /^Losers?\s*(?:SF|Semi-final)\s*1\s*(?:v|vs)\s*Losers?\s*(?:SF|Semi-final)\s*2$/i,
  'PM5 must be contested by the two Cup semi-final losers');
assertAwayConfirmedPendingResult('PM5', knockout.PM5, 'england');
assertPlaceholder('PM5', knockout.PM5, /(?:loser\s*(?:SF|Semi-final)\s*1|(?:SF|Semi-final)\s*1\s*loser)/i, /(?:loser\s*(?:SF|Semi-final)\s*2|(?:SF|Semi-final)\s*2\s*loser)/i);
assert.match(box.renderKnockoutCard('PM5', knockout.PM5), /England/,
  'Rendered PM5 must show England as the confirmed away team');

/* PM6 and PM7 depended on the removed UC3/UC4 semi-finals and must be gone. */
assert.ok(!hasOwn(knockout, 'PM6'), 'Obsolete PM6 must be removed with UC3/UC4');
assert.ok(!hasOwn(knockout, 'PM7'), 'Obsolete PM7 must be removed with UC3/UC4');

assert.ok(hasOwn(knockout, 'FINAL'), 'The Grand Final must be present');
assert.deepEqual(pick(knockout.FINAL, ['label', 'date']), {
  label: 'Grand Final',
  date: '31 Oct 2026'
}, 'Grand Final details changed');
assert.match(knockout.FINAL.venue, /Providence/i, 'Grand Final must be at Providence');
assert.match(knockout.FINAL.note, /^Winners?\s*(?:SF|Semi-final)\s*1\s*(?:v|vs)\s*Winners?\s*(?:SF|Semi-final)\s*2$/i,
  'Grand Final must be contested by the two Cup semi-final winners');
assertAwayConfirmedPendingResult('FINAL', knockout.FINAL, 'pakistan');
assertPlaceholder('FINAL', knockout.FINAL, /(?:winner\s*(?:SF|Semi-final)\s*1|(?:SF|Semi-final)\s*1\s*winner)/i, /(?:winner\s*(?:SF|Semi-final)\s*2|(?:SF|Semi-final)\s*2\s*winner)/i);
assert.match(box.renderKnockoutCard('FINAL', knockout.FINAL), /Pakistan/,
  'Rendered Grand Final must show Pakistan as the confirmed away team');

/* These remaining provisional placement records are intentionally unchanged. */
const retainedPlacementRecords = {
  LC1: { label: 'Placement Semi-final 1', date: '29 Oct 2026', venue: 'Police Sports Club Ground at Eve Leary', note: '5th overall league vs 6th overall league' },
  LC2: { label: 'Placement Semi-final 2', date: '29 Oct 2026', venue: 'Lusignan Community Centre Ground', note: '6th overall league vs 5th overall league' },
  LC3: { label: 'Placement Semi-final 3', date: '29 Oct 2026', venue: 'Malteenoes Sports Club', note: '7th overall league vs 8th overall league' },
  LC4: { label: 'Placement Semi-final 4', date: '29 Oct 2026', venue: 'Georgetown Cricket Club (GCC)', note: '8th overall league vs 7th overall league' },
  PM1: { label: 'Placement Match 1', date: '30 Oct 2026', venue: 'Lusignan Community Centre Ground', note: 'Winner Match 61 vs Winner Match 62' },
  PM2: { label: 'Placement Match 2', date: '30 Oct 2026', venue: 'Enmore Community Centre Ground', note: 'Loser Match 61 vs Loser Match 62' },
  PM3: { label: 'Placement Match 3', date: '30 Oct 2026', venue: 'Guyana National Stadium — Providence', note: 'Winner Match 63 vs Winner Match 64' },
  PM4: { label: 'Placement Match 4', date: '30 Oct 2026', venue: 'Everest Cricket Club (ECC)', note: 'Loser Match 63 vs Loser Match 64' }
};

for (const [id, expected] of Object.entries(retainedPlacementRecords)) {
  assert.ok(hasOwn(knockout, id), `${id} must be retained`);
  assert.deepEqual(pick(knockout[id], fixtureFields), {
    ...expected,
    home: null,
    away: null,
    homeScore: null,
    awayScore: null,
    result: null,
    scorecardURL: ''
  }, `${id} must remain unmodified`);
}

/* The restored path must render in tournament order before provisional placement cards. */
const knockoutHtml = box.renderKnockout();
const cardOccurrences = (knockoutHtml.match(/Cup Semi-final [12]/g) || []).length;
assert.equal(cardOccurrences, 2, 'Rendered knockout must contain exactly two Cup semi-final cards');
assert.doesNotMatch(knockoutHtml, /Cup Semi-final [34]/, 'Rendered knockout must not contain obsolete Cup semis');
assert.doesNotMatch(knockoutHtml, /Placement Match [67]/, 'Rendered knockout must not contain obsolete PM6/PM7');
assert.match(knockoutHtml, /<h3[^>]*>\s*3rd\s*\/\s*4th Place Playoff/i,
  'Third/fourth playoff must render in its own section');
assert.match(knockoutHtml, /<h3[^>]*>\s*Grand Final/i,
  'Grand Final must render in its own section');

const cupLast = knockoutHtml.indexOf('Cup Semi-final 2');
const playoff = knockoutHtml.indexOf('3rd / 4th Place Playoff');
const grandFinal = knockoutHtml.indexOf('<h3 class="wc-ko-section-title">Grand Final');
const provisionalPlacements = knockoutHtml.indexOf('Placement Semi-final 1');
assert.ok(cupLast >= 0 && playoff > cupLast, 'Third/fourth playoff must follow the Cup semi-finals');
assert.ok(grandFinal > playoff, 'Grand Final must follow the third/fourth playoff');
assert.ok(provisionalPlacements > grandFinal, 'Provisional placement matches must follow the Grand Final');

/*
 * Populate an in-memory future result to protect score and scorecard rendering,
 * then confirm that knockout changes never affect the standings/NRR engine.
 */
function standingsSnapshot() {
  return box.calcStandings('ALL').map(row => ({
    team: row.team,
    p: row.p,
    w: row.w,
    l: row.l,
    tie: row.tie,
    nr: row.nr,
    pts: row.pts,
    nrr: box.calcNRR(row.team, 'ALL')
  }));
}

const standingsBefore = standingsSnapshot();
const originalUC2 = knockout.UC2;
try {
  knockout.UC2 = {
    ...originalUC2,
    homeScore: null,
    awayScore: null,
    result: null,
    scorecardURL: ''
  };
  box.renderKnockout();
  assert.deepEqual(standingsSnapshot(), standingsBefore,
    'Confirming or clearing the UC2 knockout result must not alter group standings or NRR');
} finally {
  knockout.UC2 = originalUC2;
}

const futureCupSemi = {
  ...knockout.UC1,
  home: 'england',
  away: 'australia',
  homeScore: '218/6 (45)',
  awayScore: '217/9 (45)',
  result: 'home',
  scorecardURL: 'https://example.test/world-cup-2026/uc1-scorecard'
};
const futureCard = box.renderKnockoutCard('UC1', futureCupSemi);
assert.match(futureCard, /England/);
assert.match(futureCard, /Australia/);
assert.match(futureCard, /218\/6 \(45\)/);
assert.match(futureCard, /217\/9 \(45\)/);
assert.match(futureCard, /https:\/\/example\.test\/world-cup-2026\/uc1-scorecard/);
assert.match(futureCard, />📋 Scorecard</);

const originalUC1 = knockout.UC1;
try {
  knockout.UC1 = futureCupSemi;
  box.renderKnockout();
  assert.deepEqual(standingsSnapshot(), standingsBefore,
    'Adding/rendering a future knockout result must not alter group standings or NRR');
} finally {
  knockout.UC1 = originalUC1;
}

console.log('PASS: World Cup knockout restoration schema, rendering order, placeholders, and standings isolation verified.');
