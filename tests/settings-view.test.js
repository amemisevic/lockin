import test from 'node:test';
import assert from 'node:assert/strict';
import { all, texts, fire, byText, byLabel, headings, hasClass, windowListeners } from './fakedom.js';
import { renderSettings, exportBackup, importBackupFile, importPackFile } from '../src/views/settings.js';
import { renderDay0 } from '../src/views/day0.js';
import { defaultState } from '../src/core/model.js';
import { startChallenge } from '../src/core/challenge.js';
import { exportJson } from '../src/core/store.js';

// Task 19 Settings view. DOM conventions pinned here (the code must produce them):
// - h2.sec headings in order Protocols, Red lines, Challenge, Gym (G13), Reminders, Data.
// - protocol / red line rows are buttons (id set-protocol-<id> / set-redline-<id>); 'Add protocol' / 'Add red line' buttons.
// - steppers (ui/controls.js) with group aria-label 'Zero Day threshold' and 'MED per week'.
// - Day 1: an <input type=date id=set-start> while editable, plain text (no input) once a day is closed.
// - a refusal shows its exact sentence in a .plate.warn with role=alert; nothing else changes and app.set is never called.
const TODAY = '2026-10-14';
const P = { id: 'p1', title: 'Protocol A', med: null };
const R = { id: 'r1', name: 'Red line A' };
const mkApp = (state, today = TODAY) => {
  const sets = [];
  return { state, sets, today: () => today, version: '1.0.0', set(fn) { const n = fn(this.state); sets.push(n); if (n !== this.state) this.state = n; } };
};
const live = () => startChallenge(defaultState(), '2026-10-12', { protocols: [P], redLines: [R], oathComplete: true }).state;
const file = text => ({ text: async () => text });
const alerts = nodes => all(nodes).filter(n => n.getAttribute('role') === 'alert').map(n => n.textContent);
const noConfirm = () => { throw new Error('confirm must not open'); };

test('sections in order, with the setup lists before Day 1', () => {
  const app = mkApp({ ...defaultState(), setup: { protocols: [P], redLines: [R] } });
  const out = renderSettings(app);
  assert.deepEqual(headings(out), ['Protocols', 'Red lines', 'Challenge', 'Gym', 'Reminders', 'Data']);
  assert.ok(texts(all(out).filter(n => n.id === 'set-protocol-p1')).includes('Protocol A'));
  assert.ok(all(out).some(n => n.id === 'set-redline-r1'));
  assert.ok(texts(out).includes('Add protocol') && texts(out).includes('Add red line'));
  assert.equal(all(out).some(n => n.id === 'set-start'), false);
});

test('steppers change the settings through app.set within the core bounds', () => {
  const app = mkApp(defaultState());
  const z = byLabel(renderSettings(app), 'Zero Day threshold');
  fire(all([z]).find(n => n.getAttribute('aria-label') === 'More'), 'click');
  assert.equal(app.state.settings.zeroDay, 4);
  const m = byLabel(renderSettings(app), 'MED per week');
  fire(all([m]).find(n => n.getAttribute('aria-label') === 'Fewer'), 'click');
  assert.equal(app.state.settings.medPerWeek, 1);
  const edge = mkApp({ ...defaultState(), settings: { ...defaultState().settings, zeroDay: 5, medPerWeek: 0 } });
  const out = renderSettings(edge);
  const more = all([byLabel(out, 'Zero Day threshold')]).find(n => n.getAttribute('aria-label') === 'More');
  const fewer = all([byLabel(out, 'MED per week')]).find(n => n.getAttribute('aria-label') === 'Fewer');
  assert.ok(more.getAttribute('disabled') !== null && fewer.getAttribute('disabled') !== null);
});

test('Day 1 date is an input while no day is closed and plain text afterwards', () => {
  const out = renderSettings(mkApp(live()));
  const input = all(out).find(n => n.id === 'set-start');
  assert.equal(input.getAttribute('type'), 'date');
  assert.equal(input.getAttribute('value'), '2026-10-12');
  const s = live();
  const closed = { ...s, days: { '2026-10-12': { morning: null, afternoon: null, declaredRedo: false, slipNote: '', incompleteMorning: false,
    auto: null, night: null, result: 'redo', closedAt: 5 } } };
  const out2 = renderSettings(mkApp(closed));
  assert.equal(all(out2).some(n => n.id === 'set-start'), false);
  assert.ok(texts(out2).some(t => t.includes('12 Oct')));
});

test('changing Day 1 into an orphaning date shows the refusal and keeps the state', () => {
  const s = live();
  const filed = { ...s, days: { '2026-10-12': { morning: { at: 1, target: 't', risk: '', med: [] }, afternoon: null, declaredRedo: false,
    slipNote: '', incompleteMorning: false, auto: null, night: null, result: null, closedAt: null } } };
  const app = mkApp(filed);
  const input = all(renderSettings(app)).find(n => n.id === 'set-start');
  fire(input, 'change', { target: { value: '2026-10-13' } });
  assert.equal(app.state, filed);
  const out = renderSettings(app);
  assert.deepEqual(alerts(out), ['Day 1 cannot move there: a day you already filed would fall outside the 30 days.']);
});

test('import backup: every refusal shows the exact sentence, never opens the confirm, never calls app.set', async () => {
  const cases = [
    ['', 'The file is empty.'],
    ['not json', 'The file is not valid JSON. Choose a Lock In backup file.'],
    [JSON.stringify({ v: 1 }), 'This is a Lock In v1 backup. v2 cannot import it.'],
    [JSON.stringify({ ...defaultState(), days: { '2026-10-01': { morning: null, afternoon: null, declaredRedo: false, slipNote: '',
      incompleteMorning: false, auto: null, night: null, result: null, closedAt: 5 } } }), "The backup's days are damaged."],
    [JSON.stringify({ ...defaultState(), warLog: { secret: { text: 'x', updatedAt: 1 } } }), "The backup's war log is damaged."],
  ];
  for (const [text, error] of cases) {
    const app = mkApp(live());
    await importBackupFile(app, file(text), noConfirm);
    assert.equal(app.sets.length, 0, error);
    assert.deepEqual(alerts(renderSettings(app)), [error]);
  }
});

test('import backup: an unreadable file is a plain refusal', async () => {
  const app = mkApp(live());
  await importBackupFile(app, { text: async () => { throw new Error('x'); } }, noConfirm);
  assert.equal(app.sets.length, 0);
  assert.deepEqual(alerts(renderSettings(app)), ['The file could not be read.']);
});

test('import backup: success asks Replace everything? and replaces the state only on yes', async () => {
  const incoming = { ...defaultState(), setup: { protocols: [P], redLines: [R] } };
  const app = mkApp(live());
  let asked = null;
  await importBackupFile(app, file(exportJson(incoming)), (title, onYes) => { asked = { title, onYes }; });
  assert.equal(asked.title, 'Replace everything?');
  assert.equal(app.sets.length, 0);
  asked.onYes();
  assert.equal(app.sets.length, 1);
  assert.deepEqual(app.state, incoming);
  assert.deepEqual(alerts(renderSettings(app)), []);
});

test('a refusal clears on the next successful attempt', async () => {
  const app = mkApp(defaultState());
  await importBackupFile(app, file('nope'), noConfirm);
  assert.equal(alerts(renderSettings(app)).length, 1);
  await importBackupFile(app, file(exportJson(defaultState())), () => {});
  assert.deepEqual(alerts(renderSettings(app)), []);
});

test('import pack: refusals show the exact validatePack error and never call app.set', async () => {
  for (const [text, error] of [['', 'The file is empty.'], ['{', 'The file is not valid JSON. Choose a Lock In pack file.'],
    [JSON.stringify({ v: 2 }), 'This is not a Lock In pack.'],
    [JSON.stringify({ v: 1, missions: [{ day: 31, title: 'a', body: 'b' }] }), 'Mission days must be whole numbers from 1 to 30.']]) {
    const app = mkApp(live());
    await importPackFile(app, file(text), noConfirm);
    assert.equal(app.sets.length, 0, error);
    assert.deepEqual(alerts(renderSettings(app)), [error]);
  }
});

test('import pack: success asks Replace the current pack? and imports only on yes', async () => {
  const pack = { v: 1, missions: [{ day: 1, title: 'M', body: 'b' }], tactics: [] };
  const app = mkApp(live());
  let asked = null;
  await importPackFile(app, file(JSON.stringify(pack)), (title, onYes) => { asked = { title, onYes }; });
  assert.equal(asked.title, 'Replace the current pack?');
  assert.equal(app.sets.length, 0);
  asked.onYes();
  assert.deepEqual(app.state.pack, { missions: [{ day: 1, title: 'M', body: 'b' }], tactics: [] });
});

const io = over => ({ makeFile: (name, text) => ({ name, text }), canShare: () => true, share: async () => {}, download() {}, ...over });

test('exportBackup: a cancelled share does not mark; a completed one marks through app.set', async () => {
  const a = mkApp(defaultState());
  await exportBackup(a, io({ share: async () => { throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); } }));
  assert.equal(a.sets.length, 0);
  const b = mkApp(defaultState());
  await exportBackup(b, io());
  assert.equal(b.state.settings.lastBackup, TODAY);
  const c = mkApp(defaultState());
  await exportBackup(c, io({ canShare: () => false }));
  assert.equal(c.state.settings.lastBackup, TODAY);
});

test('Data section: last-backup line and the overdue warning come from backupStatus', () => {
  const overdue = renderSettings(mkApp(defaultState()));
  assert.ok(texts(overdue).includes('No backup yet · export one weekly'));
  assert.ok(all(overdue).some(n => hasClass(n, 'set-overdue')));
  const fresh = renderSettings(mkApp({ ...defaultState(), settings: { ...defaultState().settings, lastBackup: TODAY } }));
  assert.ok(texts(fresh).includes('Today · export one weekly'));
  assert.equal(all(fresh).some(n => hasClass(n, 'set-overdue')), false);
});

test('Day 0 rows navigate to Settings instead of the stub', () => {
  const out = renderDay0(mkApp({ ...defaultState(), setup: { protocols: [P], redLines: [] } }));
  const prot = all(out).find(n => n.id === 'ch-protocols');
  const red = all(out).find(n => n.id === 'ch-redlines');
  assert.equal(prot.tagName, 'A');
  assert.equal(prot.getAttribute('href'), '#settings');
  assert.equal(red.getAttribute('href'), '#settings');
  assert.ok(texts([prot]).includes('1 added'));
});

test('Day 0: Begin Day 1 is enabled once the oath and both setup lists exist', () => {
  let s = { ...defaultState(), setup: { protocols: [P], redLines: [R] } };
  for (const k of ['contract', 'funeral', 'code', 'redlines-w1']) s = { ...s, warLog: { ...s.warLog, [k]: { text: 'x', updatedAt: 1 } } };
  const btn = all(renderDay0(mkApp(s))).find(n => n.id === 'ch-begin');
  assert.equal(btn.getAttribute('disabled'), null);
  const app = mkApp(s);
  fire(all(renderDay0(app)).find(n => n.id === 'ch-begin'), 'click');
  assert.equal(app.state.challenge.startDate, TODAY);
  assert.equal('setup' in app.state, false);
});

test('only the latest refusal is on screen, whichever list it came from', async () => {
  const app = mkApp(live());
  await importBackupFile(app, file('nope'), noConfirm);
  await importPackFile(app, file(''), noConfirm);
  assert.deepEqual(alerts(renderSettings(app)), ['The file is empty.']);
  await importPackFile(app, file(JSON.stringify({ v: 1, missions: [], tactics: [] })), () => {});
  assert.deepEqual(alerts(renderSettings(app)), []);
});

test('changing Day 1 back to a day that already ended is refused with the sentence, state untouched', () => {
  const app = mkApp(live());
  fire(all(renderSettings(app)).find(n => n.id === 'set-start'), 'change', { target: { value: '2026-09-01' } });
  assert.equal(app.sets.length, 0);
  assert.deepEqual(alerts(renderSettings(app)), ['Day 1 cannot move back to a day that has already ended.']);
});

test('the Day 1 input has a lower bound of yesterday and an upper bound of today', () => {
  const input = all(renderSettings(mkApp(live()))).find(n => n.id === 'set-start');
  assert.equal(input.getAttribute('min'), '2026-10-13');
  assert.equal(input.getAttribute('max'), TODAY);
});

test('a refusal is announced once: later renders keep the text but not role=alert', async () => {
  const app = mkApp(live());
  await importBackupFile(app, file(''), noConfirm);
  assert.deepEqual(alerts(renderSettings(app)), ['The file is empty.']);
  const again = renderSettings(app);
  assert.deepEqual(alerts(again), []);
  assert.ok(texts(again).includes('The file is empty.'));
});

test('leaving Settings clears the refusal', async () => {
  const app = mkApp(live());
  await importBackupFile(app, file(''), noConfirm);
  assert.ok(windowListeners.hashchange?.length > 0);
  globalThis.location.hash = '#today';
  for (const fn of windowListeners.hashchange) fn({ type: 'hashchange' });
  globalThis.location.hash = '#settings';
  assert.deepEqual(alerts(renderSettings(app)), []);
  assert.equal(texts(renderSettings(app)).includes('The file is empty.'), false);
});
