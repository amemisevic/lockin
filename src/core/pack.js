// Mission and tactic pack: validate an imported pack file, store it, look up by day and archetype.

const MAX_BYTES = 300 * 1024;
const ARCHETYPES = ['negotiator', 'assassin', 'seducer', 'escapist', 'authority'];
const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const filled = x => typeof x === 'string' && x.trim() !== '';
const no = error => ({ ok: false, error });

// First failure wins (owner calls 1a-1h). Success keeps only the data-model fields, strings verbatim.
export function validatePack(text) {
  if (!filled(text)) return no('The file is empty.');
  if (new TextEncoder().encode(text).length > MAX_BYTES) return no('The pack is too large.');
  let obj;
  try { obj = JSON.parse(text); } catch { return no('The file is not valid JSON. Choose a Lock In pack file.'); }
  if (!isObj(obj) || obj.v !== 1) return no('This is not a Lock In pack.');
  if (!Array.isArray(obj.missions)) return no("The pack's missions are damaged.");
  if (obj.tactics !== undefined && !Array.isArray(obj.tactics)) return no("The pack's tactics are damaged.");
  const days = new Set();
  for (const m of obj.missions) {
    if (!isObj(m) || !filled(m.title) || !filled(m.body)) return no('Every mission needs a title and a body.');
    if (!Number.isInteger(m.day) || m.day < 1 || m.day > 30) return no('Mission days must be whole numbers from 1 to 30.');
    if (days.has(m.day)) return no(`Mission day ${m.day} appears twice.`);
    days.add(m.day);
  }
  const tactics = obj.tactics ?? [];
  for (const t of tactics) {
    if (!isObj(t) || !filled(t.name)) return no('Every tactic needs a name.');
    if (!ARCHETYPES.includes(t.archetype)) return no("Unknown archetype in the pack's tactics.");
  }
  return { ok: true, pack: {
    missions: obj.missions.map(({ day, title, body }) => ({ day, title, body })),
    tactics: tactics.map(({ archetype, name }) => ({ archetype, name })),
  } };
}

export const importPack = (state, pack) => ({ ...state, pack });

export const missionFor = (state, n) =>
  (typeof n === 'number' && state.pack?.missions.find(m => m.day === n)) || null;

export const tacticsFor = (state, archetype) =>
  state.pack ? state.pack.tactics.filter(t => t.archetype === archetype) : [];
