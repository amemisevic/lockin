// Tasks tab (plan Task 11): week strip, the day's once-only tasks, habits due that day, + and ⋯ menu.
// Layout = static/Tasks.html; rules live in src/core/tasks.js (the view only lists and dispatches).
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openActionSheet } from '../sheet.js';
import { tasksOn, moveToTomorrow, skipOn, archiveTask } from '../core/tasks.js';
import { screenTitle, eyebrow, sectionHeading, plate } from '../ui/chrome.js';
import { taskRow } from '../ui/taskRow.js';
import { DAY_NAMES, weekOf, weekLabel, dayLabel } from './tasksLogic.js';
import { openTaskSheet } from './taskSheet.js';

// The board's plus (static/Tasks.html): 22 box, stroke 2.4.
function plusIcon() {
  const svg = icon('plus');
  for (const [k, v] of [['viewBox', '0 0 22 22'], ['width', 22], ['height', 22], ['stroke-width', 2.4]]) svg.setAttribute(k, v);
  svg.querySelector('path').setAttribute('d', 'M11 3v16M3 11h16');
  return svg;
}

// ⋯ menu: every item calls exactly one core function (plan Task 11 step 3, rulings V5 and R2).
function menuItems(app, { task }, date) {
  const edit = { label: 'Edit', onSelect: () => openTaskSheet(app, { mode: 'edit', task, date }) };
  const del = label => ({ label, destructive: true, onSelect: () => app.set(s => archiveTask(s, task.id)) });
  if (task.repeat.type === 'none') {
    return [edit, { label: 'Move to tomorrow', onSelect: () => app.set(s => moveToTomorrow(s, task.id, date)) }, del('Delete')];
  }
  const skip = date === app.today() ? 'Skip today' : 'Skip this day';
  return [edit, { label: skip, onSelect: () => app.set(s => skipOn(s, task.id, date)) }, del('Delete task')];
}

const weekStrip = (app, date) => h('div', { class: 'wks' }, weekOf(date).map((key, i) => h('button', {
  type: 'button', id: `wk-${key}`, class: key === date ? 'wk sel' : 'wk', 'aria-label': dayLabel(key),
  'aria-pressed': String(key === date), 'aria-current': key === app.today() ? 'date' : null,
  onClick: () => app.setViewDate(key === app.today() ? null : key),
}, DAY_NAMES[i].slice(0, 3).toUpperCase(), h('span', null, String(Number(key.slice(8)))))));

export function renderTasks(app) {
  const date = app.viewDate();
  const today = app.today();
  const past = date < today; // past days: read-only except the shield (◆)
  const views = tasksOn(app.state, date);
  const once = views.filter(v => v.task.repeat.type === 'none');
  const habits = views.filter(v => v.task.repeat.type !== 'none');
  const done = once.filter(v => v.status === 'done').length;

  // The note is read in the ⋯ sheet. Past days: only the note, no actions (read-only except the shield).
  const onMenu = view => {
    const message = view.task.note || null;
    if (!past) openActionSheet(menuItems(app, view, date), { message });
    else if (message) openActionSheet([], { message, cancel: 'Close' });
  };
  const list = items => {
    const p = plate(items.map(v => {
      const row = taskRow(app, v, date, { onMenu });
      if (!v.task.note) row.classList.add('nn'); // no note: ⋯ hidden on past days (screens.css .ro .nn)
      return row;
    }));
    p.classList.add('list');
    if (past) p.classList.add('ro');
    return p;
  };
  const sectionHead = (cls, title, aside) => h('div', { class: cls }, sectionHeading(title), aside && h('span', { class: 't2' }, aside));

  return [
    h('div', { class: 'tk-hd' },
      h('div', null, eyebrow(weekLabel(date)), screenTitle('Tasks')),
      h('button', { type: 'button', id: 'add-task', class: 'add', 'aria-label': 'Add task',
        onClick: () => openTaskSheet(app, { mode: 'new', date: past ? today : date }) }, plusIcon())),
    h('div', { class: 'mk', 'aria-hidden': 'true' }),
    weekStrip(app, date),
    h('section', null,
      sectionHead('tk-sh', 'The day', once.length > 0 && `${done} of ${once.length} done`),
      once.length ? list(once) : h('p', { class: 'tk-empty' }, 'Nothing planned.')),
    habits.length > 0 && h('section', null, sectionHead('tk-sh hb', 'Habits', 'last 7 days'), list(habits)),
  ].filter(Boolean);
}
