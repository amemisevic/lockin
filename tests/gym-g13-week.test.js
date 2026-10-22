import test from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, addDays } from '../src/logic.js';
import { emptyGym, setWeeklyTarget, setWeeklyTargetOn } from '../src/core/gym.js';
import { visitsText, weekStrip } from '../src/views/gymHomeLogic.js';
import { statsModel } from '../src/views/gymStatsLogic.js';
import { defaultState } from '../src/core/model.js';
import { exportJson, validateImport } from '../src/core/store.js';

// G13 week logic with the target on and off. Run in three time zones by tests/gym-g13-tz.test.js (the count there must match).
// "Today" comes from a local clock time, so a zone that put Sunday 23:30 in another week would show up here. Invented data only.
const local = (y, m, d, h = 12, mi = 0) => dateKey(new Date(y, m - 1, d, h, mi));
const wk = date => { const [y, m, d] = date.split('-').map(Number), s = new Date(y, m - 1, d, 12).getTime(); return { id: `w-${date}`, date, startedAt: s, finishedAt: s + 3_600_000, name: '', routineId: null, items: [{ exerciseId: 'row', sets: [{ reps: 10, weight: 50, warmup: false, done: true }] }] }; };
const gymOf = (dates, on = true, n = 3) => setWeeklyTargetOn(setWeeklyTarget({ ...emptyGym(), workouts: dates.map(wk) }, n), on);

test('time zone: local offset matches EXPECT_OFFSET when set', () => {
  if (process.env.EXPECT_OFFSET === undefined) return;
  assert.equal(new Date(2026, 0, 15, 12).getTimezoneOffset(), Number(process.env.EXPECT_OFFSET));
});

test('home line: Sunday 23:30 and Monday 00:30 local are two weeks; off gives no text but the same visit counts', () => {
  const dates = ['2026-10-19', '2026-10-21', '2026-10-26'];
  const sun = local(2026, 10, 25, 23, 30), mon = local(2026, 10, 26, 0, 30); // the Sunday the clocks change in Europe
  assert.equal(visitsText(gymOf(dates), sun).text, '2 of 3 visits');
  assert.equal(visitsText(gymOf(dates), mon).text, '1 of 3 visits');
  for (const [day, visits] of [[sun, 2], [mon, 1]]) {
    assert.deepEqual(visitsText(gymOf(dates, false), day), { visits, target: null, text: null });
  }
});

test('a full 7-visit week across each zone\'s clock change counts 7; off keeps the strip and drops the text', () => {
  for (const monday of ['2026-09-21', '2026-10-19', '2026-10-26', '2026-11-02']) { // weeks holding Auckland (27 Sep), Europe (25 Oct) and LA (1 Nov) changes
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    const probe = local(Number(days[6].slice(0, 4)), Number(days[6].slice(5, 7)), Number(days[6].slice(8)), 23, 59);
    assert.equal(probe, days[6], monday);
    assert.equal(visitsText(gymOf(days, true, 7), probe).text, '7 of 7 visits', monday);
    const off = gymOf(days, false, 7);
    assert.equal(visitsText(off, probe).text, null, monday);
    assert.deepEqual(weekStrip(off, probe, probe).map(d => d.key), days, monday);
    assert.ok(weekStrip(off, probe, probe).every(d => d.visited), monday);
  }
});

test('stats weeks: one visit a week for 12 weeks; on has the target in value, scale and label, off has none of them', () => {
  const today = local(2026, 11, 1, 23, 30); // a Sunday, LA clock change day
  const mondays = Array.from({ length: 12 }, (_, i) => addDays('2026-08-17', 7 * i)); // week of 17 Aug .. week of 26 Oct
  const on = statsModel(null, gymOf(mondays, true, 3), today).weeks;
  assert.deepEqual(on.values, Array(12).fill(1));
  assert.equal(on.target, 3);
  assert.equal(on.max, 4);
  assert.match(on.label, /, target 3: /);
  const off = statsModel(null, gymOf(mondays, false, 3), today).weeks;
  assert.deepEqual(off.values, Array(12).fill(1));
  assert.equal(off.target, null);
  assert.equal(off.max, 2); // peak 1 + 1
  assert.equal(off.label, 'Visits per week for the last 12 weeks, oldest first: 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1');
});

test('backup round trip keeps number and switch whatever the zone', () => {
  const v2 = { ...defaultState(), settings: { ...defaultState().settings, lastBackup: local(2026, 10, 25, 23, 30) } };
  for (const g of [gymOf(['2026-10-19'], false, 5), gymOf(['2026-10-19'], true, 2)]) {
    const r = validateImport(exportJson(v2, g));
    assert.equal(r.ok, true);
    assert.deepEqual(r.gym.settings, g.settings);
  }
});
