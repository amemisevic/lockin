import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Backlog S1-02: a failed gym write and a failed challenge write have their own flag; the banner shows while either is set.
// app.js mounts the whole app on import, so the real `app` object literal is cut out of the source and run with stubs
// (same approach as app-render-guard.test.js). If it is renamed or moved, this test fails loudly.
const src = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const body = src.match(/export const app = (\{[\s\S]*?\r?\n\});\r?\n/)?.[1];

function setup() {
  assert.ok(body, 'export const app = {...} not found in src/app.js');
  const ok = { c: true, g: true }, banner = [];
  const env = {
    storage: null, load: () => ({ n: 0 }), today: () => '2026-10-14', gymLoaded: { state: { n: 0 }, corrupt: false },
    VERSION: 'x', requestedDate: null, notify() {}, nav() {}, parseRoute() {}, location: {}, subscribers: new Set(),
    save: () => ok.c, saveGym: () => ({ ok: ok.g }), showBanner: failed => banner.push(failed),
  };
  const names = Object.keys(env);
  const app = new Function(...names, `return ${body};`)(...names.map(n => env[n]));
  return { app, ok, shown: () => banner.at(-1) };
}
const bump = x => ({ n: x.n + 1 });

test('gym fails, then challenge saves: the banner stays; gym saves too: it clears', () => {
  const { app, ok, shown } = setup();
  ok.g = false; app.setGym(bump);
  assert.equal(shown(), true);
  assert.equal(app.saveFailed, true);
  app.set(bump); // challenge write succeeds
  assert.equal(shown(), true);
  assert.equal(app.saveFailed, true);
  ok.g = true; app.setGym(bump);
  assert.equal(shown(), false);
  assert.equal(app.saveFailed, false);
});

test('challenge fails, then gym saves: the banner stays; challenge saves too: it clears', () => {
  const { app, ok, shown } = setup();
  ok.c = false; app.set(bump);
  assert.equal(shown(), true);
  app.setGym(bump); // gym write succeeds
  assert.equal(shown(), true);
  assert.equal(app.saveFailed, true);
  ok.c = true; app.set(bump);
  assert.equal(shown(), false);
  assert.equal(app.saveFailed, false);
});
