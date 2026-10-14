// Mission detail and War Log logic (plan Task 14, brief rulings R1-R4). Pure and DOM-free: today/nowMs are parameters.
import { dayNo } from '../core/challenge.js';
import { missionFor } from '../core/pack.js';
import { warEntries, setWarEntry, OATH_KEYS, OATH_TITLES } from '../core/warlog.js';
import { dateKey } from '../logic.js';
import { dayLabel } from './tasksLogic.js';
import { CHALLENGE_LENGTH } from './challengeLogic.js';

// R1: canonical integers 1..CHALLENGE_LENGTH only ('09', '1e1', ' 9' are invalid).
export function dayParam(p) {
  const n = Number(p);
  return typeof p === 'string' && Number.isInteger(n) && n >= 1 && n <= CHALLENGE_LENGTH && String(n) === p ? n : null;
}

// R2: no challenge or before the start locks every day; the lock is checked before the mission lookup.
export function missionView(state, today, p) {
  const n = dayParam(p);
  if (n === null) return { kind: 'redirect' };
  const now = dayNo(state, today);
  if (now === null || n > now) return { kind: 'locked', n };
  const m = missionFor(state, n);
  if (!m) return { kind: 'none', n };
  const paragraphs = m.body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  return { kind: 'mission', n, title: m.title, paragraphs, href: `#warlog/day-${n}` };
}

const href = key => `#warlog/${key}`;
const writtenRow = e => ({ key: e.key, title: e.title, date: dayLabel(dateKey(new Date(e.updatedAt))),
  preview: e.preview, href: href(e.key), empty: false });
const emptyOath = key => ({ key, title: OATH_TITLES[key], date: null, preview: 'Not written yet', href: href(key), empty: true });

// R3: Oath always lists all four keys; Autopsies / Days only when non-empty. Order and previews from warEntries.
export function warLogGroups(state) {
  const entries = warEntries(state);
  const of = g => entries.filter(e => e.group === g);
  const oath = OATH_KEYS.map(k => { const e = entries.find(x => x.key === k); return e ? writtenRow(e) : emptyOath(k); });
  return [{ group: 'Oath', rows: oath },
    ...['Autopsies', 'Days'].map(group => ({ group, rows: of(group).map(writtenRow) })).filter(g => g.rows.length)];
}

// R4: oath keys and valid day keys are editable even unwritten; other keys only when warEntries lists them.
export function entryView(state, key) {
  if (typeof key !== 'string') return null;
  const listed = warEntries(state).find(e => e.key === key);
  const n = key.startsWith('day-') ? dayParam(key.slice(4)) : null;
  const title = listed?.title ?? (OATH_KEYS.includes(key) ? OATH_TITLES[key] : n !== null ? `Day ${n} notes` : null);
  if (title === null) return null;
  return { key, title, text: state.warLog[key]?.text ?? '', readOnly: key.startsWith('autopsy-') };
}

// Same object back when nothing changes (app.set then neither saves nor re-renders); autopsies are read-only.
export function saveEntry(state, key, text, nowMs) {
  const s = String(text);
  const old = state.warLog[key]?.text ?? '';
  if (key.startsWith('autopsy-') || old === s || (old === '' && s.trim() === '')) return state; // blank on blank: no-op (M5)
  return setWarEntry(state, key, s, nowMs);
}
