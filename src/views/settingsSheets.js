// Settings sheets: goal editor (with commitment friction), red line name, weight target, reminders.
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openSheet, openActionSheet } from '../sheet.js';
import { shortDate } from './blockRow.js';
import { needsCommitConfirm, goalRulesChanged, saveGoal, uid } from '../logic.js';

const REMINDERS = [
  ['09:00', "Lock in. Open the plan, put today's blocks in, start the first one."],
  ['13:00', 'Midday check. Log what you did, then do the next block.'],
  ['21:00', 'Log today, including the red lines. Then reset for tomorrow.'],
];

const field = (label, control) => h('label', { class: 'row form-row' }, h('span', { class: 'row-main' }, label), control);
const whole = (v, lo, hi) => /^\d+$/.test(v) && +v >= lo && +v <= hi;

export function openGoalSheet(app, goal) {
  const today = app.today();
  const name = h('input', { type: 'text', class: 'text-input', value: goal.name, 'aria-label': 'Name', onInput: () => check() });
  const num = (value, label) => h('input', { type: 'number', inputmode: 'numeric', min: '1', value: String(value), 'aria-label': label, onInput: () => check() });
  const weekday = goal.minutes && num(goal.minutes.weekday, 'Weekday minimum in minutes');
  const weekend = goal.minutes && num(goal.minutes.weekend, 'Weekend minimum in minutes');
  const target = goal.weeklyCount && num(goal.weeklyCount.target, `${goal.weeklyCount.label} per week`);
  let checks = goal.checks.map(c => ({ ...c }));
  const checkList = h('div', { class: 'group' });
  const renderChecks = () => checkList.replaceChildren(
    ...checks.map((c, i) => h('div', { class: 'row' },
      h('input', { type: 'text', class: 'text-input', value: c.label, 'aria-label': `Daily check ${i + 1}`, onInput: e => { c.label = e.target.value; check(); } }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Remove ${c.label || 'check'}`, onClick: () => { checks = checks.filter(x => x !== c); renderChecks(); check(); } }, icon('minus')))),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-text', onClick: () => { checks = [...checks, { id: uid(), label: '' }]; renderChecks(); check(); } }, 'Add Daily Check')));
  const error = h('p', { class: 'form-error', role: 'status' });

  const draft = () => ({ ...goal, name: name.value.trim(),
    minutes: goal.minutes && { weekday: +weekday.value, weekend: +weekend.value },
    weeklyCount: goal.weeklyCount && { ...goal.weeklyCount, target: +target.value },
    checks: checks.map(c => ({ id: c.id, label: c.label.trim() })) });
  const problem = () => !name.value.trim() ? 'Add a name.'
    : goal.minutes && !(whole(weekday.value, 1, 720) && whole(weekend.value, 1, 720)) ? 'Minimums must be 1 to 720 minutes.'
    : goal.weeklyCount && !whole(target.value, 1, 21) ? 'The weekly target must be 1 to 21.'
    : checks.some(c => !c.label.trim()) ? 'Name each daily check or remove it.' : null;
  function check() { const p = problem(); error.textContent = p ?? ''; if (sheet) sheet.actionButton.disabled = !!p; }

  let sheet = null;
  renderChecks();
  sheet = openSheet({ title: 'Edit Goal', action: 'Done',
    content: h('div', { class: 'form' },
      h('div', { class: 'group' }, h('div', { class: 'row' }, name)),
      goal.minutes && h('div', { class: 'group' }, field('Weekday minimum (min)', weekday), field('Weekend minimum (min)', weekend)),
      goal.weeklyCount && h('div', { class: 'group' }, field(`${goal.weeklyCount.label} per week`, target)),
      h('h3', { class: 'section-header footnote' }, 'Daily Checks'), checkList,
      h('p', { class: 'footnote section-footer' }, `Committed until ${shortDate(goal.committedUntil)}. Changing a rule starts a new 30 days. The color is fixed.`),
      error),
    isDirty: () => JSON.stringify(draft()) !== JSON.stringify(goal),
    onAction: () => {
      if (problem()) return false;
      const next = draft();
      const save = () => { app.set(s => saveGoal(s, next, today)); sheet.close(); };
      if (!goalRulesChanged(goal, next) || !needsCommitConfirm(goal, today)) { app.set(s => saveGoal(s, next, today)); return; }
      openActionSheet([{ label: 'Change Anyway', onSelect: save }],
        { message: `This goal is committed until ${shortDate(goal.committedUntil)}. Change it anyway?`, cancel: 'Keep Goal' });
      return false;
    } });
  check();
}

// Add (line = undefined) or rename a red line.
export function openRedLineSheet(app, line) {
  const name = h('input', { type: 'text', class: 'text-input', value: line?.name ?? '', placeholder: 'Red line', 'aria-label': 'Red line', onInput: () => { sheet.actionButton.disabled = !name.value.trim(); } });
  const sheet = openSheet({ title: line ? 'Rename Red Line' : 'New Red Line', action: line ? 'Done' : 'Add',
    content: h('div', { class: 'form' }, h('div', { class: 'group' }, h('div', { class: 'row' }, name)),
      h('p', { class: 'footnote section-footer' }, 'Something you will not do. Mark it Held or Slipped on Today.')),
    isDirty: () => name.value !== (line?.name ?? ''),
    onAction: () => {
      const n = name.value.trim();
      if (!n) return false;
      app.set(s => ({ ...s, redLines: line ? s.redLines.map(l => (l.id === line.id ? { ...l, name: n } : l)) : [...s.redLines, { id: uid(), name: n }] }));
    } });
  sheet.actionButton.disabled = !name.value.trim();
}

export function openWeightTargetSheet(app) {
  const start = app.state.targetWeightKg == null ? '' : app.state.targetWeightKg.toFixed(1);
  // Text field with a decimal keypad: iOS shows a comma in many regions, which type=number rejects.
  const kg = h('input', { type: 'text', inputmode: 'decimal', value: start, placeholder: 'Not set', 'aria-label': 'Weight target in kg', onInput: () => check() });
  const error = h('p', { class: 'form-error', role: 'status' });
  const parse = () => { const t = kg.value.trim(); if (!t) return null; const v = Number(t.replace(',', '.')); return /^\d{2,3}([.,]\d)?$/.test(t) && v >= 30 && v <= 300 ? v : NaN; };
  const check = () => { const ok = !Number.isNaN(parse()); error.textContent = ok ? '' : 'Enter a weight from 30 to 300 kg, or leave it empty.'; sheet.actionButton.disabled = !ok; };
  const sheet = openSheet({ title: 'Weight Target', action: 'Done',
    content: h('div', { class: 'form' }, h('div', { class: 'group' }, field('Target (kg)', kg)),
      h('p', { class: 'footnote section-footer' }, 'Optional. Shown as a dashed line on Progress. Leave empty for no target.'), error),
    isDirty: () => kg.value !== start,
    onAction: () => {
      const v = parse();
      if (Number.isNaN(v)) return false;
      app.set(s => ({ ...s, targetWeightKg: v }));
    } });
}

export function openRemindersSheet() {
  const copy = (text, button, node) => navigator.clipboard?.writeText(text)
    .then(() => { button.textContent = 'Copied'; button.setAttribute('aria-label', button.getAttribute('aria-label').replace('Copy', 'Copied')); })
    .catch(() => getSelection().selectAllChildren(node)) ?? getSelection().selectAllChildren(node);
  openSheet({ title: 'Reminders', action: 'Done',
    content: h('div', { class: 'form' },
      h('ol', { class: 'steps' },
        h('li', null, 'Open the Shortcuts app and tap Automation.'),
        h('li', null, 'Tap New Automation, then Time of Day.'),
        h('li', null, 'Set the time, choose Daily and Run Immediately.'),
        h('li', null, 'Add the action Show Notification and paste the text.'),
        h('li', null, 'Repeat for each time below.')),
      h('div', { class: 'group' }, REMINDERS.map(([time, text]) => {
        const p = h('p', { class: 'reminder-text' }, text);
        const button = h('button', { type: 'button', class: 'btn btn-text', 'aria-label': `Copy the ${time} text` }, 'Copy');
        button.addEventListener('click', () => copy(text, button, p));
        return h('div', { class: 'row reminder' }, h('div', { class: 'row-main' }, h('p', { class: 'headline' }, time), p), button);
      })),
      h('p', { class: 'footnote section-footer' }, 'Notifications show “Shortcuts” as the sender. Tapping one does not open Lock In.')),
    onAction: () => {} });
}
