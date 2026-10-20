// Exercise picker (gym plan G8), a pushed screen #gym/exercises: search, muscle and equipment chips, Create exercise,
// the matching rows. Typing and chip taps repaint the list in place (a full re-render would drop the keyboard and
// reset the chip row's scroll); the query and filters live here so the 30 s re-render keeps them. Browse mode (#gym/exercises):
// custom rows carry a Delete button (confirm first; the core refuses an exercise that a workout or routine uses).
// Pick mode (#gym/pick, G9): onPick(id) is given, every row has an Add button and there is no Delete.
import { h } from '../dom.js';
import { pushedHeader, rerender } from '../ui/chrome.js';
import { chips } from '../ui/controls.js';
import { openActionSheet } from '../sheet.js';
import { deleteCustom } from '../core/exercises.js';
import { pickerResults, chipOptions, countText, NO_MATCH, IN_USE } from './gymPickerLogic.js';
import { exerciseData, exerciseDataFailed, ensureExerciseData, retryExerciseData } from './gymData.js';
import { openExerciseSheet } from './gymExerciseSheet.js';

const fresh = () => ({ query: '', muscle: null, equipment: null, notice: '' });
let state = fresh();
export const resetPicker = () => { state = fresh(); };

export function renderPicker(app, { data = exerciseData(), load = ensureExerciseData, confirm = openActionSheet, onPick } = {}) {
  const header = pushedHeader({ title: onPick ? 'Add exercise' : 'Exercises', onBack: () => history.back() });
  if (!data) {
    if (exerciseDataFailed()) {
      return [header, h('p', { class: 'tk-empty' }, 'The exercise list could not be loaded.'),
        h('button', { type: 'button', class: 'btn-ghost gm-retry', onClick: () => retryExerciseData(rerender) }, 'Try again')];
    }
    load(rerender);
    return [header, h('p', { class: 'tk-empty' }, 'Loading exercises…')];
  }

  const search = h('input', { type: 'search', id: 'gm-q', class: 'in', 'aria-label': 'Search exercises', placeholder: 'Search exercises',
    value: state.query, autocomplete: 'off', autocapitalize: 'off', enterkeyhint: 'search',
    onInput: e => { state.query = e.target.value; paint(); } });
  const filter = (key, label, list) => {
    const group = chips({ options: chipOptions(list), value: state[key], onPick: v => { state[key] = state[key] === v ? null : v; paint(); } });
    group.setAttribute('aria-label', label);
    group.classList.add('gm-scroll');
    return { group, sync: () => [...group.children].forEach((b, i) => {
      const on = state[key] === list[i];
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }) };
  };
  const muscle = filter('muscle', 'Muscle', data.muscles);
  const equipment = filter('equipment', 'Equipment', data.equipment);
  const count = h('p', { class: 't2 gm-count', role: 'status' });
  const notice = h('p', { class: 'form-error', role: 'alert' });
  const results = h('div', { id: 'gm-results' });

  // Reads app.gym when confirmed, not when the row was drawn. A refusal leaves everything as it was and says why.
  const remove = id => {
    const r = deleteCustom(app.gym, id);
    if (!r.ok && r.reason === 'in-use') { state.notice = IN_USE; notice.replaceChildren(IN_USE); return; }
    if (r.ok) app.setGym(() => r.state);
    paint();
  };
  const ask = r => confirm([{ label: 'Delete', destructive: true, onSelect: () => remove(r.id) }], { message: `Delete "${r.name}"? This can't be undone.` });
  const tag = () => h('span', { class: 'gm-tag' }, 'Custom');
  const side = r => (onPick
    ? h('div', { class: 'gm-side' }, r.custom && tag(), h('button', { type: 'button', class: 'gm-add', 'aria-label': `Add ${r.name}`, onClick: () => onPick(r.id) }, 'Add'))
    : r.custom && h('div', { class: 'gm-side' }, tag(), h('button', { type: 'button', class: 'gm-del', 'aria-label': `Delete ${r.name}`, onClick: () => ask(r) }, 'Delete')));
  const row = r => h('li', { class: 'gm-rw gm-ex' }, h('div', { class: 'gm-rwn' }, r.name), h('div', { class: 'rn' }, r.detail), side(r));

  // The refusal notice lives in `state` so the 30 s re-render keeps it; any search, chip tap or delete clears it.
  function paint(keepNotice) {
    if (!keepNotice) state.notice = '';
    notice.replaceChildren(...(state.notice ? [state.notice] : []));
    muscle.sync();
    equipment.sync();
    const r = pickerResults(data, app.gym, state);
    count.replaceChildren(countText(r));
    results.replaceChildren(r.rows.length ? h('ul', { class: 'plate list gm-ul' }, r.rows.map(row)) : h('p', { class: 'tk-empty' }, NO_MATCH));
  }

  // The new exercise shows up because its name becomes the query. The save already re-rendered, so rebuild once more.
  const created = name => { state = { ...fresh(), query: name }; rerender(); };
  const field = (label, body) => h('div', { class: 'fld' }, h('span', { class: 'fld-l' }, label), body);
  paint(true);
  return [header, h('div', { class: 'gm-pk' },
    search, field('Muscle', muscle.group), field('Equipment', equipment.group),
    h('button', { type: 'button', id: 'gm-create', class: 'btn-ghost', onClick: () => openExerciseSheet(app, data, created) }, 'Create exercise'),
    notice, count, results)];
}
