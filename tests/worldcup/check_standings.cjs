const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const text = fs.readFileSync('tournaments/wc2026/index.html', 'utf8');
const code = text.slice(text.indexOf('var WC ='), text.indexOf('function renderStandings'));
const box = {};
vm.createContext(box);
vm.runInContext(code, box, { timeout: 1000 });
const standings = box.calcStandings('ALL');
const expected = {};
box.WC.groups.ALL.forEach(t => expected[t] = { p: 0, w: 0, l: 0, tie: 0, nr: 0, pts: 0, rf: 0, ra: 0, of: 0, oa: 0 });
function effective(record, side) {
  const score = record[side + 'Score'];
  const [overs, balls = '0'] = String(record[side + 'Overs']).split('.');
  assert.match(balls, /^[0-5]$/);
  assert.ok(Number(overs) >= 0 && Number(overs) <= 45);
  const wickets = Number(score.match(/^\d+\/(\d+)/)[1]);
  assert.ok(wickets >= 0 && wickets <= 10);
  const allOut = record[side + 'AllOut'];
  assert.ok(allOut === undefined || typeof allOut === 'boolean', 'AllOut must be an explicit boolean');
  return wickets === 10 || allOut === true ? 45 : Number(overs) + Number(balls) / 6;
}
let count = 0;
for (const [key, r] of Object.entries(box.WC.results)) {
  if (!key.startsWith('ALL_') || !r.result) continue;
  const [, home, away] = key.split('_');
  assert.ok(box.WC.schedule[key], `Missing fixture: ${key}`);
  const h = expected[home], a = expected[away];
  h.p++; a.p++; count++;
  if (r.result === 'home') { h.w++; h.pts += 2; a.l++; }
  else if (r.result === 'away') { a.w++; a.pts += 2; h.l++; }
  else if (r.result === 'tie') { h.tie++; a.tie++; h.pts++; a.pts++; }
  else if (r.result === 'nr') { h.nr++; a.nr++; h.pts++; a.pts++; continue; }
  else assert.fail(`Unknown result: ${r.result}`);
  const ho = effective(r, 'home'), ao = effective(r, 'away');
  h.rf += r.homeRuns; h.of += ho; h.ra += r.awayRuns; h.oa += ao;
  a.rf += r.awayRuns; a.of += ao; a.ra += r.homeRuns; a.oa += ho;
}
for (const row of standings) {
  const e = expected[row.team];
  for (const field of ['p', 'w', 'l', 'tie', 'nr', 'pts']) assert.equal(row[field], e[field]);
  if (e.of && e.oa) {
    const nrr = e.rf / e.of - e.ra / e.oa;
    assert.ok(Math.abs(box.calcNRR(row.team, 'ALL') - nrr) < 1e-10, `${row.team} cumulative NRR differs`);
  }
}
assert.equal(standings.reduce((sum, r) => sum + r.p, 0), count * 2);
assert.equal(standings.reduce((sum, r) => sum + r.pts, 0), count * 2);
const england = standings.find(r => r.team === 'england');
assert.ok(england.w >= 2 && england.pts >= 4, 'Confirmed England wins must remain');
assert.equal(box.WC.results.ALL_newzealand_england.awayRuns, 286);
assert.equal(box.WC.results.ALL_newzealand_england.homeRuns, 157);
assert.equal(box.WC.results.ALL_usa_england.awayRuns, 264);
assert.equal(box.effectiveNRROvers('249/9 (43.3)', 43.3, true), 45);
assert.equal(box.effectiveNRROvers('249/9 (43.3)', 43.3, false), 43.5);
assert.equal(box.effectiveNRROvers('249/9 (43.3)', 43.3), 43.5);
assert.equal(box.effectiveNRROvers('249/9 (43.3)', 43.3, 'true'), 43.5);
assert.equal(box.effectiveNRROvers('157/10 (34.3)', 34.3, false), 45);
assert.equal(box.WC.results.ALL_india_england.awayScore, '250/9 (43.3)');
assert.equal(box.WC.results.ALL_india_england.awayOvers, 43.3);
assert.equal(box.WC.results.ALL_india_england.awayAllOut, true);
console.log(`PASS: ${count} results, all team standings and independent cumulative NRR checks.`);
console.log('England:', JSON.stringify({ ...england, nrr: box.calcNRR('england', 'ALL').toFixed(3) }));
console.log('Current order:', standings.map(x => `${x.team}: ${x.pts} pts ${box.calcNRR(x.team, 'ALL')?.toFixed(3) ?? '—'}`).join('; '));
