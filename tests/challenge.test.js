import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/core/challenge.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// 2026-10-12 is a Monday.
const MON = '2026-10-12', TUE = '2026-10-13', WED = '2026-10-14', SUN = '2026-10-18', NEXT_MON = '2026-10-19';

const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const at = (dayOffset, h, min = 0) => new Date(2026, 9, 12 + dayOffset, h, min).getTime();

const PROTOCOLS = [
  { id: 'pa', title: 'Protocol A', med: 'Short version A' },
  { id: 'pb', title: 'Protocol B', med: null },
  { id: 'pc', title: 'Protocol C', med: '  ' },
  { id: 'pd', title: 'Protocol D', med: 'Short version D' },
];
const RED_LINES = [{ id: 'ra', name: 'Red line A' }];
const challenge = (o = {}) => ({ startDate: MON, length: 30, protocols: PROTOCOLS, redLines: RED_LINES, redoUsed: null, ...o });
const day = (o = {}) => ({ morning: null, afternoon: null, declaredRedo: false, slipNote: '', incompleteMorning: false,
  auto: null, night: null, result: null, closedAt: null, ...o });
const morning = (med = []) => ({ at: 1, target: 'Target A', risk: '', med });
const st = ({ days = {}, settings = {}, ch = {}, recovery = {} } = {}) => deepFreeze({
  ...defaultState(), settings: { ...defaultState().settings, ...settings }, challenge: challenge(ch), days, recovery,
});
const noChallenge = () => deepFreeze(defaultState());
const pendingRecovery = (filedAt = null) => ({ '2026-10-11': { dueAt: 1, filedAt, state: '', time: '', place: '', decision: '', change: '' } });
const form = (o = {}) => ({ target: 'Target A', risk: '', med: [], ...o });
const valid = s => assert.equal(validateState(s), null);

const NOT_ACTIVE = 'The challenge is not active today.';
const CLOSED = 'This day is already closed.';
const START_FORM = { protocols: [PROTOCOLS[0]], redLines: RED_LINES, oathComplete: true };

// ---- startChallenge / dayNo / phase ----

test('startChallenge refuses without oath, protocols or red lines', () => {
  const s = noChallenge();
  assert.deepEqual(C.startChallenge(s, MON, { ...START_FORM, oathComplete: false }),
    { ok: false, error: 'Write your Contract, Funeral and Code first.' });
  assert.deepEqual(C.startChallenge(s, MON, { ...START_FORM, protocols: [] }), { ok: false, error: 'Add at least one protocol.' });
  assert.deepEqual(C.startChallenge(s, MON, { ...START_FORM, redLines: [] }), { ok: false, error: 'Add at least one red line.' });
});

test('startChallenge refusal order: oath, then protocols, then red lines', () => {
  const s = noChallenge();
  assert.equal(C.startChallenge(s, MON, { protocols: [], redLines: [], oathComplete: false }).error,
    'Write your Contract, Funeral and Code first.');
  assert.equal(C.startChallenge(s, MON, { protocols: [], redLines: [], oathComplete: true }).error, 'Add at least one protocol.');
});

test('startChallenge with all three starts a 30-day challenge today', () => {
  const s = noChallenge();
  const r = C.startChallenge(s, MON, deepFreeze({ ...START_FORM }));
  assert.equal(r.ok, true);
  valid(r.state);
  const c = r.state.challenge;
  assert.equal(c.startDate, MON);
  assert.equal(c.length, 30);
  assert.equal(c.redoUsed, null);
  assert.deepEqual(c.protocols, START_FORM.protocols);
  assert.deepEqual(c.redLines, START_FORM.redLines);
  assert.notEqual(c.protocols, START_FORM.protocols);
  assert.notEqual(c.redLines, START_FORM.redLines);
  assert.equal(C.dayNo(r.state, MON), 1);
  assert.equal(C.dayNo(r.state, addDays(MON, 9)), 10);
});

test('startChallenge refuses when a challenge already exists (checked first)', () => {
  const s = st();
  assert.deepEqual(C.startChallenge(s, TUE, START_FORM), { ok: false, error: 'The challenge has already started.' });
  assert.deepEqual(C.startChallenge(s, TUE, { protocols: [], redLines: [], oathComplete: false }),
    { ok: false, error: 'The challenge has already started.' });
  assert.equal(s.challenge.startDate, MON);
});

test('dayNo and phase: none, before, active days 1..30, finished from day 31', () => {
  assert.equal(C.dayNo(noChallenge(), MON), null);
  assert.equal(C.phase(noChallenge(), MON), 'none');
  const s = st();
  assert.equal(C.dayNo(s, addDays(MON, -1)), null);
  assert.equal(C.phase(s, addDays(MON, -1)), 'before');
  assert.equal(C.phase(s, MON), 'active');
  assert.equal(C.dayNo(s, addDays(MON, 29)), 30);
  assert.equal(C.phase(s, addDays(MON, 29)), 'active');
  assert.equal(C.dayNo(s, addDays(MON, 30)), 31);
  assert.equal(C.phase(s, addDays(MON, 30)), 'finished');
});

// ---- forcedFullPass ----

test('forcedFullPass: true after reset and after a declared Redo; false after plain redo, passed, or nothing', () => {
  const closed = result => st({ days: { [MON]: day({ result, closedAt: 1 }) } });
  assert.equal(C.forcedFullPass(closed('reset'), TUE), true);
  assert.equal(C.forcedFullPass(closed('redo'), TUE), false);
  assert.equal(C.forcedFullPass(closed('passed'), TUE), false);
  assert.equal(C.forcedFullPass(st({ days: { [MON]: day({ declaredRedo: true, result: 'redo', closedAt: 1 }) } }), TUE), true);
  assert.equal(C.forcedFullPass(st({ days: { [MON]: day({ declaredRedo: true }) } }), TUE), true);
  assert.equal(C.forcedFullPass(st(), TUE), false);
  assert.equal(C.forcedFullPass(closed('reset'), MON), false);
});

// ---- medCheck / medUsedInWeek ----

test('medCheck: ok for a protocol with MED text; no-med for null or blank; no-protocol for red line, unknown, no challenge', () => {
  const s = st();
  assert.deepEqual(C.medCheck(s, MON, 'pa'), { ok: true });
  assert.deepEqual(C.medCheck(s, MON, 'pb'), { ok: false, reason: 'no-med' });
  assert.deepEqual(C.medCheck(s, MON, 'pc'), { ok: false, reason: 'no-med' });
  assert.deepEqual(C.medCheck(s, MON, 'ra'), { ok: false, reason: 'no-protocol' });
  assert.deepEqual(C.medCheck(s, MON, 'zz'), { ok: false, reason: 'no-protocol' });
  assert.deepEqual(C.medCheck(noChallenge(), MON, 'pa'), { ok: false, reason: 'no-protocol' });
});

test('medCheck: forced after a reset day and after a declared Redo day', () => {
  assert.deepEqual(C.medCheck(st({ days: { [MON]: day({ result: 'reset', closedAt: 1 }) } }), TUE, 'pa'), { ok: false, reason: 'forced' });
  assert.deepEqual(C.medCheck(st({ days: { [MON]: day({ declaredRedo: true }) } }), TUE, 'pa'), { ok: false, reason: 'forced' });
});

test('medCheck order: no-protocol, no-med, forced, cap', () => {
  const s = st({ settings: { medPerWeek: 0 }, days: { [MON]: day({ result: 'reset', closedAt: 1 }) } });
  assert.deepEqual(C.medCheck(s, TUE, 'ra'), { ok: false, reason: 'no-protocol' });
  assert.deepEqual(C.medCheck(s, TUE, 'pb'), { ok: false, reason: 'no-med' });
  assert.deepEqual(C.medCheck(s, TUE, 'pa'), { ok: false, reason: 'forced' });
  assert.deepEqual(C.medCheck(s, WED, 'pa'), { ok: false, reason: 'cap' });
});

test('MED cap: two on Mon + Tue block a third on Wed; next Monday resets the count', () => {
  let s = st({ settings: { medPerWeek: 2 } });
  s = deepFreeze(C.submitMorning(s, MON, form({ med: ['pa'] }), at(0, 7)).state);
  s = deepFreeze(C.submitMorning(s, TUE, form({ med: ['pa'] }), at(1, 7)).state);
  assert.equal(C.medUsedInWeek(s, WED), 2);
  assert.deepEqual(C.medCheck(s, WED, 'pa'), { ok: false, reason: 'cap' });
  assert.deepEqual(C.submitMorning(s, WED, form({ med: ['pa'] }), at(2, 7)), { ok: false, error: 'Weekly limit reached.' });
  assert.equal(C.medUsedInWeek(s, NEXT_MON), 0);
  assert.deepEqual(C.medCheck(s, NEXT_MON, 'pa'), { ok: true });
});

test('medPerWeek 0: the first MED is refused as cap', () => {
  const s = st({ settings: { medPerWeek: 0 } });
  assert.deepEqual(C.medCheck(s, MON, 'pa'), { ok: false, reason: 'cap' });
  assert.deepEqual(C.submitMorning(s, MON, form({ med: ['pa'] }), at(0, 7)), { ok: false, error: 'Weekly limit reached.' });
});

test('medUsedInWeek: Sunday counts toward the week that started the previous Monday; next Monday is a new week', () => {
  const s = st({ days: {
    [SUN]: day({ morning: morning(['pa', 'pd']) }),
    [NEXT_MON]: day({ morning: morning(['pa']) }),
  } });
  assert.equal(C.medUsedInWeek(s, MON), 2);
  assert.equal(C.medUsedInWeek(s, SUN), 2);
  assert.equal(C.medUsedInWeek(s, NEXT_MON), 1);
  assert.equal(C.medUsedInWeek(s, addDays(NEXT_MON, 6)), 1);
});

// ---- submitMorning ----

test('submitMorning: needs a target', () => {
  const s = st();
  assert.deepEqual(C.submitMorning(s, MON, form({ target: '' }), at(0, 7)), { ok: false, error: 'Write today\'s #1 target.' });
  assert.deepEqual(C.submitMorning(s, MON, form({ target: '   ' }), at(0, 7)), { ok: false, error: 'Write today\'s #1 target.' });
  assert.deepEqual(C.submitMorning(s, MON, { risk: '' }, at(0, 7)), { ok: false, error: 'Write today\'s #1 target.' });
});

test('submitMorning stores morning with med; a second call is refused', () => {
  const s = st();
  const r = C.submitMorning(s, MON, form({ risk: 'Risk A', med: ['pa'] }), at(0, 7));
  assert.equal(r.ok, true);
  valid(r.state);
  assert.deepEqual(r.state.days[MON], day({ morning: { at: at(0, 7), target: 'Target A', risk: 'Risk A', med: ['pa'] } }));
  assert.deepEqual(C.submitMorning(deepFreeze(r.state), MON, form(), at(0, 8)),
    { ok: false, error: 'Morning check-in is already filed.' });
});

test('submitMorning defaults risk and med, dedupes med, keeps existing day fields', () => {
  const s = st({ days: { [MON]: day({ declaredRedo: true, slipNote: 'Note A' }) }, ch: { redoUsed: MON } });
  const r = C.submitMorning(s, MON, { target: 'Target A' }, at(0, 7));
  assert.equal(r.ok, true);
  valid(r.state);
  assert.deepEqual(r.state.days[MON], day({ declaredRedo: true, slipNote: 'Note A',
    morning: { at: at(0, 7), target: 'Target A', risk: '', med: [] } }));
  const r2 = C.submitMorning(st(), MON, form({ med: ['pa', 'pa'] }), at(0, 7));
  assert.deepEqual(r2.state.days[MON].morning.med, ['pa']);
  assert.equal(C.medUsedInWeek(r2.state, MON), 1);
});

test('submitMorning with a failing MED id is refused as a whole (no partial write)', () => {
  const s = st();
  assert.deepEqual(C.submitMorning(s, MON, form({ med: ['pa', 'pb'] }), at(0, 7)),
    { ok: false, error: 'This protocol has no MED version.' });
  assert.deepEqual(C.submitMorning(s, MON, form({ med: ['ra'] }), at(0, 7)),
    { ok: false, error: 'This protocol has no MED version.' });
  assert.equal(s.days[MON], undefined);
});

test('submitMorning: MED refused on a forced full pass, with the cause', () => {
  const afterReset = st({ days: { [MON]: day({ result: 'reset', closedAt: 1 }) } });
  assert.deepEqual(C.submitMorning(afterReset, TUE, form({ med: ['pa'] }), at(1, 7)),
    { ok: false, error: 'No MED today. Yesterday was a Reset.' });
  const afterRedo = st({ days: { [MON]: day({ declaredRedo: true, result: 'redo', closedAt: 1 }) }, ch: { redoUsed: MON } });
  assert.deepEqual(C.submitMorning(afterRedo, TUE, form({ med: ['pa'] }), at(1, 7)),
    { ok: false, error: 'No MED today. Yesterday was a declared Redo.' });
  const ok = C.submitMorning(afterReset, TUE, form(), at(1, 7));
  assert.equal(ok.ok, true);
  valid(ok.state);
});

test('submitMorning counts MED ids in the same submit toward the weekly cap', () => {
  const s = st({ settings: { medPerWeek: 2 }, days: { [MON]: day({ morning: morning(['pa']), result: 'passed', closedAt: 1 }) } });
  assert.deepEqual(C.submitMorning(s, TUE, form({ med: ['pa', 'pd'] }), at(1, 7)), { ok: false, error: 'Weekly limit reached.' });
  const r = C.submitMorning(s, TUE, form({ med: ['pd'] }), at(1, 7));
  assert.equal(r.ok, true);
  valid(r.state);
  assert.equal(C.medUsedInWeek(r.state, TUE), 2);
});

test('submitMorning refused when not active or closed, in the R3-2 order', () => {
  const s = st();
  assert.deepEqual(C.submitMorning(s, addDays(MON, -1), form(), at(-1, 7)), { ok: false, error: NOT_ACTIVE });
  assert.deepEqual(C.submitMorning(s, addDays(MON, 30), form(), at(30, 7)), { ok: false, error: NOT_ACTIVE });
  assert.deepEqual(C.submitMorning(noChallenge(), MON, form(), at(0, 7)), { ok: false, error: NOT_ACTIVE });
  assert.deepEqual(C.submitMorning(s, addDays(MON, -1), form({ target: '' }), at(-1, 7)), { ok: false, error: NOT_ACTIVE });
  const closed = st({ days: { [MON]: day({ result: 'passed', closedAt: 1 }) } });
  assert.deepEqual(C.submitMorning(closed, MON, form(), at(0, 7)), { ok: false, error: CLOSED });
  assert.deepEqual(C.submitMorning(st({ days: { [MON]: day({ closedAt: 1 }) } }), MON, form(), at(0, 7)), { ok: false, error: CLOSED });
  const closedWithMorning = st({ days: { [MON]: day({ morning: morning(), result: 'passed', closedAt: 1 }) } });
  assert.deepEqual(C.submitMorning(closedWithMorning, MON, form(), at(0, 7)), { ok: false, error: CLOSED });
  const filed = st({ days: { [MON]: day({ morning: morning() }) } });
  assert.deepEqual(C.submitMorning(filed, MON, form({ target: '' }), at(0, 7)),
    { ok: false, error: 'Morning check-in is already filed.' });
  assert.deepEqual(C.submitMorning(s, MON, form({ target: '', med: ['pb'] }), at(0, 7)),
    { ok: false, error: 'Write today\'s #1 target.' });
});

test('submitMorning is not retroactive: a second submit carrying MED is refused, med unchanged', () => {
  const s = st({ days: { [MON]: day({ morning: morning() }) } });
  assert.deepEqual(C.submitMorning(s, MON, form({ med: ['pa'] }), at(0, 9)),
    { ok: false, error: 'Morning check-in is already filed.' });
  assert.deepEqual(s.days[MON].morning.med, []);
});

// ---- submitAfternoon ----

test('submitAfternoon: friction kept only when struggling; no morning needed', () => {
  const s = st();
  const a = C.submitAfternoon(s, MON, { onTrack: 'struggling', friction: 'Friction A' }, at(0, 13));
  valid(a);
  assert.deepEqual(a.days[MON], day({ afternoon: { at: at(0, 13), onTrack: 'struggling', friction: 'Friction A' } }));
  const b = C.submitAfternoon(s, MON, { onTrack: 'no', friction: 'Friction A' }, at(0, 13));
  valid(b);
  assert.deepEqual(b.days[MON].afternoon, { at: at(0, 13), onTrack: 'no', friction: '' });
  assert.equal(C.submitAfternoon(s, MON, { onTrack: 'struggling' }, at(0, 13)).days[MON].afternoon.friction, '');
});

test('submitAfternoon: re-submit replaces; existing morning kept', () => {
  const s = st({ days: { [MON]: day({ morning: morning(['pa']) }) } });
  const a = deepFreeze(C.submitAfternoon(s, MON, { onTrack: 'struggling', friction: 'Friction A' }, at(0, 13)));
  const b = C.submitAfternoon(a, MON, { onTrack: 'yes', friction: 'Friction B' }, at(0, 14));
  valid(b);
  assert.deepEqual(b.days[MON], day({ morning: morning(['pa']), afternoon: { at: at(0, 14), onTrack: 'yes', friction: '' } }));
});

test('submitAfternoon returns the same state when not active, closed, or onTrack invalid', () => {
  const s = st();
  const f = { onTrack: 'yes', friction: '' };
  assert.equal(C.submitAfternoon(s, addDays(MON, -1), f, at(-1, 13)), s);
  assert.equal(C.submitAfternoon(s, addDays(MON, 30), f, at(30, 13)), s);
  const none = noChallenge();
  assert.equal(C.submitAfternoon(none, MON, f, at(0, 13)), none);
  const closed = st({ days: { [MON]: day({ result: 'passed', closedAt: 1 }) } });
  assert.equal(C.submitAfternoon(closed, MON, f, at(0, 13)), closed);
  assert.equal(C.submitAfternoon(s, MON, { onTrack: 'maybe', friction: '' }, at(0, 13)), s);
});

// ---- declareRedo ----

test('declareRedo sets redoUsed and the day flag; a second call on any day is refused', () => {
  const s = st();
  const r = C.declareRedo(s, MON);
  assert.equal(r.ok, true);
  valid(r.state);
  assert.equal(r.state.challenge.redoUsed, MON);
  assert.deepEqual(r.state.days[MON], day({ declaredRedo: true }));
  const used = deepFreeze(r.state);
  assert.deepEqual(C.declareRedo(used, MON), { ok: false, error: 'Your one declared Redo is already used.' });
  assert.deepEqual(C.declareRedo(used, TUE), { ok: false, error: 'Your one declared Redo is already used.' });
});

test('declareRedo refused after the day is closed, before start, or with no challenge', () => {
  const closed = st({ days: { [MON]: day({ result: 'passed', closedAt: 1 }) } });
  assert.deepEqual(C.declareRedo(closed, MON), { ok: false, error: CLOSED });
  assert.deepEqual(C.declareRedo(st(), addDays(MON, -1)), { ok: false, error: NOT_ACTIVE });
  assert.deepEqual(C.declareRedo(st(), addDays(MON, 30)), { ok: false, error: NOT_ACTIVE });
  assert.deepEqual(C.declareRedo(noChallenge(), MON), { ok: false, error: NOT_ACTIVE });
  assert.deepEqual(C.declareRedo(st({ ch: { redoUsed: MON } }), addDays(MON, -1)),
    { ok: false, error: 'Your one declared Redo is already used.' });
});

test('declareRedo leaves an existing morning intact', () => {
  const s = st({ days: { [MON]: day({ morning: morning(['pa']) }) } });
  const r = C.declareRedo(s, MON);
  assert.equal(r.ok, true);
  valid(r.state);
  assert.deepEqual(r.state.days[MON], day({ morning: morning(['pa']), declaredRedo: true }));
});

// ---- Review Focus 4: rule edits never rewrite history ----

test('closed day D keeps its result and night snapshot after zeroDay and protocols change', () => {
  const night = {
    at: 2,
    protocols: [
      { id: 'pa', title: 'Protocol A', status: 'missed' },
      { id: 'pb', title: 'Protocol B', status: 'missed' },
      { id: 'pd', title: 'Protocol D', status: 'missed' },
    ],
    redLines: [{ id: 'ra', name: 'Red line A', status: 'held' }],
    win: '', bottomG: { archetype: 'negotiator', tactic: '', text: '' }, suggested: 'reset', override: null,
  };
  const s = st({ days: { [MON]: day({ morning: morning(), night, result: 'reset', closedAt: 3 }) } });
  valid(s);
  const snapshot = structuredClone(s.days[MON]);
  const e = deepFreeze({ ...s, settings: { ...s.settings, zeroDay: 5 }, challenge: { ...s.challenge, protocols: [] } });
  valid(e);
  assert.equal(C.forcedFullPass(e, TUE), true);
  assert.deepEqual(C.medCheck(e, TUE, 'pa'), { ok: false, reason: 'no-protocol' });
  const m = C.submitMorning(e, TUE, form(), at(1, 7));
  assert.equal(m.ok, true);
  const r = C.declareRedo(deepFreeze(m.state), TUE);
  assert.equal(r.ok, true);
  valid(r.state);
  assert.deepEqual(e.days[MON], snapshot);
  assert.deepEqual(r.state.days[MON], snapshot);
  assert.equal(r.state.days[MON].result, 'reset');
});

// ---- nextAction ----

test('nextAction constants', () => {
  assert.equal(C.NIGHT_FROM, 18);
  assert.equal(C.AFTERNOON_FROM, 12);
});

test('nextAction: morning at 07:00; afternoon at 13:00 after morning; night at 19:00', () => {
  assert.equal(C.nextAction(st(), new Date(2026, 9, 12, 7, 0).getTime()), 'morning');
  const s = st({ days: { [MON]: day({ morning: morning() }) } });
  assert.equal(C.nextAction(s, at(0, 13)), 'afternoon');
  assert.equal(C.nextAction(s, at(0, 19)), 'night');
});

test('nextAction boundaries: 11:59 none, 12:00 afternoon, 17:59 afternoon, 18:00 night', () => {
  const s = st({ days: { [MON]: day({ morning: morning() }) } });
  assert.equal(C.nextAction(s, at(0, 11, 59)), 'none');
  assert.equal(C.nextAction(s, at(0, 12, 0)), 'afternoon');
  assert.equal(C.nextAction(s, at(0, 17, 59)), 'afternoon');
  assert.equal(C.nextAction(s, at(0, 18, 0)), 'night');
});

test('nextAction: pending Recovery wins over morning, in any phase; a filed one does not', () => {
  assert.equal(C.nextAction(st({ recovery: pendingRecovery() }), at(0, 7)), 'recovery');
  assert.equal(C.nextAction(deepFreeze({ ...defaultState(), recovery: pendingRecovery() }), at(0, 7)), 'recovery');
  assert.equal(C.nextAction(st({ recovery: pendingRecovery(5) }), at(0, 7)), 'morning');
});

test('nextAction: none without challenge, outside the challenge, mid-morning, after afternoon, or once closed', () => {
  assert.equal(C.nextAction(noChallenge(), at(0, 7)), 'none');
  assert.equal(C.nextAction(noChallenge(), at(0, 19)), 'none');
  assert.equal(C.nextAction(st(), at(-1, 7)), 'none');
  assert.equal(C.nextAction(st(), at(30, 19)), 'none');
  const m = { morning: morning() };
  assert.equal(C.nextAction(st({ days: { [MON]: day(m) } }), at(0, 10)), 'none');
  const aft = { at: 1, onTrack: 'yes', friction: '' };
  assert.equal(C.nextAction(st({ days: { [MON]: day({ ...m, afternoon: aft }) } }), at(0, 13)), 'none');
  const closed = st({ days: { [MON]: day({ ...m, result: 'passed', closedAt: 1 }) } });
  assert.equal(C.nextAction(closed, at(0, 19)), 'none');
  assert.equal(C.nextAction(st({ days: { [MON]: day({ result: 'redo', closedAt: 1 }) } }), at(0, 7)), 'none');
});
