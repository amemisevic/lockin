import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/core/gymstats.js';
import { startWorkout } from '../src/core/workouts.js';
import { emptyGym } from '../src/core/gym.js';

// Weeks and visits around clock changes and midnight. Run in several zones by tests/gymstats-tz.test.js;
// date keys must come out the same everywhere. Expected keys are written by hand (Mondays of 2026-03-23, 03-02, 03-30, 10-19, 10-26, 09-21).
const L = (m, d, h, min) => new Date(2026, m - 1, d, h, min).getTime(); // local time
const done = (ms) => { // a finished workout started at ms, dated by startWorkout (local date of the start)
  const w = startWorkout(emptyGym(), ms).state.workouts[0];
  return { ...w, items: [{ exerciseId: 'bench-press', sets: [{ reps: 5, weight: 80, warmup: false, done: true }] }], finishedAt: ms + 3600000 };
};
const gym = (...ms) => ({ ...emptyGym(), workouts: ms.map(done) });

test('time zone: local offset matches EXPECT_OFFSET when set', () => {
  if (process.env.EXPECT_OFFSET === undefined) return;
  assert.equal(new Date(2026, 0, 15, 12).getTimezoneOffset(), Number(process.env.EXPECT_OFFSET));
});

test('weekKeys: the week of Sun 2026-10-25 (EU clocks go back) has 7 keys, Mon 10-19 to Sun 10-25', () => {
  const expected = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];
  for (const d of expected) assert.deepEqual(S.weekKeys(d), expected, d);
});

test('weekKeys: the other clock-change Sundays (EU spring, US both, NZ both) give 7 keys', () => {
  assert.deepEqual(S.weekKeys('2026-03-29'), ['2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29']);
  assert.deepEqual(S.weekKeys('2026-11-01'), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  assert.deepEqual(S.weekKeys('2026-03-08'), ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08']);
  assert.deepEqual(S.weekKeys('2026-04-05'), ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05']);
  assert.deepEqual(S.weekKeys('2026-09-27'), ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27']);
});

test('Sunday 23:59 and Monday 00:00 land in different weeks, also across clock changes', () => {
  for (const [sun, mon, sunKey, monKey] of [
    [L(10, 25, 23, 59), L(10, 26, 0, 0), '2026-10-25', '2026-10-26'], // EU fall back
    [L(3, 29, 23, 59), L(3, 30, 0, 0), '2026-03-29', '2026-03-30'],   // EU spring forward
    [L(11, 1, 23, 59), L(11, 2, 0, 0), '2026-11-01', '2026-11-02'],   // US fall back
    [L(10, 11, 23, 59), L(10, 12, 0, 0), '2026-10-11', '2026-10-12'], // no change
  ]) {
    const g = gym(sun, mon);
    assert.deepEqual(S.visitDates(g), [sunKey, monKey]);
    assert.equal(S.visitsInWeek(g, sunKey), 1, sunKey);
    assert.equal(S.visitsInWeek(g, monKey), 1, monKey);
    assert.deepEqual(S.weeklyVisits(g, monKey, 2), [{ start: S.weekKeys(sunKey)[0], visits: 1 }, { start: monKey, visits: 1 }]);
  }
});

test('last 12 weeks across the EU and US fall-back are 12 consecutive Mondays', () => {
  const r = S.weeklyVisits(gym(L(10, 25, 23, 59), L(11, 1, 23, 59)), '2026-11-02');
  assert.deepEqual(r.map(w => w.start), ['2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']);
  assert.deepEqual(r.map(w => w.visits), [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0]);
});
