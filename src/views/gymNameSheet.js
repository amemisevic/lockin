// Start-workout sheet (gym plan G9c): an optional name, up to 60 characters. Blank starts an unnamed workout (shown as "Workout").
// onDone(name) gets the trimmed name; the sheet stays open with a message if the name is too long.
import { h } from '../dom.js';
import { openSheet } from '../sheet.js';
import { parseName, NAME_MESSAGE } from './gymWorkoutLogic.js';

export function openNameSheet(onDone, open = openSheet) {
  let text = '';
  const error = h('p', { class: 'form-error', role: 'status' });
  const input = h('input', { class: 'in', id: 'gm-wname', type: 'text', maxlength: '60', autocomplete: 'off', enterkeyhint: 'done',
    placeholder: 'Workout', 'aria-label': 'Workout name (optional)', onInput: e => { text = e.target.value; error.replaceChildren(); } });
  return open({
    title: 'Start workout', action: 'Start',
    content: h('div', { class: 'form' }, h('div', { class: 'fld' }, h('span', { class: 'fld-l' }, 'Name (optional)'), input), error),
    isDirty: () => text !== '',
    onAction: () => {
      const name = parseName(text);
      if (name === null) { error.replaceChildren(NAME_MESSAGE); return false; }
      onDone(name);
    },
  });
}
