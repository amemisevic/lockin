import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_FORM, formProblem, createExercise } from '../src/views/gymExerciseLogic.js';
import { emptyGym } from '../src/core/gym.js';

// Gym G8 create-exercise form logic. The VIEW rejects a blank name itself; src/core/exercises.js is not changed.
const DATA = {
  exercises: [{ id: 'bench', name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest', category: 'strength' }],
  muscles: ['biceps', 'chest', 'other'],
  equipment: ['barbell', 'dumbbell', 'other'],
};
const form = over => ({ ...EMPTY_FORM, muscle: 'biceps', equipment: 'dumbbell', ...over });

test('the empty form has no name and nothing chosen', () => {
  assert.deepEqual(EMPTY_FORM, { name: '', muscle: null, equipment: null });
});

test('blank name is rejected in the view: empty, spaces, tab and newline; state untouched', () => {
  const gym = emptyGym();
  for (const name of ['', '   ', '\t\n ']) {
    assert.equal(formProblem(DATA, gym, form({ name })), 'Enter a name.', JSON.stringify(name));
    assert.deepEqual(createExercise(DATA, gym, form({ name })), { ok: false, message: 'Enter a name.' });
  }
  assert.equal(JSON.stringify(gym), JSON.stringify(emptyGym()));
});

test('a non-string name is blank too (never throws)', () => {
  for (const name of [undefined, null, 5, {}]) assert.equal(formProblem(DATA, emptyGym(), form({ name })), 'Enter a name.');
});

test('name rules: 60 characters after trim is fine, 61 is not; duplicates ignore case and match bundled names', () => {
  assert.equal(formProblem(DATA, emptyGym(), form({ name: 'x'.repeat(60) })), null);
  assert.equal(formProblem(DATA, emptyGym(), form({ name: `  ${'x'.repeat(60)}  ` })), null);
  assert.equal(formProblem(DATA, emptyGym(), form({ name: 'x'.repeat(61) })), 'Name must be 60 characters or fewer.');
  assert.equal(formProblem(DATA, emptyGym(), form({ name: 'barbell BENCH press' })), 'That name is already used.');
});

test('muscle and equipment must be chosen from the dataset lists', () => {
  assert.equal(formProblem(DATA, emptyGym(), form({ name: 'Curl', muscle: null })), 'Choose a muscle.');
  assert.equal(formProblem(DATA, emptyGym(), form({ name: 'Curl', equipment: null })), 'Choose equipment.');
  assert.equal(formProblem(DATA, emptyGym(), form({ name: 'Curl', muscle: 'wings' })), 'Choose a muscle.');
  assert.equal(formProblem(DATA, emptyGym(), form({ name: 'Curl', equipment: 'rocket' })), 'Choose equipment.');
});

test('a name that repeats an earlier custom exercise is refused', () => {
  const gym = { ...emptyGym(), customExercises: [{ id: 'custom-1', name: 'Zottman Curl', muscle: 'biceps', equipment: 'dumbbell' }] };
  assert.equal(formProblem(DATA, gym, form({ name: ' zottman curl ' })), 'That name is already used.');
});

test('success: trimmed name, id custom-1, then custom-2; the old state object is not changed', () => {
  const gym = emptyGym();
  const a = createExercise(DATA, gym, form({ name: '  Zottman Curl  ' }));
  assert.equal(a.ok, true);
  assert.equal(a.id, 'custom-1');
  assert.deepEqual(a.state.customExercises, [{ id: 'custom-1', name: 'Zottman Curl', muscle: 'biceps', equipment: 'dumbbell' }]);
  assert.deepEqual(gym.customExercises, []);
  const b = createExercise(DATA, a.state, form({ name: 'Reverse Curl' }));
  assert.equal(b.id, 'custom-2');
  assert.equal(b.state.customExercises.length, 2);
});

test('a refusal carries a message and no state', () => {
  const r = createExercise(DATA, emptyGym(), form({ name: 'x'.repeat(61) }));
  assert.deepEqual(r, { ok: false, message: 'Name must be 60 characters or fewer.' });
});
