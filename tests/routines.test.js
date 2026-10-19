import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../src/core/routines.js';
import { emptyGym, validateGym } from '../src/core/gym.js';

// Invented sample data only. Expected values are written by hand from the plan (Rules: Save as routine, Prefill,
// Repeat last workout, One open workout) and the owner rulings 10 and 14 in PROGRESS-GYM.md.
const T = (day, h = 10, m = 0) => new Date(2026, 9, day, h, m).getTime(); // local time, Oct 2026
const set = (o = {}) => ({ reps: 8, weight: 80, warmup: false, done: true, ...o });
const item = (sets = [set()], exerciseId = 'bench-press') => ({ exerciseId, sets });
const done = (o = {}) => ({ id: 'w1', date: '2026-10-05', startedAt: T(5), finishedAt: T(5, 11), name: '', routineId: null, items: [item()], ...o });
const open = (o = {}) => done({ id: 'w9', date: '2026-10-12', startedAt: T(12), finishedAt: null, items: [], ...o });
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const gym = (...workouts) => deepFreeze({ ...emptyGym(), workouts });
const gymR = (routines, ...workouts) => deepFreeze({ ...emptyGym(), routines, workouts });
const no = reason => ({ ok: false, reason });

// A success must carry a state that passes validateGym.
const good = r => { assert.equal(r.ok, true, JSON.stringify(r)); assert.deepEqual(validateGym(r.state), { ok: true }); return r.state; };
// A refusal is { ok: false, reason } and the input is byte-identical afterwards.
const refuse = (g, call, reason) => { const before = JSON.stringify(g); assert.deepEqual(call(g), no(reason)); assert.equal(JSON.stringify(g), before); };

const row = (reps, weight) => ({ reps, weight, warmup: false, done: false });
const tpl = (reps, weight) => ({ reps, weight });
const routine = (o = {}) => ({ id: 'r1', name: 'Push', createdAt: T(1), items: [{ exerciseId: 'bench-press', sets: [tpl(8, 80), tpl(8, 80)] }], ...o });
const sets3 = [set(), set(), set({ reps: 7, weight: 77.5 })]; // last time: 80x8, 80x8, 77.5x7
const lastTime = (o = {}) => done({ items: [item(sets3)], ...o });

// ---------- saveRoutineFromWorkout ----------
// Hand-written: bench 4 working sets (+1 warm-up), row 3, curl 3 (+1 warm-up) = 4 + 3 + 3.
const session = () => done({
  id: 'w3', name: 'Upper', items: [
    item([set({ warmup: true, reps: 10, weight: 40 }), set(), set(), set({ reps: 7, weight: 77.5 }), set({ reps: 6, weight: 75 })]),
    item([set({ reps: 10, weight: 60 }), set({ reps: 10, weight: 60 }), set({ reps: 9, weight: 60 })], 'barbell-row'),
    item([set({ warmup: true, reps: 12, weight: 10 }), set({ reps: 12, weight: 20 }), set({ reps: 10, weight: 20 }), set({ reps: 8, weight: 20 })], 'curl'),
  ],
});

test('saveRoutineFromWorkout: order, working-set counts 4 + 3 + 3, template reps and weight, warm-ups dropped', () => {
  const now = T(13, 9);
  const r = R.saveRoutineFromWorkout(gym(session()), 'w3', now, 'Upper A');
  assert.deepEqual(good(r).routines, [{
    id: `r-${now}`, name: 'Upper A', createdAt: now, items: [
      { exerciseId: 'bench-press', sets: [tpl(8, 80), tpl(8, 80), tpl(7, 77.5), tpl(6, 75)] },
      { exerciseId: 'barbell-row', sets: [tpl(10, 60), tpl(10, 60), tpl(9, 60)] },
      { exerciseId: 'curl', sets: [tpl(12, 20), tpl(10, 20), tpl(8, 20)] },
    ],
  }]);
  assert.equal(r.id, `r-${now}`);
});

test('saveRoutineFromWorkout keeps the workout, adds after existing routines, and counts undone working sets too (ruling 14)', () => {
  const w = done({ id: 'w3', items: [item([set(), set({ done: false, reps: 5, weight: 60 })])] });
  const g = gymR([routine()], w);
  const s = good(R.saveRoutineFromWorkout(g, 'w3', T(13), 'B'));
  assert.deepEqual(s.workouts, g.workouts);
  assert.deepEqual(s.routines.map(r => r.id), ['r1', `r-${T(13)}`]);
  assert.deepEqual(s.routines[1].items, [{ exerciseId: 'bench-press', sets: [tpl(8, 80), tpl(5, 60)] }]);
});

test('saveRoutineFromWorkout skips an exercise whose sets were all warm-ups', () => {
  const w = done({ items: [item([set({ warmup: true }), set({ warmup: true })], 'curl'), item()] });
  assert.deepEqual(good(R.saveRoutineFromWorkout(gym(w), 'w1', T(13), 'X')).routines[0].items, [{ exerciseId: 'bench-press', sets: [tpl(8, 80)] }]);
});

test('saveRoutineFromWorkout refusals: unknown workout, open workout, bad name; state unchanged', () => {
  const g = gym(session(), open({ items: [item([set({ done: false })])] }));
  refuse(g, x => R.saveRoutineFromWorkout(x, 'nope', T(13), 'A'), 'unknown-workout');
  refuse(g, x => R.saveRoutineFromWorkout(x, 'w9', T(13), 'A'), 'not-finished');
  for (const bad of ['', '   ', 'x'.repeat(61), undefined, null, 5, {}]) refuse(g, x => R.saveRoutineFromWorkout(x, 'w3', T(13), bad), 'name-length');
});

test('saveRoutineFromWorkout: a taken timestamp id gets -2, -3 …; a non-finite time is refused', () => {
  const g = gymR([routine({ id: `r-${T(13)}` }), routine({ id: `r-${T(13)}-2` })], session());
  assert.equal(R.saveRoutineFromWorkout(g, 'w3', T(13), 'A').id, `r-${T(13)}-3`);
  for (const bad of [NaN, Infinity, undefined, null, '1000']) assert.equal(R.saveRoutineFromWorkout(gym(session()), 'w3', bad, 'A').ok, false, String(bad));
});

// ---------- createRoutine ----------
test('createRoutine: trimmed name, id r-<nowMs>, createdAt, no items by default', () => {
  const r = R.createRoutine(gym(), T(13), '  Legs  ');
  assert.deepEqual(good(r).routines, [{ id: `r-${T(13)}`, name: 'Legs', createdAt: T(13), items: [] }]);
  assert.equal(r.id, `r-${T(13)}`);
});

test('createRoutine name rules: 1 to 60 characters after trim; duplicates are allowed', () => {
  assert.equal(good(R.createRoutine(gym(), T(13), 'x'.repeat(60))).routines[0].name.length, 60);
  assert.equal(good(R.createRoutine(gym(), T(13), ` ${'x'.repeat(60)} `)).routines[0].name.length, 60);
  for (const bad of ['', ' \t ', 'x'.repeat(61), undefined, null, 7, ['a']]) refuse(gym(), x => R.createRoutine(x, T(13), bad), 'name-length');
  const s = good(R.createRoutine(gymR([routine({ name: 'Push' })]), T(13), 'push'));
  assert.deepEqual(s.routines.map(r => r.name), ['Push', 'push']);
});

test('createRoutine keeps items in order and strips everything but exerciseId and { reps, weight }', () => {
  const items = [
    { exerciseId: 'curl', sets: [{ reps: 12, weight: 20, warmup: true, done: true, note: 'x' }], extra: 1 },
    { exerciseId: 'bench-press', sets: [tpl(5, 0), tpl(5, 0)] },
  ];
  assert.deepEqual(good(R.createRoutine(gym(), T(13), 'A', deepFreeze(items))).routines[0].items, [
    { exerciseId: 'curl', sets: [tpl(12, 20)] },
    { exerciseId: 'bench-press', sets: [tpl(5, 0), tpl(5, 0)] },
  ]);
});

test('createRoutine refuses bad items with the validateGym code, and an item with no sets with set-count', () => {
  const mk = items => g => R.createRoutine(g, T(13), 'A', items);
  const one = sets => [{ exerciseId: 'curl', sets }];
  refuse(gym(), mk(one([tpl(0, 20)])), 'reps');
  refuse(gym(), mk(one([tpl(1000, 20)])), 'reps');
  refuse(gym(), mk(one([tpl(1.5, 20)])), 'reps');
  refuse(gym(), mk(one([tpl(5, -1)])), 'weight');
  refuse(gym(), mk(one([tpl(5, 1001)])), 'weight');
  refuse(gym(), mk(one([tpl(5, NaN)])), 'weight');
  refuse(gym(), mk(one([{ reps: 5 }])), 'weight');
  refuse(gym(), mk(one([])), 'set-count');
  refuse(gym(), mk(one('abc')), 'shape');
  refuse(gym(), mk(one([null])), 'shape');
  refuse(gym(), mk([{ sets: [tpl(5, 1)] }]), 'id');
  refuse(gym(), mk([{ exerciseId: '', sets: [tpl(5, 1)] }]), 'id');
  refuse(gym(), mk([null]), 'shape');
  refuse(gym(), mk('abc'), 'shape');
  refuse(gym(), mk(null), 'shape');
});

test('createRoutine: a taken id gets -2; a non-finite time is refused', () => {
  const g = gymR([routine({ id: `r-${T(13)}` })]);
  assert.deepEqual(good(R.createRoutine(g, T(13), 'B')).routines.map(r => r.id), [`r-${T(13)}`, `r-${T(13)}-2`]);
  for (const bad of [NaN, Infinity, undefined, null, '1000']) assert.equal(R.createRoutine(gym(), bad, 'A').ok, false, String(bad));
});

// ---------- editRoutine ----------
const full = () => routine({
  items: [
    { exerciseId: 'bench-press', sets: [tpl(8, 80), tpl(8, 80), tpl(7, 77.5)] },
    { exerciseId: 'barbell-row', sets: [tpl(10, 60)] },
    { exerciseId: 'curl', sets: [tpl(12, 20), tpl(10, 20)] },
  ],
});
const edit = (patch, g = gymR([full()])) => good(R.editRoutine(g, 'r1', patch)).routines[0];

test('editRoutine renames (trimmed) and keeps id, createdAt and items', () => {
  const r = edit({ name: '  Pull  ' });
  assert.deepEqual(r, { ...full(), name: 'Pull' });
});

test('editRoutine reorders items', () => {
  const f = full();
  const r = edit({ items: [f.items[2], f.items[0], f.items[1]] });
  assert.deepEqual(r.items.map(i => i.exerciseId), ['curl', 'bench-press', 'barbell-row']);
  assert.deepEqual(r.items[1].sets, [tpl(8, 80), tpl(8, 80), tpl(7, 77.5)]);
});

test('editRoutine changes set counts both ways', () => {
  const f = full();
  const r = edit({ items: [{ ...f.items[0], sets: f.items[0].sets.slice(0, 1) }, { ...f.items[1], sets: [tpl(10, 60), tpl(10, 60), tpl(10, 62.5), tpl(8, 65)] }, f.items[2]] });
  assert.deepEqual(r.items.map(i => i.sets.length), [1, 4, 2]);
  assert.deepEqual(r.items[1].sets[3], tpl(8, 65));
});

test('editRoutine adds and removes items, down to none', () => {
  const f = full();
  assert.deepEqual(edit({ items: [...f.items, { exerciseId: 'squat', sets: [tpl(5, 100)] }] }).items.map(i => i.exerciseId), ['bench-press', 'barbell-row', 'curl', 'squat']);
  assert.deepEqual(edit({ items: [f.items[0], f.items[2]] }).items.map(i => i.exerciseId), ['bench-press', 'curl']);
  assert.deepEqual(edit({ items: [] }).items, []);
});

test('editRoutine takes name and items together; other keys (id, createdAt, extras) in the patch are ignored', () => {
  const r = edit({ id: 'zzz', createdAt: 5, extra: 1, name: 'Z', items: [{ exerciseId: 'squat', sets: [tpl(5, 100)] }] });
  assert.deepEqual(r, { id: 'r1', name: 'Z', createdAt: T(1), items: [{ exerciseId: 'squat', sets: [tpl(5, 100)] }] });
  assert.deepEqual(edit({}), full());
});

test('editRoutine strips item extras like createRoutine and touches only the named routine and no workout', () => {
  const g = gymR([routine({ id: 'r0', name: 'Other' }), full()], lastTime());
  const s = good(R.editRoutine(g, 'r1', { items: [{ exerciseId: 'curl', sets: [{ reps: 5, weight: 10, done: true }] }] }));
  assert.deepEqual(s.routines[0], g.routines[0]);
  assert.deepEqual(s.routines[1].items, [{ exerciseId: 'curl', sets: [tpl(5, 10)] }]);
  assert.deepEqual(s.workouts, g.workouts);
});

test('editRoutine refusals: unknown routine, bad patch, bad name, bad items; state unchanged', () => {
  const g = gymR([full()]);
  refuse(g, x => R.editRoutine(x, 'nope', { name: 'A' }), 'unknown-routine');
  for (const bad of [null, undefined, 'abc', 5]) refuse(g, x => R.editRoutine(x, 'r1', bad), 'shape');
  for (const bad of ['', '  ', 'x'.repeat(61), undefined, null, 3]) refuse(g, x => R.editRoutine(x, 'r1', { name: bad }), 'name-length');
  refuse(g, x => R.editRoutine(x, 'r1', { items: undefined }), 'shape');
  refuse(g, x => R.editRoutine(x, 'r1', { items: [{ exerciseId: 'curl', sets: [] }] }), 'set-count');
  refuse(g, x => R.editRoutine(x, 'r1', { items: [{ exerciseId: 'curl', sets: [tpl(0, 5)] }] }), 'reps');
  refuse(g, x => R.editRoutine(x, 'r1', { items: [{ exerciseId: 'curl', sets: [tpl(5, 2000)] }] }), 'weight');
  refuse(g, x => R.editRoutine(x, 'r1', { items: [{ sets: [tpl(5, 5)] }] }), 'id');
});

// ---------- deleteRoutine ----------
test('deleteRoutine removes only that routine; workouts are untouched and keep a dangling routineId', () => {
  const w = done({ id: 'w2', routineId: 'r1', startedAt: T(8), finishedAt: T(8, 11), date: '2026-10-08' });
  const g = gymR([routine(), routine({ id: 'r2', name: 'Pull' })], lastTime(), w);
  const s = good(R.deleteRoutine(g, 'r1'));
  assert.deepEqual(s.routines.map(r => r.id), ['r2']);
  assert.deepEqual(s.workouts, g.workouts);
  assert.equal(s.workouts[1].routineId, 'r1');
  assert.deepEqual(good(R.deleteRoutine(deepFreeze(s), 'r2')).routines, []);
});

test('deleteRoutine refuses an unknown id; an open workout started from it is untouched', () => {
  refuse(gymR([routine()]), g => R.deleteRoutine(g, 'nope'), 'unknown-routine');
  const g = gymR([routine()], open({ routineId: 'r1' }));
  assert.equal(good(R.deleteRoutine(g, 'r1')).workouts[0].routineId, 'r1');
});

// ---------- startRoutine ----------
test('startRoutine: Prefill example. Bench 4 sets, last time 80x8, 80x8, 77.5x7 gives 80x8, 80x8, 77.5x7, 77.5x7, not done', () => {
  const r = routine({ items: [{ exerciseId: 'bench-press', sets: [tpl(5, 60), tpl(5, 60), tpl(5, 60), tpl(5, 60)] }] });
  const now = T(12, 18);
  const res = R.startRoutine(gymR([r], lastTime()), 'r1', now);
  const s = good(res);
  assert.equal(res.id, `w-${now}`);
  assert.deepEqual(s.workouts[1], {
    id: `w-${now}`, date: '2026-10-12', startedAt: now, finishedAt: null, name: 'Push', routineId: 'r1',
    items: [{ exerciseId: 'bench-press', sets: [row(8, 80), row(8, 80), row(7, 77.5), row(7, 77.5)] }],
  });
  assert.deepEqual(s.routines, [r]);
});

test('startRoutine: no history uses the routine\'s template values, in routine order, nothing done', () => {
  const r = routine({ items: [{ exerciseId: 'curl', sets: [tpl(12, 20), tpl(10, 22.5)] }, { exerciseId: 'bench-press', sets: [tpl(5, 60)] }] });
  const s = good(R.startRoutine(gymR([r]), 'r1', T(12)));
  assert.deepEqual(s.workouts[0].items, [
    { exerciseId: 'curl', sets: [row(12, 20), row(10, 22.5)] },
    { exerciseId: 'bench-press', sets: [row(5, 60)] },
  ]);
});

test('startRoutine: each exercise prefills from its own latest finished workout, warm-ups excluded, even from another routine', () => {
  const older = done({ id: 'w1', routineId: 'rX', items: [item([set({ warmup: true, reps: 10, weight: 40 }), set({ reps: 6, weight: 70 })], 'curl')] });
  const newer = done({ id: 'w2', startedAt: T(8), finishedAt: T(8, 11), date: '2026-10-08', items: [item([set({ reps: 5, weight: 85 })])] });
  const r = routine({ items: [{ exerciseId: 'bench-press', sets: [tpl(3, 50)] }, { exerciseId: 'curl', sets: [tpl(3, 5), tpl(3, 5)] }] });
  const s = good(R.startRoutine(gymR([r], older, newer), 'r1', T(12)));
  assert.deepEqual(s.workouts[2].items, [
    { exerciseId: 'bench-press', sets: [row(5, 85)] },
    { exerciseId: 'curl', sets: [row(6, 70), row(6, 70)] },
  ]);
});

test('startRoutine with no items opens an empty workout linked to the routine', () => {
  const s = good(R.startRoutine(gymR([routine({ items: [] })]), 'r1', T(12)));
  assert.deepEqual(s.workouts[0].items, []);
  assert.equal(s.workouts[0].routineId, 'r1');
});

test('startRoutine while a workout is open is refused with workout-open, state unchanged', () => {
  refuse(gymR([routine()], open()), g => R.startRoutine(g, 'r1', T(12, 11)), 'workout-open');
});

test('startRoutine: unknown routine and a non-finite time are refused; a finished workout does not block', () => {
  refuse(gymR([routine()]), g => R.startRoutine(g, 'nope', T(12)), 'unknown-routine');
  for (const bad of [NaN, Infinity, undefined, null, '1000']) assert.equal(R.startRoutine(gymR([routine()]), 'r1', bad).ok, false, String(bad));
  assert.equal(good(R.startRoutine(gymR([routine()], done()), 'r1', T(12))).workouts.length, 2);
});

// ---------- repeatLastWorkout ----------
test('repeatLastWorkout: same exercises as the latest finished workout (bench, rows), prefilled, nothing done, routineId null', () => {
  const latest = done({ id: 'w2', startedAt: T(8), finishedAt: T(8, 11), date: '2026-10-08', routineId: 'r1', name: 'Pull', items: [item(sets3), item([set({ reps: 10, weight: 60 }), set({ reps: 10, weight: 60 })], 'barbell-row')] });
  const older = done({ id: 'w1', items: [item([set({ reps: 3, weight: 100 })], 'squat')] });
  const now = T(12, 9);
  const res = R.repeatLastWorkout(gym(latest, older), now);
  const s = good(res);
  assert.equal(res.id, `w-${now}`);
  assert.deepEqual(s.workouts[2], {
    id: `w-${now}`, date: '2026-10-12', startedAt: now, finishedAt: null, name: '', routineId: null,
    items: [
      { exerciseId: 'bench-press', sets: [row(8, 80), row(8, 80), row(7, 77.5)] },
      { exerciseId: 'barbell-row', sets: [row(10, 60), row(10, 60)] },
    ],
  });
  assert.deepEqual(s.workouts.slice(0, 2), [latest, older]);
});

test('repeatLastWorkout picks the latest by startedAt, whatever the array order; open workouts never count', () => {
  const newer = done({ id: 'w2', startedAt: T(8), finishedAt: T(8, 11), items: [item([set()], 'row')] });
  const older = done({ id: 'w1', items: [item([set()], 'squat')] });
  const o = open({ id: 'w3', startedAt: T(9), items: [item([set({ done: false })], 'curl')] });
  const first = x => good(R.repeatLastWorkout(x, T(12))).workouts.at(-1).items.map(i => i.exerciseId);
  assert.deepEqual(first(gym(older, newer)), ['row']);
  assert.deepEqual(first(gym(newer, older)), ['row']);
  refuse(gym(newer, o), g => R.repeatLastWorkout(g, T(12)), 'workout-open');
});

test('repeatLastWorkout drops warm-up rows; an exercise that was only warm-ups last time stays in with older values or one empty set', () => {
  const older = done({ id: 'w1', items: [item([set({ reps: 6, weight: 70 })], 'curl')] });
  const latest = done({ id: 'w2', startedAt: T(8), finishedAt: T(8, 11), items: [item([set({ warmup: true, reps: 10, weight: 40 }), set(), set({ reps: 6, weight: 85 })]), item([set({ warmup: true })], 'curl'), item([set({ warmup: true })], 'squat')] });
  const s = good(R.repeatLastWorkout(gym(older, latest), T(12)));
  assert.deepEqual(s.workouts[2].items, [
    { exerciseId: 'bench-press', sets: [row(8, 80), row(6, 85)] },
    { exerciseId: 'curl', sets: [row(6, 70)] },
    { exerciseId: 'squat', sets: [row(1, 0)] },
  ]);
});

test('repeatLastWorkout refusals: no finished workout is no-history, an open one is workout-open', () => {
  refuse(gym(), g => R.repeatLastWorkout(g, T(12)), 'no-history');
  refuse(gym(done(), open()), g => R.repeatLastWorkout(g, T(12, 11)), 'workout-open');
  for (const bad of [NaN, Infinity, undefined, null, '1000']) assert.equal(R.repeatLastWorkout(gym(done()), bad).ok, false, String(bad));
});

// ---------- inherited-key ids, purity ----------
test('toString and __proto__ as routine ids are unknown, never found, never thrown', () => {
  const g = gymR([routine()]);
  for (const id of ['toString', '__proto__', 'constructor', 'hasOwnProperty']) {
    refuse(g, x => R.editRoutine(x, id, { name: 'x' }), 'unknown-routine');
    refuse(g, x => R.deleteRoutine(x, id), 'unknown-routine');
    refuse(g, x => R.startRoutine(x, id, T(12)), 'unknown-routine');
  }
});

test('toString and __proto__ as workout and exercise ids are plain ids', () => {
  for (const id of ['toString', '__proto__']) {
    const w = done({ id, items: [item([set({ reps: 6, weight: 50 })], id)] });
    const s = good(R.saveRoutineFromWorkout(gym(w), id, T(13), 'A'));
    assert.deepEqual(s.routines[0].items, [{ exerciseId: id, sets: [tpl(6, 50)] }]);
    const st = good(R.startRoutine(deepFreeze(s), s.routines[0].id, T(14)));
    assert.deepEqual(st.workouts[1].items, [{ exerciseId: id, sets: [row(6, 50)] }]);
    assert.deepEqual(good(R.repeatLastWorkout(gym(w), T(14))).workouts[1].items, [{ exerciseId: id, sets: [row(6, 50)] }]);
    assert.equal({}.exerciseId, undefined);
  }
});

test('a routine session stays valid at every step: create, edit, start, delete', () => {
  let g = deepFreeze(good(R.saveRoutineFromWorkout(gym(session()), 'w3', T(13), 'Upper')));
  const step = r => { g = deepFreeze(good(r)); };
  const id = g.routines[0].id;
  step(R.editRoutine(g, id, { name: 'Upper B' }));
  step(R.startRoutine(g, id, T(14)));
  assert.equal(g.workouts[1].routineId, id);
  step(R.deleteRoutine(g, id));
  assert.equal(g.workouts[1].routineId, id);
});

test('routines.js is pure: no DOM, no storage global, no forbidden date APIs', () => {
  const src = readFileSync(new URL('../src/core/routines.js', import.meta.url), 'utf8');
  assert.ok(!/\b(document|window|localStorage|location|navigator)\b/.test(src));
  assert.ok(!/toISOString|getUTC|Date\.parse|new Date\(\s*['"`]|Date\.now|Math\.random/.test(src));
});
