// Pure rules. Dates are local 'YYYY-MM-DD' keys, times 'HH:MM', weekday Mon=0…Sun=6.

const pad = n => String(n).padStart(2, '0');
export const keyToDate = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

export const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(key, n) { const d = keyToDate(key); d.setDate(d.getDate() + n); return dateKey(d); }

// Date.UTC day numbers: the only allowed UTC use, immune to DST.
const dayNum = key => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
export const daysBetween = (a, b) => dayNum(b) - dayNum(a);

export const weekdayIdx = key => (keyToDate(key).getDay() + 6) % 7;
export const isWeekend = key => weekdayIdx(key) >= 5;
export const weekStart = key => addDays(key, -weekdayIdx(key));

export function toMin(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m || +m[1] > 23 || +m[2] > 59) return NaN;
  return +m[1] * 60 + +m[2];
}
export const fromMin = min => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

export const resolveViewDate = (requested, today) => (!requested || requested > today ? today : requested);

export const uid = () => globalThis.crypto?.randomUUID?.()
  ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

// ---- Blocks and occurrences. occId = `${blockId}:${date}`.

const occDate = occId => occId.slice(-10);
const occBlockId = occId => occId.slice(0, -11);

export function validateBlock(b) {
  if (!b.title?.trim()) return 'title-required';
  const s = toMin(b.start), e = toMin(b.end);
  if (Number.isNaN(s) || Number.isNaN(e)) return 'bad-time';
  return e <= s ? 'ends-before-start' : null;
}

function repeatsOn(b, date) {
  if (date < b.date || (b.until && date > b.until) || b.skip?.includes(date)) return false;
  const wd = weekdayIdx(date);
  switch (b.repeat?.type) {
    case 'daily': return true;
    case 'weekdays': return wd < 5;
    case 'weekends': return wd >= 5;
    case 'custom': return b.repeat.days.includes(wd);
    default: return date === b.date;
  }
}

function makeOcc(occId, base, o = {}, orphan = false) {
  const v = o.done && o.snap ? { ...base, ...o.snap } : base;
  return { occId, blockId: occBlockId(occId), date: occDate(occId), ...v,
    done: !!o.done, actualMin: o.actualMin, movedTo: o.movedTo, orphan };
}

export function occurrencesOn(state, date) {
  const out = state.blocks.filter(b => repeatsOn(b, date)).map(b => {
    const occId = `${b.id}:${date}`;
    return makeOcc(occId, { title: b.title, desc: b.desc, start: b.start, end: b.end, tag: b.tag,
      plannedMin: toMin(b.end) - toMin(b.start) }, state.occ[occId]);
  });
  // Orphans: completed occurrences the blocks no longer generate keep their frozen snapshot.
  for (const [occId, o] of Object.entries(state.occ)) {
    if (occDate(occId) === date && o.done && o.snap && !out.some(x => x.occId === occId))
      out.push(makeOcc(occId, { desc: '' }, o, true));
  }
  return out.sort((a, b) => toMin(a.start) - toMin(b.start));
}

export const minutesFor = o => o.actualMin !== undefined ? o.actualMin : o.done ? o.plannedMin : 0;

export function nowNext(occs, nowMin) {
  const open = occs.filter(o => !o.done && !o.movedTo);
  const current = open.find(o => toMin(o.start) <= nowMin && nowMin < toMin(o.end)) ?? null;
  const next = open.find(o => toMin(o.start) > nowMin) ?? null;
  return {
    current, next,
    minsLeft: current ? toMin(current.end) - nowMin : null,
    minsToNext: next ? toMin(next.start) - nowMin : null,
    missed: open.filter(o => toMin(o.end) <= nowMin),
  };
}

export const setOcc = (state, occId, patch) => ({ ...state, occ: { ...state.occ, [occId]: { ...state.occ[occId], ...patch } } });

export function completeOcc(state, occ, actualMin) {
  const { title, start, end, tag, plannedMin } = occ;
  const patch = { done: true, snap: { title, start, end, tag, plannedMin } };
  if (actualMin !== undefined) patch.actualMin = actualMin;
  return setOcc(state, occ.occId, patch);
}

export function uncompleteOcc(state, occId) {
  const { done, actualMin, snap, ...rest } = state.occ[occId] ?? {};
  const occ = { ...state.occ };
  if (Object.keys(rest).length) occ[occId] = rest; else delete occ[occId];
  return { ...state, occ };
}

export function upsertBlock(state, block) {
  const has = state.blocks.some(b => b.id === block.id);
  return { ...state, blocks: has ? state.blocks.map(b => (b.id === block.id ? block : b)) : [...state.blocks, block] };
}

const dropOcc = (state, keep) => ({ ...state, occ: Object.fromEntries(Object.entries(state.occ).filter(([k]) => keep(k))) });

export const removeBlock = (state, blockId) =>
  dropOcc({ ...state, blocks: state.blocks.filter(b => b.id !== blockId) }, k => occBlockId(k) !== blockId);

export function deleteOccurrence(state, blockId, date) {
  const b = state.blocks.find(x => x.id === blockId);
  if (!b || b.repeat.type === 'none') return removeBlock(state, blockId);
  return dropOcc(upsertBlock(state, { ...b, skip: [...b.skip, date] }), k => k !== `${blockId}:${date}`);
}

export function deleteFuture(state, blockId, date) {
  const b = state.blocks.find(x => x.id === blockId);
  if (!b || date <= b.date) return removeBlock(state, blockId);
  const end = addDays(date, -1);
  return dropOcc(upsertBlock(state, { ...b, until: b.until && b.until < end ? b.until : end }),
    k => occBlockId(k) !== blockId || occDate(k) < date);
}

export const rescheduleDraft = (occ, today) =>
  ({ title: occ.title, desc: occ.desc, tag: occ.tag, date: addDays(today, 1), start: '', durationMin: occ.plannedMin });

export const moveOccurrence = (state, occId, newBlock) => setOcc(upsertBlock(state, newBlock), occId, { movedTo: newBlock.id });

export function elapsedMin(startedAt, nowMs) {
  if (!Number.isFinite(startedAt) || !(nowMs >= startedAt)) return 0;
  return Math.min(720, Math.floor((nowMs - startedAt) / 60000));
}

// Running-timer clock: m:ss, h:mm:ss from an hour; capped at 12 h like elapsedMin.
export function formatClock(ms) {
  const t = Number.isFinite(ms) && ms > 0 ? Math.floor(Math.min(ms, 720 * 60000) / 1000) : 0;
  const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = pad(t % 60);
  return h ? `${h}:${pad(m)}:${s}` : `${m}:${s}`;
}

export function sanitizeTimer(state) {
  const t = state.timer;
  if (!t) return { ...state, timer: null };
  const ok = typeof t.occId === 'string' && Number.isFinite(t.startedAt)
    && occurrencesOn(state, occDate(t.occId)).some(o => o.occId === t.occId);
  return ok ? state : { ...state, timer: null };
}

export function copyDay(state, fromDate, toDate, newId) {
  return occurrencesOn(state, fromDate).filter(o => !o.movedTo).reduce((s, o) => upsertBlock(s, {
    id: newId(), title: o.title, desc: o.desc, date: toDate, start: o.start, end: o.end, tag: o.tag,
    repeat: { type: 'none', days: [] }, until: null, skip: [],
  }), state);
}

// ---- Goals, day status, windows.

export const goalMinutes = (state, date, goalId) =>
  occurrencesOn(state, date).filter(o => o.tag === goalId).reduce((sum, o) => sum + minutesFor(o), 0);
export const unsortedMinutes = (state, date) => goalMinutes(state, date, 'unsorted');

export function goalMet(state, date, goal) {
  if (!goal.minutes && !goal.checks.length) return null;
  if (state.manualMet[date]?.[goal.id]) return true;
  const min = goal.minutes ? goal.minutes[isWeekend(date) ? 'weekend' : 'weekday'] : 0;
  return goalMinutes(state, date, goal.id) >= min && goal.checks.every(c => state.checks[date]?.[c.id]);
}

export function dayWon(state, date) {
  const met = state.goals.map(g => goalMet(state, date, g)).filter(m => m !== null);
  return met.length > 0 && met.every(Boolean);
}

export function dayStatus(state, date) {
  if (dayWon(state, date)) return 'won';
  const any = obj => Object.values(obj ?? {}).some(v => v === true || v > 0);
  const logged = state.goals.some(g => goalMinutes(state, date, g.id) > 0)
    || any(state.checks[date]) || any(state.counts[date]) || any(state.manualMet[date]);
  return logged ? 'partial' : 'empty';
}

const count = (state, date, goalId) => state.counts[date]?.[goalId] ?? 0;

export function weekSummary(state, date) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i));
  const sum = f => days.reduce((s, d) => s + f(d), 0);
  return Object.fromEntries(state.goals.filter(g => g.minutes || g.weeklyCount).map(g => [g.id, g.minutes
    ? { done: sum(d => goalMinutes(state, d, g.id)), target: 5 * g.minutes.weekday + 2 * g.minutes.weekend, unit: 'min' }
    : { done: sum(d => count(state, d, g.id)), target: g.weeklyCount.target, unit: 'count' }]));
}

export function windowTotals(state, endDate, n) {
  const zero = () => Object.fromEntries(state.goals.map(g => [g.id, 0]));
  const t = { won: 0, partial: 0, minutes: zero(), counts: zero(), unsorted: 0 };
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(endDate, -i), st = dayStatus(state, d);
    if (st !== 'empty') t[st]++;
    for (const g of state.goals) { t.minutes[g.id] += goalMinutes(state, d, g.id); t.counts[g.id] += count(state, d, g.id); }
    t.unsorted += unsortedMinutes(state, d);
  }
  return t;
}

export function redLineSummary(state, endDate, n) {
  const r = { held: 0, slipped: 0 };
  for (let i = 0; i < n; i++) {
    const day = state.red[addDays(endDate, -i)] ?? {};
    for (const line of state.redLines) if (day[line.id]) r[day[line.id]]++;
  }
  return r;
}

export function lifetime(state, today) {
  const first = [...Object.keys(state.occ).map(occDate), ...Object.keys(state.counts)].sort()[0] ?? today;
  const { minutes, counts, unsorted } = windowTotals(state, today, daysBetween(first, today) + 1);
  return { minutes, counts, unsorted };
}

export const needsCommitConfirm = (goal, today) => today < goal.committedUntil;
