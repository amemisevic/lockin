import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as W from '../src/core/workouts.js';
import { emptyGym, validateGym } from '../src/core/gym.js';

// Invented sample data only. Expected values are written by hand from the plan (Rules: Finish, One open workout,
// Stale open workout, Prefill) and the owner rulings 7 and 10 in PROGRESS-GYM.md.
const T = (day, h = 10, m = 0) => new Date(2026, 9, day, h, m).getTime(); // local time, Oct 2026
const set = (o = {}) => ({ reps: 8, weight: 80, warmup: false, done: true, ...o });
const item = (sets = [set()], exerciseId = 'bench-press') => ({ exerciseId, sets });
const done = (o = {}) => ({ id: 'w1', date: '2026-10-05', startedAt: T(5), finishedAt: T(5, 11), name: '', routineId: null, items: [item()], ...o });
const open = (o = {}) => done({ id: 'w9', date: '2026-10-12', startedAt: T(12), finishedAt: null, items: [], ...o });
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const gym = (...workouts) => deepFreeze({ ...emptyGym(), workouts });
const no = reason => ({ ok: false, reason });

// A success must carry a state that passes validateGym.
const good = r => { assert.equal(r.ok, true, JSON.stringify(r)); assert.deepEqual(validateGym(r.state), { ok: true }); return r.state; };
// A refusal is { ok: false, reason } and the input is byte-identical afterwards.
const refuse = (g, call, reason) => { const before = JSON.stringify(g); assert.deepEqual(call(g), no(reason)); assert.equal(JSON.stringify(g), before); };

const bench = (...sets) => item(sets);
const sets3 = [set(), set(), set({ reps: 7, weight: 77.5 })]; // last time: 80x8, 80x8, 77.5x7
const row = (reps, weight) => ({ reps, weight, warmup: false, done: false });
const lastTime = (o = {}) => done({ items: [bench(...sets3)], ...o });

// ---------- startWorkout, openWorkout ----------
test('startWorkout makes one open workout dated by the local start time', () => {
  const now = T(12, 9, 30);
  const r = W.startWorkout(gym(), now);
  assert.deepEqual(good(r).workouts, [{ id: `w-${now}`, date: '2026-10-12', startedAt: now, finishedAt: null, name: '', routineId: null, items: [] }]);
  assert.equal(r.id, `w-${now}`);
});

test('the workout date is the local calendar date of the start, not the 04:00 boundary', () => {
  assert.equal(good(W.startWorkout(gym(), T(13, 0, 30))).workouts[0].date, '2026-10-13');
  assert.equal(good(W.startWorkout(gym(), T(12, 23, 59))).workouts[0].date, '2026-10-12');
});

test('startWorkout takes an optional name; a non-string name becomes empty', () => {
  assert.equal(good(W.startWorkout(gym(), T(12), 'Push day')).workouts[0].name, 'Push day');
  assert.equal(good(W.startWorkout(gym(), T(12), 5)).workouts[0].name, '');
  assert.equal(good(W.startWorkout(gym(), T(12), null)).workouts[0].name, '');
});

test('startWorkout keeps earlier workouts and picks a fresh id when the timestamp id is taken', () => {
  const g = gym(done({ id: `w-${T(12)}`, date: '2026-10-05' }));
  const s = good(W.startWorkout(g, T(12)));
  assert.deepEqual(s.workouts.map(w => w.id), [`w-${T(12)}`, `w-${T(12)}-2`]);
});

test('starting while a workout is open is refused with workout-open, state unchanged', () => {
  const s = good(W.startWorkout(gym(), T(12)));
  refuse(deepFreeze(s), g => W.startWorkout(g, T(12, 11)), 'workout-open');
});

test('a finished workout does not block starting a new one', () => {
  assert.equal(good(W.startWorkout(gym(done()), T(12))).workouts.length, 2);
});

test('startWorkout refuses a time that is not a finite number', () => {
  for (const bad of [NaN, Infinity, undefined, null, '1000']) assert.equal(W.startWorkout(gym(), bad).ok, false, String(bad));
});

test('openWorkout returns the open workout or null', () => {
  assert.equal(W.openWorkout(gym(done())), null);
  assert.equal(W.openWorkout(gym(done(), open())).id, 'w9');
});

// ---------- stale open workout ----------
test('an open workout from an earlier date stays open: never auto-finished, still blocks a new start', () => {
  const stale = open({ id: 'w5', date: '2026-10-11', startedAt: T(11, 22) });
  const g = gym(stale);
  assert.equal(W.openWorkout(g).finishedAt, null);
  refuse(g, x => W.startWorkout(x, T(12, 8)), 'workout-open');
  // It can still be edited today, and finishing keeps its own date.
  const withSet = good(W.addExercise(g, 'w5', 'bench-press'));
  const marked = good(W.toggleDone(deepFreeze(withSet), 'w5', 0, 0));
  const fin = good(W.finishWorkout(deepFreeze(marked), 'w5', T(12, 8)));
  assert.equal(fin.workouts[0].date, '2026-10-11');
  assert.equal(fin.workouts[0].finishedAt, T(12, 8));
});

test('a stale open workout can be discarded', () => {
  assert.deepEqual(good(W.discardWorkout(gym(open({ date: '2026-10-11', startedAt: T(11, 22) })), 'w9')).workouts, []);
});

// ---------- addExercise and Prefill ----------
test('Prefill: no history gives one empty set (reps 1, weight 0, not done)', () => {
  const s = good(W.addExercise(gym(open()), 'w9', 'bench-press'));
  assert.deepEqual(s.workouts[0].items, [{ exerciseId: 'bench-press', sets: [row(1, 0)] }]);
});

test('Prefill: added by hand takes last time\'s count and values (80x8, 80x8, 77.5x7), all not done', () => {
  const s = good(W.addExercise(gym(lastTime(), open()), 'w9', 'bench-press'));
  assert.deepEqual(s.workouts[1].items[0].sets, [row(8, 80), row(8, 80), row(7, 77.5)]);
});

test('Prefill example: routine item with 4 sets, last time 80x8, 80x8, 77.5x7 gives 80x8, 80x8, 77.5x7, 77.5x7', () => {
  const tmpl = { exerciseId: 'bench-press', sets: [{ reps: 5, weight: 60 }, { reps: 5, weight: 60 }, { reps: 5, weight: 60 }, { reps: 5, weight: 60 }] };
  assert.deepEqual(W.prefillSets(gym(lastTime()), 'bench-press', tmpl), [row(8, 80), row(8, 80), row(7, 77.5), row(7, 77.5)]);
});

test('Prefill: a routine item with fewer sets than last time cuts to the routine count', () => {
  const tmpl = { exerciseId: 'bench-press', sets: [{ reps: 5, weight: 60 }, { reps: 5, weight: 60 }] };
  assert.deepEqual(W.prefillSets(gym(lastTime()), 'bench-press', tmpl), [row(8, 80), row(8, 80)]);
});

test('Prefill: no history uses the routine\'s template values; a template with no sets counts as none', () => {
  const tmpl = { exerciseId: 'bench-press', sets: [{ reps: 10, weight: 20 }, { reps: 12, weight: 15 }] };
  assert.deepEqual(W.prefillSets(gym(), 'bench-press', tmpl), [row(10, 20), row(12, 15)]);
  assert.deepEqual(W.prefillSets(gym(), 'bench-press', { exerciseId: 'bench-press', sets: [] }), [row(1, 0)]);
  assert.deepEqual(W.prefillSets(gym(), 'bench-press'), [row(1, 0)]);
});

test('Prefill: warm-ups are excluded', () => {
  const w = done({ items: [bench(set({ warmup: true, reps: 10, weight: 40 }), set(), set({ reps: 6, weight: 85 }))] });
  assert.deepEqual(W.prefillSets(gym(w), 'bench-press'), [row(8, 80), row(6, 85)]);
});

test('Prefill: the most recent finished workout by startedAt wins, whatever the array order', () => {
  const newer = done({ id: 'w2', startedAt: T(8), finishedAt: T(8, 11), items: [bench(set({ reps: 5, weight: 90 }))] });
  const older = done({ id: 'w1', startedAt: T(5), finishedAt: T(5, 11), items: [bench(set({ reps: 8, weight: 80 }))] });
  assert.deepEqual(W.prefillSets(gym(newer, older), 'bench-press'), [row(5, 90)]);
  assert.deepEqual(W.prefillSets(gym(older, newer), 'bench-press'), [row(5, 90)]);
});

test('Prefill: open workouts and other exercises never feed it', () => {
  const g = gym(done({ items: [item([set({ reps: 12, weight: 30 })], 'row')] }), open({ items: [bench(set({ reps: 3, weight: 100 }))] }));
  assert.deepEqual(W.prefillSets(g, 'bench-press'), [row(1, 0)]);
  assert.deepEqual(W.prefillSets(g, 'row'), [row(12, 30)]);
});

test('Prefill: a most recent workout whose only sets of that exercise are warm-ups falls back to an older one', () => {
  const newer = done({ id: 'w2', startedAt: T(8), finishedAt: T(8, 11), items: [bench(set({ warmup: true })), item([set()], 'row')] });
  const older = done({ id: 'w1', items: [bench(set({ reps: 6, weight: 70 }))] });
  assert.deepEqual(W.prefillSets(gym(older, newer), 'bench-press'), [row(6, 70)]);
});

test('addExercise appends an item at the end and allows an id the bundled list does not have', () => {
  const g = gym(open({ items: [item([set({ done: false })], 'row')] }));
  const s = good(W.addExercise(g, 'w9', 'gone-from-dataset'));
  assert.deepEqual(s.workouts[0].items.map(i => i.exerciseId), ['row', 'gone-from-dataset']);
});

test('addExercise refuses an empty or non-string exercise id (id) and an unknown workout', () => {
  for (const bad of ['', undefined, null, 5]) refuse(gym(open()), g => W.addExercise(g, 'w9', bad), 'id');
  refuse(gym(open()), g => W.addExercise(g, 'nope', 'bench-press'), 'unknown-workout');
});

test('addExercise on a finished workout works and does not prefill from that workout itself', () => {
  const g = gym(done({ items: [bench(set({ reps: 9, weight: 100 }))] }));
  const s = good(W.addExercise(g, 'w1', 'bench-press'));
  assert.deepEqual(s.workouts[0].items[1].sets, [row(1, 0)]);
});

// ---------- addSet, removeSet ----------
test('addSet appends a set with reps 1, weight 0, not warm-up, not done (ruling 10)', () => {
  const s = good(W.addSet(gym(open({ items: [bench(set({ done: false }))] })), 'w9', 0));
  assert.deepEqual(s.workouts[0].items[0].sets, [set({ done: false }), { reps: 1, weight: 0, warmup: false, done: false }]);
});

test('addSet works on a finished workout and keeps it valid', () => {
  assert.equal(good(W.addSet(gym(done()), 'w1', 0)).workouts[0].items[0].sets.length, 2);
});

test('removeSet in an OPEN workout: any set, even the last one (ruling 10); the exercise stays, with no sets', () => {
  const g = gym(open({ items: [bench(set({ done: false }), set({ reps: 5, done: false }))] }));
  const one = good(W.removeSet(g, 'w9', 0, 0));
  assert.deepEqual(one.workouts[0].items[0].sets, [set({ reps: 5, done: false })]);
  const none = good(W.removeSet(deepFreeze(one), 'w9', 0, 0));
  assert.deepEqual(none.workouts[0].items, [{ exerciseId: 'bench-press', sets: [] }]);
});

test('removeSet in an open workout may remove a done working set', () => {
  assert.deepEqual(good(W.removeSet(gym(open({ items: [bench(set())] })), 'w9', 0, 0)).workouts[0].items[0].sets, []);
});

test('removeSet in a FINISHED workout: the last done working set is refused with no-sets, state unchanged (ruling 7)', () => {
  const g = gym(done({ items: [bench(set(), set({ done: false }), set({ warmup: true }))] }));
  refuse(g, x => W.removeSet(x, 'w1', 0, 0), 'no-sets');
});

test('removeSet in a finished workout: sets that are not the last working set can go', () => {
  const g = gym(done({ items: [bench(set(), set({ done: false }), set({ warmup: true }))] }));
  assert.equal(good(W.removeSet(g, 'w1', 0, 1)).workouts[0].items[0].sets.length, 2);
  assert.equal(good(W.removeSet(g, 'w1', 0, 2)).workouts[0].items[0].sets.length, 2);
  const two = gym(done({ items: [bench(set(), set({ reps: 5 }))] }));
  assert.deepEqual(good(W.removeSet(two, 'w1', 0, 0)).workouts[0].items[0].sets, [set({ reps: 5 })]);
});

test('removeSet in a finished workout: a working set in another exercise keeps the workout valid', () => {
  const g = gym(done({ items: [bench(set()), item([set({ reps: 5 })], 'row')] }));
  assert.deepEqual(good(W.removeSet(g, 'w1', 0, 0)).workouts[0].items[0].sets, []);
});

test('item and set indexes must be integers in range, else bad-index', () => {
  const g = gym(open({ items: [bench(set({ done: false }))] }));
  for (const bad of [1, -1, 0.5, '0', '__proto__', 'length', undefined, null, NaN]) {
    refuse(g, x => W.addSet(x, 'w9', bad), 'bad-index');
    refuse(g, x => W.removeSet(x, 'w9', bad, 0), 'bad-index');
    refuse(g, x => W.removeSet(x, 'w9', 0, bad), 'bad-index');
    refuse(g, x => W.editSet(x, 'w9', 0, bad, { reps: 5 }), 'bad-index');
    refuse(g, x => W.toggleDone(x, 'w9', bad, 0), 'bad-index');
    refuse(g, x => W.toggleWarmup(x, 'w9', 0, bad), 'bad-index');
  }
});

// ---------- editSet ----------
test('editSet changes reps and weight, one or both; other fields stay', () => {
  const g = gym(open({ items: [bench(set({ done: false }))] }));
  assert.deepEqual(good(W.editSet(g, 'w9', 0, 0, { reps: 10 })).workouts[0].items[0].sets[0], set({ reps: 10, done: false }));
  assert.deepEqual(good(W.editSet(g, 'w9', 0, 0, { weight: 82.5 })).workouts[0].items[0].sets[0], set({ weight: 82.5, done: false }));
  assert.deepEqual(good(W.editSet(g, 'w9', 0, 0, { reps: 3, weight: 0 })).workouts[0].items[0].sets[0], set({ reps: 3, weight: 0, done: false }));
});

test('editSet: one 2.5 kg step from 77.5 is exactly 80', () => {
  const g = gym(open({ items: [bench(set({ weight: 77.5, done: false }))] }));
  assert.equal(good(W.editSet(g, 'w9', 0, 0, { weight: 77.5 + 2.5 })).workouts[0].items[0].sets[0].weight, 80);
});

test('editSet ignores keys other than reps and weight', () => {
  const g = gym(open({ items: [bench(set({ done: false }))] }));
  const s = good(W.editSet(g, 'w9', 0, 0, { reps: 5, done: true, warmup: true, extra: 1 }));
  assert.deepEqual(s.workouts[0].items[0].sets[0], set({ reps: 5, done: false }));
});

test('editSet refuses values the validate rules refuse, with their codes', () => {
  const g = gym(open({ items: [bench(set({ done: false }))] }));
  for (const reps of [0, 1000, 1.5, -1, NaN, '5', null, undefined]) refuse(g, x => W.editSet(x, 'w9', 0, 0, { reps }), 'reps');
  for (const weight of [-1, 1001, NaN, Infinity, '80', null, undefined]) refuse(g, x => W.editSet(x, 'w9', 0, 0, { weight }), 'weight');
  assert.equal(good(W.editSet(g, 'w9', 0, 0, { reps: 999, weight: 1000 })).workouts[0].items[0].sets[0].reps, 999);
  assert.equal(good(W.editSet(g, 'w9', 0, 0, { reps: 1, weight: 0 })).workouts[0].items[0].sets[0].weight, 0);
});

test('editSet refuses a patch that is not an object', () => {
  const g = gym(open({ items: [bench(set({ done: false }))] }));
  for (const p of [null, undefined, 5, 'reps']) refuse(g, x => W.editSet(x, 'w9', 0, 0, p), 'shape');
});

// ---------- toggleDone, toggleWarmup ----------
test('toggleDone flips done both ways', () => {
  const g = gym(open({ items: [bench(set({ done: false }))] }));
  const on = good(W.toggleDone(g, 'w9', 0, 0));
  assert.equal(on.workouts[0].items[0].sets[0].done, true);
  assert.equal(good(W.toggleDone(deepFreeze(on), 'w9', 0, 0)).workouts[0].items[0].sets[0].done, false);
});

test('toggleWarmup flips warmup both ways', () => {
  const g = gym(open({ items: [bench(set({ done: false }))] }));
  const on = good(W.toggleWarmup(g, 'w9', 0, 0));
  assert.equal(on.workouts[0].items[0].sets[0].warmup, true);
  assert.equal(good(W.toggleWarmup(deepFreeze(on), 'w9', 0, 0)).workouts[0].items[0].sets[0].warmup, false);
});

test('in a finished workout, un-doing or warming up its last done working set is refused with no-sets', () => {
  const g = gym(done({ items: [bench(set(), set({ done: false }))] }));
  refuse(g, x => W.toggleDone(x, 'w1', 0, 0), 'no-sets');
  refuse(g, x => W.toggleWarmup(x, 'w1', 0, 0), 'no-sets');
  // Ticking the other set first makes it fine.
  const both = good(W.toggleDone(g, 'w1', 0, 1));
  assert.equal(good(W.toggleDone(deepFreeze(both), 'w1', 0, 0)).workouts[0].items[0].sets[0].done, false);
});

// ---------- finishWorkout ----------
test('finish needs one done, non-warm-up set: only a done warm-up set is refused with no-sets', () => {
  const g = gym(open({ items: [bench(set({ warmup: true }))] }));
  refuse(g, x => W.finishWorkout(x, 'w9', T(12, 11)), 'no-sets');
});

test('finish is refused with no sets at all, or only sets not done', () => {
  refuse(gym(open()), x => W.finishWorkout(x, 'w9', T(12, 11)), 'no-sets');
  refuse(gym(open({ items: [bench(set({ done: false }))] })), x => W.finishWorkout(x, 'w9', T(12, 11)), 'no-sets');
});

test('finish with one done working set sets finishedAt and keeps everything else', () => {
  const g = gym(open({ items: [bench(set({ warmup: true }), set(), set({ done: false }))] }));
  const w = good(W.finishWorkout(g, 'w9', T(12, 11, 15))).workouts[0];
  assert.equal(w.finishedAt, T(12, 11, 15));
  assert.deepEqual(w.items, g.workouts[0].items);
  assert.equal(w.startedAt, T(12));
});

test('finish frees the one-open rule', () => {
  const fin = good(W.finishWorkout(gym(open({ items: [bench(set())] })), 'w9', T(12, 11)));
  assert.equal(good(W.startWorkout(deepFreeze(fin), T(13))).workouts.length, 2);
});

test('finishing an already finished workout is refused with already-finished', () => {
  refuse(gym(done()), x => W.finishWorkout(x, 'w1', T(13)), 'already-finished');
});

test('finish never produces finishedAt before startedAt (a clock set back clamps)', () => {
  const g = gym(open({ items: [bench(set())] }));
  assert.equal(good(W.finishWorkout(g, 'w9', T(11))).workouts[0].finishedAt, T(12));
});

// ---------- discardWorkout ----------
test('discard removes an open workout whatever it holds', () => {
  assert.deepEqual(good(W.discardWorkout(gym(open()), 'w9')).workouts, []);
  const g = gym(done(), open({ items: [bench(set(), set({ warmup: true }))] }));
  assert.deepEqual(good(W.discardWorkout(g, 'w9')).workouts.map(w => w.id), ['w1']);
});

test('discard does not touch a finished workout (not-open) and refuses an unknown id', () => {
  refuse(gym(done()), x => W.discardWorkout(x, 'w1'), 'not-open');
  refuse(gym(done()), x => W.discardWorkout(x, 'nope'), 'unknown-workout');
});

// ---------- editWorkout (finished: date change allowed, ruling 7) ----------
test('a finished workout can change its date and name', () => {
  const g = gym(done());
  const w = good(W.editWorkout(g, 'w1', { date: '2026-10-09', name: 'Leg day' })).workouts[0];
  assert.equal(w.date, '2026-10-09');
  assert.equal(w.name, 'Leg day');
  assert.equal(w.startedAt, T(5));
  assert.equal(w.finishedAt, T(5, 11));
  assert.equal(good(W.editWorkout(g, 'w1', { date: '2026-10-09' })).workouts[0].name, '');
});

test('editWorkout refuses an impossible date or a non-string name, and ignores other keys', () => {
  const g = gym(done());
  for (const date of ['2026-02-30', '2026-10-9', '', null, undefined, 20261009]) refuse(g, x => W.editWorkout(x, 'w1', { date }), 'date');
  for (const name of [null, undefined, 5]) refuse(g, x => W.editWorkout(x, 'w1', { name }), 'shape');
  const w = good(W.editWorkout(g, 'w1', { startedAt: 1, finishedAt: null, id: 'zzz', name: 'ok' })).workouts[0];
  assert.deepEqual([w.id, w.startedAt, w.finishedAt, w.name], ['w1', T(5), T(5, 11), 'ok']);
  for (const p of [null, undefined, 5]) refuse(g, x => W.editWorkout(x, 'w1', p), 'shape');
});

// ---------- deleteWorkout ----------
test('delete removes a finished workout and keeps the others in order', () => {
  const g = gym(done({ id: 'a' }), done({ id: 'b' }), done({ id: 'c' }));
  assert.deepEqual(good(W.deleteWorkout(g, 'b')).workouts.map(w => w.id), ['a', 'c']);
});

test('delete refuses an open workout (not-finished) and an unknown id', () => {
  refuse(gym(open()), x => W.deleteWorkout(x, 'w9'), 'not-finished');
  refuse(gym(done()), x => W.deleteWorkout(x, 'nope'), 'unknown-workout');
});

// ---------- inherited-key ids, purity ----------
test('toString and __proto__ as workout ids are unknown, never found, never thrown', () => {
  const g = gym(done(), open({ items: [bench(set({ done: false }))] }));
  for (const id of ['toString', '__proto__', 'constructor', 'hasOwnProperty']) {
    refuse(g, x => W.addExercise(x, id, 'bench-press'), 'unknown-workout');
    refuse(g, x => W.addSet(x, id, 0), 'unknown-workout');
    refuse(g, x => W.removeSet(x, id, 0, 0), 'unknown-workout');
    refuse(g, x => W.editSet(x, id, 0, 0, { reps: 3 }), 'unknown-workout');
    refuse(g, x => W.toggleDone(x, id, 0, 0), 'unknown-workout');
    refuse(g, x => W.toggleWarmup(x, id, 0, 0), 'unknown-workout');
    refuse(g, x => W.finishWorkout(x, id, T(12, 11)), 'unknown-workout');
    refuse(g, x => W.discardWorkout(x, id), 'unknown-workout');
    refuse(g, x => W.editWorkout(x, id, { name: 'x' }), 'unknown-workout');
    refuse(g, x => W.deleteWorkout(x, id), 'unknown-workout');
  }
});

test('toString and __proto__ as exercise ids are plain ids: stored, prefilled from history, no prototype leak', () => {
  for (const id of ['toString', '__proto__']) {
    const hist = done({ items: [item([set({ reps: 6, weight: 50 })], id)] });
    assert.deepEqual(W.prefillSets(gym(hist), id), [row(6, 50)]);
    assert.deepEqual(W.prefillSets(gym(hist), 'bench-press'), [row(1, 0)]);
    const s = good(W.addExercise(gym(hist, open()), 'w9', id));
    assert.deepEqual(s.workouts[1].items, [{ exerciseId: id, sets: [row(6, 50)] }]);
    assert.equal({}.exerciseId, undefined);
  }
});

test('a whole session stays valid at every step: start, add, tick, finish, change date, delete', () => {
  let g = deepFreeze(good(W.startWorkout(gym(lastTime()), T(12, 18), 'Push')));
  const step = r => { g = deepFreeze(good(r)); };
  step(W.addExercise(g, W.openWorkout(g).id, 'bench-press'));
  const id = W.openWorkout(g).id;
  step(W.toggleDone(g, id, 0, 0));
  step(W.addSet(g, id, 0));
  step(W.editSet(g, id, 0, 3, { reps: 5, weight: 60 }));
  step(W.finishWorkout(g, id, T(12, 19)));
  step(W.editWorkout(g, id, { date: '2026-10-11' }));
  assert.equal(g.workouts.find(w => w.id === id).items[0].sets.length, 4);
  step(W.deleteWorkout(g, id));
  assert.deepEqual(g.workouts.map(w => w.id), ['w1']);
});

test('workouts.js is pure: no DOM, no storage global, no forbidden date APIs', () => {
  const src = readFileSync(new URL('../src/core/workouts.js', import.meta.url), 'utf8');
  assert.ok(!/\b(document|window|localStorage|location|navigator)\b/.test(src));
  assert.ok(!/toISOString|getUTC|Date\.parse|new Date\(\s*['"`]|Date\.now|Math\.random/.test(src));
});

// ---------- removeExercise (ruling 12) ----------
test('removeExercise in an OPEN workout: any exercise, even one with done sets or the only one; others keep their order', () => {
  const g = gym(open({ items: [bench(set()), item([set({ done: false })], 'row'), item([set()], 'squat')] }));
  const s = good(W.removeExercise(g, 'w9', 1));
  assert.deepEqual(s.workouts[0].items.map(i => i.exerciseId), ['bench-press', 'squat']);
  const first = good(W.removeExercise(deepFreeze(s), 'w9', 0));
  assert.deepEqual(good(W.removeExercise(deepFreeze(first), 'w9', 0)).workouts[0].items, []);
});

test('removeExercise in an open workout removes an exercise left with no sets', () => {
  const g = gym(open({ items: [{ exerciseId: 'bench-press', sets: [] }] }));
  assert.deepEqual(good(W.removeExercise(g, 'w9', 0)).workouts[0].items, []);
});

test('removeExercise touches only its workout', () => {
  const g = gym(done(), open({ items: [bench(set({ done: false }))] }));
  const s = good(W.removeExercise(g, 'w9', 0));
  assert.deepEqual(s.workouts[0], g.workouts[0]);
  assert.deepEqual(s.workouts[1].items, []);
});

test('removeExercise in a FINISHED workout: refused with no-sets if it leaves no done working set, state unchanged', () => {
  refuse(gym(done()), x => W.removeExercise(x, 'w1', 0), 'no-sets');
  // Other exercise has only a warm-up and an undone set: still no done working set left.
  const g = gym(done({ items: [bench(set()), item([set({ warmup: true }), set({ done: false })], 'row')] }));
  refuse(g, x => W.removeExercise(x, 'w1', 0), 'no-sets');
});

test('removeExercise in a finished workout is fine when another exercise keeps a done working set', () => {
  const g = gym(done({ items: [bench(set()), item([set({ reps: 5 })], 'row')] }));
  assert.deepEqual(good(W.removeExercise(g, 'w1', 0)).workouts[0].items, [item([set({ reps: 5 })], 'row')]);
});

test('removeExercise in a finished workout: an exercise with no done working set can always go', () => {
  const g = gym(done({ items: [bench(set()), item([set({ warmup: true }), set({ done: false })], 'row')] }));
  assert.deepEqual(good(W.removeExercise(g, 'w1', 1)).workouts[0].items, [bench(set())]);
});

test('removeExercise: item index must be an integer in range (bad-index); workout id must exist (unknown-workout)', () => {
  const g = gym(open({ items: [bench(set({ done: false }))] }));
  for (const bad of [1, -1, 0.5, '0', '__proto__', 'length', undefined, null, NaN]) refuse(g, x => W.removeExercise(x, 'w9', bad), 'bad-index');
  for (const id of ['nope', 'toString', '__proto__', 'constructor']) refuse(g, x => W.removeExercise(x, id, 0), 'unknown-workout');
});
