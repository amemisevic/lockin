import test from 'node:test';
import assert from 'node:assert/strict';
import { noonOf, dayItems, recentWorkouts } from '../src/views/gymHomeLogic.js';
import { begin, lastTimeText } from '../src/views/gymWorkoutLogic.js';
import { addExercise, editSet, toggleDone, finishWorkout, prefillSets } from '../src/core/workouts.js';
import { emptyGym } from '../src/core/gym.js';
import { dateKey } from '../src/logic.js';

// G9b logic: the day sheet's items and the noon start time of a workout added to a past day. Run in three zones by
// tests/gym-g9b-tz.test.js (EXPECT_OFFSET proves the zone applied).
const fin = (date, id, startedAt, extra = {}) => ({ id, date, startedAt, finishedAt: startedAt + 1, name: '', routineId: null, items: [], ...extra });
const g = workouts => ({ ...emptyGym(), workouts });

test('time zone: local offset matches EXPECT_OFFSET when set', () => {
  if (process.env.EXPECT_OFFSET === undefined) return;
  assert.equal(new Date(2026, 0, 15, 12).getTimezoneOffset(), Number(process.env.EXPECT_OFFSET));
});

test('noonOf: local 12:00 of the day key, also on clock-change days and the year end', () => {
  assert.equal(noonOf('2026-10-10'), new Date(2026, 9, 10, 12, 0, 0, 0).getTime());
  for (const k of ['2026-03-29', '2026-10-25', '2026-03-08', '2026-11-01', '2026-09-27', '2026-04-05', '2026-12-31', '2027-01-01', '2028-02-29']) {
    const d = new Date(noonOf(k));
    assert.equal(dateKey(d), k, k);
    assert.deepEqual([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()], [12, 0, 0, 0], k);
  }
});

test('dayItems: finished workouts of that day only, oldest first, "Workout" for a blank name; open and other days left out', () => {
  const gym = g([
    fin('2026-10-10', 'late', 300, { name: 'Pull' }), fin('2026-10-10', 'early', 100), fin('2026-10-09', 'other', 50, { name: 'X' }),
    { ...fin('2026-10-10', 'open', 400, { name: 'Open' }), finishedAt: null }]);
  assert.deepEqual(dayItems(gym, '2026-10-10'), [{ id: 'early', title: 'Workout' }, { id: 'late', title: 'Pull' }]);
  assert.deepEqual(dayItems(gym, '2026-10-11'), []);
  assert.deepEqual(dayItems(emptyGym(), '2026-10-10'), []);
});

test('begin at noonOf(day): startedAt and date lie on that day, whatever the zone', () => {
  for (const k of ['2026-10-05', '2026-03-29', '2026-10-25', '2026-03-08', '2026-11-01']) {
    const r = begin(emptyGym(), noonOf(k), { name: 'Back' });
    const w = r.state.workouts[0];
    assert.equal(r.ok, true);
    assert.equal(w.date, k);
    assert.equal(w.startedAt, noonOf(k));
    assert.equal(dateKey(new Date(w.startedAt)), k);
  }
});

// A finished workout on a given day, built the way the app builds it: begin, add the exercise, set values, mark done, finish.
const doneWorkout = (gym, nowMs, weight, reps) => {
  const b = begin(gym, nowMs, { name: `w${weight}` });
  let s = addExercise(b.state, b.id, 'bench').state;
  s = editSet(s, b.id, 0, 0, { weight, reps }).state;
  s = toggleDone(s, b.id, 0, 0).state;
  return finishWorkout(s, b.id, nowMs + 3_600_000).state;
};

test('adding a workout to an older day changes neither the Last-time text, the prefill nor the Recent order', () => {
  const today = new Date(2026, 9, 12, 10, 0).getTime();
  const base = doneWorkout(emptyGym(), today, 80, 8);
  const baseId = base.workouts[0].id;
  const before = { last: lastTimeText(base, 'bench'), pre: prefillSets(base, 'bench'), recent: recentWorkouts(base, 5).map(r => r.id) };
  const after = doneWorkout(base, noonOf('2026-10-05'), 50, 5);
  assert.equal(after.workouts.length, 2);
  assert.equal(after.workouts[1].date, '2026-10-05');
  assert.equal(lastTimeText(after, 'bench'), before.last);
  assert.deepEqual(prefillSets(after, 'bench'), before.pre);
  const recent = recentWorkouts(after, 5).map(r => r.id);
  assert.deepEqual(recent, [baseId, after.workouts[1].id]);
  assert.equal(recent[0], before.recent[0]);
});
