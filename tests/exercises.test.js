import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as X from '../src/core/exercises.js';
import { trimDataset } from '../scripts/build-exercises.mjs';

// Fixture, not the real file. Expected values are worked out by hand.
const ex = (id, name, equipment, muscle) => ({ id, name, equipment, muscle, category: 'strength' });
const DATA = {
  exercises: [
    ex('bench-press', 'Barbell Bench Press', 'barbell', 'chest'),
    ex('incline-db', 'Incline Dumbbell Press', 'dumbbell', 'chest'),
    ex('pushdown', 'Triceps Pushdown', 'cable', 'triceps'),
    ex('row', 'Bent Over Barbell Row', 'barbell', 'middle back'),
    ex('plank', 'Plank', 'other', 'abdominals'),
    ex('mystery', 'Mystery Move', 'other', 'other'),
  ],
  muscles: ['abdominals', 'chest', 'middle back', 'triceps', 'other'],
  equipment: ['barbell', 'cable', 'dumbbell', 'other'],
};
const GYM = { v: 1, workouts: [], customExercises: [{ id: 'custom-1', name: 'Cable Fly', muscle: 'chest', equipment: 'cable' }] };
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
deepFreeze(DATA); deepFreeze(GYM);
const ids = r => r.map(e => e.id);
const find = (o = {}) => ids(X.searchExercises(DATA, GYM, o));
const ALL = ['bench-press', 'row', 'custom-1', 'incline-db', 'mystery', 'plank', 'pushdown'];

// ---------- build script transform ----------
test('trimDataset keeps five fields, maps null/empty to "other", sorts the lists', () => {
  const raw = [
    { id: 'Barbell_Curl', name: 'Barbell Curl', equipment: 'barbell', primaryMuscles: ['biceps'], category: 'strength', instructions: ['x'], images: ['a.jpg'] },
    { id: 'Plank', name: 'Plank', equipment: null, primaryMuscles: ['abdominals'], category: 'strength' },
    { id: 'Odd', name: 'Odd', equipment: '  ', primaryMuscles: [], category: 'stretching' },
    { id: 'Neck', name: 'Neck Stretch', equipment: 'body only', primaryMuscles: ['neck', 'traps'], category: 'stretching' },
  ];
  assert.deepEqual(trimDataset(raw), {
    exercises: [
      { id: 'Barbell_Curl', name: 'Barbell Curl', equipment: 'barbell', muscle: 'biceps', category: 'strength' },
      { id: 'Plank', name: 'Plank', equipment: 'other', muscle: 'abdominals', category: 'strength' },
      { id: 'Odd', name: 'Odd', equipment: 'other', muscle: 'other', category: 'stretching' },
      { id: 'Neck', name: 'Neck Stretch', equipment: 'body only', muscle: 'neck', category: 'stretching' },
    ],
    muscles: ['abdominals', 'biceps', 'neck', 'other'],
    equipment: ['barbell', 'body only', 'other'],
  });
});

test('shipped src/data/exercises.json: shape, unique ids, values inside the lists', () => {
  const d = JSON.parse(readFileSync(new URL('../src/data/exercises.json', import.meta.url), 'utf8'));
  assert.ok(d.exercises.length >= 500);
  assert.ok(d.muscles.includes('other') && d.equipment.includes('other'));
  const text = s => typeof s === 'string' && s.trim() !== '';
  for (const e of d.exercises) {
    assert.ok([e.id, e.name, e.equipment, e.muscle, e.category].every(text), e.id);
    assert.ok(d.muscles.includes(e.muscle) && d.equipment.includes(e.equipment), e.id);
  }
  assert.equal(new Set(d.exercises.map(e => e.id)).size, d.exercises.length);
});

// ---------- search ----------
test('search: empty query lists bundled and custom alphabetically, case-insensitive', () => {
  assert.deepEqual(find(), ALL);
  assert.deepEqual(find({ query: '   ' }), ALL);
  assert.deepEqual(find({ query: 42 }), ALL);
});

test('search: every typed word must be in the name, any order, any case', () => {
  assert.deepEqual(find({ query: 'barbell' }), ['bench-press', 'row']);
  assert.deepEqual(find({ query: 'BARBELL press' }), ['bench-press']);
  assert.deepEqual(find({ query: 'press barbell' }), ['bench-press']);
  assert.deepEqual(find({ query: '  barbell   ' }), ['bench-press', 'row']);
  assert.deepEqual(find({ query: 'incline press' }), ['incline-db']);
  assert.deepEqual(find({ query: 'dumbbell bench' }), []);
  assert.deepEqual(find({ query: 'ben' }), ['bench-press', 'row']);
});

test('search: muscle and equipment filters combine with the query', () => {
  assert.deepEqual(find({ muscle: 'chest' }), ['bench-press', 'custom-1', 'incline-db']);
  assert.deepEqual(find({ equipment: 'barbell' }), ['bench-press', 'row']);
  assert.deepEqual(find({ muscle: 'chest', equipment: 'cable' }), ['custom-1']);
  assert.deepEqual(find({ muscle: 'chest', query: 'press' }), ['bench-press', 'incline-db']);
  assert.deepEqual(find({ muscle: 'nope' }), []);
  assert.deepEqual(find({ muscle: null, equipment: '' }), ALL);
});

test('search: recents come first in the given order, the rest alphabetical', () => {
  assert.deepEqual(find({ recents: ['plank', 'bench-press'] }), ['plank', 'bench-press', 'row', 'custom-1', 'incline-db', 'mystery', 'pushdown']);
  assert.deepEqual(find({ query: 'barbell', recents: ['row'] }), ['row', 'bench-press']);
  assert.deepEqual(find({ recents: ['ghost', 'toString', '__proto__', 'plank'] }), ['plank', 'bench-press', 'row', 'custom-1', 'incline-db', 'mystery', 'pushdown']);
});

test('search: only the first 10 recents are pinned', () => {
  const data = { exercises: Array.from({ length: 14 }, (_, i) => ex(`e${String(i + 1).padStart(2, '0')}`, `Move ${String(i + 1).padStart(2, '0')}`, 'other', 'other')), muscles: ['other'], equipment: ['other'] };
  const recents = Array.from({ length: 14 }, (_, i) => `e${String(14 - i).padStart(2, '0')}`);
  assert.deepEqual(ids(X.searchExercises(data, {}, { recents })), ['e14', 'e13', 'e12', 'e11', 'e10', 'e09', 'e08', 'e07', 'e06', 'e05', 'e01', 'e02', 'e03', 'e04']);
});

test('search: custom results are marked, bundled are not', () => {
  const r = X.searchExercises(DATA, GYM, {});
  assert.deepEqual(r.filter(e => e.custom).map(e => e.id), ['custom-1']);
  assert.equal(r.find(e => e.id === 'bench-press').custom, false);
  assert.deepEqual(r.find(e => e.id === 'custom-1'), { id: 'custom-1', name: 'Cable Fly', muscle: 'chest', equipment: 'cable', category: 'other', custom: true });
});

test('search: missing fields never crash and read as "other"', () => {
  const data = { exercises: [null, { id: 'odd', name: 'Odd' }, { id: 'noname' }, { name: 'No id' }, ex('plank', 'Plank', 'other', 'abdominals')], muscles: [], equipment: [] };
  assert.deepEqual(ids(X.searchExercises(data, undefined, { query: 'odd' })), ['odd']);
  assert.deepEqual(ids(X.searchExercises(data, {}, { equipment: 'other', muscle: 'other', query: 'o' })), ['odd']);
  assert.deepEqual(ids(X.searchExercises(data, { customExercises: null }, { query: 'x' })), []);
  assert.deepEqual(ids(X.searchExercises({}, {}, {})), []);
  assert.deepEqual(ids(X.searchExercises(undefined, undefined, undefined)), []);
});

// ---------- recents ----------
test('recentIds: newest workout first, last exercise of a workout first, distinct, max 10', () => {
  const w = [
    { startedAt: 3, items: [{ exerciseId: 'a' }, { exerciseId: 'b' }] },
    { startedAt: 1, items: [{ exerciseId: 'c' }, { exerciseId: 'a' }] },
    { startedAt: 2, items: [{ exerciseId: 'd' }] },
  ];
  assert.deepEqual(X.recentIds(deepFreeze(w)), ['b', 'a', 'd', 'c']);
  const many = [{ startedAt: 1, items: Array.from({ length: 12 }, (_, i) => ({ exerciseId: `x${i}` })) }];
  assert.deepEqual(X.recentIds(many), ['x11', 'x10', 'x9', 'x8', 'x7', 'x6', 'x5', 'x4', 'x3', 'x2']);
});

test('recentIds: missing fields never crash', () => {
  assert.deepEqual(X.recentIds([{}, null, { startedAt: 1 }, { startedAt: 2, items: [null, {}, { exerciseId: 'toString' }] }]), ['toString']);
  assert.deepEqual(X.recentIds('x'), []);
  assert.deepEqual(X.recentIds(undefined), []);
});

// ---------- custom exercises ----------
const draft = (o = {}) => ({ name: 'Landmine Press', muscle: 'chest', equipment: 'barbell', ...o });
const add = (gym, o) => X.addCustom(DATA, gym, draft(o));
const refused = (r, reason) => { assert.equal(r.ok, false); assert.equal(r.reason, reason); assert.equal('state' in r, false); };

test('addCustom: trims the name, assigns custom-N, keeps other gym keys', () => {
  const r = add(GYM, { name: '  Landmine Press ' });
  assert.equal(r.ok, true);
  assert.equal(r.id, 'custom-2');
  assert.deepEqual(r.state, { ...GYM, customExercises: [...GYM.customExercises, { id: 'custom-2', name: 'Landmine Press', muscle: 'chest', equipment: 'barbell' }] });
  const first = add({ v: 1 }, {});
  assert.equal(first.id, 'custom-1');
  assert.deepEqual(first.state, { v: 1, customExercises: [{ id: 'custom-1', name: 'Landmine Press', muscle: 'chest', equipment: 'barbell' }] });
  assert.equal(add({ customExercises: [{ id: 'custom-5', name: 'Z', muscle: 'chest', equipment: 'cable' }] }, {}).id, 'custom-6');
});

test('addCustom: name is 1 to 60 characters after trim', () => {
  for (const name of ['', '   ', 'a'.repeat(61), ' ' + 'a'.repeat(61), null, undefined, 7]) refused(add(GYM, { name }), 'name-length');
  assert.equal(add(GYM, { name: 'a'.repeat(60) }).ok, true);
  assert.equal(add(GYM, { name: '  ' + 'a'.repeat(60) + '  ' }).ok, true);
  assert.equal(add(GYM, { name: 'a' }).ok, true);
  refused(X.addCustom(DATA, GYM, null), 'name-length');
  refused(X.addCustom(DATA, GYM, undefined), 'name-length');
});

test('addCustom: name must be unique, case-insensitive, across bundled and custom', () => {
  refused(add(GYM, { name: 'barbell bench press' }), 'name-taken');
  refused(add(GYM, { name: '  BARBELL BENCH PRESS ' }), 'name-taken');
  refused(add(GYM, { name: 'CABLE FLY' }), 'name-taken');
  assert.equal(add(GYM, { name: 'Barbell Bench' }).ok, true);
});

test('addCustom: muscle and equipment must come from the lists', () => {
  for (const muscle of ['biceps', '', null, undefined, 'toString', '__proto__', 'Chest']) refused(add(GYM, { muscle }), 'bad-muscle');
  for (const equipment of ['kettlebell', '', null, undefined, 'toString', 'Barbell']) refused(add(GYM, { equipment }), 'bad-equipment');
  assert.equal(add(GYM, { muscle: 'other', equipment: 'other' }).ok, true);
});

test('addCustom: checks run name length, name taken, muscle, equipment', () => {
  refused(add(GYM, { name: '', muscle: 'x', equipment: 'x' }), 'name-length');
  refused(add(GYM, { name: 'Plank', muscle: 'x', equipment: 'x' }), 'name-taken');
  refused(add(GYM, { muscle: 'x', equipment: 'x' }), 'bad-muscle');
});

test('refusals leave the input byte-identical', () => {
  const before = JSON.stringify(GYM);
  add(GYM, { name: '' }); add(GYM, { name: 'Plank' }); add(GYM, { muscle: 'x' }); X.renameCustom(DATA, GYM, 'custom-9', 'Foo');
  assert.equal(JSON.stringify(GYM), before);
});

const G2 = { ...GYM, customExercises: [...GYM.customExercises, { id: 'custom-2', name: 'Landmine Press', muscle: 'chest', equipment: 'barbell' }] };

test('renameCustom: changes only the name; case change and same name are fine', () => {
  const r = X.renameCustom(DATA, G2, 'custom-1', ' Low Cable Fly ');
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.customExercises, [{ id: 'custom-1', name: 'Low Cable Fly', muscle: 'chest', equipment: 'cable' }, G2.customExercises[1]]);
  assert.equal(X.renameCustom(DATA, G2, 'custom-1', 'CABLE FLY').state.customExercises[0].name, 'CABLE FLY');
  assert.deepEqual(X.renameCustom(DATA, G2, 'custom-1', 'Cable Fly').state, G2);
});

test('renameCustom: same name rules as addCustom, excluding itself', () => {
  refused(X.renameCustom(DATA, G2, 'custom-1', 'plank'), 'name-taken');
  refused(X.renameCustom(DATA, G2, 'custom-1', 'landmine press'), 'name-taken');
  refused(X.renameCustom(DATA, G2, 'custom-1', '  '), 'name-length');
  refused(X.renameCustom(DATA, G2, 'custom-1', 'a'.repeat(61)), 'name-length');
  refused(X.renameCustom(DATA, G2, 'custom-1', null), 'name-length');
});

test('renameCustom: only custom ids exist; toString and __proto__ are unknown', () => {
  for (const id of ['custom-9', 'bench-press', 'toString', '__proto__', 'constructor', '', null, undefined, 1]) refused(X.renameCustom(DATA, G2, id, 'Fine Name'), 'unknown-id');
  refused(X.renameCustom(DATA, {}, 'custom-1', 'Fine Name'), 'unknown-id');
  refused(X.renameCustom(DATA, undefined, 'custom-1', 'Fine Name'), 'unknown-id');
});

test('there is no way to delete a custom exercise', () => {
  assert.deepEqual(Object.keys(X).filter(k => /delete|remove|drop/i.test(k)), []);
});

// ---------- id lookup ----------
test('exerciseMap: a Map keyed by id, bundled and custom, custom marked', () => {
  const m = X.exerciseMap(DATA, GYM);
  assert.ok(m instanceof Map);
  assert.equal(m.size, 7);
  assert.equal(m.get('bench-press').name, 'Barbell Bench Press');
  assert.equal(m.get('custom-1').custom, true);
  assert.equal(m.get('bench-press').custom, false);
  for (const id of ['toString', '__proto__', 'constructor', 'hasOwnProperty', 'ghost', undefined]) assert.equal(m.get(id), undefined, String(id));
});

test('toString and __proto__ work as real bundled ids and as recents', () => {
  const weird = { exercises: [ex('toString', 'Alpha', 'other', 'other'), ex('__proto__', 'Beta', 'other', 'other'), ex('plain', 'Gamma', 'other', 'other')], muscles: ['other'], equipment: ['other'] };
  const m = X.exerciseMap(weird, {});
  assert.equal(m.get('toString').name, 'Alpha');
  assert.equal(m.get('__proto__').name, 'Beta');
  assert.deepEqual(ids(X.searchExercises(weird, {}, {})), ['toString', '__proto__', 'plain']);
  assert.deepEqual(ids(X.searchExercises(weird, {}, { recents: ['plain', '__proto__'] })), ['plain', '__proto__', 'toString']);
  assert.deepEqual(X.recentIds([{ startedAt: 1, items: [{ exerciseId: '__proto__' }, { exerciseId: 'toString' }] }]), ['toString', '__proto__']);
});
