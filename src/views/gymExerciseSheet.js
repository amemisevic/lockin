// Create-exercise sheet (gym plan G8): name, muscle, equipment. Same shape as taskSheet.js: a plain form object, chips
// re-synced in place by update(), validation from gymExerciseLogic (a blank name is refused here), dirty-cancel from sheet.js.
import { h } from '../dom.js';
import { openSheet } from '../sheet.js';
import { chips } from '../ui/controls.js';
import { chipOptions } from './gymPickerLogic.js';
import { EMPTY_FORM, formProblem, createExercise } from './gymExerciseLogic.js';

export function openExerciseSheet(app, data, onCreated) {
  const f = { ...EMPTY_FORM };
  const startJson = JSON.stringify(f);
  let touched = false;
  let sheet = null;
  const changed = () => { touched = true; update(); };

  const name = h('input', { class: 'in', id: 'gm-name', type: 'text', maxlength: '60', autocomplete: 'off', enterkeyhint: 'done',
    'aria-label': 'Name', onInput: e => { f.name = e.target.value; changed(); } });
  const pick = (key, label, list) => {
    const group = chips({ options: chipOptions(list), value: f[key], onPick: v => { f[key] = v; changed(); } });
    group.setAttribute('aria-label', label);
    group.classList.add('gm-scroll');
    return group;
  };
  const muscle = pick('muscle', 'Muscle', data.muscles);
  const equipment = pick('equipment', 'Equipment', data.equipment);
  const error = h('p', { class: 'form-error', role: 'status' });
  const field = (label, body) => h('div', { class: 'fld' }, h('span', { class: 'fld-l' }, label), body);
  const content = h('div', { class: 'form' }, field('Name', name), field('Muscle', muscle), field('Equipment', equipment), error);

  const sync = (group, key, list) => [...group.children].forEach((b, i) => {
    b.classList.toggle('on', f[key] === list[i]);
    b.setAttribute('aria-pressed', String(f[key] === list[i]));
  });
  function update() {
    sync(muscle, 'muscle', data.muscles);
    sync(equipment, 'equipment', data.equipment);
    const problem = formProblem(data, app.gym, f);
    error.textContent = touched && problem ? problem : '';
    if (sheet) sheet.actionButton.disabled = !!problem;
  }

  sheet = openSheet({
    title: 'New Exercise', action: 'Add', content,
    isDirty: () => JSON.stringify(f) !== startJson,
    onAction: () => {
      const r = createExercise(data, app.gym, f);
      if (!r.ok) { changed(); return false; }
      app.setGym(() => r.state);
      onCreated(f.name.trim());
    },
  });
  update();
}
