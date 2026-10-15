// Settings tab (plan Task 19). Layout = static/Settings.html; state changes = settingsLogic.js; sheets = settingsSheets.js.
// The board's per-protocol pause switch is not built: the data model has no paused flag (owner ruling pending).
// The latest refusal (date, pack or backup) is module memory shown in an alert plate while the state is the one it was made on
// (any change to it, or the next attempt, removes the plate); never saved.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { eyebrow, screenTitle, sectionHeading, plate, rerender } from '../ui/chrome.js';
import { stepper } from '../ui/controls.js';
import { validateImport, markBackup } from '../core/store.js';
import { validatePack, importPack } from '../core/pack.js';
import { dayLabel } from './tasksLogic.js';
import * as L from './settingsLogic.js';
import { openProtocolSheet, openRedLineSheet, openRemindersSheet, confirmSheet } from './settingsSheets.js';

let refusal = null; // { key: 'start' | 'pack' | 'backup', text, state }
const fail = (app, key, text) => { refusal = { key, text, state: app.state }; rerender(); };
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
  const r = await L.runExport(app.state, today, io);
  if (r.outcome !== 'cancelled') app.set(s => markBackup(s, today));
}

export async function importBackupFile(app, file, ask = confirmSheet) {
  const text = await readText(file);
  const r = text === null ? { ok: false, error: 'The file could not be read.' } : validateImport(text);
  if (!r.ok) return fail(app, 'backup', r.error);
  clear();
  ask('Replace everything?', () => app.set(() => r.state), 'Replace everything');
}

export async function importPackFile(app, file, ask = confirmSheet) {
  const text = await readText(file);
  const r = text === null ? { ok: false, error: 'The file could not be read.' } : validatePack(text);
  if (!r.ok) return fail(app, 'pack', r.error);
  clear();
  ask('Replace the current pack?', () => app.set(s => importPack(s, r.pack)), 'Replace pack');
}

const alertPlate = (app, key) => refusal?.key === key && refusal.state === app.state && plate.warn(h('p', { class: 'set-err', role: 'alert' }, refusal.text));
const row = (...children) => h('div', { class: 'sr' }, children);
const label = (title, sub) => h('div', { class: 'a' }, h('b', null, title), sub != null && h('span', null, sub));
const chevron = () => { const c = icon('chevronRight'); c.setAttribute('class', 'set-chev'); return c; };
const navRow = (id, title, sub, onClick) => h('button', { type: 'button', id, class: 'sr set-btn', onClick }, label(title, sub), chevron());
const addRow = (id, text, onClick) => h('button', { type: 'button', id, class: 'sr set-btn gt', onClick }, icon('plus'), text);
const actionRow = (id, text, onClick) => h('button', { type: 'button', id, class: 'sr set-btn gt', onClick }, text);
const picker = (id, onFile) => h('input', { type: 'file', id, accept: 'application/json,.json', hidden: true,
  onChange: e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); } });

function startRow(app) {
  const { state } = app;
  const sub = 'The day the 30 days count from';
  if (!state.challenge) return row(label('Day 1', sub), h('span', { class: 't2' }, 'Starts when you begin'));
  const date = state.challenge.startDate;
  if (!L.startEditable(state)) return row(label('Day 1', sub), h('span', { class: 't2' }, dayLabel(date)));
  const input = h('input', { type: 'date', id: 'set-start', class: 'in set-date', value: date, max: app.today(), 'aria-label': 'Day 1 date',
    onChange: e => {
      const r = L.setStartDate(app.state, app.today(), e.target.value);
      if (!r.ok) return fail(app, 'start', r.error);
      refusal = null;
      app.set(() => r.state);
      rerender(); // the same state does not re-render by itself; this also clears a shown refusal
    } });
  return row(label('Day 1', sub), input);
}

const stepRow = (app, key, title, sub) => {
  const { min, max } = L.SETTING_BOUNDS[key];
  return row(label(title, sub), stepper({ value: app.state.settings[key], min, max, label: title,
    onChange: n => app.set(s => (key === 'zeroDay' ? L.setZeroDay(s, n) : L.setMedPerWeek(s, n))) }));
};

// Returns a list of nodes (section, two footnotes).
function dataSection(app) {
  const line = L.backupLine(app.state, app.today());
  const backupPicker = picker('set-backup-file', f => importBackupFile(app, f));
  return [
    h('section', { class: 'set-sec' }, sectionHeading('Data'), h('div', { class: 'plate list' },
      row(h('div', { class: 'a' }, h('b', null, 'Last backup'), h('span', null, line.text),
        line.overdue && h('span', { class: 'set-overdue' }, 'Overdue. Export a backup now.'))),
      actionRow('set-export', 'Export backup', () => exportBackup(app)),
      actionRow('set-import', 'Import backup', () => backupPicker.click()),
      backupPicker), alertPlate(app, 'backup')),
    h('p', { class: 't3 set-foot' }, 'Deleting the Home Screen icon deletes all data. Export is the only backup.'),
    h('p', { class: 't3 set-foot' }, `Version ${app.version}`),
  ];
}

export function renderSettings(app) {
  const { state } = app;
  const { protocols, redLines } = L.lists(state);
  const packPicker = picker('set-pack-file', f => importPackFile(app, f));
  return [
    eyebrow('Lock In'),
    screenTitle('Settings'),
    h('section', { class: 'set-sec' }, sectionHeading('Protocols'), h('div', { class: 'plate list' },
      protocols.map(p => navRow(`set-protocol-${p.id}`, p.title, p.med ? 'MED version set' : 'No MED version', () => openProtocolSheet(app, p))),
      addRow('set-add-protocol', 'Add protocol', () => openProtocolSheet(app)))),
    h('section', { class: 'set-sec' }, sectionHeading('Red lines'), h('div', { class: 'plate list' },
      redLines.map(r => navRow(`set-redline-${r.id}`, r.name, 'Crossing it is a Reset', () => openRedLineSheet(app, r))),
      addRow('set-add-redline', 'Add red line', () => openRedLineSheet(app)))),
    h('section', { class: 'set-sec' }, sectionHeading('Challenge'), h('div', { class: 'plate list' },
      startRow(app),
      stepRow(app, 'zeroDay', 'Zero Day threshold', 'Missed protocols in one day that make it a Reset'),
      stepRow(app, 'medPerWeek', 'MED per week', 'Declared in the morning only'),
      row(label('Challenge pack', L.packSummary(state)),
        h('button', { type: 'button', id: 'set-pack', class: 'set-link gt', onClick: () => packPicker.click() }, state.pack ? 'Re-import' : 'Import pack'),
        packPicker)), alertPlate(app, 'start'), alertPlate(app, 'pack')),
    h('section', { class: 'set-sec' }, sectionHeading('Reminders'), h('div', { class: 'plate list' },
      navRow('set-reminders', 'Set up reminders', 'Morning, afternoon and night, through Shortcuts', openRemindersSheet))),
    ...dataSection(app),
  ];
}
