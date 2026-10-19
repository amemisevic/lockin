// Exercise search, filters, recents and custom exercises (gym plan G1). Pure.
// data = bundled { exercises, muscles, equipment }; gym = state with customExercises. Refusals: { ok: false, reason }, nothing else.
const lower = s => s.toLowerCase();
const isText = v => typeof v === 'string' && v.trim() !== '';
const arr = v => (Array.isArray(v) ? v : []);
const other = v => (isText(v) ? v : 'other');
const key = e => lower(e.name);

const fromBundled = e => ({ id: e.id, name: typeof e.name === 'string' ? e.name : '', equipment: other(e.equipment), muscle: other(e.muscle), category: other(e.category), custom: false });
const fromCustom = e => ({ id: e.id, name: typeof e.name === 'string' ? e.name : '',equipment: other(e.equipment), muscle: other(e.muscle), category: 'other', custom: true });
const valid = e => e && typeof e === 'object' && typeof e.id === 'string';

// Bundled first; Map keys, so ids like "toString" or "__proto__" are plain keys. A duplicate id keeps its first entry.
export function exerciseMap(data, gym) {
  const m = new Map();
  for (const e of [...arr(data?.exercises).filter(valid).map(fromBundled), ...arr(gym?.customExercises).filter(valid).map(fromCustom)]) if (!m.has(e.id)) m.set(e.id, e);
  return m;
}

// Query: every word in the name (substring, any case). Filters are exact. The first 10 recents lead, the rest by name.
export function searchExercises(data, gym, { query, muscle, equipment, recents } = {}) {
  const words = typeof query === 'string' ? lower(query).split(/\s+/).filter(Boolean) : [];
  const rank = new Map(arr(recents).slice(0, 10).map((id, i) => [id, i]).reverse()); // reversed: a repeated id keeps its first place
  return [...exerciseMap(data, gym).values()]
    .filter(e => (!muscle || e.muscle === muscle) && (!equipment || e.equipment === equipment) && words.every(w => key(e).includes(w)))
    .sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : a.id < b.id ? -1 : 1));
}

// Newest workout first; inside a workout the last exercise first; distinct; at most 10.
export function recentIds(workouts) {
  const out = new Set();
  for (const w of arr(workouts).filter(Boolean).sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))) {
    for (const it of [...arr(w.items)].reverse()) if (typeof it?.exerciseId === 'string') out.add(it.exerciseId);
  }
  return [...out].slice(0, 10);
}

const refuse = reason => ({ ok: false, reason });

// null = fine for this name (ignoring the exercise `self`), else the refusal code.
function nameProblem(data, gym, name, self) {
  const n = typeof name === 'string' ? name.trim() : '';
  if (n.length < 1 || n.length > 60) return 'name-length';
  const taken = [...exerciseMap(data, gym).values()].some(e => e.id !== self && key(e) === lower(n));
  return taken ? 'name-taken' : null;
}

export function addCustom(data, gym, draft) {
  const bad = nameProblem(data, gym, draft?.name, null);
  if (bad) return refuse(bad);
  if (!arr(data?.muscles).includes(draft.muscle)) return refuse('bad-muscle');
  if (!arr(data?.equipment).includes(draft.equipment)) return refuse('bad-equipment');
  const list = arr(gym?.customExercises);
  const n = Math.max(0, ...list.map(e => Number(/^custom-(\d+)$/.exec(e?.id)?.[1] ?? 0))) + 1;
  const id = `custom-${n}`;
  const e = { id, name: draft.name.trim(), muscle: draft.muscle, equipment: draft.equipment };
  return { ok: true, id, state: { ...gym, customExercises: [...list, e] } };
}

export function renameCustom(data, gym, id, name) {
  const list = arr(gym?.customExercises);
  const old = typeof id === 'string' ? list.find(e => e?.id === id) : undefined;
  if (!old) return refuse('unknown-id');
  const bad = nameProblem(data, gym, name, id);
  if (bad) return refuse(bad);
  const next = name.trim();
  return { ok: true, state: next === old.name ? gym : { ...gym, customExercises: list.map(e => (e === old ? { ...e, name: next } : e)) } };
}
