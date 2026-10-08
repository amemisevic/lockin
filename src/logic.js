// Pure rules. Dates are local 'YYYY-MM-DD' keys, times 'HH:MM', weekday Mon=0…Sun=6.

const pad = n => String(n).padStart(2, '0');
const parse = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

export const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(key, n) { const d = parse(key); d.setDate(d.getDate() + n); return dateKey(d); }

// Date.UTC day numbers: the only allowed UTC use, immune to DST.
const dayNum = key => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
export const daysBetween = (a, b) => dayNum(b) - dayNum(a);

export const weekdayIdx = key => (parse(key).getDay() + 6) % 7;
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

function makeOcc(occId, base, o = {}) {
  const v = o.done && o.snap ? { ...base, ...o.snap } : base;
  return { occId, blockId: occBlockId(occId), date: occDate(occId), ...v,
    done: !!o.done, actualMin: o.actualMin, movedTo: o.movedTo };
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
      out.push(makeOcc(occId, { desc: '' }, o));
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
