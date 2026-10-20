// Create-exercise form logic (gym plan G8). The view turns a blank name away itself; src/core/exercises.js stays as it is
// and has the final say on length, duplicates, muscle and equipment.
import { addCustom } from '../core/exercises.js';

export const EMPTY_FORM = { name: '', muscle: null, equipment: null };

const BLANK = 'Enter a name.';
const MESSAGE = {
  'name-length': 'Name must be 60 characters or fewer.',
  'name-taken': 'That name is already used.',
  'bad-muscle': 'Choose a muscle.',
  'bad-equipment': 'Choose equipment.',
};

// { ok: true, state, id } or { ok: false, message }; nothing is written either way.
export function createExercise(data, gym, form) {
  if (typeof form?.name !== 'string' || form.name.trim() === '') return { ok: false, message: BLANK };
  const r = addCustom(data, gym, form);
  return r.ok ? r : { ok: false, message: MESSAGE[r.reason] ?? 'Check the form.' };
}

export const formProblem = (data, gym, form) => createExercise(data, gym, form).message ?? null;
