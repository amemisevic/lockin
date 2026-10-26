// Active workout screen (gym plan G9), a pushed route #gym/workout: a card per exercise with last time's sets, set rows
// (warm-up, weight, reps, done), Add set / Add exercise, a name field, the workout length and Finish / Discard.
// Logic in gymWorkoutLogic.js, state changes in src/core/workouts.js. No timers, clocks or rest countdown (G9c, owner
// ruling: the app has no live timers). Finish takes the length in minutes: finishedAt = startedAt + minutes.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { pushedHeader, rerender } from '../ui/chrome.js';
import { goldButton } from '../ui/controls.js';
import { openActionSheet } from '../sheet.js';
import { exerciseMap } from '../core/exercises.js';
import { openWorkout, addExercise, addSet, removeSet, removeExercise, editSet, editWorkout, toggleDone, toggleWarmup, finishWorkout, discardWorkout } from '../core/workouts.js';
import { dayLabel } from './tasksLogic.js';
import { exerciseData, exerciseDataFailed, ensureExerciseData } from './gymData.js';
import { resetPicker } from './gymPicker.js';
import { DEFAULT_MINUTES, NAME_MESSAGE, LENGTH_MESSAGE, parseWeight, parseReps, parseMinutes, parseName, finishTime, stepWeight, stepReps, lastTimeText, markBlank, dropBlankSet, dropBlankItem } from './gymWorkoutLogic.js';

export const NO_SETS = 'Mark at least one working set done to finish.';

// View state, not saved: the typed workout length, so a repaint (logging a set) does not put the 60 back.
// blank: the fields of new sets still empty (ruling C), see gymWorkoutLogic.js.
const view = { length: String(DEFAULT_MINUTES), blank: new Set() };
export const resetWorkoutView = () => { view.length = String(DEFAULT_MINUTES); view.blank = new Set(); };

// The picker's pick mode calls this: add the exercise to the open workout (Prefill from last time), then go back to it.
export function pickExercise(app, id, back = () => history.back()) {
  const w = openWorkout(app.gym);
  if (w) {
    const fresh = !lastTimeText(app.gym, id, w.id); // no history: the fixed default set, shown empty
    const ii = w.items.length;
    app.setGym(g => { const r = addExercise(g, w.id, id); return r.ok ? r.state : g; });
    if (fresh) view.blank = markBlank(view.blank, ii, 0);
  }
  back();
}

export function renderWorkout(app, { data = exerciseData(), load = ensureExerciseData, confirm = openActionSheet } = {}) {
  const w = openWorkout(app.gym);
  if (!w) { app.redirect('#gym'); return []; }
  const wid = w.id;
  const settled = !!data || exerciseDataFailed();
  if (!settled) load(rerender);
  const names = exerciseMap(data, app.gym);
  const nameOf = id => names.get(id)?.name || (settled ? 'Unknown exercise' : 'Loading…');

  // Reads the stored workout, not the one drawn: typing saves without a repaint (the 30 s re-render skips a focused input).
  const live = (ii, si) => openWorkout(app.gym)?.items[ii]?.sets[si];
  const apply = fn => app.setGym(g => { const r = fn(g); return r.ok ? r.state : g; });
  // iOS keeps an input focused when a button is tapped, and the re-render guard would then skip the repaint: blur first.
  const act = fn => () => { const a = document.activeElement; if (a?.tagName === 'INPUT') a.blur(); fn(); };

  // ---- set rows ----

  const emptySet = (ii, si) => view.blank.has(`${ii}/${si}/reps`) || view.blank.has(`${ii}/${si}/weight`);

  function field(ii, si, s, done, { key, unit, aria, parse, step, inputmode }) {
    const n = si + 1;
    const bk = `${ii}/${si}/${key}`;
    const blank = () => view.blank.has(bk);
    const save = v => apply(g => editSet(g, wid, ii, si, { [key]: v }));
    // A step on an empty field enters the placeholder value, so the first tap does not jump past it.
    const move = dir => act(() => { const cur = live(ii, si); if (!cur) return; if (blank()) { view.blank.delete(bk); rerender(); } else save(step(cur[key], dir)); });
    const input = h('input', { type: 'text', id: `gw-${key}-${ii}-${si}`, class: 'in gw-in', inputmode, autocomplete: 'off', value: blank() ? '' : String(s[key]), placeholder: blank() ? String(s[key]) : null, 'aria-label': `Set ${n} ${aria}`,
      onInput: e => {
        const v = parse(e.target.value);
        if (v === null) return;
        if (v !== live(ii, si)?.[key]) save(v);
        if (blank()) { view.blank.delete(bk); if (!emptySet(ii, si)) done.removeAttribute('disabled'); }
      },
      onBlur: e => { if (!blank()) e.target.value = String(live(ii, si)?.[key] ?? s[key]); } });
    return h('div', { class: 'gw-f' }, h('span', { class: 'gw-u' }, unit),
      h('div', { class: 'gw-stp' },
        h('button', { type: 'button', class: 'gw-step', 'aria-label': `Set ${n} ${key} down`, disabled: key === 'weight' ? s.weight <= 0 : s.reps <= 1, onClick: move(-1) }, icon('stpMinus')),
        input,
        h('button', { type: 'button', class: 'gw-step', 'aria-label': `Set ${n} ${key} up`, disabled: key === 'weight' ? s.weight >= 1000 : s.reps >= 999, onClick: move(1) }, icon('stpPlus'))));
  }

  const row = (ii, si, s) => {
    const n = si + 1;
    // Empty fields = not entered: the check stays disabled until reps and weight have a number.
    const blankSet = emptySet(ii, si);
    const done = h('button', { type: 'button', class: 'gw-done', 'aria-pressed': String(s.done), 'aria-label': `Set ${n} done`, disabled: blankSet,
      onClick: act(() => { if (!emptySet(ii, si)) apply(g => toggleDone(g, wid, ii, si)); }) }, s.done && icon('check'));
    return h('li', { class: s.done ? 'gw-set done' : 'gw-set', 'data-k': `s/${ii}/${si}` },
      h('div', { class: 'gw-top' },
        h('span', { class: 'gw-n' }, `Set ${n}`),
        h('button', { type: 'button', class: 'gw-btn gw-wu', 'aria-pressed': String(s.warmup), 'aria-label': `Set ${n} warm-up`, onClick: act(() => apply(g => toggleWarmup(g, wid, ii, si))) },
          s.warmup && icon('check'), 'Warm-up'),
        h('button', { type: 'button', class: 'gw-btn gw-x', 'aria-label': `Remove set ${n}`, onClick: act(() => { view.blank = dropBlankSet(view.blank, ii, si); apply(g => removeSet(g, wid, ii, si)); }) }, icon('xmark')),
        // A tick inside the ring when done, an empty ring when not: shape, not colour.
        done),
      h('div', { class: 'gw-fields' },
        field(ii, si, s, done, { key: 'weight', unit: 'kg', aria: 'weight (kg)', parse: parseWeight, step: stepWeight, inputmode: 'decimal' }),
        field(ii, si, s, done, { key: 'reps', unit: 'reps', aria: 'reps', parse: parseReps, step: stepReps, inputmode: 'numeric' })));
  };

  const card = (it, ii) => {
    const name = nameOf(it.exerciseId);
    const last = lastTimeText(app.gym, it.exerciseId, wid);
    const drop = () => confirm([{ label: 'Remove exercise', destructive: true, onSelect: () => { view.blank = dropBlankItem(view.blank, ii); apply(g => removeExercise(g, wid, ii)); } }],
      { message: `Remove ${name}? Its sets in this workout are deleted.` });
    return h('section', { class: 'plate gw-card' },
      h('div', { class: 'gw-ch' }, h('h2', { class: 'gw-en' }, name),
        h('button', { type: 'button', class: 'gw-btn', 'aria-label': `Remove ${name}`, onClick: act(drop) }, 'Remove')),
      h('p', { class: 't2 gw-last' }, last ? `Last time: ${last}` : 'No history yet'),
      h('ul', { class: 'gw-sets' }, it.sets.map((s, si) => row(ii, si, s))),
      h('button', { type: 'button', class: 'btn-ghost gw-btn', onClick: act(() => { const k = openWorkout(app.gym).items[ii].sets.length; apply(g => addSet(g, wid, ii)); view.blank = markBlank(view.blank, ii, k); }) }, 'Add set'));
  };

  // ---- finish, discard ----
  const err = h('p', { class: 'form-error', role: 'alert' });
  const finish = () => {
    err.replaceChildren();
    const minutes = parseMinutes(view.length);
    if (minutes === null) { err.replaceChildren(LENGTH_MESSAGE); return; }
    const r = finishWorkout(app.gym, wid, finishTime(w.startedAt, minutes));
    if (!r.ok) { err.replaceChildren(r.reason === 'no-sets' ? NO_SETS : 'The workout could not be finished.'); return; }
    resetWorkoutView();
    app.setGym(() => r.state);
    app.nav('#gym');
  };
  const discard = () => confirm([{ label: 'Discard workout', destructive: true, onSelect: () => {
    const r = discardWorkout(app.gym, wid);
    if (r.ok) { resetWorkoutView(); app.setGym(() => r.state); }
    app.nav('#gym');
  } }], { message: 'Discard this workout? Its sets are deleted.' });

  // Name: every valid keystroke is saved (a focused input is not repainted); blank is allowed and shows "Workout".
  const header = pushedHeader({ title: w.name || 'Workout', onBack: () => history.back() });
  const title = header.querySelector('h1');
  const nameErr = h('p', { class: 'form-error' });
  // role=alert only while there is a message, so the screen has one empty alert slot (the Finish message) at rest.
  const say = msg => { nameErr.replaceChildren(msg); if (msg) nameErr.setAttribute('role', 'alert'); else nameErr.removeAttribute('role'); };
  const nameInput = h('input', { type: 'text', id: 'gw-name', class: 'in', maxlength: '60', autocomplete: 'off', enterkeyhint: 'done', placeholder: 'Workout',
    value: w.name, 'aria-label': 'Workout name',
    onInput: e => {
      const n = parseName(e.target.value);
      say(n === null ? NAME_MESSAGE : '');
      if (n === null) return;
      if (n !== openWorkout(app.gym)?.name) apply(g => editWorkout(g, wid, { name: n }));
      title.replaceChildren(n || 'Workout');
    },
    onBlur: e => { e.target.value = openWorkout(app.gym)?.name ?? w.name; say(''); } });
  const lengthInput = h('input', { type: 'text', id: 'gw-length', class: 'in', inputmode: 'numeric', autocomplete: 'off', value: view.length,
    'aria-label': 'Workout length (minutes)', onInput: e => { view.length = e.target.value; } });

  return [
    header,
    h('div', { class: 'gw' },
      w.date !== app.today() && h('p', { class: 't2' }, `Started ${dayLabel(w.date)}`),
      h('div', { class: 'gw-name' }, nameInput, nameErr),
      w.items.length ? w.items.map(card) : h('p', { class: 'tk-empty' }, 'No exercises yet. Add one to start.'),
      h('a', { href: '#gym/pick', id: 'gw-add', class: 'btn-ghost gw-add', onClick: resetPicker }, 'Add exercise'),
      h('div', { class: 'gw-len' }, h('span', { class: 'fld-l' }, 'Workout length (minutes)'), lengthInput),
      err,
      h('div', { class: 'gw-end' },
        goldButton('Finish', act(finish)),
        h('button', { type: 'button', class: 'btn-ghost', onClick: act(discard) }, 'Discard'))),
  ];
}
