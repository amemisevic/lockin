import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { El, all, texts, fire, byLabel, hasClass, headings } from './fakedom.js';
import { renderToday } from '../src/views/today.js';
import { renderGymHome, resetGymHome } from '../src/views/gymHome.js';
import { renderGymStats, resetStatsView } from '../src/views/gymStats.js';
import { renderSettings } from '../src/views/settings.js';
import { emptyGym, setWeeklyTarget, setWeeklyTargetOn, validateGym } from '../src/core/gym.js';
import { defaultState } from '../src/core/model.js';

// G13 views with the gym weekly target on and off: the Today card is gone for good, the Gym tab shows the target only while it is on
// (no text, no empty slot), and Settings has a switch and a number. Same fake-DOM shims as tests/gym-views.test.js. Invented data only.
El.prototype.replaceChildren = function replaceChildren(...cs) { this.children = []; this.append(...cs); };
Object.defineProperty(El.prototype, 'classList', {
  configurable: true,
  get() { return { add: c => { this.className = `${this.className} ${c}`.trim(); }, toggle() {} }; },
});

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const wk = (date, id) => { const [y, m, d] = date.split('-').map(Number), s = new Date(y, m - 1, d, 10).getTime();
  return { id, date, startedAt: s, finishedAt: s + 3_600_000, name: id, routineId: null, items: [{ exerciseId: 'row', sets: [{ reps: 10, weight: 50, warmup: false, done: true }] }] }; };
const WORKOUTS = [wk('2026-10-05', 'a'), wk('2026-10-07', 'b'), wk('2026-10-11', 'c')]; // week of 5 Oct: 3 visits
const gymWith = (on, n = 4) => setWeeklyTargetOn(setWeeklyTarget({ ...emptyGym(), workouts: WORKOUTS }, n), on);
const DATA = { exercises: [{ id: 'row', name: 'Barbell Row', equipment: 'barbell', muscle: 'back', category: 'strength' }], muscles: ['back', 'other'], equipment: ['barbell', 'other'] };
const TARGET_TEXT = /target|\d+\s*\/\s*\d+|\d+ of \d+/i;
const noEmptyText = out => all(out).filter(n => n.tagName === 'SPAN' || n.tagName === 'P').every(n => all([n]).some(x => x.tagName === 'SVG') || n.textContent.trim() !== '');

// ---- Today ----
const todayOut = gym => renderToday({ state: defaultState(), gym, today: () => '2026-10-11', nav() {}, version: '2.1.0' });

test('Today: no Gym card or link, with the target on and off', () => {
  for (const on of [true, false]) {
    const out = todayOut(gymWith(on));
    assert.equal(all(out).some(n => n.id === 'td-gym'), false, `on=${on}`);
    assert.equal(all(out).some(n => n.getAttribute('href') === '#gym'), false, `on=${on}`);
    assert.equal(texts(out).some(t => /gym/i.test(t)), false, `on=${on}`);
  }
});

test('Today: the Gym card code is gone from the source, not only hidden', () => {
  assert.doesNotMatch(read('src/views/today.js'), /gym/i);
  assert.doesNotMatch(read('src/views/todayLogic.js'), /gym/i);
});

// ---- Gym home ----
const homeOut = gym => { resetGymHome(); return renderGymHome({ gym, gymCorrupt: false, today: () => '2026-10-11', nav() {} }, { load() {} }); };
const weekRow = out => all(out).filter(n => hasClass(n, 'tk-sh')).find(n => headings([n])[0] === 'This week');

test('Gym home, target on: "3 of 4 visits" sits in the This week row', () => {
  const out = homeOut(gymWith(true));
  assert.deepEqual(weekRow(out).children.map(c => c.textContent), ['This week', '3 of 4 visits']);
});

test('Gym home, target off: no target text anywhere, the This week row is only its heading, the strip still shows the visits', () => {
  const out = homeOut(gymWith(false));
  assert.equal(texts(out).some(t => TARGET_TEXT.test(t)), false, texts(out).filter(t => TARGET_TEXT.test(t)).join(' | '));
  assert.equal(weekRow(out).children.length, 1);
  assert.ok(noEmptyText(out));
  const tiles = all(out).filter(n => hasClass(n, 'wk'));
  assert.equal(tiles.length, 7);
  assert.equal(tiles.filter(t => hasClass(t, 'sel')).length, 3);
});

test('Gym home: switching the target does not change the visit tiles, buttons or sections', () => {
  const shape = out => ({ heads: headings(out), tiles: all(out).filter(n => hasClass(n, 'wk')).map(n => n.getAttribute('aria-label')), buttons: all(out).filter(n => n.tagName === 'BUTTON').length });
  assert.deepEqual(shape(homeOut(gymWith(false))), shape(homeOut(gymWith(true))));
});

// ---- Gym Stats ----
const statsOut = gym => { resetStatsView(); return renderGymStats({ gym, gymCorrupt: false, today: () => '2026-10-12', nav() {}, redirect() {}, setGym() { return true; } },
  { data: DATA, load() {}, failed: false, retry() {} }); };
const section = (out, title) => all(out).filter(n => n.tagName === 'SECTION').find(s => headings([s])[0] === title);
const viewBoxOf = sec => all([sec]).map(n => n.getAttribute('viewBox')).find(v => v?.startsWith('0 0 12 '));
const MONDAY = [...WORKOUTS, wk('2026-10-12', 'd')]; // 3 visits in the week of 5 Oct (the peak), 1 in this week (12 Oct)

test('Gym Stats, target on: the Target text, the dashed line and the label in the chart', () => {
  const out = statsOut({ ...gymWith(true, 4), workouts: MONDAY });
  const sec = section(out, 'Visits per week');
  assert.ok(texts([sec]).includes('Target 4 a week'));
  assert.equal(all([sec]).filter(n => hasClass(n, 'gs-target')).length, 1);
  assert.match(all([sec]).find(n => n.getAttribute('role') === 'img').getAttribute('aria-label'), /, target 4: /);
  assert.equal(viewBoxOf(sec), '0 0 12 5'); // max(target 4, peak 3) + 1
});

test('Gym Stats, target off: no target text, line, label part or empty paragraph; the scale follows the visits only', () => {
  const out = statsOut({ ...gymWith(false, 4), workouts: MONDAY });
  assert.equal(texts(out).some(t => /target/i.test(t)), false);
  const sec = section(out, 'Visits per week');
  assert.equal(all([sec]).filter(n => hasClass(n, 'gs-target') || hasClass(n, 'gs-tg')).length, 0);
  assert.doesNotMatch(all([sec]).find(n => n.getAttribute('role') === 'img').getAttribute('aria-label'), /target/i);
  assert.equal(viewBoxOf(sec), '0 0 12 4'); // peak 3 + 1
  assert.ok(noEmptyText(out));
  assert.equal(all([sec]).filter(n => hasClass(n, 'an-bar')).length, 2); // the bars are still drawn (weeks of 5 Oct and 12 Oct hold visits)
});

// ---- Settings ----
const TODAY = '2026-10-11';
const settingsApp = gym => ({ state: defaultState(), gym, today: () => TODAY, version: '2.1.0', set() {}, setGym(fn) { this.gym = fn(this.gym); return true; } });
const gymSection = out => all(out).filter(n => n.tagName === 'SECTION').find(s => headings([s])[0] === 'Gym');
const stepperOf = out => byLabel([gymSection(out)], 'Gym visits a week');
const press = (group, label) => fire(all([group]).find(n => n.getAttribute('aria-label') === label), 'click');
const rows = out => all([gymSection(out)]).filter(n => hasClass(n, 'sr'));

test('Settings: a Gym section between Challenge and Reminders', () => {
  assert.deepEqual(headings(renderSettings(settingsApp(emptyGym()))), ['Protocols', 'Red lines', 'Challenge', 'Gym', 'Reminders', 'Data']);
});

test('Settings, target on (default): a switch that is on and a number control showing 4', () => {
  const out = renderSettings(settingsApp(emptyGym()));
  const sw = byLabel([gymSection(out)], 'Weekly gym target');
  assert.equal(sw.getAttribute('role'), 'switch');
  assert.equal(sw.getAttribute('aria-checked'), 'true');
  assert.equal(sw.id, 'set-gym-target'); // app.js restores focus by id after the re-render
  assert.equal(stepperOf(out).children[1].textContent, '4');
  assert.equal(rows(out).length, 2);
});

test('Settings: data written before the switch existed reads as on', () => {
  const old = { ...emptyGym(), settings: { weeklyTarget: 3 } };
  const out = renderSettings(settingsApp(old));
  assert.equal(byLabel([gymSection(out)], 'Weekly gym target').getAttribute('aria-checked'), 'true');
  assert.equal(stepperOf(out).children[1].textContent, '3');
});

test('Settings: the switch turns the target off and on; off hides the number control and shows no digit', () => {
  const app = settingsApp(emptyGym());
  fire(byLabel([gymSection(renderSettings(app))], 'Weekly gym target'), 'click');
  assert.equal(app.gym.settings.weeklyTargetOn, false);
  assert.equal(app.gym.settings.weeklyTarget, 4); // the number is kept
  assert.deepEqual(validateGym(app.gym), { ok: true });
  const off = renderSettings(app);
  assert.equal(byLabel([gymSection(off)], 'Weekly gym target').getAttribute('aria-checked'), 'false');
  assert.equal(stepperOf(off), undefined);
  assert.equal(rows(off).length, 1);
  assert.equal(texts([gymSection(off)]).some(t => /\d/.test(t)), false);
  fire(byLabel([gymSection(off)], 'Weekly gym target'), 'click');
  assert.equal(app.gym.settings.weeklyTargetOn, true);
  assert.equal(stepperOf(renderSettings(app)).children[1].textContent, '4');
});

test('Settings: the number steps from 1 to 7 and stops at both ends', () => {
  const app = settingsApp(emptyGym());
  press(stepperOf(renderSettings(app)), 'More');
  assert.equal(app.gym.settings.weeklyTarget, 5);
  press(stepperOf(renderSettings(app)), 'Fewer');
  press(stepperOf(renderSettings(app)), 'Fewer');
  assert.equal(app.gym.settings.weeklyTarget, 3);
  const low = renderSettings(settingsApp(setWeeklyTarget(emptyGym(), 1)));
  assert.ok(all([stepperOf(low)]).find(n => n.getAttribute('aria-label') === 'Fewer').getAttribute('disabled') !== null);
  const high = renderSettings(settingsApp(setWeeklyTarget(emptyGym(), 7)));
  assert.ok(all([stepperOf(high)]).find(n => n.getAttribute('aria-label') === 'More').getAttribute('disabled') !== null);
});

test('Settings: changing the number never switches the target on or off', () => {
  const app = settingsApp(setWeeklyTargetOn(emptyGym(), true));
  press(stepperOf(renderSettings(app)), 'More');
  assert.equal(app.gym.settings.weeklyTargetOn, true);
});

test('Settings: the switch and the number buttons are 44 pt or more (shared styles)', () => {
  const css = read('styles.css');
  assert.match(css, /\.swb\{[^}]*width:60px;height:44px/);
  assert.match(css, /\.stp button\{width:44px;height:44px/);
  const src = read('src/views/settings.js');
  assert.match(src, /switchControl/);
  assert.match(src, /stepper\(/);
});
