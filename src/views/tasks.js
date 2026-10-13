// Tasks tab (plan Task 11): week strip, the day's once-only tasks, habits due that day, + and ⋯ menu.
// Layout = static/Tasks.html; rules live in src/core/tasks.js (the view only lists and dispatches).
import { h } from '../dom.js';
import { addDays } from '../logic.js';
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

// "Go to today": the plus icon redrawn as a rounded calendar with a dot (a zero-length round-capped stroke).
function todayIcon() {
  const svg = icon('plus');
  for (const [k, v] of [['viewBox', '0 0 22 22'], ['width', 22], ['height', 22], ['stroke-width', 2.4]]) svg.setAttribute(k, v);
  svg.querySelector('path').setAttribute('d', 'M5 4.5h12a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2zM3 9h16M7.5 2.5v3.5M14.5 2.5v3.5M11 14h0');
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

// The viewed date's convention: today is stored as null (app.setViewDate).
const show = (app, key) => app.setViewDate(key === app.today() ? null : key);

// Seven day buttons; today has class "today" (gold number + dot; the dot's space is kept on every day).
// Swipe left/right (≥ 48 px, more horizontal than vertical) = next/previous week; the click that follows a
// swipe is swallowed in the capture phase so it never selects a day (the swiped strip may already be detached).
function weekStrip(app, date) {
  const strip = h('div', { class: 'wks' }, weekOf(date).map((key, i) => h('button', {
    type: 'button', id: `wk-${key}`, class: ['wk', key === date && 'sel', key === app.today() && 'today'].filter(Boolean).join(' '),
    'aria-label': dayLabel(key), 'aria-pressed': String(key === date), 'aria-current': key === app.today() ? 'date' : null,
    onClick: () => show(app, key),
  }, DAY_NAMES[i].slice(0, 3).toUpperCase(), h('span', null, String(Number(key.slice(8)))), h('i', { 'aria-hidden': 'true' }))));
  let start = null;
  let swiped = false;
  strip.addEventListener('pointerdown', e => { start = [e.clientX, e.clientY]; swiped = false; });
  strip.addEventListener('pointercancel', () => { start = null; });
  strip.addEventListener('pointerup', e => {
    if (!start) return;
    const dx = e.clientX - start[0], dy = e.clientY - start[1];
    start = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) return;
    swiped = true;
    show(app, addDays(date, dx < 0 ? 7 : -7));
  });
  strip.addEventListener('click', e => { if (swiped) { swiped = false; e.stopPropagation(); e.preventDefault(); } }, true);
  return strip;
}

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
      // Right-aligned group: the Today icon grows it to the left, so ‹ › + never move (fix round 3).
      h('div', { class: 'tk-nav' },
        !weekOf(date).includes(today) && h('button', { type: 'button', id: 'wk-today', class: 'more tdy', 'aria-label': 'Go to today',
          title: 'Go to today', onClick: () => app.setViewDate(null) }, todayIcon()),
        h('button', { type: 'button', id: 'wk-prev', class: 'more', 'aria-label': 'Previous week', onClick: () => show(app, addDays(date, -7)) }, icon('chevronLeft')),
        h('button', { type: 'button', id: 'wk-next', class: 'more', 'aria-label': 'Next week', onClick: () => show(app, addDays(date, 7)) }, icon('chevronRight')),
        h('button', { type: 'button', id: 'add-task', class: 'add', 'aria-label': 'Add task',
          onClick: () => openTaskSheet(app, { mode: 'new', date: past ? today : date }) }, plusIcon()))),
    h('div', { class: 'mk', 'aria-hidden': 'true' }),
    weekStrip(app, date),
    h('section', null,
      sectionHead('tk-sh', 'The day', once.length > 0 && `${done} of ${once.length} done`),
      once.length ? list(once) : h('p', { class: 'tk-empty' }, 'Nothing planned.')),
    habits.length > 0 && h('section', null, sectionHead('tk-sh hb', 'Habits', 'last 7 days'), list(habits)),
  ].filter(Boolean);
}
