import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { redoDeclaredToday } from '../src/views/challengeLogic.js';
import { startChallenge, submitMorning, declareRedo } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { setWarEntry, oathComplete } from '../src/core/warlog.js';
import { defaultState, validateState } from '../src/core/model.js';
import { addDays } from '../src/logic.js';

// Task 13 fix round 2 (owner ruling 2026-10-14): today's strip cell shows a declared Redo with the existing bronze
// ring; stored result and legend are unchanged until the night closes the day. States built with core functions.
const at = (key, h, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
const ok = r => { assert.equal(r.ok, true, r.error); assert.equal(validateState(r.state), null); return r.state; };
const HELD = { protocols: { p1: 'held' }, redLines: { r1: 'held' } };
const D1 = '2026-10-13', D2 = addDays(D1, 1);

function started(key) {
  let s = defaultState();
  for (const k of ['contract', 'funeral', 'code', 'redlines-w1']) s = setWarEntry(s, k, `Text ${k}`, at(key, 7));
  return ok(startChallenge(s, key, { protocols: [{ id: 'p1', title: 'Protocol A', med: null }],
    redLines: [{ id: 'r1', name: 'Red Line A' }], oathComplete: oathComplete(s) }));
}
const declared = (s, key) => ok(declareRedo(s, key, at(key, 9)));

test('redoDeclaredToday: false before, true after declareRedo on today', () => {
  const s = started(D1);
  assert.equal(redoDeclaredToday(s, D1), false);
  assert.equal(redoDeclaredToday(declared(s, D1), D1), true);
});

test('redoDeclaredToday: a past declared day does not mark today', () => {
  let s = declared(started(D1), D1);
  s = ok(closeNight(s, D1, HELD, at(D1, 21)));
  assert.equal(redoDeclaredToday(s, D2), false);
});

test('redoDeclaredToday: false once today is closed with a result', () => {
  let s = declared(started(D1), D1);
  s = ok(submitMorning(s, D1, { target: 'Task A', risk: '', med: [] }, at(D1, 8)));
  s = ok(closeNight(s, D1, HELD, at(D1, 21)));
  assert.equal(s.days[D1].result, 'redo');
  assert.equal(redoDeclaredToday(s, D1), false);
});

// Contrast: helpers copied from tests/contrast-challenge.test.js.
const tokensCss = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const css = readFileSync(new URL('../screens.css', import.meta.url), 'utf8');
const D0 = tokensCss.indexOf('/* tokens:dark */');
const dark = Object.fromEntries([...tokensCss.slice(D0, tokensCss.indexOf('}', D0)).matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m => [m[1], m[2]]));
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const decl = (src, sel, prop) => {
  const m = src.match(new RegExp(`(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{([^}]*)\\}`));
  assert.ok(m, `rule ${sel} not found`);
  const v = m[1].match(new RegExp(`(?:^|;)${prop}:([^;]+)`))?.[1].trim();
  assert.ok(v, `${sel} has no ${prop}`); return v;
};
const token = v => { const t = v.match(/^var\((--[\w-]+)\)$/)?.[1]; assert.ok(t && dark[t], `not a colour token: ${v}`); return t; };

test('declared-Redo ring on today (.dy.t.dr): existing bronze token, >= 3 on the today cell and on both hero stops', t => {
  const name = token(decl(css, '.dy.t.dr', 'border-color'));
  assert.ok(['--bronze', '--bronze-lt'].includes(name), `${name} is not the existing bronze`);
  const ring = dark[name];
  const bgs = [decl(css, '.dy.t', 'background'), '#201d1a', dark['--plate-bot']];
  for (const bg of bgs) {
    const x = ratio(rgb(ring), rgb(bg));
    t.diagnostic(`${name} ${ring} on ${bg} = ${x.toFixed(3)}`);
    assert.ok(x >= 3, `${ring} on ${bg}: ${x.toFixed(3)} < 3`);
  }
});
