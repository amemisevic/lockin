import test from 'node:test';
import assert from 'node:assert/strict';
import { weekStrip, visitsText, recentWorkouts, isCurrentWeek, shiftWeek, weekHeading } from '../src/views/gymHomeLogic.js';
import { emptyGym } from '../src/core/gym.js';

// G8b: week navigation on Gym home. Today is Sunday 2026-10-11; the week before is 10-05..10-11 minus 7 = 09-28..10-04.
const fin = (date, id, startedAt, extra = {}) => ({ id, date, startedAt, finishedAt: startedAt + 1, name: '', routineId: null, items: [], ...extra });
const g = workouts => ({ ...emptyGym(), workouts });
const EX = [fin('2026-09-29', 'a', 1), fin('2026-10-01', 'b', 2), fin('2026-10-05', 'c', 3), fin('2026-10-07', 'd', 4)];
const TODAY = '2026-10-11';

test('weekStrip: a shown week other than today\'s has no today tile', () => {
  const s = weekStrip(g(EX), '2026-10-04', TODAY);
  assert.deepEqual(s.map(d => d.key), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(s.map(d => d.visited), [false, true, false, true, false, false, false]);
  assert.equal(s.some(d => d.today), false);
  assert.equal(s.some(d => d.label.endsWith('today')), false);
});

test('weekStrip: a third argument equal to the shown week still marks today; one argument keeps the old meaning', () => {
  assert.equal(weekStrip(g(EX), TODAY, TODAY).filter(d => d.today).length, 1);
  assert.equal(weekStrip(g(EX), TODAY)[6].today, true);
  assert.equal(weekStrip(g(EX), '2026-10-08', TODAY)[6].today, true); // any key inside the shown week
});

test('visitsText follows the shown week', () => {
  assert.equal(visitsText(g(EX), '2026-10-02').text, '2 of 4 visits');
  assert.equal(visitsText(g(EX), TODAY).text, '2 of 4 visits');
  assert.equal(visitsText(g(EX), '2026-10-12').text, '0 of 4 visits');
});

test('isCurrentWeek: Monday to Sunday of today\'s week only', () => {
  assert.equal(isCurrentWeek('2026-10-05', TODAY), true);
  assert.equal(isCurrentWeek('2026-10-11', TODAY), true);
  assert.equal(isCurrentWeek('2026-10-04', TODAY), false);
  assert.equal(isCurrentWeek('2026-10-12', TODAY), false);
});

test('shiftWeek: one week back or forward from a key; landing on today\'s week gives null', () => {
  assert.equal(shiftWeek(TODAY, TODAY, -1), '2026-09-28');
  assert.equal(shiftWeek('2026-09-28', TODAY, -1), '2026-09-21');
  assert.equal(shiftWeek('2026-09-28', TODAY, 1), null);
  assert.equal(shiftWeek(TODAY, TODAY, 1), '2026-10-12');
  assert.equal(shiftWeek('2026-10-12', TODAY, -1), null);
});

test('shiftWeek across the DST change (Sun 2026-10-25) and the year end', () => {
  assert.equal(shiftWeek('2026-10-25', '2026-12-01', 1), '2026-10-26');
  assert.equal(shiftWeek('2026-10-26', '2026-12-01', -1), '2026-10-19');
  assert.equal(shiftWeek('2026-12-28', '2027-03-01', 1), '2027-01-04');
});

test('weekHeading: "This week" for today\'s week, otherwise the Tasks week label', () => {
  assert.equal(weekHeading(TODAY, TODAY), 'This week');
  assert.equal(weekHeading('2026-10-05', TODAY), 'This week');
  assert.equal(weekHeading('2026-09-28', TODAY), 'September · week 40');
});

test('recentWorkouts: a third argument keeps only workouts dated on or before that day; newest first', () => {
  assert.deepEqual(recentWorkouts(g(EX), 5, '2026-10-04').map(r => r.id), ['b', 'a']);
  assert.deepEqual(recentWorkouts(g(EX), 5, '2026-10-05').map(r => r.id), ['c', 'b', 'a']);
  assert.deepEqual(recentWorkouts(g(EX), 5).map(r => r.id), ['d', 'c', 'b', 'a']);
  assert.deepEqual(recentWorkouts(g(EX), 1, '2026-10-04').map(r => r.id), ['b']);
  assert.deepEqual(recentWorkouts(g(EX), 5, '2026-09-01'), []);
});
