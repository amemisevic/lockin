import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { El, all, fire, byText, hasClass, texts } from './fakedom.js';
import { HELP } from '../src/views/helpCopy.js';
import { renderSettings } from '../src/views/settings.js';
import { openProtocolSheet, openRedLineSheet } from '../src/views/settingsSheets.js';
import { defaultState } from '../src/core/model.js';

// Task H1b-S: the nine Settings "?" buttons (docs/superpowers/plans/help-copy-settings-draft.md, entries 1 to 9).
// Same fake DOM shims as help-buttons.test.js.
El.prototype.showModal = function () { this.attrs.open = ''; };
El.prototype.close = function () { delete this.attrs.open; };
El.prototype.replaceChildren = function (...cs) { this.children = []; this.append(...cs); };
Object.defineProperty(El.prototype, 'style', { get() { return { setProperty() {} }; } });
Object.defineProperty(El.prototype, 'isConnected', { get() { return this.parent != null; } });
const textGet = Object.getOwnPropertyDescriptor(El.prototype, 'textContent').get; // the sheets clear their error line with textContent = ''
Object.defineProperty(El.prototype, 'textContent', { get: textGet, set(v) { this.children = []; if (v) this.append(String(v)); } });
globalThis.matchMedia = () => ({ matches: false });
globalThis.document.body.parent = {};

// draft entry number -> HELP key
const KEYS = { 1: 'zeroDay', 2: 'medPerWeek', 3: 'startDate', 4: 'packImport', 5: 'medVersion', 6: 'deleteItem', 7: 'gymTarget', 8: 'exportBackup', 9: 'importBackup' };
const draft = readFileSync(new URL('../docs/superpowers/plans/help-copy-settings-draft.md', import.meta.url), 'utf8');
const entry = n => {
  const block = draft.split(/^## /m).find(b => b.startsWith(`${n}. `));
  return { name: block.match(/^- name: `(.+)`$/m)[1], text: block.match(/^- text: "(.+)"$/m)[1] };
};

const app = state => ({ state, today: () => '2026-10-12', version: '2.4.1', set() {} });
const helps = nodes => all(nodes).filter(n => hasClass(n, 'help'));
const labels = nodes => helps(nodes).map(n => n.getAttribute('aria-label')).sort();
const want = (...keys) => keys.map(k => `Help: ${HELP[k].name}`).sort();
const btn = (nodes, key) => helps(nodes).find(n => n.getAttribute('aria-label') === `Help: ${HELP[key].name}`);
const sheets = () => document.body.children.filter(n => n.tagName === 'DIALOG' && !hasClass(n, 'ghost') && hasClass(n, 'action-sheet'));
const sameRow = (b, title) => all([b.parent]).some(n => n.tagName === 'B' && n.textContent === title);

test('Erase all data entry: owner-approved text (STATUS.md draft, 2026-10-24)', () => {
  assert.deepEqual(HELP.eraseAll, { name: 'Erase all data', text: 'Deletes everything Lock In stored on this phone and restarts the app empty. Export a backup first.' });
});

test('the nine Settings entries match the draft word for word', () => {
  for (const [n, key] of Object.entries(KEYS)) assert.deepEqual(HELP[key], entry(n), key);
});

test('Settings page: one "?" per draft row, none for the rows the draft leaves out', () => {
  const out = renderSettings(app(defaultState()));
  assert.deepEqual(labels(out), want('addProtocols', 'addRedLines', 'zeroDay', 'medPerWeek', 'startDate', 'packImport', 'gymTarget', 'exportBackup', 'importBackup', 'eraseAll'));
});

test('each "?" sits in the row the draft names', () => {
  const out = renderSettings(app(defaultState()));
  for (const [key, title] of [['zeroDay', 'Zero Day threshold'], ['medPerWeek', 'MED per week'], ['startDate', 'Day 1'],
    ['packImport', 'Challenge pack'], ['gymTarget', 'Weekly gym target']]) assert.ok(sameRow(btn(out, key), title), key);
  for (const [key, title] of [['exportBackup', 'Export backup'], ['importBackup', 'Import backup'], ['eraseAll', 'Erase all data']]) {
    assert.ok(btn(out, key).parent.children.some(n => n.tagName === 'BUTTON' && n.textContent === title), key);
  }
});

test('the Data "?" buttons are not inside the action buttons (no button in a button)', () => {
  const out = renderSettings(app(defaultState()));
  for (const b of helps(out)) assert.ok(!all([b.parent]).some(n => n.tagName === 'BUTTON' && n.children.includes(b)), b.getAttribute('aria-label'));
});

test('Protocol sheet: MED version field, and Delete only when editing', () => {
  openProtocolSheet(app(defaultState()));
  let dialog = document.body.children.filter(n => n.tagName === 'DIALOG').at(-1);
  assert.deepEqual(labels([dialog]), want('medVersion'));
  assert.ok(texts([btn([dialog], 'medVersion').parent]).includes('MED version (optional)'));
  fire(byText([dialog], 'button', 'Cancel'), 'click');
  openProtocolSheet(app(defaultState()), { id: 'p1', title: 'A', med: 'a' });
  dialog = document.body.children.filter(n => n.tagName === 'DIALOG').at(-1);
  assert.deepEqual(labels([dialog]), want('medVersion', 'deleteItem'));
  assert.ok(btn([dialog], 'deleteItem').parent.children.includes(byText([dialog], 'button', 'Delete protocol')));
});

test('Red line sheet: Delete "?" only when editing', () => {
  openRedLineSheet(app(defaultState()));
  let dialog = document.body.children.filter(n => n.tagName === 'DIALOG').at(-1);
  assert.deepEqual(labels([dialog]), []);
  fire(byText([dialog], 'button', 'Cancel'), 'click');
  openRedLineSheet(app(defaultState()), { id: 'r1', name: 'X' });
  dialog = document.body.children.filter(n => n.tagName === 'DIALOG').at(-1);
  assert.deepEqual(labels([dialog]), want('deleteItem'));
  assert.ok(btn([dialog], 'deleteItem').parent.children.includes(byText([dialog], 'button', 'Delete red line')));
});

test('tapping a Settings "?" opens the help sheet with its text and Close', () => {
  const out = renderSettings(app(defaultState()));
  for (const key of ['zeroDay', 'exportBackup']) {
    fire(btn(out, key), 'click');
    assert.equal(sheets().length, 1, key);
    assert.ok(texts(sheets()).includes(HELP[key].text), key);
    fire(byText(sheets(), 'button', 'Close'), 'click');
    assert.equal(sheets().length, 0, key);
  }
});
