import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePack, importPack, missionFor, tacticsFor } from '../src/core/pack.js';
import { defaultState, validateState } from '../src/core/model.js';
import { validateImport, exportJson } from '../src/core/store.js';

// Task 6. Expected values follow the owner calls 1-6 and controller rulings R1-R3 (task-6-context.md), quoted per assertion.
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };
const bytes = s => new TextEncoder().encode(s).length;
const json = o => JSON.stringify(o);
const pack = (missions, tactics) => json(tactics === undefined ? { v: 1, missions } : { v: 1, missions, tactics });
// A refusal is exactly {ok:false, error}: deepEqual (strict) also proves no `pack` key is returned.
const refuse = (input, error, label) => assert.deepEqual(validatePack(input), { ok: false, error }, label);

const EMPTY = 'The file is empty.';
const LARGE = 'The pack is too large.';
const NOT_JSON = 'The file is not valid JSON. Choose a Lock In pack file.';
const NOT_PACK = 'This is not a Lock In pack.';
const MISSIONS = "The pack's missions are damaged.";
const TACTICS = "The pack's tactics are damaged.";
const SHAPE = 'Every mission needs a title and a body.';
const DAY = 'Mission days must be whole numbers from 1 to 30.';
const NAME = 'Every tactic needs a name.';
const ARCH = "Unknown archetype in the pack's tactics.";

const mA = { day: 1, title: 'Mission A', body: 'Body A' };
const mB = { day: 9, title: 'Mission B', body: 'Body B' };
const mC = { day: 30, title: 'Mission C', body: 'Body C' };
const tA = { archetype: 'negotiator', name: 'Tactic A' };
const tB = { archetype: 'escapist', name: 'Tactic B' };
const tC = { archetype: 'negotiator', name: 'Tactic C' };

test('1a: not a string, or blank after trim -> empty', () => {
  // Owner 1a: "not a string, or blank after trim -> 'The file is empty.'"; test list: "undefined, null, 5 and {} as input".
  for (const [label, input] of [['undefined', undefined], ['null', null], ['5', 5], ['{}', {}], ['""', ''], ['spaces', ' \n\t ']]) refuse(input, EMPTY, label);
  // Owner 1: "first failure wins": 400 KB of spaces is blank (1a) before it is too large (1b).
  refuse(' '.repeat(400 * 1024), EMPTY, '400 KB blank');
});

test('1b: a 400 KB non-JSON string is too large, checked before JSON.parse', () => {
  const big = 'x'.repeat(400 * 1024);
  assert.equal(bytes(big), 409600);
  // Owner 1b: "UTF-8 byte length > 300 * 1024 ... checked BEFORE JSON.parse -> 'The pack is too large.'" (not the JSON error of 1c).
  refuse(big, LARGE);
});

test('1b: size boundary, exactly 307200 bytes accepted, 307201 refused', () => {
  const base = pack([{ ...mA, body: '' }]);
  assert.equal(bytes(base), 60); // hand count of {"v":1,"missions":[{"day":1,"title":"Mission A","body":""}]}
  const padded = n => pack([{ ...mA, body: 'x'.repeat(n - 60) }]);
  const at = padded(307200), over = padded(307201);
  assert.equal(bytes(at), 307200);
  assert.equal(bytes(over), 307201);
  // Test list: "a valid pack whose JSON text is exactly 307200 bytes is accepted".
  const r = validatePack(at);
  assert.equal(r.ok, true);
  assert.equal(r.pack.missions[0].body.length, 307140);
  // Test list: "307201 bytes is refused".
  refuse(over, LARGE);
});

test('1b: bytes not characters (160000 x é)', () => {
  const text = pack([{ ...mA, body: 'é'.repeat(160000) }]);
  assert.equal(text.length, 160060); // characters: 60 + 160000, under the limit
  assert.equal(bytes(text), 320060); // bytes: 60 + 2 x 160000, over the limit
  // Test list: "Bytes not characters: a body of 160000 'é' (320000 bytes, 160000 characters) is refused."
  refuse(text, LARGE);
});

test('1c: invalid JSON', () => {
  // Owner 1c: "invalid JSON -> 'The file is not valid JSON. Choose a Lock In pack file.'"
  for (const t of ['{', '{"v":1,', 'Mission A', "{'v':1}"]) refuse(t, NOT_JSON, t);
});

test('1d: not a plain object, or v !== 1', () => {
  // Owner 1d: "not a plain object, or v !== 1 -> 'This is not a Lock In pack.'"; R3: plain object = non-null, object, not array.
  for (const t of ['[1,2]', 'null', '7', '"Mission A"', 'true']) refuse(t, NOT_PACK, t);
  // Test list: "{v:2}". v is compared strictly, and a missing v is not 1.
  for (const o of [{ v: 2 }, { v: 2, missions: [] }, { v: '1', missions: [] }, { missions: [] }]) refuse(json(o), NOT_PACK, json(o));
});

test('1e: missions not an array', () => {
  // Owner 1e: "missions not an array -> \"The pack's missions are damaged.\""
  for (const o of [{ v: 1 }, { v: 1, missions: {} }, { v: 1, missions: null }, { v: 1, missions: 'Mission A' }]) refuse(json(o), MISSIONS, json(o));
  // Owner 1: "first failure wins": e before f.
  refuse(json({ v: 1, missions: {}, tactics: {} }), MISSIONS);
});

test('1f: tactics present and not an array', () => {
  // Owner 1f: "tactics present (not undefined) and not an array -> \"The pack's tactics are damaged.\"" (null is present).
  for (const tactics of [{}, null, 'Tactic A', 5]) refuse(pack([mA], tactics), TACTICS, json(tactics));
  // Owner 1: "first failure wins": f before g (a bad mission element is not reached).
  refuse(pack([5], {}), TACTICS);
});

test('1g: mission without a title and a body', () => {
  // Owner 1g: "not a plain object, or title/body not strings or blank after trim -> 'Every mission needs a title and a body.'"
  const bad = [5, null, [], 'Mission A', { day: 1, body: 'Body A' }, { day: 1, title: 'Mission A' },
    { ...mA, title: '  ' }, { ...mA, body: '' }, { ...mA, title: 5 }, { ...mA, body: null }];
  for (const m of bad) refuse(pack([m]), SHAPE, json(m));
});

test('1g: mission day not an integer 1-30', () => {
  // Owner 1g: "day not an integer 1-30 -> 'Mission days must be whole numbers from 1 to 30.'"; test list: "day 0, 1.5 and 31".
  for (const day of [0, 1.5, 31, -1, '1', null]) refuse(pack([{ ...mA, day }]), DAY, json(day));
  refuse(pack([{ title: 'Mission A', body: 'Body A' }]), DAY, 'missing day');
});

test('1g: duplicate day', () => {
  // Owner 1g: "duplicate day -> 'Mission day N appears twice.' (N = the day)".
  refuse(pack([{ ...mA, day: 4 }, { ...mB, day: 4 }]), 'Mission day 4 appears twice.');
  refuse(pack([mA, mB, { ...mC, day: 9 }]), 'Mission day 9 appears twice.');
});

test('1h: tactic without a name', () => {
  // Owner 1h: "not a plain object, or name not a string or blank -> 'Every tactic needs a name.'"
  const bad = [5, null, [], 'Tactic A', { archetype: 'negotiator' }, { ...tA, name: '   ' }, { ...tA, name: 7 }];
  for (const t of bad) refuse(pack([mA], [t]), NAME, json(t));
});

test('1h: unknown archetype', () => {
  // Owner 1h: "archetype not one of negotiator, assassin, seducer, escapist, authority -> \"Unknown archetype in the pack's tactics.\""
  for (const archetype of ['pirate', 'Negotiator', ' assassin', '', 3]) refuse(pack([mA], [{ ...tA, archetype }]), ARCH, json(archetype));
  refuse(pack([mA], [{ name: 'Tactic A' }]), ARCH, 'missing archetype');
});

test('R1: per element in file order, first failure wins', () => {
  // R1: "for each mission, shape check -> day check -> duplicate check, then the next mission".
  refuse(pack([{ ...mA, title: '', day: 31 }]), SHAPE, 'shape before day in one mission');
  refuse(pack([{ ...mA, day: 31 }, { ...mB, title: '' }]), DAY, 'first mission fails first');
  refuse(pack([mA, { ...mB, day: 1, title: '' }]), SHAPE, 'shape before duplicate in one mission');
  refuse(pack([mA, { ...mB, day: 1 }, { ...mC, day: 31 }]), 'Mission day 1 appears twice.', 'duplicate before a later bad day');
  // R1: "Same for tactics: shape -> archetype per tactic."
  refuse(pack([mA], [{ ...tA, archetype: 'pirate', name: '' }]), NAME, 'name before archetype in one tactic');
  refuse(pack([mA], [{ ...tA, archetype: 'pirate' }, { ...tB, name: '' }]), ARCH, 'first tactic fails first');
  // Owner 1: g before h.
  refuse(pack([{ ...mA, day: 0 }], [{ ...tA, archetype: 'pirate' }]), DAY, 'missions before tactics');
});

test('success: days 1 and 30, tactics round trip, every archetype id', () => {
  const tactics = ['negotiator', 'assassin', 'seducer', 'escapist', 'authority'].map((archetype, i) => ({ archetype, name: `Tactic ${i}` }));
  // Owner 1 "Success: {ok:true, pack:{missions, tactics}}"; test list: "days 1 and 30 accepted, tactics round trip".
  assert.deepEqual(validatePack(pack([mC, mA], tactics)), { ok: true, pack: { missions: [mC, mA], tactics } });
});

test('success: strings verbatim, v and unknown keys dropped at every level', () => {
  const text = json({ v: 1, extra: 'X', missions: [{ day: 2, title: ' Mission A ', body: 'Body A\n', note: 'X' }], tactics: [{ ...tA, extra: 1 }] });
  // Owner 1: "Strings stored verbatim (no trim). v and unknown keys are dropped."; R2: "rebuilt ... with exactly the data-model fields".
  assert.deepEqual(validatePack(text), { ok: true, pack: { missions: [{ day: 2, title: ' Mission A ', body: 'Body A\n' }], tactics: [tA] } });
});

test('owner call 2: no tactics gives tactics [] and a state that validates', () => {
  // Owner 1g: "An empty missions array is allowed."; owner 2: "a pack file without tactics must give pack.tactics = []".
  const empty = validatePack(pack([]));
  assert.deepEqual(empty, { ok: true, pack: { missions: [], tactics: [] } });
  const r = validatePack(pack([mA]));
  assert.deepEqual(r, { ok: true, pack: { missions: [mA], tactics: [] } });
  // Owner 2: "validateState(importPack(defaultState(), result.pack)) === null for a pack with no tactics."
  assert.equal(validateState(importPack(defaultState(), r.pack)), null);
  assert.equal(validateState(importPack(defaultState(), empty.pack)), null);
});

test('importPack replaces an earlier pack, nothing else changes, input not mutated', () => {
  const s = deepFreeze({ ...defaultState(), tasks: [{ id: 'a' }], pack: { missions: [mA, mB], tactics: [tA] } });
  const next = { missions: [mC], tactics: [] };
  const n = importPack(s, next);
  // Owner 3: "returns a new state with pack replaced (not merged)".
  assert.notEqual(n, s);
  assert.deepEqual(n.pack, { missions: [mC], tactics: [] });
  // Owner 3: "No other key changes".
  assert.deepEqual(Object.keys(n), Object.keys(s));
  for (const k of Object.keys(s)) if (k !== 'pack') assert.equal(n[k], s[k], k);
  // Owner 3: "input not mutated (deepFreeze in the test)".
  assert.deepEqual(s.pack, { missions: [mA, mB], tactics: [tA] });
  // Owner 3: "no validation inside": an import onto a null pack also just replaces it.
  assert.deepEqual(importPack(deepFreeze(defaultState()), next).pack, next);
});

test('missionFor', () => {
  const s = deepFreeze(importPack(defaultState(), { missions: [mA, mB, mC], tactics: [] }));
  // Owner 4: "Returns the mission whose day === n".
  assert.deepEqual(missionFor(s, 9), mB);
  assert.deepEqual(missionFor(s, 1), mA);
  assert.deepEqual(missionFor(s, 30), mC);
  // Plan: "missionFor(state, 9) null when absent".
  assert.equal(missionFor(deepFreeze(importPack(defaultState(), { missions: [mA, mC], tactics: [] })), 9), null);
  // Owner 4: "n must be a number ... (the string '9' included)" -> null even though day 9 exists.
  assert.equal(missionFor(s, '9'), null);
  assert.equal(missionFor(s, undefined), null);
  // Owner 4: "Null also when state.pack is null".
  assert.equal(missionFor(deepFreeze(defaultState()), 9), null);
});

test('tacticsFor', () => {
  const s = deepFreeze(importPack(defaultState(), { missions: [], tactics: [tA, tB, tC] }));
  // Owner 5 / plan: "tacticsFor filters by archetype", "matching tactics in file order".
  assert.deepEqual(tacticsFor(s, 'negotiator'), [tA, tC]);
  assert.deepEqual(tacticsFor(s, 'escapist'), [tB]);
  // Owner 5: "[] when there is no pack or no match".
  assert.deepEqual(tacticsFor(s, 'authority'), []);
  assert.deepEqual(tacticsFor(deepFreeze(defaultState()), 'negotiator'), []);
});

test('Review Focus 5: an imported pack survives export and re-import', () => {
  const r = validatePack(pack([mA, mC], [tA]));
  // Review Focus 5 (owner test list): "validateImport(exportJson(importPack(defaultState(), pack))).ok === true".
  assert.equal(validateImport(exportJson(importPack(defaultState(), r.pack))).ok, true);
});
