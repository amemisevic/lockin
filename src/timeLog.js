// Log time (spec §1.4): hours + minutes typed after the fact, added to or replacing a block's actualMin.
import { completeOcc } from './logic.js';

const whole = v => { const t = String(v ?? '').trim(); return t === '' ? 0 : /^\d+$/.test(t) ? Number(t) : null; };

// Total whole minutes (minutes over 59 are fine), or null when either field is not a whole number >= 0.
export function parseDuration(hours, minutes) {
  const h = whole(hours), m = whole(minutes);
  return h === null || m === null ? null : h * 60 + m;
}

// Add needs a duration; Replace may set 0.
export const canSave = (min, mode) => min !== null && (min > 0 || mode === 'replace');

// Marks the block done like any log; a running timer is left alone (Finish adds its elapsed minutes).
// A moved original counts as neither missed nor done (spec §1.6), so it takes no log.
export const logTime = (state, occ, min, mode) => occ.movedTo ? state :
  completeOcc(state, occ, mode === 'add' ? (occ.actualMin ?? 0) + min : min);
