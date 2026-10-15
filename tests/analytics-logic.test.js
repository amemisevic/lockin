import test from 'node:test';
import assert from 'node:assert/strict';
import { analytics, RANGES, DEFAULT_RANGE, EMPTY, WEEKDAYS } from '../src/views/analyticsLogic.js';
import { CHALLENGE_LENGTH } from '../src/views/challengeLogic.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays, weekdayIdx } from '../src/logic.js';

// Task 18 view model (task-18-rulings R1-R3, R5). Expected values are computed HERE by walking the raw hand state
// (no stats.js / scoring.js selector is called for an expected value), plus literal hand-computed anchors.
// Hand state: challenge 2026-08-25 (Tue) .. 09-23 (30 days); endDate E = 2026-09-27 (Sun), after the challenge end, so
// 7d = 09-21..09-27, 30d = 08-29..09-27, All = 08-25..09-27 all differ. First taskLog 08-20 is before the start, so the
// task windows differ too (All starts at the challenge start, call 7 / R3 of Task 7). Heatmap = 08-31 (Mon) .. 09-27.
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const S = '2026-08-25', E = '2026-09-27', FIRST = '2026-08-20';

const P = (a, b, t1 = 'Protocol A') => [{ id: 'p1', title: t1, status: a }, { id: 'p2', title: 'Protocol B', status: b }];
const closed = (result, protocols, { crossed = false, archetype = '', tactic = '', override = null } = {}) => ({
  morning: { at: 1, target: 'Target A', risk: '', med: [] }, afternoon: null, declaredRedo: false, slipNote: '',
  incompleteMorning: false, auto: null,
  night: { at: 2, protocols, redLines: [{ id: 'r1', name: 'Red Line A', status: crossed ? 'crossed' : 'held' }], win: '',
    bottomG: { archetype, tactic, text: '' }, suggested: result, override },
  result, closedAt: 2,
});
const noNight = { ...closed('redo', []), night: null, auto: 'no-night', incompleteMorning: true, morning: null };
const tA = { archetype: 'negotiator', tactic: 'Tactic A' }, tB = { archetype: 'assassin', tactic: 'Tactic B' };
const task = (id, title, repeat, date = null) => ({ id, title, note: '', start: null, end: null, date, repeat, skip: [], archived: false });
const TASKS = [
  task('h1', 'Task A', { type: 'weekdays', days: [] }),
  task('h2', 'Task B', { type: 'custom', days: [0, 2] }), // Mon, Wed
  task('t1', 'Task C', { type: 'none', days: [] }, '2026-09-22'),
  task('t2', 'Task D', { type: 'none', days: [] }, '2026-08-26'),
];
const TASK_LOG = {
  '2026-08-20': { h1: 'done' },
  '2026-08-25': { h1: 'done' },
  '2026-08-26': { h1: 'failed', h2: 'done', t2: 'stalled' },
  '2026-08-31': { h1: 'done', h2: 'done' },
  '2026-09-02': { h1: 'done' },
  '2026-09-07': { h1: 'stalled' },
  '2026-09-21': { h1: 'done', h2: 'done' },
  '2026-09-22': { h1: 'done', t1: 'done' },
  '2026-09-23': { h2: 'done' },
  '2026-09-25': { h1: 'failed' },
};
// p1 is renamed: 'Protocol A' in early snapshots, 'Protocol A2' on 09-22/23 (latest), 'Protocol A3' in the current rules.
const STATE = deepFreeze({
  ...defaultState(),
  tasks: TASKS, taskLog: TASK_LOG,
  challenge: { startDate: S, length: 30, protocols: [{ id: 'p1', title: 'Protocol A3', med: null },
    { id: 'p2', title: 'Protocol B', med: null }], redLines: [{ id: 'r1', name: 'Red Line A' }], redoUsed: null },
  days: {
    '2026-08-25': closed('passed', P('held', 'held'), tA),
    '2026-08-26': closed('reset', P('held', 'missed'), { crossed: true, ...tB }), // red-line reset
    '2026-08-27': closed('passed', P('held', 'held')),
    '2026-09-01': closed('passed', P('held', 'held'), tA),
    '2026-09-02': closed('redo', P('held', 'missed'), tA),
    '2026-09-03': closed('reset', P('missed', 'missed'), { ...tB, override: { result: 'reset', reason: 'Reason A' } }), // protocols reset
    '2026-09-10': closed('passed', P('med', 'held')),
    '2026-09-15': noNight,
    '2026-09-21': closed('passed', P('held', 'held'), tA),
    '2026-09-22': closed('redo', P('held', 'missed', 'Protocol A2'), tB),
    '2026-09-23': closed('reset', P('held', 'held', 'Protocol A2'), { crossed: true }),
  },
});
const NO_CHALLENGE = deepFreeze({ ...defaultState(), tasks: TASKS, taskLog: TASK_LOG });

// ---- independent walkers over the raw state ----
const span = (from, to) => { const r = []; for (let d = from; d <= to; d = addDays(d, 1)) r.push(d); return r; };
const cut = n => (n === null ? null : addDays(E, -(n - 1)));
const chDates = (s, n) => (s.challenge ? span(cut(n) ?? s.challenge.startDate, E) : []);
const tkDates = (s, n) => {
  const first = Object.keys(s.taskLog).sort()[0];
  if (!first) return [];
  return span(cut(n) ?? (s.challenge ? s.challenge.startDate : first), E).filter(d => d >= first);
};
const due = (t, d) => !t.archived && !t.skip.includes(d) && ({ daily: true, weekdays: weekdayIdx(d) < 5,
  custom: t.repeat.days.includes(weekdayIdx(d)), none: t.date === d })[t.repeat.type];
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const lt = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function expectedChallenge(s, n) {
  const days = chDates(s, n).filter(d => s.days[d]?.result != null).map(d => s.days[d]);
  const c = { passed: 0, redo: 0, reset: 0 };
  for (const d of days) c[d.result]++;
  const titles = {};
  for (const d of days) for (const p of d.night?.protocols ?? []) titles[p.id] = p.title;
  const pr = {};
  for (const d of days) for (const p of d.night?.protocols ?? []) (pr[p.id] ??= { held: 0, med: 0, missed: 0 })[p.status]++;
  const protocols = Object.entries(pr).map(([id, v]) => ({ title: titles[id], ...v }))
    .sort((a, b) => b.missed - a.missed || lt(a.title, b.title))
    .map(p => ({ title: p.title, held: String(p.held), med: String(p.med), missed: String(p.missed),
      counts: [p.held, p.med, p.missed], label: `${p.title}: held ${p.held}, MED ${p.med}, missed ${p.missed}` }));
  let red = 0, prot = 0; const by = {};
  for (const d of days.filter(x => x.result === 'reset')) {
    if (d.night?.redLines.some(r => r.status === 'crossed')) { red++; continue; }
    prot++;
    for (const p of d.night?.protocols ?? []) if (p.status === 'missed') by[p.id] = (by[p.id] ?? 0) + 1;
  }
  const byProtocol = Object.entries(by).map(([id, count]) => ({ title: titles[id], count }))
    .sort((a, b) => b.count - a.count || lt(a.title, b.title))
    .map(x => ({ title: x.title, count: String(x.count), label: `${x.title}: ${x.count}` }));
  const tc = {};
  for (const d of days) {
    const g = d.night?.bottomG;
    if (!g?.archetype.trim() || !g?.tactic.trim()) continue;
    const k = `${g.archetype}|${g.tactic}`;
    (tc[k] ??= { archetype: g.archetype, tactic: g.tactic, count: 0 }).count++;
  }
  const tl = Object.values(tc).sort((a, b) => b.count - a.count || lt(a.archetype, b.archetype) || lt(a.tactic, b.tactic));
  const max = Math.max(0, ...tl.map(x => x.count));
  const closedN = c.passed + c.redo + c.reset;
  return {
    counts: c,
    overviewLabel: `Passed ${c.passed}, redo ${c.redo}, reset ${c.reset}, pass rate ${pct(c.passed, closedN)}`,
    protocols: protocols.length ? protocols : null,
    resets: red + prot ? { redLine: String(red), protocols: String(prot), counts: [red, prot], byProtocol,
      label: `Red line ${red}, missed protocols ${prot}` } : null,
    tactics: tl.length ? tl.map(x => ({ archetype: x.archetype, tactic: x.tactic, count: String(x.count), share: x.count / max,
      label: `${x.tactic} (${x.archetype}): ${x.count}` })) : null,
  };
}

// Streaks over every stored result, ascending (whole history).
function streaks(s) {
  const r = Object.keys(s.days).sort().map(d => s.days[d].result).filter(x => x != null);
  let run = 0, longest = 0;
  for (const x of r) { run = x === 'passed' ? run + 1 : 0; longest = Math.max(longest, run); }
  return { current: run, longest };
}

function expectedHabits(s, n) {
  const w = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }));
  for (const d of tkDates(s, n)) for (const t of s.tasks.filter(t => t.repeat.type !== 'none' && due(t, d))) {
    w[weekdayIdx(d)].total++;
    if (s.taskLog[d]?.[t.id] === 'done') w[weekdayIdx(d)].done++;
  }
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = w.map((x, i) => ({ day: names[i], rate: pct(x.done, x.total), done: String(x.done), total: String(x.total),
    share: x.total ? x.done / x.total : 0 }));
  const first = Object.keys(s.taskLog).sort()[0];
  const cells = span(addDays(E, -27), E).map(date => {
    const hs = first && date >= first ? s.tasks.filter(t => t.repeat.type !== 'none' && due(t, date)) : [];
    const done = hs.filter(t => s.taskLog[date]?.[t.id] === 'done').length;
    return { date, kind: hs.length === 0 ? 'none' : done === hs.length ? 'all' : done === 0 ? 'missed' : 'part' };
  });
  const k = kind => cells.filter(c => c.kind === kind).length;
  return {
    weekdays: w.some(x => x.total) ? { days, label: days.map(x => `${x.day} ${x.rate} (${x.done} of ${x.total})`).join(', ') } : null,
    cells, heatmapLabel: `Last 28 days: ${k('all')} all done, ${k('part')} partly done, ${k('missed')} missed, ${k('none')} nothing due`,
    heatmapEmpty: cells.every(c => c.kind === 'none'),
  };
}

function expectedTasks(s, n) {
  const r = { done: 0, failed: 0, stalled: 0, open: 0 };
  for (const d of tkDates(s, n)) for (const t of s.tasks.filter(t => due(t, d))) r[s.taskLog[d]?.[t.id] ?? 'open']++;
  if (!(r.done + r.failed + r.stalled + r.open)) return null;
  return { done: String(r.done), failed: String(r.failed), stalled: String(r.stalled), open: String(r.open),
    label: `Done ${r.done}, failed ${r.failed}, stalled ${r.stalled}, open ${r.open}` };
}

function assertModel(s, n) {
  const m = analytics(s, E, n), at = `n=${n}`;
  const ch = expectedChallenge(s, n), { counts: c } = ch, st = streaks(s);
  const closedN = c.passed + c.redo + c.reset;
  assert.deepEqual(m.overview, closedN ? { passed: String(c.passed), redo: String(c.redo), reset: String(c.reset),
    rate: pct(c.passed, closedN), current: String(st.current), longest: String(st.longest), label: ch.overviewLabel } : null, at);
  if (s.challenge) {
    const whole = { passed: 0, redo: 0, reset: 0 };
    for (const d of span(s.challenge.startDate, addDays(s.challenge.startDate, s.challenge.length - 1))) {
      if (s.days[d]?.result != null) whole[s.days[d].result]++;
    }
    assert.deepEqual(m.challenge.strip, Array.from({ length: s.challenge.length }, (_, i) => {
      const date = addDays(s.challenge.startDate, i);
      return { n: i + 1, date, kind: s.days[date]?.result ?? (date === E ? 'today' : date > E ? 'future' : 'open') };
    }), at);
    assert.deepEqual(m.challenge.legend, whole, at);
    assert.equal(m.challenge.stripLabel,
      `Day results: passed ${whole.passed}, redo ${whole.redo}, reset ${whole.reset} of ${s.challenge.length} days`, at);
    assert.deepEqual(m.challenge.protocols, ch.protocols, at);
    assert.deepEqual(m.challenge.resets, ch.resets, at);
    assert.deepEqual(m.challenge.tactics, ch.tactics, at);
  } else assert.equal(m.challenge, null, at);
  const hb = expectedHabits(s, n);
  assert.deepEqual(m.habits.weekdays, hb.weekdays, at);
  if (hb.heatmapEmpty) assert.equal(m.habits.heatmap, null, at);
  else {
    assert.deepEqual(m.habits.heatmap.cells.map(x => ({ date: x.date, kind: x.kind })), hb.cells, at);
    assert.equal(m.habits.heatmap.label, hb.heatmapLabel, at);
  }
  assert.deepEqual(m.tasks, expectedTasks(s, n), at);
  return m;
}

test('RANGES, DEFAULT_RANGE, EMPTY, WEEKDAYS', () => {
  assert.deepEqual(RANGES, [{ value: 7, label: '7d' }, { value: 30, label: '30d' }, { value: null, label: 'All' }]);
  assert.equal(DEFAULT_RANGE, 30);
  assert.equal(EMPTY, 'No data yet.');
  assert.deepEqual(WEEKDAYS, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.equal(WEEKDAYS[0], 'Mon');
});

test('hand state is valid and the three ranges give different numbers', () => {
  assert.equal(validateState(STATE), null);
  assert.equal(validateState(NO_CHALLENGE), null);
  const labels = [7, 30, null].map(n => analytics(STATE, E, n));
  assert.equal(new Set(labels.map(m => m.overview.label)).size, 3);
  assert.equal(new Set(labels.map(m => m.tasks.label)).size, 3);
  assert.equal(new Set(labels.map(m => m.habits.weekdays.label)).size, 3);
});

for (const n of [7, 30, null]) {
  test(`every display string equals the raw-state walk, range ${n ?? 'All'}`, () => { assertModel(STATE, n); });
}

test('literal anchors: pass rate rounding, streaks, overview labels per range', () => {
  // 7d: 09-21 passed, 09-22 redo, 09-23 reset -> 1/3 = 33%. 30d: passed 09-01,10,21; redo 09-02,15,22; reset 09-03,23 -> 3/8.
  // All adds 08-25 passed, 08-26 reset, 08-27 passed -> 5/11 = 45%. Streaks over all results: current 0, longest 2.
  assert.equal(analytics(STATE, E, 7).overview.label, 'Passed 1, redo 1, reset 1, pass rate 33%');
  assert.equal(analytics(STATE, E, 7).overview.rate, '33%');
  assert.equal(analytics(STATE, E, 30).overview.label, 'Passed 3, redo 3, reset 2, pass rate 38%');
  const all = analytics(STATE, E, null).overview;
  assert.deepEqual([all.rate, all.current, all.longest], ['45%', '0', '2']);
  // 2 passed of 5 closed -> 40%.
  const days = Object.fromEntries(['passed', 'redo', 'passed', 'reset', 'redo'].map((r, i) => [addDays(E, i - 4), closed(r, [])]));
  const five = { ...defaultState(), challenge: { ...STATE.challenge, startDate: addDays(E, -4) }, days };
  assert.equal(analytics(five, E, 7).overview.rate, '40%');
  assert.equal(analytics(five, E, 7).overview.current, '0');
});

test('literal anchors: renamed protocol, red line vs protocol resets, tactic order', () => {
  // 7d protocols: p2 held 2 missed 1 (missed desc first), p1 held 3 under its latest stored title.
  assert.deepEqual(analytics(STATE, E, 7).challenge.protocols.map(p => p.label),
    ['Protocol B: held 2, MED 0, missed 1', 'Protocol A2: held 3, MED 0, missed 0']);
  for (const n of [7, 30, null]) {
    const titles = analytics(STATE, E, n).challenge.protocols.map(p => p.title);
    assert.ok(titles.includes('Protocol A2') && !titles.includes('Protocol A') && !titles.includes('Protocol A3'), `n=${n}`);
  }
  // 7d: 09-23 is a red-line reset only. 30d: + 09-03 protocol reset (p1, p2 missed). All: + 08-26 red-line reset.
  assert.deepEqual(analytics(STATE, E, 7).challenge.resets,
    { redLine: '1', protocols: '0', counts: [1, 0], byProtocol: [], label: 'Red line 1, missed protocols 0' });
  const r30 = analytics(STATE, E, 30).challenge.resets;
  assert.equal(r30.label, 'Red line 1, missed protocols 1');
  assert.deepEqual(r30.byProtocol, [{ title: 'Protocol A2', count: '1', label: 'Protocol A2: 1' },
    { title: 'Protocol B', count: '1', label: 'Protocol B: 1' }]);
  assert.equal(analytics(STATE, E, null).challenge.resets.label, 'Red line 2, missed protocols 1');
  // Count desc beats archetype order (assassin < negotiator); 7d tie falls back to archetype.
  assert.deepEqual(analytics(STATE, E, 30).challenge.tactics.map(t => t.label), ['Tactic A (negotiator): 3', 'Tactic B (assassin): 2']);
  assert.deepEqual(analytics(STATE, E, null).challenge.tactics.map(t => [t.count, t.share]), [['4', 1], ['3', 3 / 4]]);
  assert.deepEqual(analytics(STATE, E, 7).challenge.tactics.map(t => t.label), ['Tactic B (assassin): 1', 'Tactic A (negotiator): 1']);
});

test('literal anchors: weekdays Mon-first with — for no due habit, heatmap 28 cells ending at endDate', () => {
  const m = analytics(STATE, E, 7);
  assert.equal(m.habits.weekdays.days[0].day, 'Mon');
  assert.deepEqual(m.habits.weekdays.days[0], { day: 'Mon', rate: '100%', done: '2', total: '2', share: 1 }); // 09-21
  assert.equal(m.habits.weekdays.label, 'Mon 100% (2 of 2), Tue 100% (1 of 1), Wed 50% (1 of 2), Thu 0% (0 of 1), '
    + 'Fri 0% (0 of 1), Sat — (0 of 0), Sun — (0 of 0)');
  assert.equal(m.tasks.label, 'Done 5, failed 1, stalled 0, open 2');
  const cells = m.habits.heatmap.cells;
  assert.equal(cells.length, 28);
  assert.equal(cells[27].date, E);
  assert.equal(cells[0].date, '2026-08-31');
  assert.deepEqual([0, 1, 2, 5, 27].map(i => cells[i].kind), ['all', 'missed', 'part', 'none', 'none']);
  assert.deepEqual(analytics(STATE, E, null).habits.heatmap, m.habits.heatmap); // heatmap ignores the range
});

test('empty state: every block null', () => {
  const m = analytics(defaultState(), E, DEFAULT_RANGE);
  assert.deepEqual(m, { overview: null, challenge: null, habits: { weekdays: null, heatmap: null }, tasks: null });
});

test('no challenge but tasks: challenge and overview null, habits and tasks from the first log', () => {
  for (const n of [7, 30, null]) {
    const m = assertModel(NO_CHALLENGE, n);
    assert.equal(m.challenge, null);
    assert.equal(m.overview, null);
    assert.notEqual(m.tasks, null);
    assert.notEqual(m.habits.weekdays, null);
  }
});

test('challenge started today, nothing closed: strip shows, sub-blocks null', () => {
  const s = deepFreeze({ ...defaultState(), challenge: { ...STATE.challenge, startDate: E } });
  const m = assertModel(s, DEFAULT_RANGE);
  assert.equal(m.overview, null);
  assert.equal(m.challenge.strip.length, CHALLENGE_LENGTH);
  assert.deepEqual([m.challenge.strip[0].kind, m.challenge.strip[1].kind], ['today', 'future']);
  assert.equal(m.challenge.stripLabel, `Day results: passed 0, redo 0, reset 0 of ${CHALLENGE_LENGTH} days`);
  assert.deepEqual([m.challenge.protocols, m.challenge.resets, m.challenge.tactics], [null, null, null]);
  assert.deepEqual([m.habits.weekdays, m.habits.heatmap, m.tasks], [null, null, null]);
});
