import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyGym } from '../src/core/gym.js';
import { openWorkout } from '../src/core/workouts.js';
import { createRoutine } from '../src/core/routines.js';
import {
  MAX_SETS, ROUTINE_NAME_MESSAGE, parseRoutineName, routineIdFromParam, routineHref, withSetCount, moveItem, newItem, startFromRoutine,
} from '../src/views/gymRoutineLogic.js';

// Gym G10 routine screen logic. Expected values by hand.
const T = new Date(2026, 9, 12, 10, 0, 0).getTime();
const set = (reps, weight) => ({ reps, weight });
const bench = { exerciseId: 'bench', sets: [set(8, 80), set(8, 80), set(7, 77.5)] };
const fin = (id, startedAt, items) => ({ id, date: '2026-10-05', startedAt, finishedAt: startedAt + 1, name: '', routineId: null, items });
const row = (reps, weight, extra = {}) => ({ reps, weight, warmup: false, done: true, ...extra });

test('constants: at most 20 sets per routine exercise; name message', () => {
  assert.equal(MAX_SETS, 20);
  assert.equal(ROUTINE_NAME_MESSAGE, 'Name must be 1 to 60 characters.');
});

test('parseRoutineName: trimmed, 1 to 60 characters; blank, 61 and non-strings are null', () => {
  assert.equal(parseRoutineName('  Push day '), 'Push day');
  assert.equal(parseRoutineName('x'.repeat(60)), 'x'.repeat(60));
  assert.equal(parseRoutineName(` ${'x'.repeat(60)} `), 'x'.repeat(60));
  for (const bad of ['', '   ', 'x'.repeat(61), null, undefined, 5]) assert.equal(parseRoutineName(bad), null, String(bad));
});

test('routineHref and routineIdFromParam round-trip any id; a broken escape comes back as it was', () => {
  assert.equal(routineHref('r-1'), '#gym/routine/r-1');
  assert.equal(routineHref('a/b c'), '#gym/routine/a%2Fb%20c');
  assert.equal(routineIdFromParam('a%2Fb%20c'), 'a/b c');
  assert.equal(routineIdFromParam('r-1-2'), 'r-1-2');
  assert.equal(routineIdFromParam('%E0%A4%A'), '%E0%A4%A');
});

test('withSetCount: shrink keeps the first sets; grow repeats the last set; clamps to 1..20; input untouched', () => {
  const before = JSON.stringify(bench);
  assert.deepEqual(withSetCount(bench, 2).sets, [set(8, 80), set(8, 80)]);
  assert.deepEqual(withSetCount(bench, 5).sets, [set(8, 80), set(8, 80), set(7, 77.5), set(7, 77.5), set(7, 77.5)]);
  assert.equal(withSetCount(bench, 3).sets.length, 3);
  assert.equal(withSetCount(bench, 0).sets.length, 1);
  assert.equal(withSetCount(bench, -4).sets.length, 1);
  assert.equal(withSetCount(bench, 99).sets.length, 20);
  assert.equal(withSetCount(bench, 2.7).sets.length, 2);
  assert.equal(withSetCount(bench, 5).exerciseId, 'bench');
  assert.equal(JSON.stringify(bench), before);
  assert.notEqual(withSetCount(bench, 3).sets[0], bench.sets[0]);
});

test('withSetCount: an item with no sets grows from reps 1 weight 0', () => {
  assert.deepEqual(withSetCount({ exerciseId: 'x', sets: [] }, 2).sets, [set(1, 0), set(1, 0)]);
});

test('moveItem: swaps with the neighbour; at either end the order stays', () => {
  const l = ['a', 'b', 'c'];
  assert.deepEqual(moveItem(l, 0, 1), ['b', 'a', 'c']);
  assert.deepEqual(moveItem(l, 2, -1), ['a', 'c', 'b']);
  assert.deepEqual(moveItem(l, 1, -1), ['b', 'a', 'c']);
  assert.deepEqual(moveItem(l, 0, -1), ['a', 'b', 'c']);
  assert.deepEqual(moveItem(l, 2, 1), ['a', 'b', 'c']);
  assert.deepEqual(moveItem(l, 7, 1), ['a', 'b', 'c']);
  assert.deepEqual(l, ['a', 'b', 'c']);
});

test('newItem: sets follow the Prefill rule (last time, warm-ups out, same count); no history = one set of reps 1 weight 0', () => {
  const g = { ...emptyGym(), workouts: [fin('w1', 1, [{ exerciseId: 'bench', sets: [row(10, 40, { warmup: true }), row(8, 80), row(8, 80), row(7, 77.5)] }])] };
  assert.deepEqual(newItem(g, 'bench'), bench);
  assert.deepEqual(newItem(g, 'row'), { exerciseId: 'row', sets: [set(1, 0)] });
  assert.deepEqual(newItem(emptyGym(), 'bench'), { exerciseId: 'bench', sets: [set(1, 0)] });
});

test('newItem: keeps reps and weight only, and never more than 20 sets', () => {
  const many = Array.from({ length: 25 }, () => row(5, 60));
  const g = { ...emptyGym(), workouts: [fin('w1', 1, [{ exerciseId: 'bench', sets: many }])] };
  const it = newItem(g, 'bench');
  assert.equal(it.sets.length, 20);
  assert.deepEqual(Object.keys(it.sets[0]).sort(), ['reps', 'weight']);
});

const gymWith = items => createRoutine(emptyGym(), T - 5, 'Push', items).state;

test('startFromRoutine: blank name = the routine name; open workout with the routine counts, routineId set, nothing done', () => {
  const g = gymWith([bench, { exerciseId: 'row', sets: [set(10, 50)] }]);
  const r = startFromRoutine(g, 'r-' + (T - 5), T, '');
  assert.equal(r.ok, true);
  const w = openWorkout(r.state);
  assert.equal(w.name, 'Push');
  assert.equal(w.routineId, 'r-' + (T - 5));
  assert.deepEqual(w.items.map(i => [i.exerciseId, i.sets.length]), [['bench', 3], ['row', 1]]);
  assert.ok(w.items.every(i => i.sets.every(s => s.done === false && s.warmup === false)));
  assert.equal(w.startedAt, T);
  assert.equal(w.date, '2026-10-12');
});

test('startFromRoutine: a typed name replaces the routine name (trimmed)', () => {
  const g = gymWith([bench]);
  const r = startFromRoutine(g, 'r-' + (T - 5), T, '  Heavy day ');
  assert.equal(openWorkout(r.state).name, 'Heavy day');
  assert.equal(openWorkout(r.state).routineId, 'r-' + (T - 5));
});

test('startFromRoutine: a name over 60 is refused with name-length and nothing changes', () => {
  const g = gymWith([bench]);
  const before = JSON.stringify(g);
  const r = startFromRoutine(g, 'r-' + (T - 5), T, 'x'.repeat(61));
  assert.deepEqual(r, { ok: false, reason: 'name-length' });
  assert.equal(JSON.stringify(g), before);
});

test('startFromRoutine: refusals pass through (workout-open, unknown-routine) and leave the state alone', () => {
  const g = gymWith([bench]);
  const id = 'r-' + (T - 5);
  const open = startFromRoutine(g, id, T, '').state;
  const before = JSON.stringify(open);
  assert.deepEqual(startFromRoutine(open, id, T + 1, ''), { ok: false, reason: 'workout-open' });
  assert.deepEqual(startFromRoutine(g, 'nope', T, ''), { ok: false, reason: 'unknown-routine' });
  for (const bad of ['toString', '__proto__']) assert.deepEqual(startFromRoutine(g, bad, T, ''), { ok: false, reason: 'unknown-routine' }, bad);
  assert.equal(JSON.stringify(open), before);
});
