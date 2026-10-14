import test from 'node:test';
import assert from 'node:assert/strict';
import { ARCHETYPES, NIGHT_ERRORS, newDraft, nightRoute, medIds, liveSuggestion, overrideOptions, canClose, nightForm }
  from '../src/views/checkinNightLogic.js';
import { startChallenge, submitMorning, declareRedo } from '../src/core/challenge.js';
import { closeNight, NIGHT_TEXT } from '../src/core/scoring.js';
import { addTask, setTaskStatus } from '../src/core/tasks.js';
import { importPack } from '../src/core/pack.js';
import { setWarEntry, oathComplete, OATH_KEYS } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Task 16 (night check-in), DOM-free logic. Contract: scratch/t16/brief.md "Logic module API".
const at = (key, h, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
const PROTOCOLS = [{ id: 'p1', title: 'Protocol A', med: 'MED A' }, { id: 'p2', title: 'Protocol B', med: null },
  { id: 'p3', title: 'Protocol C', med: null }];
const RED = [{ id: 'r1', name: 'Red Line A' }, { id: 'r2', name: 'Red Line B' }];
function started(day) {
  let s = defaultState();
  for (const k of OATH_KEYS) s = setWarEntry(s, k, `Text A ${k}`, at(day, 7));
  return ok(startChallenge(s, day, { protocols: PROTOCOLS, redLines: RED, oathComplete: oathComplete(s) }));
}
const morning = (s, day, med = []) => ok(submitMorning(s, day, { target: 'Target Z', risk: '', med }, at(day, 8)));
const draft = patch => ({ ...newDraft(), ...patch });
const ALL_HELD = { protocols: { p1: 'held', p2: 'held', p3: 'held' }, redLines: { r1: 'held', r2: 'held' } };
const PACK = { missions: [], tactics: [{ archetype: 'negotiator', name: 'Tactic A' }] };

test('newDraft: the exact empty shape, a fresh object each call', () => {
  assert.deepEqual(newDraft(), { tasks: {}, protocols: {}, redLines: {}, win: '', archetype: '', tactic: '', other: false,
    text: '', slipNote: '', overrideOpen: false, overrideResult: null, reason: '', error: null });
  const a = newDraft();
  a.tasks.t1 = 'done';
  assert.deepEqual(newDraft().tasks, {});
});

test('ARCHETYPES: the five pack archetype ids in order', () => {
  assert.deepEqual(ARCHETYPES, ['negotiator', 'assassin', 'seducer', 'escapist', 'authority']);
});

test('NIGHT_ERRORS: one plain sentence per closeNight error code; the two core sentences come from NIGHT_TEXT', () => {
  assert.deepEqual(NIGHT_ERRORS, {
    'yesterday-open': NIGHT_TEXT['yesterday-open'],
    'red-line-override': NIGHT_TEXT['red-line-override'],
    closed: 'This day is already closed.',
    'not-active': 'This day is not part of the challenge.',
    'tasks-open': 'Settle every task first.',
    'protocols-unanswered': 'Answer every protocol.',
    'redlines-unanswered': 'Answer every red line.',
    'override-reason': 'Write a reason for the override.',
    'not-closable': 'This day can no longer be closed.',
  });
});

test('nightRoute: form on an open active day, yesterday-open before 04:00, redirect otherwise', () => {
  const mon = '2027-08-02', tue = addDays(mon, 1);
  const s = started(mon);
  assert.deepEqual(nightRoute(s, mon, at(mon, 21)), { kind: 'form' });
  assert.deepEqual(nightRoute(s, tue, at(tue, 1, 30)), { kind: 'yesterday-open', href: `#checkin/night/${mon}` });
  assert.deepEqual(nightRoute(s, mon, at(tue, 1, 30)), { kind: 'form' });
  assert.deepEqual(nightRoute(s, mon, at(tue, 4, 1)), { kind: 'redirect' }); // grace over
  assert.deepEqual(nightRoute(defaultState(), mon, at(mon, 21)), { kind: 'redirect' });
  assert.deepEqual(nightRoute(s, addDays(mon, -1), at(mon, 21)), { kind: 'redirect' }); // before the start
  assert.deepEqual(nightRoute(s, tue, at(mon, 21)), { kind: 'redirect' }); // future
  const closed = ok(closeNight(s, mon, ALL_HELD, at(mon, 21)));
  assert.deepEqual(nightRoute(closed, mon, at(mon, 22)), { kind: 'redirect' });
  for (const bad of [undefined, '', 'x', '2027-13-45']) assert.deepEqual(nightRoute(s, bad, at(mon, 21)), { kind: 'redirect' }, String(bad));
});

test('medIds: the MED ids of that morning, [] without a morning', () => {
  const mon = '2027-08-09';
  assert.deepEqual(medIds(started(mon), mon), []);
  assert.deepEqual(medIds(morning(started(mon), mon, ['p1']), mon), ['p1']);
});

test('liveSuggestion: clean pass, 1 missed, red line crossed', () => {
  const mon = '2027-08-16';
  const s = morning(started(mon), mon);
  assert.deepEqual(liveSuggestion(s, mon, draft(ALL_HELD)), { result: 'passed', reasons: [] });
  assert.deepEqual(liveSuggestion(s, mon, draft({ ...ALL_HELD, protocols: { p1: 'held', p2: 'missed', p3: 'held' } })),
    { result: 'redo', reasons: ['1 protocol missed'] });
  assert.deepEqual(liveSuggestion(s, mon, draft({ ...ALL_HELD, redLines: { r1: 'crossed', r2: 'held' } })),
    { result: 'reset', reasons: ['Red line crossed'] });
});

test('liveSuggestion: unanswered items are left out; MED counts as held; zeroDay, declared Redo and no morning apply', () => {
  const mon = '2027-08-23';
  const s = morning(started(mon), mon, ['p1']);
  assert.deepEqual(liveSuggestion(s, mon, newDraft()), { result: 'passed', reasons: [] });
  assert.deepEqual(liveSuggestion(s, mon, draft({ protocols: { p2: 'missed' } })), { result: 'redo', reasons: ['1 protocol missed'] });
  const zero2 = { ...s, settings: { ...s.settings, zeroDay: 2 } };
  assert.deepEqual(liveSuggestion(zero2, mon, draft({ protocols: { p2: 'missed', p3: 'missed' } })),
    { result: 'reset', reasons: ['2 protocols missed'] });
  const redo = ok(declareRedo(morning(started(mon), mon), mon));
  assert.deepEqual(liveSuggestion(redo, mon, draft(ALL_HELD)), { result: 'redo', reasons: ['Declared Redo'] });
  assert.deepEqual(liveSuggestion(started(mon), mon, draft(ALL_HELD)), { result: 'redo', reasons: ['No morning check-in'] });
});

test('overrideOptions: all three results, only reset once any red line is crossed', () => {
  const mon = '2027-08-30';
  const s = morning(started(mon), mon);
  assert.deepEqual(overrideOptions(s, newDraft()), ['passed', 'redo', 'reset']);
  assert.deepEqual(overrideOptions(s, draft(ALL_HELD)), ['passed', 'redo', 'reset']);
  assert.deepEqual(overrideOptions(s, draft({ redLines: { r1: 'held', r2: 'crossed' } })), ['reset']);
});

test('canClose: needs every open task, every non-MED protocol and every red line answered', () => {
  const mon = '2027-09-06';
  let s = morning(started(mon), mon, ['p1']);
  s = addTask(addTask(addTask(s, { title: 'Task A', date: mon }, 't1'), { title: 'Task B', date: mon }, 't2'),
    { title: 'Task C', date: mon }, 't3');
  s = setTaskStatus(s, mon, 't3', 'done'); // already settled: no answer needed
  const full = { tasks: { t1: 'done', t2: 'stalled' }, protocols: { p2: 'held', p3: 'missed' }, redLines: { r1: 'held', r2: 'held' } };
  assert.equal(canClose(s, mon, newDraft()), false);
  assert.equal(canClose(s, mon, draft(full)), true); // p1 is MED, t3 is not open
  assert.equal(canClose(s, mon, draft({ ...full, tasks: { t1: 'done' } })), false);
  assert.equal(canClose(s, mon, draft({ ...full, protocols: { p2: 'held' } })), false);
  assert.equal(canClose(s, mon, draft({ ...full, redLines: { r1: 'held' } })), false);
  const noMed = morning(started(mon), mon, []);
  assert.equal(canClose(noMed, mon, draft({ protocols: { p2: 'held', p3: 'held' }, redLines: full.redLines })), false);
  assert.equal(canClose(noMed, mon, draft(ALL_HELD)), true);
});

test('canClose with the override open: needs a valid result and a non-blank reason', () => {
  const mon = '2027-09-13';
  const s = morning(started(mon), mon);
  const o = patch => draft({ ...ALL_HELD, overrideOpen: true, ...patch });
  assert.equal(canClose(s, mon, o({})), false);
  assert.equal(canClose(s, mon, o({ overrideResult: 'redo' })), false);
  assert.equal(canClose(s, mon, o({ overrideResult: 'redo', reason: '   ' })), false);
  assert.equal(canClose(s, mon, o({ overrideResult: 'redo', reason: 'Reason A' })), true);
  assert.equal(canClose(s, mon, o({ overrideResult: 'bogus', reason: 'Reason A' })), false);
  const crossed = { redLines: { r1: 'crossed', r2: 'held' } };
  assert.equal(canClose(s, mon, o({ ...crossed, overrideResult: 'passed', reason: 'Reason A' })), false);
  assert.equal(canClose(s, mon, o({ ...crossed, overrideResult: 'reset', reason: 'Reason A' })), true);
  // Closed override: its leftovers do not gate.
  assert.equal(canClose(s, mon, draft({ ...ALL_HELD, overrideResult: 'passed', reason: '' })), true);
});

test('nightForm: the exact closeNight form; MED ids and settled tasks are left out; closeNight accepts it', () => {
  const mon = '2027-09-20';
  let s = importPack(morning(started(mon), mon, ['p1']), PACK);
  s = setTaskStatus(addTask(addTask(s, { title: 'Task A', date: mon }, 't1'), { title: 'Task B', date: mon }, 't2'), mon, 't2', 'done');
  const d = draft({ tasks: { t1: 'stalled', t2: 'failed' }, protocols: { p1: 'missed', p2: 'held', p3: 'missed' },
    redLines: { r1: 'held', r2: 'held' }, win: 'Win A', archetype: 'negotiator', tactic: 'Tactic A', text: 'Text A',
    slipNote: 'Slip A' });
  const form = nightForm(s, mon, d);
  assert.deepEqual(form, { tasks: { t1: 'stalled' }, protocols: { p2: 'held', p3: 'missed' }, redLines: { r1: 'held', r2: 'held' },
    win: 'Win A', bottomG: { archetype: 'negotiator', tactic: 'Tactic A', text: '' }, slipNote: 'Slip A', override: null });
  const closed = ok(closeNight(s, mon, form, at(mon, 21)));
  assert.equal(closed.days[mon].night.protocols.find(p => p.id === 'p1').status, 'med');
  assert.equal(closed.days[mon].result, 'redo');
});

test('nightForm: strings are never null on an empty draft; override null while closed', () => {
  const mon = '2027-09-27';
  const form = nightForm(morning(started(mon), mon), mon, newDraft());
  for (const v of [form.win, form.slipNote, form.bottomG.archetype, form.bottomG.tactic, form.bottomG.text]) assert.equal(typeof v, 'string');
  assert.deepEqual(form.bottomG, { archetype: '', tactic: '', text: '' });
  assert.equal(form.win, '');
  assert.equal(form.slipNote, '');
  assert.equal(form.override, null);
});

test('nightForm bottomG: Something else sends no tactic and the typed text; an archetype without tactics sends the text', () => {
  const mon = '2027-10-04';
  const s = importPack(morning(started(mon), mon), PACK);
  assert.deepEqual(nightForm(s, mon, draft({ archetype: 'negotiator', tactic: 'Tactic A', other: true, text: 'Text A' })).bottomG,
    { archetype: 'negotiator', tactic: '', text: 'Text A' });
  assert.deepEqual(nightForm(s, mon, draft({ archetype: 'assassin', text: 'Text B' })).bottomG,
    { archetype: 'assassin', tactic: '', text: 'Text B' });
  // No pack at all: no tactics for any archetype, the text goes through.
  assert.deepEqual(nightForm(morning(started(mon), mon), mon, draft({ archetype: 'escapist', text: 'Text C' })).bottomG,
    { archetype: 'escapist', tactic: '', text: 'Text C' });
});

test('nightForm override: {result, reason} while open, null when closed again', () => {
  const mon = '2027-10-11';
  const s = morning(started(mon), mon);
  const open = draft({ ...ALL_HELD, overrideOpen: true, overrideResult: 'redo', reason: 'Reason A' });
  assert.deepEqual(nightForm(s, mon, open).override, { result: 'redo', reason: 'Reason A' });
  assert.equal(nightForm(s, mon, { ...open, overrideOpen: false }).override, null);
  const closed = ok(closeNight(s, mon, nightForm(s, mon, open), at(mon, 21)));
  assert.equal(closed.days[mon].result, 'redo');
  assert.deepEqual(closed.days[mon].night.override, { result: 'redo', reason: 'Reason A' });
});
