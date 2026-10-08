// New / Edit / Move block form in a bottom sheet (spec §1.6, §3.7 wireframe).
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { openSheet } from '../sheet.js';
import { toMin, fromMin, validateBlock, upsertBlock, moveOccurrence, rescheduleDraft, weekdayIdx, uid } from '../logic.js';

export const TAGS = [['biz', 'briefcase', 'Business'], ['uni', 'book', 'Uni'], ['body', 'heart', 'Body & Health'],
  ['social', 'people', 'Socializing'], ['unsorted', 'tray', 'Unsorted']];
const CHIPS = [15, 30, 45, 60, 90, 120, 180];
const DAYS = [['M', 'Monday'], ['T', 'Tuesday'], ['W', 'Wednesday'], ['T', 'Thursday'], ['F', 'Friday'], ['S', 'Saturday'], ['S', 'Sunday']];
const REPEATS = [['none', 'Never'], ['daily', 'Daily'], ['weekdays', 'Weekdays'], ['weekends', 'Weekends'], ['custom', 'Custom days']];
const MESSAGES = { 'title-required': 'Add a title.', 'bad-time': 'Enter a valid time.',
  'ends-before-start': 'Ends before it starts. Move the end time later.', 'no-days': 'Choose at least one day.', 'no-date': 'Choose a date.', 'no-tag': 'Choose a tag.' };
const MODES = { new: ['New Block', 'Add'], edit: ['Edit Block', 'Done'], move: ['Move Block', 'Move'] };

export const formatDuration = min => min < 60 ? `${min} min` : min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`;

function initial(app, { mode, occ, draft, date }) {
  if (mode === 'edit') {
    const b = app.state.blocks.find(x => x.id === occ.blockId);
    return { ...b, repeat: { ...b.repeat, days: [...b.repeat.days] }, duration: toMin(b.end) - toMin(b.start) };
  }
  const d = mode === 'move' ? (draft ?? rescheduleDraft(occ, app.today())) : { title: '', desc: '', tag: null, date: date ?? app.today(), start: '', durationMin: 60 };
  return { id: uid(), title: d.title, desc: d.desc, tag: d.tag, date: d.date, start: d.start, duration: d.durationMin,
    end: '', repeat: { type: 'none', days: [] }, until: null, skip: [] };
}

export function openBlockSheet(app, opts) {
  const f = initial(app, opts);
  const startJson = JSON.stringify(f);
  let touched = false;

  // Duration drives the end time unless "Custom end time" is on; past midnight wraps so validation reports it.
  const syncEnd = () => { const s = toMin(f.start); f.end = Number.isNaN(s) ? '' : fromMin((s + f.duration) % 1440); };
  if (opts.mode !== 'edit') syncEnd();

  const input = (props, onInput) => h('input', { ...props, onInput: e => { onInput(e.target.value); touched = true; update(); } });
  const field = (label, control) => h('label', { class: 'row form-row' }, h('span', { class: 'row-main' }, label), control);

  const title = input({ class: 'text-input', type: 'text', value: f.title, placeholder: 'Title', 'aria-label': 'Title', enterkeyhint: 'next' }, v => { f.title = v; });
  const desc = h('textarea', { class: 'text-input', rows: '2', placeholder: 'Description', 'aria-label': 'Description',
    onInput: e => { f.desc = e.target.value; touched = true; update(); } }, f.desc);
  const dateIn = input({ type: 'date', value: f.date, required: true }, v => { f.date = v; });
  const startIn = input({ type: 'time', value: f.start, required: true }, v => { f.start = v; if (!custom.checked) syncEnd(); });
  const endIn = input({ type: 'time', value: f.end }, v => {
    f.end = v; const d = toMin(v) - toMin(f.start); if (d > 0) f.duration = d;
  });
  const durText = h('span', { class: 'subhead', 'aria-live': 'polite' });
  const setDuration = min => { f.duration = min; syncEnd(); touched = true; update(); };
  const chips = CHIPS.map(m => h('button', { type: 'button', class: 'chip', onClick: () => setDuration(m) },
    h('span', { class: 'chip-check' }, icon('check')), formatDuration(m)));
  const slider = h('input', { type: 'range', class: 'slider', min: '5', max: '240', step: '5', 'aria-label': 'Duration in minutes',
    onInput: e => setDuration(+e.target.value) });
  const custom = h('input', { type: 'checkbox', switch: true, onChange: () => { if (!custom.checked) syncEnd(); touched = true; update(); } });
  const endRow = field('End', endIn);

  const tagChips = TAGS.map(([id, ic, name]) => h('button', { type: 'button', class: `chip g-${id}`, onClick: () => { f.tag = id; touched = true; update(); } },
    h('span', { class: 'chip-check' }, icon('check')), h('span', { class: 'chip-icon' }, icon(ic)), name));
  const repeat = h('select', { 'aria-label': 'Repeat', onChange: e => {
    f.repeat.type = e.target.value;
    if (f.repeat.type === 'custom' && !f.repeat.days.length && f.date) f.repeat.days = [weekdayIdx(f.date)];
    touched = true; update();
  } }, REPEATS.map(([v, l]) => h('option', { value: v, selected: f.repeat.type === v }, l)));
  const dayChips = DAYS.map(([letter, name], i) => h('button', { type: 'button', class: 'chip day-chip', 'aria-label': name, onClick: () => {
    f.repeat.days = f.repeat.days.includes(i) ? f.repeat.days.filter(x => x !== i) : [...f.repeat.days, i].sort();
    touched = true; update();
  } }, letter));
  const dayRow = h('div', { class: 'chips day-chips' }, dayChips);
  const error = h('p', { class: 'form-error', role: 'status' });

  const content = h('div', { class: 'form' },
    h('div', { class: 'group' }, h('div', { class: 'row' }, title), h('div', { class: 'row' }, desc)),
    opts.mode === 'edit' && f.repeat.type !== 'none' && h('p', { class: 'footnote section-footer' }, 'Changes apply to every day of this series.'),
    h('div', { class: 'group' },
      field('Date', dateIn), field('Start', startIn),
      h('div', { class: 'row' }, h('span', { class: 'row-main' }, 'Duration'), durText),
      h('div', { class: 'row stack' }, h('div', { class: 'chips' }, chips), slider),
      field('Custom end time', custom), endRow),
    h('h3', { class: 'section-header footnote' }, 'Tag'),
    h('div', { class: 'chips' }, tagChips),
    h('div', { class: 'group' }, field('Repeat', repeat), dayRow),
    error);

  function problem() {
    const p = validateBlock(f);
    if (p) return p;
    if (!f.date) return 'no-date';
    if (!f.tag) return 'no-tag';
    return f.repeat.type === 'custom' && !f.repeat.days.length ? 'no-days' : null;
  }
  function update() {
    if (!custom.checked) endIn.value = f.end;
    durText.textContent = formatDuration(f.duration);
    chips.forEach((c, i) => c.setAttribute('aria-pressed', String(CHIPS[i] === f.duration)));
    slider.value = String(f.duration);
    endRow.hidden = !custom.checked;
    tagChips.forEach((c, i) => c.setAttribute('aria-pressed', String(TAGS[i][0] === f.tag)));
    dayRow.hidden = f.repeat.type !== 'custom';
    dayChips.forEach((c, i) => c.setAttribute('aria-pressed', String(f.repeat.days.includes(i))));
    const p = problem();
    error.textContent = touched && p ? MESSAGES[p] : '';
    if (sheet) sheet.actionButton.disabled = !!p;
  }

  const [sheetTitle, action] = MODES[opts.mode];
  const block = () => ({ id: f.id, title: f.title.trim(), desc: f.desc.trim(), date: f.date, start: f.start, end: f.end, tag: f.tag,
    repeat: f.repeat.type === 'custom' ? f.repeat : { type: f.repeat.type, days: [] }, until: f.until, skip: f.skip });
  let sheet = null;
  update();
  sheet = openSheet({ title: sheetTitle, action, content,
    isDirty: () => JSON.stringify(f) !== startJson,
    onAction: () => {
      if (problem()) return false;
      app.set(s => opts.mode === 'move' ? moveOccurrence(s, opts.occ.occId, block()) : upsertBlock(s, block()));
    } });
  update();
}
