// Gym home (gym plan G8, G9): this week's visits against the target, Start (asks for a name first) / Resume workout and Repeat last workout,
// the exercise list entry, routines (each row opens the routine, G10; New routine asks for a name), the last workouts
// (each row opens its detail, G11) and a History row for the full list. Logic in gymHomeLogic.js.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { eyebrow, screenTitle, sectionHeading, plate, rerender } from '../ui/chrome.js';
import { goldButton } from '../ui/controls.js';
import { weekKeys } from '../core/gymstats.js';
import { openWorkout } from '../core/workouts.js';
import { createRoutine } from '../core/routines.js';
import { begin } from './gymWorkoutLogic.js';
import { openNameSheet } from './gymNameSheet.js';
import { routineHref } from './gymRoutineLogic.js';
import { GYM_CORRUPT_NOTICE, weekStrip, visitsText, recentWorkouts, routineRows, isCurrentWeek, shiftWeek, weekHeading } from './gymHomeLogic.js';
import { ensureExerciseData } from './gymData.js';
import { resetPicker } from './gymPicker.js';
import { historyRow } from './gymHistory.js';
import { historySummary } from './gymHistoryLogic.js';

// The shown week is view state only (null = today's week); it is not saved and the 30 s re-render keeps it.
let shown = null;
export const resetGymHome = () => { shown = null; };

// Today's tile also swaps the weekday for the word TODAY (the aria-label still names the day) and gets a ring in gym.css.
const tile = d => h('div', { class: ['wk', d.visited && 'sel', d.today && 'today'].filter(Boolean).join(' '), role: 'img', 'aria-label': d.label,
  'aria-current': d.today ? 'date' : null },
  d.today ? 'TODAY' : d.name, h('span', null, String(d.day)), d.visited ? icon('check') : h('i', { 'aria-hidden': 'true' }));

const section = (title, aside, body) => h('section', null,
  h('div', { class: 'tk-sh' }, sectionHeading(title), aside && h('span', { class: 't2' }, aside)), body);

const list = rows => h('ul', { class: 'plate list gm-ul' }, rows);

const askRoutineName = onDone => openNameSheet(onDone, undefined, { title: 'New routine', action: 'Create', label: 'Name', placeholder: 'Routine name', required: true });

export function renderGymHome(app, { load = ensureExerciseData, now = Date.now, askName = openNameSheet, askNewRoutine = askRoutineName } = {}) {
  load(); // first Gym open: fetch the bundled list so the picker is ready
  const { gym } = app;
  const today = app.today();
  const key = shown && !isCurrentWeek(shown, today) ? shown : today;
  const current = key === today;
  const go = week => { shown = week; rerender(); };
  const heading = weekHeading(key, today);
  const v = visitsText(gym, key);
  const routines = routineRows(gym);
  const recent = recentWorkouts(gym, 5, weekKeys(key)[6]);
  const open = openWorkout(gym);
  // The date is begin's parameter (default today), so a later task can start a workout on a past day.
  const start = (repeat, name = '') => {
    const r = begin(app.gym, now(), { repeat, name });
    if (r.ok) app.setGym(() => r.state);
    if (r.ok || r.reason === 'workout-open') app.nav('#gym/workout');
  };

  // The new routine opens at once so its exercises can be added.
  const create = name => {
    const r = createRoutine(app.gym, now(), name);
    if (!r.ok) return;
    app.setGym(() => r.state);
    app.nav(routineHref(r.id));
  };

  return [
    h('div', { class: 'tk-hd' }, h('div', null, eyebrow('Lock In'), screenTitle('Gym')),
      // Same pattern as Tasks: Today grows to the left so the two arrows never move.
      h('div', { class: 'tk-nav' },
        !current && h('button', { type: 'button', id: 'gm-today', class: 'more tdy gm-today', onClick: () => go(null) }, 'Today'),
        h('button', { type: 'button', id: 'gm-prev', class: 'more', 'aria-label': 'Previous week', onClick: () => go(shiftWeek(key, today, -1)) }, icon('chevronLeft')),
        h('button', { type: 'button', id: 'gm-next', class: 'more', 'aria-label': 'Next week', onClick: () => go(shiftWeek(key, today, 1)) }, icon('chevronRight')))),
    h('div', { class: 'mk', 'aria-hidden': 'true' }),
    app.gymCorrupt && plate.warn(h('p', { class: 'gm-notice', role: 'status' }, icon('warn'), GYM_CORRUPT_NOTICE)),
    section(heading, v.text,
      h('div', { class: 'wks gm-wks', role: 'group', 'aria-label': current ? 'Gym visits this week' : `Gym visits, ${heading}` }, weekStrip(gym, key, today).map(tile))),
    h('div', { class: 'gm-actions' },
      goldButton(open ? 'Resume workout' : 'Start workout', () => (open ? app.nav('#gym/workout') : askName(name => start(false, name)))),
      h('button', { type: 'button', class: 'btn-ghost', disabled: !!open || !gym.workouts.some(w => w.finishedAt !== null), onClick: () => start(true) }, 'Repeat last workout')),
    h('a', { href: '#gym/exercises', id: 'gm-exercises', class: 'plate list gm-link', onClick: resetPicker },
      h('div', null, h('div', { class: 'gm-lt' }, 'Exercises'), h('p', { class: 't2 gm-ls' }, 'Browse the list or create your own')),
      icon('chevronRight')),
    section('Routines', null, [
      h('button', { type: 'button', id: 'gm-new-routine', class: 'btn-ghost gm-new', onClick: () => askNewRoutine(create) }, 'New routine'),
      routines.length
        ? list(routines.map(r => h('li', { class: 'gm-rli' }, h('a', { href: routineHref(r.id), class: 'gm-rw gm-rl' },
          h('div', null, h('div', { class: 'gm-rwn' }, r.name), h('div', { class: 'rn' }, r.summary)), icon('chevronRight')))))
        : h('p', { class: 'tk-empty' }, 'No routines yet')]),
    section('Recent workouts', null, recent.length
      ? list(recent.map(historyRow))
      : h('p', { class: 'tk-empty' }, 'No workouts yet')),
    h('a', { href: '#gym/history', id: 'gm-history', class: 'plate list gm-link' },
      h('div', null, h('div', { class: 'gm-lt' }, 'History'), h('p', { class: 't2 gm-ls' }, historySummary(gym))),
      icon('chevronRight')),
  ].filter(Boolean);
}
