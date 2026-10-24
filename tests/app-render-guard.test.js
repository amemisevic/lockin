import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Backlog T14-2 (Task 21): the render() guard in src/app.js. app.js mounts the whole app on import, so it cannot be imported
// in a test; its render() is cut out of the source and run with stubs. If the function is renamed or moved, this test fails
// loudly instead of silently passing.
const src = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const body = src.match(/function render\(\) \{[\s\S]*?\r?\n\}\r?\n/)?.[0];

// route = where the router points now; shown = the screen on display. focus = document.activeElement.
function setup({ route = 'recovery/2027-01-01', shown = 'recovery/2027-01-01', focus = null, viewHas = true } = {}) {
  assert.ok(body, 'function render() not found in src/app.js');
  const calls = { screens: 0 };
  const [name, ...params] = route.split('/');
  const env = {
    app: { route: () => ({ name, params, tab: 'challenge', pushed: false }) },
    view: { classList: { toggle() {} }, contains: el => viewHas && el !== null && el === focus },
    window: { scrollY: 40, scrollTo() {} },
    document: { activeElement: focus, getElementById: () => null },
    swapRows() {}, screen: () => { calls.screens++; return []; },
    tabs: [], tabBar: { style: { setProperty() {} }, hidden: false },
  };
  const names = Object.keys(env);
  const make = new Function(...names, `let shown = ${JSON.stringify(shown)};\n${body}\nreturn render;`);
  return { render: make(...names.map(n => env[n])), calls };
}

test('a focused TEXTAREA inside the view on the same screen: the tick re-render is skipped', () => {
  const { render, calls } = setup({ focus: { tagName: 'TEXTAREA' } });
  render();
  assert.equal(calls.screens, 0);
});

test('a focused INPUT inside the view on the same screen: skipped too', () => {
  const { render, calls } = setup({ focus: { tagName: 'INPUT' } });
  render();
  assert.equal(calls.screens, 0);
});

test('same screen, nothing focused: it re-renders', () => {
  const { render, calls } = setup({ focus: null });
  render();
  assert.equal(calls.screens, 1);
});

test('a focused button, select or link does not block the re-render', () => {
  for (const tagName of ['BUTTON', 'SELECT', 'A']) {
    const { render, calls } = setup({ focus: { tagName } });
    render();
    assert.equal(calls.screens, 1, tagName);
  }
});

test('a focused TEXTAREA outside #view does not block the re-render', () => {
  const { render, calls } = setup({ focus: { tagName: 'TEXTAREA' }, viewHas: false });
  render();
  assert.equal(calls.screens, 1);
});

test('route change with a focused TEXTAREA: the new screen still renders', () => {
  const { render, calls } = setup({ focus: { tagName: 'TEXTAREA' }, route: 'today', shown: 'recovery/2027-01-01' });
  render();
  assert.equal(calls.screens, 1);
});
