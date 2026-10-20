// Gym home (gym plan G8): this week's visits against the target, the action buttons, the exercise list entry,
// routines and the last workouts. Logic in gymHomeLogic.js. Start workout and Repeat last workout wait for the
// workout screen (G9); routine and workout rows are read-only until G10 / G11.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { eyebrow, screenTitle, sectionHeading, plate } from '../ui/chrome.js';
import { goldButton } from '../ui/controls.js';
import { GYM_CORRUPT_NOTICE, weekStrip, visitsText, recentWorkouts, routineRows } from './gymHomeLogic.js';
import { ensureExerciseData } from './gymData.js';
import { resetPicker } from './gymPicker.js';

const tile = d => h('div', { class: ['wk', d.visited && 'sel', d.today && 'today'].filter(Boolean).join(' '), role: 'img', 'aria-label': d.label },
  d.name, h('span', null, String(d.day)), d.visited ? icon('check') : h('i', { 'aria-hidden': 'true' }));

const section = (title, aside, body) => h('section', null,
  h('div', { class: 'tk-sh' }, sectionHeading(title), aside && h('span', { class: 't2' }, aside)), body);

const list = rows => h('ul', { class: 'plate list gm-ul' }, rows);

export function renderGymHome(app, { load = ensureExerciseData } = {}) {
  load(); // first Gym open: fetch the bundled list so the picker is ready
  const { gym } = app;
  const v = visitsText(gym, app.today());
  const routines = routineRows(gym);
  const recent = recentWorkouts(gym);

  return [
    h('div', { class: 'tk-hd' }, h('div', null, eyebrow('Lock In'), screenTitle('Gym'))),
    h('div', { class: 'mk', 'aria-hidden': 'true' }),
    app.gymCorrupt && plate.warn(h('p', { class: 'gm-notice', role: 'status' }, icon('warn'), GYM_CORRUPT_NOTICE)),
    section('This week', v.text,
      h('div', { class: 'wks gm-wks', role: 'group', 'aria-label': 'Gym visits this week' }, weekStrip(gym, app.today()).map(tile))),
    h('div', { class: 'gm-actions' },
      goldButton('Start workout', null, { disabled: true }),
      h('button', { type: 'button', class: 'btn-ghost', disabled: true }, 'Repeat last workout')),
    h('a', { href: '#gym/exercises', id: 'gm-exercises', class: 'plate list gm-link', onClick: resetPicker },
      h('div', null, h('div', { class: 'gm-lt' }, 'Exercises'), h('p', { class: 't2 gm-ls' }, 'Browse the list or create your own')),
      icon('chevronRight')),
    section('Routines', null, routines.length
      ? list(routines.map(r => h('li', { class: 'gm-rw' }, h('div', null, h('div', { class: 'gm-rwn' }, r.name), h('div', { class: 'rn' }, r.summary)))))
      : h('p', { class: 'tk-empty' }, 'No routines yet')),
    section('Recent workouts', null, recent.length
      ? list(recent.map(w => h('li', { class: 'gm-rw' },
        h('div', null, h('div', { class: 'gm-rwn' }, w.title), h('div', { class: 'rn' }, w.summary)),
        h('span', { class: 'gm-rwd' }, w.date))))
      : h('p', { class: 'tk-empty' }, 'No workouts yet')),
  ].filter(Boolean);
}
