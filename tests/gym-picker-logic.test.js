import test from 'node:test';
import assert from 'node:assert/strict';
import { PICKER_CAP, NO_MATCH, pickerResults, chipLabel, chipOptions, countText } from '../src/views/gymPickerLogic.js';
import { emptyGym } from '../src/core/gym.js';

// Gym G8 picker logic. Small invented dataset; names sort bench < bent < dumbbell < push by lowercase.
const DATA = {
  exercises: [
    { id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' },
    { id: 'row', name: 'Bent Over Row', equipment: 'barbell', muscle: 'middle back', category: 'strength' },
    { id: 'curl', name: 'Dumbbell Curl', equipment: 'dumbbell', muscle: 'biceps', category: 'strength' },
    { id: 'pushup', name: 'Push-Up', equipment: 'body only', muscle: 'chest', category: 'strength' },
  ],
  muscles: ['biceps', 'chest', 'middle back', 'other'],
  equipment: ['barbell', 'body only', 'dumbbell', 'other'],
};
const names = r => r.rows.map(x => x.name);

test('no filters: everything, alphabetical, each row has id, name, "muscle · equipment" and a custom flag', () => {
  const r = pickerResults(DATA, emptyGym(), {});
  assert.deepEqual(names(r), ['Barbell Bench Press', 'Bent Over Row', 'Dumbbell Curl', 'Push-Up']);
  assert.deepEqual(r.rows[0], { id: 'bench', name: 'Barbell Bench Press', detail: 'chest · barbell', custom: false });
  assert.equal(r.total, 4);
  assert.equal(r.capped, false);
});

test('query: every typed word must be in the name, any case', () => {
  assert.deepEqual(names(pickerResults(DATA, emptyGym(), { query: 'bench press' })), ['Barbell Bench Press']);
  assert.deepEqual(names(pickerResults(DATA, emptyGym(), { query: 'BEN' })), ['Barbell Bench Press', 'Bent Over Row']);
  assert.deepEqual(names(pickerResults(DATA, emptyGym(), { query: 'zzz' })), []);
});

test('muscle and equipment filters combine; null or empty means no filter', () => {
  assert.deepEqual(names(pickerResults(DATA, emptyGym(), { muscle: 'chest' })), ['Barbell Bench Press', 'Push-Up']);
  assert.deepEqual(names(pickerResults(DATA, emptyGym(), { muscle: 'chest', equipment: 'barbell' })), ['Barbell Bench Press']);
  assert.equal(pickerResults(DATA, emptyGym(), { muscle: null, equipment: null, query: '' }).total, 4);
});

test('recents lead: the exercise used last in the newest workout comes first', () => {
  const gym = { ...emptyGym(), workouts: [{ id: 'w', date: '2026-10-05', startedAt: 5, finishedAt: 6, name: '', routineId: null, items: [{ exerciseId: 'pushup', sets: [] }, { exerciseId: 'curl', sets: [] }] }] };
  assert.deepEqual(names(pickerResults(DATA, gym, {})), ['Dumbbell Curl', 'Push-Up', 'Barbell Bench Press', 'Bent Over Row']);
});

test('custom exercises are merged in and marked', () => {
  const gym = { ...emptyGym(), customExercises: [{ id: 'custom-1', name: 'Zottman Curl', muscle: 'biceps', equipment: 'dumbbell' }] };
  const r = pickerResults(DATA, gym, { muscle: 'biceps' });
  assert.deepEqual(r.rows.map(x => [x.id, x.custom, x.detail]), [['curl', false, 'biceps · dumbbell'], ['custom-1', true, 'biceps · dumbbell']]);
});

test('at most PICKER_CAP (50) rows are returned; total says how many matched', () => {
  assert.equal(PICKER_CAP, 50);
  const many = { ...DATA, exercises: Array.from({ length: 120 }, (_, i) => ({ id: `e${i}`, name: `Move ${String(i).padStart(3, '0')}`, equipment: 'other', muscle: 'other', category: 'strength' })) };
  const r = pickerResults(many, emptyGym(), {});
  assert.equal(r.rows.length, 50);
  assert.equal(r.total, 120);
  assert.equal(r.capped, true);
  assert.equal(r.rows[0].name, 'Move 000');
  assert.equal(pickerResults(many, emptyGym(), { query: 'move 11' }).capped, false); // 110..119 = 10 rows
});

test('a missing dataset or an exercise with null fields does not throw ("other" fills the gaps)', () => {
  assert.deepEqual(pickerResults(null, emptyGym(), {}), { rows: [], total: 0, capped: false });
  const odd = { exercises: [{ id: 'x', name: 'Odd', equipment: null, muscle: '' }], muscles: [], equipment: [] };
  assert.equal(pickerResults(odd, emptyGym(), {}).rows[0].detail, 'other · other');
});

test('ids named toString and __proto__ are plain rows', () => {
  const d = { ...DATA, exercises: [{ id: 'toString', name: 'A', equipment: 'other', muscle: 'other' }, { id: '__proto__', name: 'B', equipment: 'other', muscle: 'other' }] };
  assert.deepEqual(pickerResults(d, emptyGym(), {}).rows.map(x => x.id), ['toString', '__proto__']);
});

test('chip labels start with a capital; options keep the raw value for the filter', () => {
  assert.equal(chipLabel('lower back'), 'Lower back');
  assert.equal(chipLabel('e-z curl bar'), 'E-z curl bar');
  assert.equal(chipLabel('other'), 'Other');
  assert.deepEqual(chipOptions(['biceps', 'middle back']), [{ value: 'biceps', label: 'Biceps' }, { value: 'middle back', label: 'Middle back' }]);
  assert.deepEqual(chipOptions(undefined), []);
});

test('count line: plain total, singular, or the capped hint', () => {
  assert.equal(countText({ total: 4, capped: false }), '4 exercises');
  assert.equal(countText({ total: 1, capped: false }), '1 exercise');
  assert.equal(countText({ total: 876, capped: true }), 'Showing 50 of 876. Search or filter to narrow down.');
  assert.equal(NO_MATCH, 'No exercises match.');
});
