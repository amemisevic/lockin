// Workout detail (gym plan G11), a pushed route #gym/history/<id>: name, date, length and every set of one finished workout.
// Everything is editable and saved at once through src/core/workouts.js (no Save button, no draft): rename, date (not in the
// future), weight and reps, warm-up, add / remove a set, remove an exercise. Also Save as routine and Delete workout (asks first).
// A refusal (a workout keeps at least one done working set) shows its reason and changes nothing. Logic in gymHistoryLogic.js.
// No timers or clocks: the app has no live timers.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { pushedHeader, rerender } from '../ui/chrome.js';
import { openActionSheet } from '../sheet.js';
import { exerciseMap } from '../core/exercises.js';
import { removeSet, removeExercise, editSet, editWorkout, toggleWarmup, deleteWorkout } from '../core/workouts.js';
import { saveRoutineFromWorkout } from '../core/routines.js';
import { exerciseData, exerciseDataFailed, ensureExerciseData } from './gymData.js';
import { openNameSheet } from './gymNameSheet.js';
import { routineHref } from './gymRoutineLogic.js';
import { NAME_MESSAGE, parseName, parseWeight, parseReps } from './gymWorkoutLogic.js';
import { detailModel, lengthText, checkDate, refusalMessage, addDoneSet } from './gymHistoryLogic.js';

// View state, not saved: the routine just made from a workout, so the screen can say so and link to it.
const view = { saved: null };
export const resetDetailView = () => { view.saved = null; };

export function renderWorkoutDetail(app, id, { data = exerciseData(), load = ensureExerciseData, confirm = openActionSheet, now = Date.now,
  askName = (onDone, placeholder) => openNameSheet(onDone, undefined, { title: 'Save as routine', action: 'Save', label: 'Name', placeholder, required: true }) } = {}) {
  const m = detailModel(app.gym, id);
  if (!m) { app.redirect('#gym/history'); return []; }
  const settled = !!data || exerciseDataFailed();
  if (!settled) load(rerender);
  const names = exerciseMap(data, app.gym);
  const nameOf = eid => names.get(eid)?.name || (settled ? 'Unknown exercise' : 'Loading…');

  // role=alert only while there is a message. One slot for refusals, one under the name field.
  const slot = () => {
    const el = h('p', { class: 'form-error' });
    return { el, say: msg => { el.replaceChildren(msg); if (msg) el.setAttribute('role', 'alert'); else el.removeAttribute('role'); } };
  };
  const err = slot(), nameErr = slot();

  // Reads the stored workout, not the one drawn: typing saves without a repaint (the 30 s re-render skips a focused input).
  const live = (ii, si) => app.gym.workouts.find(w => w.id === id)?.items[ii]?.sets[si];
  const edit = fn => {
    const r = fn(app.gym);
    if (!r.ok) { err.say(refusalMessage(r.reason)); return false; }
    err.say('');
    app.setGym(() => r.state);
    return true;
  };
  // iOS keeps an input focused when a button is tapped, and the re-render guard would then skip the repaint: blur first.
  const act = fn => () => { const a = document.activeElement; if (a?.tagName === 'INPUT') a.blur(); fn(); };

  function field(ii, si, name, key, unit, parse, inputmode) {
    const n = si + 1;
    const s = m.items[ii].sets[si];
    return h('div', { class: 'gw-f' }, h('span', { class: 'gw-u' }, unit),
      h('input', { type: 'text', id: `gh-${key}-${ii}-${si}`, class: 'in gh-in', inputmode, autocomplete: 'off', value: String(s[key]), 'aria-label': `${name}, set ${n} ${key === 'weight' ? 'weight (kg)' : 'reps'}`,
        onInput: e => { const v = parse(e.target.value); if (v !== null && v !== live(ii, si)?.[key]) edit(g => editSet(g, id, ii, si, { [key]: v })); },
        onBlur: e => { e.target.value = String(live(ii, si)?.[key] ?? s[key]); } }));
  }

  // Warm-up, PR and not-done are words in the label, so no state rests on colour or on the button alone.
  const row = (ii, si, name) => {
    const s = m.items[ii].sets[si];
    const label = [`Set ${s.n}`, s.warmup && 'warm-up', s.pr && 'PR', !s.done && 'not done'].filter(Boolean).join(' · ');
    return h('li', { class: 'gw-set' },
      h('div', { class: 'gw-top' },
        h('span', { class: 'gw-n' }, label),
        h('button', { type: 'button', class: 'gw-btn gw-wu', 'aria-pressed': String(s.warmup), 'aria-label': `${name}, set ${s.n} warm-up`, onClick: act(() => edit(g => toggleWarmup(g, id, ii, si))) },
          s.warmup && icon('check'), 'Warm-up'),
        h('button', { type: 'button', class: 'gw-btn gw-x', 'aria-label': `${name}, remove set ${s.n}`, onClick: act(() => edit(g => removeSet(g, id, ii, si))) }, icon('xmark'))),
      h('div', { class: 'gw-fields' }, field(ii, si, name, 'weight', 'kg', parseWeight, 'decimal'), field(ii, si, name, 'reps', 'reps', parseReps, 'numeric')));
  };

  const card = (it, ii) => {
    const name = nameOf(it.exerciseId);
    const drop = () => confirm([{ label: 'Remove exercise', destructive: true, onSelect: () => edit(g => removeExercise(g, id, ii)) }],
      { message: `Remove ${name}? Its sets in this workout are deleted.` });
    return h('section', { class: 'plate gw-card' },
      h('div', { class: 'gw-ch' }, h('h2', { class: 'gw-en' }, name),
        h('button', { type: 'button', class: 'gw-btn', 'aria-label': `Remove ${name}`, onClick: act(drop) }, 'Remove')),
      h('ul', { class: 'gw-sets' }, it.sets.map((_, si) => row(ii, si, name))),
      h('button', { type: 'button', class: 'btn-ghost gw-btn', 'aria-label': `Add set to ${name}`, onClick: act(() => edit(g => addDoneSet(g, id, ii))) }, 'Add set'));
  };

  const nameInput = h('input', { type: 'text', id: 'gh-name', class: 'in', maxlength: '60', autocomplete: 'off', enterkeyhint: 'done', placeholder: 'Workout', value: m.name, 'aria-label': 'Workout name',
    onInput: e => {
      const n = parseName(e.target.value);
      nameErr.say(n === null ? NAME_MESSAGE : '');
      if (n !== null && n !== app.gym.workouts.find(w => w.id === id)?.name) edit(g => editWorkout(g, id, { name: n }));
    },
    onBlur: e => { e.target.value = app.gym.workouts.find(w => w.id === id)?.name ?? m.name; nameErr.say(''); } });

  // A future date is refused here (max also stops the picker); a date that is not a real day is refused by the core.
  const dateInput = h('input', { type: 'date', id: 'gh-date', class: 'in gh-date', value: m.date, max: app.today(), 'aria-label': 'Workout date',
    onChange: e => {
      const d = checkDate(e.target.value, app.today());
      if (!d.ok) { err.say(d.message); return; }
      if (d.date !== app.gym.workouts.find(w => w.id === id)?.date) edit(g => editWorkout(g, id, { date: d.date }));
      else err.say('');
    },
    onBlur: e => { e.target.value = app.gym.workouts.find(w => w.id === id)?.date ?? m.date; } });

  const saveRoutine = () => askName(name => {
    const r = saveRoutineFromWorkout(app.gym, id, now(), name);
    if (!r.ok) { err.say(refusalMessage(r.reason)); return; }
    view.saved = { workoutId: id, routineId: r.id, name };
    app.setGym(() => r.state);
  }, m.name || 'Routine name');
  const remove = () => confirm([{ label: 'Delete workout', destructive: true, onSelect: () => {
    const r = deleteWorkout(app.gym, id);
    if (r.ok) app.setGym(() => r.state);
    app.nav('#gym/history');
  } }], { message: `Delete "${m.name || 'Workout'}"? This can't be undone.` });

  const saved = view.saved?.workoutId === id && app.gym.routines.some(r => r.id === view.saved.routineId) ? view.saved : null;

  return [
    pushedHeader({ title: 'Workout', onBack: () => history.back() }),
    h('div', { class: 'gw' },
      h('div', { class: 'gw-name' }, h('span', { class: 'fld-l' }, 'Name'), nameInput, nameErr.el),
      h('div', { class: 'gw-name' }, h('span', { class: 'fld-l' }, 'Date'), dateInput),
      h('p', { class: 't2 gh-len' }, `Length: ${lengthText(m.minutes)}`),
      err.el,
      m.items.map(card),
      h('div', { class: 'gw-end' },
        saved && h('p', { class: 't2 gh-saved', role: 'status' }, `Saved as routine "${saved.name}".`, ' ', h('a', { href: routineHref(saved.routineId) }, 'Open routine')),
        h('button', { type: 'button', id: 'gh-save-routine', class: 'btn-ghost', 'aria-label': 'Save as routine', onClick: act(saveRoutine) }, 'Save as routine'),
        h('button', { type: 'button', id: 'gh-delete', class: 'btn-ghost', 'aria-label': 'Delete workout', onClick: act(remove) }, 'Delete workout'))),
  ];
}
