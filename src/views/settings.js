// Settings: goals, red lines, weight target, reminders, data (export / import / erase), version.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openActionSheet } from '../sheet.js';
import { exportJson, markBackup, validateImport, backupStatus, defaultState } from '../store.js';
import { openGoalSheet, openRedLineSheet, openWeightTargetSheet, openRemindersSheet } from './settingsSheets.js';

// Shared by Settings › Export and Progress › Back Up Now. Marks the backup only when it went out.
export async function exportBackup(app) {
  const name = `lockin-${app.today()}.json`;
  // The file carries its own backup date, so a restore reports when that backup was made.
  const blob = new Blob([exportJson(markBackup(app.state, app.today()))], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch { return; } // cancelled or failed: not backed up
  } else {
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  app.set(s => markBackup(s, app.today()));
}

let importError = ''; // shown until the next import attempt; never auto-dismissed

const header = text => h('h2', { class: 'section-header footnote' }, text);
const chevron = () => h('span', { class: 'chevron' }, icon('chevronRight'));
const navRow = (id, main, detail, onClick, cls = '') => h('button', { type: 'button', class: `row row-btn ${cls}`, id, onClick },
  main, detail != null && h('span', { class: 'subhead stat' }, detail), chevron());

function goalSummary(g) {
  return [g.minutes && `${g.minutes.weekday} min weekdays, ${g.minutes.weekend} min weekends`,
    ...g.checks.map(c => c.label),
    g.weeklyCount && `${g.weeklyCount.target} ${g.weeklyCount.label.toLowerCase()} a week`].filter(Boolean).join(' · ');
}

export function renderSettings(app) {
  const s = app.state;
  const { days, overdue } = backupStatus(s, app.today());
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onChange: e => importFile(app, e.target) });
  return h('section', null,
    h('h1', { class: 'large-title' }, 'Settings'),

    header('Goals'),
    h('div', { class: 'group' }, s.goals.map(g => navRow(`goal-${g.id}`,
      h('span', { class: `row-main goal-line g-${g.id}` }, h('span', { class: 'badge' }, icon(g.icon)),
        h('span', null, h('span', { class: 'goal-name' }, g.name), h('span', { class: 'subhead block' }, goalSummary(g)))),
      null, () => openGoalSheet(app, g)))),

    header('Red Lines'),
    h('div', { class: 'group' },
      s.redLines.map(l => h('div', { class: 'row' }, h('p', { class: 'row-main' }, l.name),
        h('button', { type: 'button', class: 'icon-btn', id: `red-more-${l.id}`, 'aria-label': `Actions for ${l.name}`, onClick: () => openActionSheet([
          { label: 'Rename', onSelect: () => openRedLineSheet(app, l) },
          { label: 'Delete', destructive: true, onSelect: () => openActionSheet([{ label: 'Delete Red Line', destructive: true,
            onSelect: () => app.set(st => ({ ...st, redLines: st.redLines.filter(x => x.id !== l.id) })) }],
            { message: 'Its past marks stay saved but no longer count in Progress.' }) },
        ]) }, icon('ellipsis')))),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-text', id: 'add-red-line', onClick: () => openRedLineSheet(app) }, 'Add Red Line'))),

    header('Weight'),
    h('div', { class: 'group' }, navRow('weight-target', h('span', { class: 'row-main' }, 'Weight target'),
      s.targetWeightKg == null ? 'Not set' : `${s.targetWeightKg.toFixed(1)} kg`, () => openWeightTargetSheet(app))),

    header('Reminders'),
    h('div', { class: 'group' }, navRow('reminders', h('span', { class: 'row-main' }, 'Set Up Reminders'), null, () => openRemindersSheet())),
    h('p', { class: 'footnote section-footer' }, 'Three daily notifications through the iOS Shortcuts app.'),

    header('Data'),
    h('div', { class: 'group' },
      h('div', { class: 'row' }, h('p', { class: `row-main${overdue ? ' overdue' : ' subhead'}` },
        days === null ? 'Never backed up' : days === 0 ? 'Last backup: today' : `Last backup: ${days} ${days === 1 ? 'day' : 'days'} ago`)),
      h('button', { type: 'button', class: 'row row-btn action', id: 'export', onClick: () => exportBackup(app) }, 'Export Backup'),
      h('button', { type: 'button', class: 'row row-btn action', id: 'import', onClick: () => fileInput.click() }, 'Import Backup'),
      h('button', { type: 'button', class: 'row row-btn action destructive', id: 'erase', onClick: () => openActionSheet([{ label: 'Erase All Data', destructive: true,
        onSelect: () => app.set(() => defaultState(app.today())) }], { message: 'This deletes every block, log, red line and weigh-in on this phone. Export a backup first if you might want them.' }) }, 'Erase All Data'),
      fileInput),
    h('p', { class: 'form-error import-error', id: 'import-error', role: 'alert' }, importError),
    h('p', { class: 'footnote section-footer' }, 'Deleting the Home Screen icon deletes all data. Export is the only backup.'),

    h('p', { class: 'footnote version' }, `Lock In v${app.version}`));
}

async function importFile(app, input) {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const result = validateImport(await file.text());
  importError = result.ok ? '' : `Import failed: ${result.error} Nothing was changed.`;
  document.getElementById('import-error').textContent = importError;
  if (!result.ok) return;
  openActionSheet([{ label: 'Replace All Data', destructive: true, onSelect: () => app.set(() => result.state) }],
    { message: 'Replace all current data with this backup?' });
}
