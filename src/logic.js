// Pure rules. Dates are local 'YYYY-MM-DD' keys, times 'HH:MM', weekday Mon=0…Sun=6.

const pad = n => String(n).padStart(2, '0');
const parse = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

export const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(key, n) { const d = parse(key); d.setDate(d.getDate() + n); return dateKey(d); }

// Date.UTC day numbers: the only allowed UTC use, immune to DST.
const dayNum = key => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
export const daysBetween = (a, b) => dayNum(b) - dayNum(a);

export const weekdayIdx = key => (parse(key).getDay() + 6) % 7;
export const isWeekend = key => weekdayIdx(key) >= 5;
export const weekStart = key => addDays(key, -weekdayIdx(key));

export function toMin(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m || +m[1] > 23 || +m[2] > 59) return NaN;
  return +m[1] * 60 + +m[2];
}
export const fromMin = min => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

export const resolveViewDate = (requested, today) => (!requested || requested > today ? today : requested);

export const uid = () => globalThis.crypto?.randomUUID?.()
  ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
