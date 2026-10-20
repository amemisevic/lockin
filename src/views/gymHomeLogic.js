// Gym home logic (gym plan G8): week strip, visits line, last workouts, routine rows. Pure, DOM-free.
import { weekKeys, visitDates, visitsInWeek } from '../core/gymstats.js';
import { addDays } from '../logic.js';
import { DAY_NAMES, dayLabel, weekLabel } from './tasksLogic.js';

export const GYM_CORRUPT_NOTICE = 'Gym data could not be read. A copy was kept.';

const arr = v => (Array.isArray(v) ? v : []);
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Week navigation is view state: the shown week is a key inside it, null = today's week.
export const isCurrentWeek = (key, today) => weekKeys(key)[0] === weekKeys(today)[0];
export const shiftWeek = (key, today, n) => { const k = addDays(weekKeys(key)[0], 7 * n); return isCurrentWeek(k, today) ? null : k; };
export const weekHeading = (key, today) => (isCurrentWeek(key, today) ? 'This week' : weekLabel(key));

// Mon-Sun of the week holding `shown`; the label carries what colour and the check mark show. `today` marks one tile.
export function weekStrip(gym, shown, today = shown) {
  const visits = new Set(visitDates(gym));
  return weekKeys(shown).map((key, i) => {
    const visited = visits.has(key), isToday = key === today;
    return {
      key, name: DAY_NAMES[i].slice(0, 3).toUpperCase(), day: Number(key.slice(8)), visited, today: isToday,
      label: `${dayLabel(key)}, ${visited ? 'gym visit' : 'no visit'}${isToday ? ', today' : ''}`,
    };
  });
}

export function visitsText(gym, today) {
  const visits = visitsInWeek(gym, today), target = gym.settings.weeklyTarget;
  return { visits, target, text: `${visits} of ${target} ${target === 1 ? 'visit' : 'visits'}` };
}

const shortDate = key => { const [d, n, m] = dayLabel(key).split(' '); return `${d.slice(0, 3)} ${n} ${m.slice(0, 3)}`; };

// One list row for a finished workout: title, short date, "n exercises · m sets" (done working sets) and the length chosen at Finish.
export function workoutRow(w) {
  const sets = arr(w.items).flatMap(it => arr(it.sets)).filter(s => s.done && !s.warmup).length;
  const mins = Math.round((w.finishedAt - w.startedAt) / 60_000); // left out below one minute
  return { id: w.id, title: w.name || 'Workout', date: shortDate(w.date),
    summary: `${count(arr(w.items).length, 'exercise', 'exercises')} · ${count(sets, 'set', 'sets')}${mins >= 1 ? ` · ${mins} min` : ''}` };
}

// Newest finished workouts first (ties: the later one in the list). Open workouts are not history.
// `upTo` (a day key): only workouts on or before it, so the list follows the shown week.
export function recentWorkouts(gym, limit = 5, upTo) {
  return arr(gym.workouts).map((w, i) => ({ w, i })).filter(({ w }) => w.finishedAt !== null && (upTo === undefined || w.date <= upTo))
    .sort((a, b) => b.w.startedAt - a.w.startedAt || b.i - a.i).slice(0, limit)
    .map(({ w }) => workoutRow(w));
}

export const routineRows = gym => arr(gym.routines).map(r => ({ id: r.id, name: r.name, summary: count(arr(r.items).length, 'exercise', 'exercises') }));
