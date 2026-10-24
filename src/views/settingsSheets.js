// Settings sheets (plan Task 19): protocol and red line add/edit, Reminders steps, confirm. Flow ported from taskSheet.js:
// a plain form object, validation and writes from settingsLogic.js, dirty-cancel from sheet.js. Text nodes only.
import { h } from '../dom.js';
import { openSheet, openActionSheet } from '../sheet.js';
import { helpButton } from '../ui/controls.js';
import * as L from './settingsLogic.js';

export const confirmSheet = (message, onYes, action) =>
  openActionSheet([{ label: action, destructive: true, onSelect: onYes }], { message });

// With a help key the name is a <label for> beside the "?" (a button inside the <label> would take the input's place).
const field = (name, control, hint, help) => help
  ? h('div', { class: 'fld' }, h('div', { class: 'hlp-row' }, h('label', { class: 'fld-l', for: control.id }, name), helpButton(help)), control,
    hint && h('span', { class: 'footnote' }, hint))
  : h('label', { class: 'fld' }, h('span', { class: 'fld-l' }, name), control, hint && h('span', { class: 'footnote' }, hint));

// One sheet for both lists. spec: { title, fields: [{key, label, hint?, required}], save(state, form, id), drop(state, id), noun }.
function openListSheet(app, item, spec) {
  const edit = !!item;
  const f = Object.fromEntries(spec.fields.map(x => [x.key, item?.[x.key] ?? '']));
  const start = JSON.stringify(f);
  const error = h('p', { class: 'form-error', role: 'status' });
  let sheet = null;
  const inputs = spec.fields.map(x => field(x.label, h('input', { id: x.help && `sheet-${x.key}`, class: 'in', type: 'text', value: f[x.key], autocomplete: 'off',
    enterkeyhint: 'done', onInput: e => { f[x.key] = e.target.value; update(); } }), x.hint, x.help));
  const problem = () => { const r = spec.save(app.state, f, item?.id ?? null); return r.ok ? null : r.error; };
  function update() {
    const err = problem();
    error.textContent = '';
    if (sheet) sheet.actionButton.disabled = !!err;
  }
  const remove = () => {
    const r = spec.drop(app.state, item.id);
    if (!r.ok) { error.textContent = r.error; return; }
    app.set(() => r.state);
    sheet.close();
  };
  const del = h('button', { type: 'button', class: 'btn-ghost set-del', onClick: () => openActionSheet(
    [{ label: `Delete ${spec.noun}`, destructive: true, onSelect: remove }],
    { message: app.state.challenge ? 'Finished days keep the name they were filed with.' : `Delete this ${spec.noun}?` }) }, `Delete ${spec.noun}`);
  sheet = openSheet({
    title: edit ? spec.edit : spec.add, action: edit ? 'Done' : 'Add',
    content: h('div', { class: 'form' }, inputs, edit && h('div', { class: 'hlp-row set-dr' }, del, helpButton('deleteItem')), error),
    isDirty: () => JSON.stringify(f) !== start,
    onAction: () => {
      const r = spec.save(app.state, f, item?.id ?? null);
      if (!r.ok) { error.textContent = r.error; return false; }
      app.set(() => r.state);
    },
  });
  update();
}

export const openProtocolSheet = (app, protocol) => openListSheet(app, protocol, {
  add: 'New Protocol', edit: 'Edit Protocol', noun: 'protocol',
  fields: [{ key: 'title', label: 'Title' },
    { key: 'med', label: 'MED version (optional)', help: 'medVersion', hint: 'A shorter version you may declare once in the morning. Leave empty for none.' }],
  save: (s, f, id) => L.saveProtocol(s, f, id), drop: L.deleteProtocol,
});

export const openRedLineSheet = (app, line) => openListSheet(app, line, {
  add: 'New Red Line', edit: 'Edit Red Line', noun: 'red line',
  fields: [{ key: 'name', label: 'Name' }],
  save: (s, f, id) => L.saveRedLine(s, f, id), drop: L.deleteRedLine,
});

// Shortcuts steps copied from v1 openRemindersSheet; texts and times are the plan's (REMINDERS). No in-app notifications.
export function openRemindersSheet() {
  const copy = async (text, button, node, name) => {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
      button.setAttribute('aria-label', `Copied the ${name} text`);
    } catch { getSelection()?.selectAllChildren(node); }
  };
  openSheet({ title: 'Reminders', action: 'Done',
    content: h('div', { class: 'form' },
      h('ol', { class: 'set-steps' },
        h('li', null, 'Open the Shortcuts app and tap Automation.'),
        h('li', null, 'Tap New Automation, then Time of Day.'),
        h('li', null, 'Set the time, choose Daily and Run Immediately.'),
        h('li', null, 'Add the action Show Notification and paste the text.'),
        h('li', null, 'Repeat for each time below.')),
      h('div', { class: 'plate list' }, L.REMINDERS.map(([name, time, text]) => {
        const p = h('p', { class: 'set-rem-text' }, text);
        const button = h('button', { type: 'button', class: 'btn btn-text', 'aria-label': `Copy the ${name} text` }, 'Copy');
        button.addEventListener('click', () => copy(text, button, p, name));
        return h('div', { class: 'sr' }, h('div', { class: 'a' }, h('b', null, `${name} · ${time}`), p), button);
      })),
      h('p', { class: 'footnote' }, 'Notifications show “Shortcuts” as the sender. Tapping one does not open Lock In.')),
    onAction: () => {} });
}
