import test from 'node:test';
import assert from 'node:assert/strict';
import { todayCards, timeLeft } from '../src/views/todayLogic.js';
import { startChallenge, submitMorning, submitAfternoon } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { setWarEntry, oathComplete } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Plan Task 12 (rulings R1-R3): Today's action cards and the Recovery time label. Expected values are hand-computed.
// todayLogic-tz.test.js runs this file in three time zones; the DST days below are DST changes in one of them each.
const at = (key, h, mi = 0, s = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi, s).getTime(); };
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
const kinds = cards => cards.map(c => c.kind);
const hrefs = cards => cards.map(c => c.href);
const HELD = { protocols: { p1: 'held' }, redLines: { r1: 'held' } };
const CROSSED = { protocols: { p1: 'held' }, redLines: { r1: 'crossed' } };

const D1 = '2026-10-13', D2 = '2026-10-14', D3 = '2026-10-15';
const DST_DAYS = ['2026-10-25', '2026-11-01', '2026-09-27']; // Europe ends, Los Angeles ends, Auckland starts

function begin(startKey) {
  let s = defaultState();
  for (const k of ['contract', 'funeral', 'code', 'redlines-w1']) s = setWarEntry(s, k, `Text ${k}`, at(startKey, 7));
  return ok(startChallenge(s, startKey, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
const morning = (s, key) => ok(submitMorning(s, key, { target: 'Target A', risk: '', med: [] }, at(key, 8)));
const night = (s, key, form = HELD) => ok(closeNight(s, key, form, at(key, 21)));

test('time zone: local offset matches EXPECT_OFFSET when set', () => {
  if (process.env.EXPECT_OFFSET === undefined) return;
  assert.equal(new Date(2026, 0, 15, 12).getTimezoneOffset(), Number(process.env.EXPECT_OFFSET));
});

test('no challenge: one start card to #challenge', () => {
  const c = todayCards(defaultState(), at(D1, 8));
  assert.deepEqual(kinds(c), ['start']);
  assert.deepEqual(hrefs(c), ['#challenge']);
});

test('finished challenge (day 31, day 30 closed): no cards', () => {
  let s = begin(D1);
  for (let i = 0; i < 30; i++) s = night(s, addDays(D1, i));
  assert.deepEqual(todayCards(s, at(addDays(D1, 30), 8)), []);
  assert.deepEqual(todayCards(s, at(addDays(D1, 30), 21)), []);
});

test('day 30 still open at 00:30 of day 31: one closeYesterday card for day 30', () => {
  let s = begin(D1);
  for (let i = 0; i < 29; i++) s = night(s, addDays(D1, i));
  const c = todayCards(s, at(addDays(D1, 30), 0, 30));
  assert.deepEqual(kinds(c), ['closeYesterday']);
  assert.deepEqual(hrefs(c), [`#checkin/night/${addDays(D1, 29)}`]);
});

test('morning due at 08:00: one morning card', () => {
  const c = todayCards(begin(D1), at(D1, 8));
  assert.deepEqual(kinds(c), ['morning']);
  assert.deepEqual(hrefs(c), ['#checkin/morning']);
});

test('morning done at 13:00: afternoon card; dismissed: none', () => {
  const s = morning(begin(D1), D1);
  const c = todayCards(s, at(D1, 13));
  assert.deepEqual(kinds(c), ['afternoon']);
  assert.deepEqual(hrefs(c), ['#checkin/afternoon']);
  assert.deepEqual(todayCards(s, at(D1, 13), { afternoonDismissed: true }), []);
  assert.deepEqual(todayCards(s, at(D1, 13), { afternoonDismissed: false }).map(x => x.kind), ['afternoon']);
});

test('morning done, before 12:00 and after the afternoon check-in: no card until 20:00', () => {
  const s = morning(begin(D1), D1);
  assert.deepEqual(todayCards(s, at(D1, 11, 59)), []);
  const a = submitAfternoon(s, D1, { onTrack: 'yes' }, at(D1, 14));
  assert.deepEqual(todayCards(a, at(D1, 19, 59)), []);
  assert.deepEqual(kinds(todayCards(a, at(D1, 20))), ['night']);
});

test('19:59 afternoon, 20:00 night (to tonight), also when the afternoon was dismissed', () => {
  const s = morning(begin(D1), D1);
  assert.deepEqual(kinds(todayCards(s, at(D1, 19, 59))), ['afternoon']);
  const c = todayCards(s, at(D1, 20, 0));
  assert.deepEqual(kinds(c), ['night']);
  assert.deepEqual(hrefs(c), [`#checkin/night/${D1}`]);
  assert.deepEqual(hrefs(todayCards(s, at(D1, 20, 0), { afternoonDismissed: true })), [`#checkin/night/${D1}`]);
});

test('recovery pending, morning not done: recovery card first and no morning card', () => {
  const s = night(begin(D1), D1, CROSSED); // Reset at D1 21:00, due D2 21:00
  const c = todayCards(s, at(D2, 8));
  assert.deepEqual(kinds(c), ['recovery']);
  assert.deepEqual(hrefs(c), [`#recovery/${D1}`]);
  assert.equal(c[0].date, D1);
  assert.equal(c[0].overdue, false);
  assert.equal(c[0].msLeft, 13 * 3600000);
});

test('recovery overdue: still one recovery card, overdue, 0 ms left', () => {
  const s = night(begin(D1), D1, CROSSED);
  const c = todayCards(s, at(D2, 22));
  assert.deepEqual(kinds(c), ['recovery']);
  assert.equal(c[0].date, D1);
  assert.equal(c[0].overdue, true);
  assert.equal(c[0].msLeft, 0);
});

test('recovery pending and yesterday open at 00:30: recovery first, then closeYesterday', () => {
  const s = night(begin(D1), D1, CROSSED); // D2 never closed
  const c = todayCards(s, at(D3, 0, 30));
  assert.deepEqual(kinds(c), ['recovery', 'closeYesterday']);
  assert.deepEqual(hrefs(c), [`#recovery/${D1}`, `#checkin/night/${D2}`]);
});

test('yesterday open at 00:30: exactly one closeYesterday card, no morning card', () => {
  const s = morning(begin(D1), D1);
  const c = todayCards(s, at(D2, 0, 30));
  assert.deepEqual(kinds(c), ['closeYesterday']);
  assert.deepEqual(hrefs(c), [`#checkin/night/${D1}`]);
});

test('closed today: no cards', () => {
  const s = night(morning(begin(D1), D1), D1);
  assert.deepEqual(todayCards(s, at(D1, 22)), []);
  assert.deepEqual(todayCards(s, at(D1, 23, 59)), []);
});

for (const DST of DST_DAYS) {
  test(`DST day ${DST}: 19:59 afternoon, 20:00 night`, () => {
    const s = morning(begin(DST), DST);
    assert.deepEqual(kinds(todayCards(s, at(DST, 19, 59))), ['afternoon']);
    const c = todayCards(s, at(DST, 20, 0));
    assert.deepEqual(kinds(c), ['night']);
    assert.deepEqual(hrefs(c), [`#checkin/night/${DST}`]);
  });

  test(`DST day ${DST}: yesterday open at 00:30 gives one closeYesterday card`, () => {
    const y = addDays(DST, -1);
    const s = morning(begin(y), y);
    const c = todayCards(s, at(DST, 0, 30));
    assert.deepEqual(kinds(c), ['closeYesterday']);
    assert.deepEqual(hrefs(c), [`#checkin/night/${y}`]);
  });
}

test('timeLeft: hours and minutes, under an hour minutes only, partial minutes round up', () => {
  assert.equal(timeLeft(90 * 60000), '1h 30m left');
  assert.equal(timeLeft(59 * 60000), '59m left');
  assert.equal(timeLeft(61 * 60000), '1h 1m left');
  assert.equal(timeLeft(24 * 3600000), '24h 0m left');
  assert.equal(timeLeft(30000), '1m left');
  assert.equal(timeLeft(0), '0m left');
});
