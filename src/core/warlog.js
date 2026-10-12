// War Log core (plan Task 5): oath entries, autopsies, day notes. Pure: returns new state.

export const OATH_KEYS = ['contract', 'funeral', 'code', 'redlines-w1'];
export const OATH_TITLES = { contract: 'Contract', funeral: 'The Funeral', code: 'The Code', 'redlines-w1': 'Week 1 red lines' };

const AUTOPSY = /^autopsy-(\d{4}-\d{2}-\d{2})$/;
const DAY = /^day-([1-9]|[12]\d|30)$/;
const validKey = key => OATH_KEYS.includes(key) || AUTOPSY.test(key) || DAY.test(key);
const blank = text => typeof text !== 'string' || text.trim() === '';

// Text blank after trim deletes the key; a key other than the allowed ones, or non-string text, returns the same state.
export function setWarEntry(state, key, text, nowMs) {
  if (!validKey(key) || typeof text !== 'string') return state;
  const { [key]: _, ...rest } = state.warLog;
  return { ...state, warLog: blank(text) ? rest : { ...rest, [key]: { text, updatedAt: nowMs } } };
}

export const oathComplete = state => OATH_KEYS.every(k => !blank(state.warLog[k]?.text));

// Oath (fixed order), Autopsies (newest first), Days (by number). Keys matching no group are skipped.
export function warEntries(state) {
  const log = state.warLog;
  const keys = Object.keys(log);
  const item = (key, title, group) => ({ key, title, group, updatedAt: log[key].updatedAt,
    preview: [...log[key].text].slice(0, 80).join('') });
  const dayNo = key => Number(key.match(DAY)[1]);
  return [
    ...OATH_KEYS.filter(k => k in log).map(k => item(k, OATH_TITLES[k], 'Oath')),
    ...keys.filter(k => AUTOPSY.test(k)).sort().reverse().map(k => item(k, `Autopsy · ${k.match(AUTOPSY)[1]}`, 'Autopsies')),
    ...keys.filter(k => DAY.test(k)).sort((a, b) => dayNo(a) - dayNo(b)).map(k => item(k, `Day ${dayNo(k)} notes`, 'Days')),
  ];
}
