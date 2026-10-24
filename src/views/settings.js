// Settings tab (plan Task 19). Layout = static/Settings.html; state changes = settingsLogic.js; sheets = settingsSheets.js.
// The board's per-protocol pause switch is not built: the data model has no paused flag (owner ruling pending).
// The latest refusal (date, pack or backup) is module memory shown in an alert plate while the state is the one it was made on
// (any change to it, or the next attempt, removes the plate); never saved.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { eyebrow, screenTitle, sectionHeading, plate, rerender } from '../ui/chrome.js';
import { stepper, switchControl, helpButton } from '../ui/controls.js';
import { validateImport, markBackup } from '../core/store.js';
import { WEEKLY_TARGET, weeklyTarget, setWeeklyTarget, setWeeklyTargetOn } from '../core/gym.js';
import { validatePack, importPack } from '../core/pack.js';
import { addDays } from '../logic.js';
import { dayLabel } from './tasksLogic.js';
import * as L from './settingsLogic.js';
import { openProtocolSheet, openRedLineSheet, openRemindersSheet, confirmSheet } from './settingsSheets.js';

let refusal = null; // { key: 'start' | 'pack' | 'backup', text, state, announced }
// Leaving Settings drops the refusal (registered before app.js's own listener, so it runs before the re-render).
window.addEventListener('hashchange', () => { if (location.hash !== '#settings') refusal = null; });
const fail = (app, key, text) => { refusal = { key, text, state: app.state, announced: false }; rerender(); };
const clear = () => { if (refusal) { refusal = null; rerender(); } };
const readText = async file => { try { return await file.text(); } catch { return null; } };

const browserIo = {
  makeFile: (name, text) => new File([new Blob([text], { type: 'application/json' })], name, { type: 'application/json' }),
  canShare: file => !!navigator.canShare?.({ files: [file] }),
  share: file => navigator.share({ files: [file] }),
  download(file) {
    const url = URL.createObjectURL(file);
    const a = h('a', { href: url, download: file.name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

// Shared with nothing else yet; the backup is marked only after the share or download ran (a cancelled share is not a backup).
export async function exportBackup(app, io = browserIo) {
  const today = app.today();
  const r = await L.runExport(app.state, today, io, app.gym);
  if (r.outcome !== 'cancelled') app.set(s => markBackup(s, today));
}

export async function importBackupFile(app, file, ask = confirmSheet) {
  const text = await readText(file);
  const r = text === null ? { ok: false, error: 'The file could not be read.' } : validateImport(text);
  if (!r.ok) return fail(app, 'backup', r.error);
  clear();
  ask('Replace everything?', () => {
    if (!L.applyImport(app, r)) fail(app, 'backup', 'The backup could not be saved. Nothing was changed.');
  }, 'Replace everything');
}

export async function importPackFile(app, file, ask = confirmSheet) {
  const text = await readText(file);
  const r = text === null ? { ok: false, error: 'The file could not be read.' } : validatePack(text);
  if (!r.ok) return fail(app, 'pack', r.error);
  clear();
  ask('Replace the current pack?', () => app.set(s => importPack(s, r.pack)), 'Replace pack');
}

// role=alert only on the first display: the 30 s tick rebuilds the screen and must not make VoiceOver repeat it.
function alertPlate(app, key) {
  if (refusal?.key !== key || refusal.state !== app.state) return null;
  const role = refusal.announced ? null : 'alert';
  refusal.announced = true;
  return plate.warn(h('p', { class: 'set-err', role }, refusal.text));
}
const row = (...children) => h('div', { class: 'sr' }, children);
const label = (title, sub) => h('div', { class: 'a' }, h('b', null, title), sub != null && h('span', null, sub));
const chevron = () => { const c = icon('chevronRight'); c.setAttribute('class', 'set-chev'); return c; };
const navRow = (id, title, sub, onClick) => h('button', { type: 'button', id, class: 'sr set-btn', onClick }, label(title, sub), chevron());
const addRow = (id, text, onClick) => h('button', { type: 'button', id, class: 'sr set-btn gt', onClick }, icon('plus'), text);
const actionRow = (id, text, onClick) => h('button', { type: 'button', id, class: 'sr set-btn gt', onClick }, text);
// A "?" cannot sit inside a button, so a whole-row button gets its "?" beside it (.ch-or, as on Day 0).
const withHelp = (key, button) => h('div', { class: 'ch-or' }, button, helpButton(key));
// Built on tap and kept in <body> until it answers, so a screen rebuild while the Files sheet is open cannot detach it.
function pickFile(id, onFile) {
  const input = h('input', { type: 'file', id, accept: 'application/json,.json', hidden: true,
    onChange: e => { const f = e.target.files?.[0]; input.remove(); if (f) onFile(f); },
    onCancel: () => input.remove() });
  document.body.append(input);
  input.click();
}

function startRow(app) {
  const { state } = app;
  const sub = 'The day the 30 days count from';
  if (!state.challenge) return row(label('Day 1', sub), helpButton('startDate'), h('span', { class: 't2' }, 'Starts when you begin'));
  const date = state.challenge.startDate;
  if (!L.startEditable(state)) return row(label('Day 1', sub), helpButton('startDate'), h('span', { class: 't2' }, dayLabel(date)));
  const input = h('input', { type: 'date', id: 'set-start', class: 'in set-date', value: date, min: addDays(app.today(), -1), max: app.today(), 'aria-label': 'Day 1 date',
    onChange: e => {
      const r = L.setStartDate(app.state, app.today(), e.target.value, Date.now());
      if (!r.ok) return fail(app, 'start', r.error);
      refusal = null;
      app.set(() => r.state);
      rerender(); // the same state does not re-render by itself; this also clears a shown refusal
    } });
  return row(label('Day 1', sub), helpButton('startDate'), input);
}

const stepRow = (app, key, title, sub) => { // key doubles as the help key
  const { min, max } = L.SETTING_BOUNDS[key];
  return row(label(title, sub), helpButton(key), stepper({ value: app.state.settings[key], min, max, label: title,
    onChange: n => app.set(s => (key === 'zeroDay' ? L.setZeroDay(s, n) : L.setMedPerWeek(s, n))) }));
};

// The weekly gym target (G13): a switch, and the number only while it is on, so an off target shows no number anywhere.
// The switch has an id because app.js restores focus by id after the re-render.
function gymSection(app) {
  const target = weeklyTarget(app.gym), on = target !== null;
  const sw = switchControl({ on, label: 'Weekly gym target', onToggle: () => app.setGym(g => setWeeklyTargetOn(g, !on)) });
  sw.id = 'set-gym-target';
  return h('section', { class: 'set-sec' }, sectionHeading('Gym'), h('div', { class: 'plate list' },
    row(label('Weekly gym target', 'Compare each week to a number of visits'), helpButton('gymTarget'), sw),
    on && row(label('Visits a week'), stepper({ value: target, min: WEEKLY_TARGET.min, max: WEEKLY_TARGET.max, label: 'Gym visits a week',
      onChange: n => app.setGym(g => setWeeklyTarget(g, n)) }))));
}

// Returns a list of nodes (section, two footnotes).
function dataSection(app) {
  const line = L.backupLine(app.state, app.today());
  return [
    h('section', { class: 'set-sec' }, sectionHeading('Data'), h('div', { class: 'plate list' },
      row(h('div', { class: 'a' }, h('b', null, 'Last backup'), h('span', null, line.text),
        line.overdue && h('span', { class: 'set-overdue' }, 'Overdue. Export a backup now.'))),
      withHelp('exportBackup', actionRow('set-export', 'Export backup', () => exportBackup(app))),
      withHelp('importBackup', actionRow('set-import', 'Import backup', () => pickFile('set-backup-file', f => importBackupFile(app, f))))), alertPlate(app, 'backup')),
    h('p', { class: 't3 set-foot' }, 'Deleting the Home Screen icon deletes all data. Export is the only backup.'),
    h('p', { class: 't3 set-foot' }, `Version ${app.version}`),
  ];
}

export function renderSettings(app) {
  const { state } = app;
  const { protocols, redLines } = L.lists(state);
  return [
    eyebrow('Lock In'),
    screenTitle('Settings'),
    h('section', { class: 'set-sec' }, sectionHeading('Protocols', 'addProtocols'), h('div', { class: 'plate list' },
      protocols.map(p => navRow(`set-protocol-${p.id}`, p.title, p.med ? 'MED version set' : 'No MED version', () => openProtocolSheet(app, p))),
      addRow('set-add-protocol', 'Add protocol', () => openProtocolSheet(app)))),
    h('section', { class: 'set-sec' }, sectionHeading('Red lines', 'addRedLines'), h('div', { class: 'plate list' },
      redLines.map(r => navRow(`set-redline-${r.id}`, r.name, 'Crossing it is a Reset', () => openRedLineSheet(app, r))),
      addRow('set-add-redline', 'Add red line', () => openRedLineSheet(app)))),
    h('section', { class: 'set-sec' }, sectionHeading('Challenge'), h('div', { class: 'plate list' },
      startRow(app),
      stepRow(app, 'zeroDay', 'Zero Day threshold', 'Missed protocols in one day that make it a Reset'),
      stepRow(app, 'medPerWeek', 'MED per week', 'Declared in the morning only'),
      row(label('Challenge pack', L.packSummary(state)), helpButton('packImport'),
        h('button', { type: 'button', id: 'set-pack', class: 'set-link gt', 'aria-label': state.pack ? 'Re-import pack' : 'Import pack',
          onClick: () => pickFile('set-pack-file', f => importPackFile(app, f)) }, state.pack ? 'Re-import' : 'Import pack'))), alertPlate(app, 'start'), alertPlate(app, 'pack')),
    gymSection(app),
    h('section', { class: 'set-sec' }, sectionHeading('Reminders'), h('div', { class: 'plate list' },
      navRow('set-reminders', 'Set up reminders', 'Morning, afternoon and night, through Shortcuts', openRemindersSheet))),
    ...dataSection(app),
  ];
}
