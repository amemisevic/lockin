// Name sheet (gym plan G9c, G10): by default "Start workout" with an optional name, up to 60 characters; blank starts an
// unnamed workout (shown as "Workout"). Options: title, action, label, placeholder, and required (G10: New routine needs a
// name of 1 to 60 characters; blank is refused). onDone(name) gets the trimmed name; the sheet stays open with a message if refused.
import { h } from '../dom.js';
import { openSheet } from '../sheet.js';
import { parseName, NAME_MESSAGE } from './gymWorkoutLogic.js';
import { parseRoutineName, ROUTINE_NAME_MESSAGE } from './gymRoutineLogic.js';

export function openNameSheet(onDone, open = openSheet,
  { title = 'Start workout', action = 'Start', label = 'Name (optional)', placeholder = 'Workout', required = false } = {}) {
  const parse = required ? parseRoutineName : parseName;
  const message = required ? ROUTINE_NAME_MESSAGE : NAME_MESSAGE;
  let text = '';
  const error = h('p', { class: 'form-error', role: 'status' });
  const input = h('input', { class: 'in', id: 'gm-wname', type: 'text', maxlength: '60', autocomplete: 'off', enterkeyhint: 'done',
    placeholder, 'aria-label': required ? 'Name' : 'Workout name (optional)', onInput: e => { text = e.target.value; error.replaceChildren(); } });
  return open({
    title, action,
    content: h('div', { class: 'form' }, h('div', { class: 'fld' }, h('span', { class: 'fld-l' }, label), input), error),
    isDirty: () => text !== '',
    onAction: () => {
      const name = parse(text);
      if (name === null) { error.replaceChildren(message); return false; }
      onDone(name);
    },
  });
}
