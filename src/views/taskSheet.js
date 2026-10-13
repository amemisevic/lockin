// Add / edit task sheet (plan Task 11 step 2). Flow ported from v1 blockSheet.js: a plain form object,
// controls re-synced in place by update(), validation from core validateTask, dirty-cancel from sheet.js.
import { h } from '../dom.js';
import { openSheet } from '../sheet.js';
import { chips } from '../ui/controls.js';
import { validateTask, addTask, updateTask } from '../core/tasks.js';
import { DAY_NAMES, formFromTask, draftFromForm, toggleDay } from './tasksLogic.js';

const REPEATS = [['none', 'Never'], ['daily', 'Daily'], ['weekdays', 'Weekdays'], ['custom', 'Custom']]
  .map(([value, label]) => ({ value, label }));

export function openTaskSheet(app, { mode, task, date }) {
  const f = formFromTask(mode === 'edit' ? task : null, date);
  const startJson = JSON.stringify(f);
  let touched = false;
  let sheet = null;
  const changed = () => { touched = true; update(); };

  const field = (label, control) => h('label', { class: 'fld' }, h('span', { class: 'fld-l' }, label), control);
  const input = (key, props) => h('input', { class: 'in', value: f[key], ...props,
    onInput: e => { f[key] = e.target.value; changed(); } });

  const title = input('title', { type: 'text', required: true, enterkeyhint: 'next', autocomplete: 'off' });
  const note = h('textarea', { class: 'ta', rows: '2', onInput: e => { f.note = e.target.value; changed(); } }, f.note);
  const start = input('start', { type: 'time' });
  const end = input('end', { type: 'time' });
  // Ruling V6: an emptied date is ignored (the input goes back to the last date), so core never sees ''.
  const dateIn = h('input', { class: 'in', type: 'date', value: f.date, required: true, onChange: e => {
    if (!e.target.value) { e.target.value = f.date; return; }
    f.date = e.target.value; changed();
  } });

  // Chips are built once; update() flips .on / aria-pressed so focus stays on the tapped chip.
  const repeat = chips({ options: REPEATS, value: f.repeat, onPick: v => { f.repeat = v; changed(); } });
  repeat.setAttribute('aria-label', 'Repeat');
  const days = chips({ options: DAY_NAMES.map((n, i) => ({ value: i, label: n[0] })), value: f.days, multi: true,
    onPick: i => { f.days = toggleDay(f.days, i); changed(); } });
  days.classList.add('days');
  days.setAttribute('aria-label', 'Days');
  const dayButtons = [...days.children];
  dayButtons.forEach((b, i) => b.setAttribute('aria-label', DAY_NAMES[i]));
  const dateField = field('Date', dateIn);
  const error = h('p', { class: 'form-error', role: 'status' });

  const content = h('div', { class: 'form' },
    field('Title', title), field('Note', note),
    h('div', { class: 'fld-2' }, field('Start', start), field('End', end)),
    h('div', { class: 'fld' }, h('span', { class: 'fld-l' }, 'Repeat'), repeat, days),
    dateField, error);

  const sync = (buttons, isOn) => buttons.forEach((b, i) => {
    b.classList.toggle('on', isOn(i));
    b.setAttribute('aria-pressed', String(isOn(i)));
  });
  const problem = () => validateTask(draftFromForm(f));
  function update() {
    sync([...repeat.children], i => REPEATS[i].value === f.repeat);
    sync(dayButtons, i => f.days.includes(i));
    days.hidden = f.repeat !== 'custom';
    dateField.hidden = f.repeat !== 'none';
    const err = problem();
    error.textContent = touched && err ? err : '';
    if (sheet) sheet.actionButton.disabled = !!err;
  }

  update();
  sheet = openSheet({
    title: mode === 'edit' ? 'Edit Task' : 'New Task', action: mode === 'edit' ? 'Done' : 'Add', content,
    isDirty: () => JSON.stringify(f) !== startJson,
    onAction: () => {
      if (problem()) return false;
      const draft = draftFromForm(f);
      app.set(s => (mode === 'edit' ? updateTask(s, task.id, draft) : addTask(s, draft)));
    },
  });
  update();
}
