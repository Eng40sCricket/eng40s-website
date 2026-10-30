/* Run: node tests/worldcup/check_knockout.cjs
 * Verified 29 October 2026 outcomes and current official knockout progression.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pagePath = path.resolve(__dirname, '../../tournaments/wc2026/index.html');
const text = fs.readFileSync(pagePath, 'utf8');
function slice(startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `Missing source markers ${startMarker} / ${endMarker}`);
  return text.slice(start, end);
}
const box = {};
vm.createContext(box);
vm.runInContext(slice('var WC =', 'function renderStandings'), box, {timeout: 1000});
vm.runInContext(slice('function renderKnockoutCard', '/* ── Main tab switching ── */'), box, {timeout: 1000});
const k = box.WC.knockout;
assert.deepEqual(Object.keys(k).filter(id => /^UC\d+$/.test(id)).sort(), ['UC1', 'UC2']);
assert.ok(!k.PM6 && !k.PM7, 'Obsolete quarter-final/placement branches must remain absent');

const standardResults = {
  UC1: {id:52, label:'Cup Semi-final 1', home:'southafrica', away:'australia', homeScore:'234/9 (45.0)', awayScore:'235/6 (43.5)', winner:'away', margin:4, venue:'Georgetown Cricket Club (GCC)', card:27948571},
  LC1: {id:53, label:'Shield Semi-final 1', home:'canada', away:'india', homeScore:'228/9 (45.0)', awayScore:'231/5 (42.3)', winner:'away', margin:5, venue:'Everest Cricket Club', card:27948611},
  LC3: {id:54, label:'Bowl Semi-final 1', home:'rotc', away:'newzealand', homeScore:'162/10 (40.5)', awayScore:'163/3 (25.3)', winner:'away', margin:7, venue:'Guyana National Stadium — Providence', card:27948625},
  LC4: {id:55, label:'Bowl Semi-final 2', home:'namibia', away:'scotland', homeScore:'195/10 (30.1)', awayScore:'196/2 (38.1)', winner:'away', margin:8, venue:'Malteenoes Cricket Club', card:27948658}
};
for (const [id, expected] of Object.entries(standardResults)) {
  const m = k[id];
  assert.equal(m.officialMatchId, expected.id);
  assert.equal(m.label, expected.label);
  assert.equal(m.date, '29 Oct 2026');
  assert.equal(m.time, '9:30 AM');
  assert.equal(m.venue, expected.venue);
  assert.equal(m.home, expected.home);
  assert.equal(m.away, expected.away);
  assert.equal(m.homeScore, expected.homeScore);
  assert.equal(m.awayScore, expected.awayScore);
  assert.equal(m.result, expected.winner);
  assert.equal(m.resultMethod, 'standard');
  assert.ok(m.scorecardURL.startsWith(`https://cricheroes.com/scorecard/${expected.card}/`));
  assert.ok(m.note.includes(`won by ${expected.margin} wickets`));
  const card = box.renderKnockoutCard(id, m);
  assert.ok(card.includes(expected.homeScore) && card.includes(expected.awayScore));
  assert.ok(card.includes(m.scorecardURL));
  assert.ok(card.includes(`won by ${expected.margin} wickets`));
  assert.ok(card.includes('9:30 AM Guyana'));
  const winnerScore = m[expected.winner + 'Score'].match(/^(\d+)\/(\d+) \((\d+)\.([0-5])\)$/);
  const loserScore = m[(expected.winner === 'home' ? 'away' : 'home') + 'Score'].match(/^(\d+)\/(\d+) \((\d+)\.([0-5])\)$/);
  assert.ok(winnerScore && loserScore, 'Actual cricket overs must remain legal');
  assert.ok(Number(winnerScore[1]) > Number(loserScore[1]));
  assert.equal(10 - Number(winnerScore[2]), expected.margin);
}

/* Walkover is a completed result without fabricated runs, wickets or overs. */
assert.equal(k.PS1.officialMatchId, 56);
assert.equal(k.PS1.date, '29 Oct 2026');
assert.equal(k.PS1.home, 'row');
assert.equal(k.PS1.away, 'colombia');
assert.equal(k.PS1.result, 'home');
assert.equal(k.PS1.resultMethod, 'walkover');
assert.equal(k.PS1.homeScore, null);
assert.equal(k.PS1.awayScore, null);
assert.equal(k.PS1.note, 'Rest of the World won by walkover');
assert.ok(k.PS1.scorecardURL.includes('/27948683/'));
const walkoverCard = box.renderKnockoutCard('PS1', k.PS1);
assert.match(walkoverCard, /Rest of the World won by walkover/);
assert.doesNotMatch(walkoverCard, /wc-ko-score|0\/0/);

/* Previously confirmed England result and link policy must remain intact. */
assert.equal(k.UC2.home, 'pakistan');
assert.equal(k.UC2.away, 'england');
assert.equal(k.UC2.date, '28 Oct 2026');
assert.equal(k.UC2.homeScore, '206/8 (41.0)');
assert.equal(k.UC2.awayScore, '205/9 (45.0)');
assert.equal(k.UC2.scorecardURL, 'https://englandseniors.play-cricket.com/website/results/7778862');
assert.equal(k.UC2.replayURL, 'https://www.youtube.com/watch?v=Xwx2_r0fTX0');
assert.equal(k.UC2.backupReplayURL, 'https://www.youtube.com/live/ZqNW5h5RiYo?si=dWc8zGd5-0WPU62r');
assert.equal(k.UC2.highlightsURL, '');
const englandCard = box.renderKnockoutCard('UC2', k.UC2);
assert.ok(englandCard.indexOf('246Sports Replay') < englandCard.indexOf('England Replay (backup)'));
assert.doesNotMatch(englandCard, />Highlights<|cricheroes/);

const future = {
  PM5: ['southafrica', 'england', '30 Oct 2026', 'Georgetown Cricket Club (GCC)'],
  FINAL: ['australia', 'pakistan', '31 Oct 2026', 'Guyana National Stadium — Providence'],
  LC2: ['westindies', 'usa', '30 Oct 2026', 'Guyana National Stadium — Providence'],
  PM1: ['india', null, '31 Oct 2026', 'Georgetown Cricket Club (GCC)'],
  PM2: ['canada', null, '31 Oct 2026', 'Enmore Community Centre Ground'],
  PM3: ['newzealand', 'scotland', '31 Oct 2026', 'Malteenoes Cricket Club'],
  PM4: ['rotc', 'namibia', '30 Oct 2026', 'Everest Cricket Club']
};
for (const [id, [home, away, date, venue]] of Object.entries(future)) {
  assert.equal(k[id].home, home, `${id} home progression`);
  assert.equal(k[id].away, away, `${id} away progression`);
  assert.equal(k[id].date, date, `${id} date`);
  assert.equal(k[id].venue, venue, `${id} venue`);
  assert.equal(k[id].time, '9:30 AM');
  for (const field of ['homeScore','awayScore','result']) assert.equal(k[id][field], null);
  assert.equal(k[id].scorecardURL, '');
}
assert.match(k.PM1.awayPlaceholder, /winner M57/);
assert.match(k.PM2.awayPlaceholder, /loser M57/);
const html = box.renderKnockout();
assert.match(html, /28–29 October 2026/);
assert.match(html, /Shield and Bowl semi-finals/);
assert.match(html, /Rest of the World won by walkover/);
assert.doesNotMatch(html, /Other placement semi-finals — provisional|Cup Semi-final [34]/);
assert.ok(html.indexOf('Grand Final') < html.indexOf('Shield Semi-final 1'));

/* Every knockout result is isolated from the cumulative preliminary table. */
const snapshot = () => JSON.stringify(box.calcStandings('ALL').map(r => ({...r,nrr:box.calcNRR(r.team,'ALL')})));
const baseline = snapshot();
const saved = box.WC.knockout;
box.WC.knockout = {};
assert.equal(snapshot(), baseline, 'Removing all knockouts must not affect points/NRR');
box.WC.knockout = saved;
assert.equal(Object.keys(box.WC.results).length, 45);
console.log('PASS: five 29 October results, walkover without scores, confirmed progression, England links and league isolation.');
