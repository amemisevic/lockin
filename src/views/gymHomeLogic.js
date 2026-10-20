// Gym home logic (gym plan G8): week strip, visits line, last workouts, routine rows. Pure, DOM-free.
import { weekKeys, visitDates, visitsInWeek } from '../core/gymstats.js';
import { DAY_NAMES, dayLabel } from './tasksLogic.js';

export const GYM_CORRUPT_NOTICE = 'Gym data could not be read. A copy was kept.';

const arr = v => (Array.isArray(v) ? v : []);
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Mon-Sun of the week holding `today`; the label carries what colour and the check mark show.
export function weekStrip(gym, today) {
  const visits = new Set(visitDates(gym));
  return weekKeys(today).map((key, i) => {
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

// Newest finished workouts first (ties: the later one in the list). Open workouts are not history.
export function recentWorkouts(gym, limit = 5) {
  return arr(gym.workouts).map((w, i) => ({ w, i })).filter(({ w }) => w.finishedAt !== null)
    .sort((a, b) => b.w.startedAt - a.w.startedAt || b.i - a.i).slice(0, limit)
    .map(({ w }) => {
      const sets = arr(w.items).flatMap(it => arr(it.sets)).filter(s => s.done && !s.warmup).length;
      return { id: w.id, title: w.name || 'Workout', date: shortDate(w.date),
        summary: `${count(arr(w.items).length, 'exercise', 'exercises')} · ${count(sets, 'set', 'sets')}` };
    });
}

export const routineRows = gym => arr(gym.routines).map(r => ({ id: r.id, name: r.name, summary: count(arr(r.items).length, 'exercise', 'exercises') }));
