// Active workout screen (gym plan G9), a pushed route #gym/workout: a card per exercise with last time's sets, set rows
// (warm-up, weight, reps, done), Add set / Add exercise, Finish and Discard, the elapsed clock and the rest countdown.
// Logic in gymWorkoutLogic.js, state changes in src/core/workouts.js. The clock and the countdown are computed from
// timestamps (the workout's startedAt, the stored rest end), never by counting ticks, so a locked phone cannot make them
// drift; the 1 s timer only repaints them in place. No sound, no notification: the end of the rest is text plus an icon.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { pushedHeader, rerender } from '../ui/chrome.js';
import { goldButton, segmented } from '../ui/controls.js';
import { openActionSheet } from '../sheet.js';
import { exerciseMap } from '../core/exercises.js';
import { openWorkout, addExercise, addSet, removeSet, removeExercise, editSet, toggleDone, toggleWarmup, finishWorkout, discardWorkout } from '../core/workouts.js';
import { dayLabel } from './tasksLogic.js';
import { exerciseData, exerciseDataFailed, ensureExerciseData } from './gymData.js';
import { resetPicker } from './gymPicker.js';
import { REST_CHOICES, DEFAULT_REST, parseWeight, parseReps, stepWeight, stepReps, fmtClock, elapsedSec, restState, lastTimeText } from './gymWorkoutLogic.js';

export const NO_SETS = 'Mark at least one working set done to finish.';

// View state, not saved: the end time of the running rest (ms) and the chosen length. ponytail: lost if iOS discards the page.
const rest = { end: null, len: DEFAULT_REST };
export const resetWorkoutView = () => { rest.end = null; rest.len = DEFAULT_REST; };

// The picker's pick mode calls this: add the exercise to the open workout (Prefill from last time), then go back to it.
export function pickExercise(app, id, back = () => history.back()) {
  const w = openWorkout(app.gym);
  if (w) app.setGym(g => { const r = addExercise(g, w.id, id); return r.ok ? r.state : g; });
  back();
}

export function renderWorkout(app, { data = exerciseData(), load = ensureExerciseData, now = Date.now, every = setInterval, stop = clearInterval, confirm = openActionSheet } = {}) {
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

  // ---- clock and rest, repainted in place ----
  const clock = h('span', { class: 'gw-clock', role: 'timer' });
  const bar = h('div', { class: 'gw-rest' });
  const label = h('span', { class: 'gw-rt' });
  let shown = null; // the bar is rebuilt only when its state changes: a rebuild every second would swallow a tap on Skip
  function paint() {
    const t = now();
    clock.replaceChildren(fmtClock(elapsedSec(w.startedAt, t)));
    const r = restState(rest.end, t);
    if (r.kind !== shown) {
      shown = r.kind;
      bar.removeAttribute('role');
      if (r.kind === 'idle') bar.replaceChildren();
      else {
        bar.setAttribute('role', r.kind === 'over' ? 'status' : 'timer');
        bar.replaceChildren(...[r.kind === 'over' && icon('check'), label,
          h('button', { type: 'button', class: 'gw-btn', onClick: act(() => { rest.end = null; paint(); }) }, r.kind === 'over' ? 'Dismiss' : 'Skip rest')].filter(Boolean));
      }
    }
    if (r.kind !== 'idle') label.replaceChildren(r.kind === 'over' ? r.text : `Rest ${r.text}`);
  }
  paint();
  const timer = every(() => { if (clock.isConnected === false) stop(timer); else paint(); }, 1000);

  // ---- set rows ----
  const toggleSetDone = (ii, si) => {
    const s = live(ii, si);
    if (!s) return;
    if (!s.done && !s.warmup) rest.end = now() + rest.len * 1000; // before the save: it repaints at once
    apply(g => toggleDone(g, wid, ii, si));
  };

  function field(ii, si, s, { key, unit, aria, parse, step, inputmode }) {
    const n = si + 1;
    const save = v => apply(g => editSet(g, wid, ii, si, { [key]: v }));
    const move = dir => act(() => { const cur = live(ii, si); if (cur) save(step(cur[key], dir)); });
    const input = h('input', { type: 'text', id: `gw-${key}-${ii}-${si}`, class: 'in gw-in', inputmode, autocomplete: 'off', value: String(s[key]), 'aria-label': `Set ${n} ${aria}`,
      onInput: e => { const v = parse(e.target.value); if (v !== null && v !== live(ii, si)?.[key]) save(v); },
      onBlur: e => { e.target.value = String(live(ii, si)?.[key] ?? s[key]); } });
    return h('div', { class: 'gw-f' }, h('span', { class: 'gw-u' }, unit),
      h('div', { class: 'gw-stp' },
        h('button', { type: 'button', class: 'gw-step', 'aria-label': `Set ${n} ${key} down`, disabled: key === 'weight' ? s.weight <= 0 : s.reps <= 1, onClick: move(-1) }, icon('stpMinus')),
        input,
        h('button', { type: 'button', class: 'gw-step', 'aria-label': `Set ${n} ${key} up`, disabled: key === 'weight' ? s.weight >= 1000 : s.reps >= 999, onClick: move(1) }, icon('stpPlus'))));
  }

  const row = (ii, si, s) => {
    const n = si + 1;
    return h('li', { class: s.done ? 'gw-set done' : 'gw-set' },
      h('div', { class: 'gw-top' },
        h('span', { class: 'gw-n' }, `Set ${n}`),
        h('button', { type: 'button', class: 'gw-btn gw-wu', 'aria-pressed': String(s.warmup), 'aria-label': `Set ${n} warm-up`, onClick: act(() => apply(g => toggleWarmup(g, wid, ii, si))) },
          s.warmup && icon('check'), 'Warm-up'),
        h('button', { type: 'button', class: 'gw-btn gw-x', 'aria-label': `Remove set ${n}`, onClick: act(() => apply(g => removeSet(g, wid, ii, si))) }, icon('xmark')),
        // A tick inside the ring when done, an empty ring when not: shape, not colour.
        h('button', { type: 'button', class: 'gw-done', 'aria-pressed': String(s.done), 'aria-label': `Set ${n} done`, onClick: act(() => toggleSetDone(ii, si)) }, s.done && icon('check'))),
      h('div', { class: 'gw-fields' },
        field(ii, si, s, { key: 'weight', unit: 'kg', aria: 'weight (kg)', parse: parseWeight, step: stepWeight, inputmode: 'decimal' }),
        field(ii, si, s, { key: 'reps', unit: 'reps', aria: 'reps', parse: parseReps, step: stepReps, inputmode: 'numeric' })));
  };

  const card = (it, ii) => {
    const name = nameOf(it.exerciseId);
    const last = lastTimeText(app.gym, it.exerciseId, wid);
    const drop = () => confirm([{ label: 'Remove exercise', destructive: true, onSelect: () => apply(g => removeExercise(g, wid, ii)) }],
      { message: `Remove ${name}? Its sets in this workout are deleted.` });
    return h('section', { class: 'plate gw-card' },
      h('div', { class: 'gw-ch' }, h('h2', { class: 'gw-en' }, name),
        h('button', { type: 'button', class: 'gw-btn', 'aria-label': `Remove ${name}`, onClick: act(drop) }, 'Remove')),
      h('p', { class: 't2 gw-last' }, last ? `Last time: ${last}` : 'No history yet'),
      h('ul', { class: 'gw-sets' }, it.sets.map((s, si) => row(ii, si, s))),
      h('button', { type: 'button', class: 'btn-ghost gw-btn', onClick: act(() => apply(g => addSet(g, wid, ii))) }, 'Add set'));
  };

  // ---- finish, discard ----
  const err = h('p', { class: 'form-error', role: 'alert' });
  const finish = () => {
    const r = finishWorkout(app.gym, wid, now());
    if (!r.ok) { err.replaceChildren(r.reason === 'no-sets' ? NO_SETS : 'The workout could not be finished.'); return; }
    rest.end = null;
    app.setGym(() => r.state);
    app.nav('#gym');
  };
  const discard = () => confirm([{ label: 'Discard workout', destructive: true, onSelect: () => {
    const r = discardWorkout(app.gym, wid);
    if (r.ok) { rest.end = null; app.setGym(() => r.state); }
    app.nav('#gym');
  } }], { message: 'Discard this workout? Its sets are deleted.' });

  const lengths = segmented({ options: REST_CHOICES.map(v => ({ value: v, label: `${v} s` })), value: rest.len, onPick: v => act(() => { rest.len = v; rerender(); })() });
  lengths.setAttribute('aria-label', 'Rest length');

  return [
    pushedHeader({ title: w.name || 'Workout', onBack: () => history.back() }),
    h('div', { class: 'gw' },
      h('div', { class: 'gw-bar' }, h('span', { class: 't2' }, w.date === app.today() ? 'Elapsed' : `Started ${dayLabel(w.date)}`), clock),
      bar,
      w.items.length ? w.items.map(card) : h('p', { class: 'tk-empty' }, 'No exercises yet. Add one to start.'),
      h('a', { href: '#gym/pick', id: 'gw-add', class: 'btn-ghost gw-add', onClick: resetPicker }, 'Add exercise'),
      h('div', { class: 'gw-len' }, h('span', { class: 't2' }, 'Rest length'), lengths),
      err,
      h('div', { class: 'gw-end' },
        goldButton('Finish', act(finish)),
        h('button', { type: 'button', class: 'btn-ghost', onClick: act(discard) }, 'Discard'))),
  ];
}
