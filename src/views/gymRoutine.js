// Routine screen (gym plan G10), a pushed route #gym/routine/<id>: rename, a card per exercise (order, set count, remove),
// Add exercise (the picker in pick mode), Start workout (asks for the optional name) and Delete routine (asks first).
// Every change is saved at once through src/core/routines.js, so there is no Save button and no draft. Logic in
// gymRoutineLogic.js. No timers or clocks: the app has no live timers.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { pushedHeader, rerender } from '../ui/chrome.js';
import { goldButton } from '../ui/controls.js';
import { openActionSheet } from '../sheet.js';
import { exerciseMap } from '../core/exercises.js';
import { openWorkout } from '../core/workouts.js';
import { editRoutine, deleteRoutine } from '../core/routines.js';
import { exerciseData, exerciseDataFailed, ensureExerciseData } from './gymData.js';
import { openNameSheet } from './gymNameSheet.js';
import { resetPicker } from './gymPicker.js';
import { ROUTINE_NAME_MESSAGE, MAX_SETS, parseRoutineName, routineHref, withSetCount, moveItem, newItem, startFromRoutine } from './gymRoutineLogic.js';

const setsText = n => `${n} ${n === 1 ? 'set' : 'sets'}`;

// The picker's pick mode calls this: add the exercise to the routine (sets from last time), then go back to it.
export function pickRoutineExercise(app, routineId, exerciseId, back = () => history.back()) {
  const r = app.gym.routines.find(x => x.id === routineId);
  if (r) {
    app.setGym(g => {
      const res = editRoutine(g, routineId, { items: [...r.items, newItem(g, exerciseId)] });
      return res.ok ? res.state : g;
    });
  }
  back();
}

export function renderRoutine(app, id, { data = exerciseData(), load = ensureExerciseData, confirm = openActionSheet, now = Date.now,
  askName = (onDone, placeholder) => openNameSheet(onDone, undefined, { placeholder }) } = {}) {
  const r = app.gym.routines.find(x => x.id === id);
  if (!r) { app.redirect('#gym'); return []; }
  const settled = !!data || exerciseDataFailed();
  if (!settled) load(rerender);
  const names = exerciseMap(data, app.gym);
  const nameOf = eid => names.get(eid)?.name || (settled ? 'Unknown exercise' : 'Loading…');

  // Reads the stored routine, not the one drawn: typing saves without a repaint (the 30 s re-render skips a focused input).
  const items = () => app.gym.routines.find(x => x.id === id)?.items ?? [];
  const save = patch => app.setGym(g => { const res = editRoutine(g, id, patch); return res.ok ? res.state : g; });
  // iOS keeps an input focused when a button is tapped, and the re-render guard would then skip the repaint: blur first.
  const act = fn => () => { const a = document.activeElement; if (a?.tagName === 'INPUT') a.blur(); fn(); };
  const replaceItem = (i, item) => save({ items: items().map((x, j) => (j === i ? item : x)) });

  const card = (it, i, all) => {
    const name = nameOf(it.exerciseId);
    const n = it.sets.length;
    const drop = () => confirm([{ label: 'Remove exercise', destructive: true, onSelect: () => save({ items: items().filter((_, j) => j !== i) }) }],
      { message: `Remove ${name} from this routine?` });
    return h('section', { class: 'plate gw-card' },
      h('div', { class: 'gw-ch' }, h('h2', { class: 'gw-en' }, name),
        h('button', { type: 'button', class: 'gw-btn', 'aria-label': `Remove ${name}`, onClick: act(drop) }, 'Remove')),
      h('div', { class: 'gr-ctl' },
        h('div', { class: 'gr-mv' },
          h('button', { type: 'button', class: 'gw-step', 'aria-label': `Move ${name} up`, disabled: i === 0, onClick: act(() => save({ items: moveItem(items(), i, -1) })) }, icon('arrowUp')),
          h('button', { type: 'button', class: 'gw-step', 'aria-label': `Move ${name} down`, disabled: i === all.length - 1, onClick: act(() => save({ items: moveItem(items(), i, 1) })) }, icon('arrowDown'))),
        h('div', { class: 'gr-n' },
          h('button', { type: 'button', class: 'gw-step', 'aria-label': `Fewer sets of ${name}`, disabled: n <= 1, onClick: act(() => replaceItem(i, withSetCount(items()[i], n - 1))) }, icon('stpMinus')),
          h('span', { class: 'gr-c' }, setsText(n)),
          h('button', { type: 'button', class: 'gw-step', 'aria-label': `More sets of ${name}`, disabled: n >= MAX_SETS, onClick: act(() => replaceItem(i, withSetCount(items()[i], n + 1))) }, icon('stpPlus')))));
  };

  // Name: every valid keystroke is saved; blank and over 60 are refused with a message (role=alert only while there is one).
  const nameErr = h('p', { class: 'form-error' });
  const say = msg => { nameErr.replaceChildren(msg); if (msg) nameErr.setAttribute('role', 'alert'); else nameErr.removeAttribute('role'); };
  const nameInput = h('input', { type: 'text', id: 'gr-name', class: 'in', maxlength: '60', autocomplete: 'off', enterkeyhint: 'done', value: r.name, 'aria-label': 'Routine name',
    onInput: e => {
      const n = parseRoutineName(e.target.value);
      say(n === null ? ROUTINE_NAME_MESSAGE : '');
      if (n !== null && n !== app.gym.routines.find(x => x.id === id)?.name) save({ name: n });
    },
    onBlur: e => { e.target.value = app.gym.routines.find(x => x.id === id)?.name ?? r.name; say(''); } });

  const busy = !!openWorkout(app.gym);
  const empty = r.items.length === 0;
  const start = () => askName(name => {
    const res = startFromRoutine(app.gym, id, now(), name);
    if (res.ok) app.setGym(() => res.state);
    if (res.ok || res.reason === 'workout-open') app.nav('#gym/workout');
  }, r.name);
  const remove = () => confirm([{ label: 'Delete routine', destructive: true, onSelect: () => {
    const res = deleteRoutine(app.gym, id);
    if (res.ok) app.setGym(() => res.state);
    app.nav('#gym');
  } }], { message: `Delete "${r.name}"? Workouts you did from it stay in your history.` });

  return [
    pushedHeader({ title: 'Routine', onBack: () => history.back() }),
    h('div', { class: 'gw' },
      h('div', { class: 'gw-name' }, h('span', { class: 'fld-l' }, 'Name'), nameInput, nameErr),
      empty ? h('p', { class: 'tk-empty' }, 'No exercises yet. Add one to start.') : r.items.map(card),
      h('a', { href: `${routineHref(id)}/pick`, id: 'gr-add', class: 'btn-ghost gw-add', onClick: resetPicker }, 'Add exercise'),
      h('div', { class: 'gw-end' },
        goldButton('Start workout', act(start), { disabled: busy || empty }),
        busy && h('p', { class: 't2 gr-why' }, 'Finish or discard your open workout first.'),
        !busy && empty && h('p', { class: 't2 gr-why' }, 'Add an exercise to start.'),
        h('button', { type: 'button', class: 'btn-ghost', onClick: act(remove) }, 'Delete routine'))),
  ];
}
