// Fake 30-day backup for screenshots and import tests (plan Task 19 step 4). Not shipped, not imported by the app.
// Built with the real core functions and generic names only. Usage: node tools/seed.mjs [today=YYYY-MM-DD]
// Writes private/seed-30days.json (gitignored). Day 1 is 29 days before `today`; `today` (day 30) is left open.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defaultState, validateState } from '../src/core/model.js';
import { startChallenge, submitMorning } from '../src/core/challenge.js';
import { closeNight } from '../src/core/scoring.js';
import { fileAutopsy } from '../src/core/recovery.js';
import { setWarEntry } from '../src/core/warlog.js';
import { addTask, tasksOn } from '../src/core/tasks.js';
import { validatePack, importPack } from '../src/core/pack.js';
import { exportJson, markBackup } from '../src/core/store.js';
import { dateKey, addDays } from '../src/logic.js';

const today = process.argv[2] ?? dateKey(new Date());
const start = addDays(today, -29);
const at = (date, hour) => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d, hour).getTime(); };
const must = r => { if (!r.ok) throw new Error(r.error); return r.state; };

const PROTOCOLS = [{ id: 'p1', title: 'Protocol A', med: 'Short version of Protocol A' }, { id: 'p2', title: 'Protocol B', med: null },
  { id: 'p3', title: 'Protocol C', med: null }];
const RED_LINES = [{ id: 'r1', name: 'Red line A' }, { id: 'r2', name: 'Red line B' }];
const ARCHETYPES = ['negotiator', 'assassin', 'seducer', 'escapist', 'authority'];

const pack = validatePack(JSON.stringify({ v: 1,
  missions: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, title: `Mission ${i + 1}`, body: `Body of mission ${i + 1}.` })),
  tactics: ARCHETYPES.flatMap(a => [1, 2].map(n => ({ archetype: a, name: `Tactic ${a} ${n}` }))) })).pack;

let s = importPack(defaultState(), pack);
for (const [key, text] of [['contract', 'Contract text A'], ['funeral', 'Funeral text A'], ['code', 'Code text A'], ['redlines-w1', 'Red lines text A']]) {
  s = setWarEntry(s, key, text, at(start, 7));
}
s = must(startChallenge(s, start, { protocols: PROTOCOLS, redLines: RED_LINES, oathComplete: true }));

// ~20 tasks: four habits and sixteen one-off tasks spread over the challenge.
const habit = (id, title, repeat, extra = {}) => ({ id, title, repeat, ...extra });
const habits = [habit('t1', 'Task A', { type: 'daily', days: [] }), habit('t2', 'Task B', { type: 'weekdays', days: [] }),
  habit('t3', 'Task C', { type: 'custom', days: [0, 2, 4] }), habit('t4', 'Task D', { type: 'daily', days: [] }, { start: '09:00', end: '10:00' })];
const oneOffs = Array.from({ length: 16 }, (_, i) => ({ id: `t${i + 5}`, title: `Task ${String.fromCharCode(69 + i)}`,
  repeat: { type: 'none', days: [] }, date: addDays(start, i * 2 + 1) }));
for (const t of [...habits, ...oneOffs]) s = addTask(s, t, t.id);

// Per-day plan, index = challenge day - 1. P passed, R redo (one protocol missed), X reset (red line / all missed).
const PLAN = Array.from({ length: 29 }, (_, i) => ([7, 22].includes(i) ? 'X' : i === 15 ? 'Z' : [3, 11, 19, 26].includes(i) ? 'R' : 'P'));
const STATUSES = ['done', 'done', 'done', 'failed', 'done', 'stalled', 'done', 'done'];

PLAN.forEach((kind, i) => {
  const date = addDays(start, i);
  if (i !== 11) s = must(submitMorning(s, date, { target: `Target ${i + 1}`, risk: 'Risk A', med: [2, 9].includes(i) ? ['p1'] : [] }, at(date, 8)));
  const status = (kind === 'R' ? { p1: 'held', p2: 'missed', p3: 'held' } : kind === 'Z' ? { p1: 'missed', p2: 'missed', p3: 'missed' }
    : { p1: 'held', p2: 'held', p3: 'held' });
  const tasks = Object.fromEntries(tasksOn(s, date).filter(v => v.status === 'open').map((v, n) => [v.task.id, STATUSES[(i + n) % STATUSES.length]]));
  const slipped = kind !== 'P';
  const form = { protocols: status, redLines: { r1: kind === 'X' ? 'crossed' : 'held', r2: 'held' }, tasks, win: `Win ${i + 1}`, slipNote: '',
    bottomG: slipped ? { archetype: ARCHETYPES[i % 5], tactic: `Tactic ${ARCHETYPES[i % 5]} 1`, text: 'Note A' } : undefined };
  s = must(closeNight(s, date, form, at(date, 22)));
  if (s.recovery[date] && date !== addDays(start, 22)) {
    s = must(fileAutopsy(s, date, { state: 'Tired and rushed', time: 'Late evening', place: 'Home', decision: 'I decided to leave the phone in another room',
      change: 'Block the apps and move the charger out of the room' }, at(addDays(date, 1), 9)));
  }
  if (i % 6 === 0) s = setWarEntry(s, `day-${i + 1}`, `Reflection ${i + 1}`, at(date, 23));
});

s = markBackup(s, addDays(today, -2));
const error = validateState(s);
if (error) throw new Error(error);
const dir = fileURLToPath(new URL('../private/', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}seed-30days.json`, exportJson(s));
const counts = Object.values(s.days).reduce((c, d) => ({ ...c, [d.result]: (c[d.result] ?? 0) + 1 }), {});
console.log(`private/seed-30days.json: start ${start}, today ${today}, days ${JSON.stringify(counts)}, tasks ${s.tasks.length}`);
