// Today tab logic (plan Task 12, rulings R1-R3): the action cards and the Recovery time label. Pure, DOM-free.
import { dateKey, addDays } from '../logic.js';
import { nextAction, yesterdayOpen } from '../core/challenge.js';
import { pendingRecovery } from '../core/recovery.js';

// Ordered card descriptors { kind, href }; recovery also carries { date, msLeft, overdue }.
export function todayCards(state, nowMs, { afternoonDismissed = false } = {}) {
  if (!state.challenge) return [{ kind: 'start', href: '#challenge' }];
  const today = dateKey(new Date(nowMs));
  const cards = [];
  const r = pendingRecovery(state, nowMs);
  if (r) cards.push({ kind: 'recovery', href: `#recovery/${r.date}`, date: r.date, msLeft: r.msLeft, overdue: r.overdue });
  const closeY = yesterdayOpen(state, today, nowMs);
  if (closeY) cards.push({ kind: 'closeYesterday', href: `#checkin/night/${addDays(today, -1)}` });
  const a = nextAction(state, nowMs);
  if (a === 'morning' && !closeY) cards.push({ kind: 'morning', href: '#checkin/morning' });
  if (a === 'afternoon' && !afternoonDismissed) cards.push({ kind: 'afternoon', href: '#checkin/afternoon' });
  if (a === 'night') cards.push({ kind: 'night', href: `#checkin/night/${today}` });
  return cards;
}

// Minutes round up, so "0m" never shows while time remains. 'Overdue' is the view's call (pendingRecovery.overdue).
export function timeLeft(msLeft) {
  const min = Math.ceil(msLeft / 60000);
  const h = Math.floor(min / 60), m = min % 60;
  return h >= 1 ? `${h}h ${m}m left` : `${m}m left`;
}
