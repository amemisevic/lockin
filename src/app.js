// App container (state, set, subscribe, viewDate), hash router, clock tick, mount.
import { dateKey } from './logic.js';
import { load, save } from './core/store.js';
import { settleMissed } from './core/scoring.js';
import { parseRoute, nav } from './router.js';
import { VERSION } from './version.js';
import { icon } from './icons.js';
import { h } from './dom.js';
import { renderTasks } from './views/tasks.js';
import { renderToday } from './views/today.js';
import { renderChallenge } from './views/challenge.js';
import { renderDay0 } from './views/day0.js';
import { renderMission } from './views/mission.js';
import { renderWarLog, renderWarEntry } from './views/warlog.js';
import { renderMorning } from './views/checkinMorning.js';
import { renderAfternoon } from './views/checkinAfternoon.js';
import { renderNight } from './views/checkinNight.js';
import { renderRecovery } from './views/recovery.js';
import { renderAnalytics } from './views/analytics.js';

// Some browsers throw on the localStorage getter itself when storage is blocked.
let storage;
try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem() { throw new Error('Storage blocked'); } }; }

const subscribers = new Set();
const notify = () => subscribers.forEach(fn => fn());
let requestedDate = null; // ephemeral, never saved

const today = () => dateKey(new Date());

export const app = {
  state: load(storage, today()),
  saveFailed: false,
  version: VERSION,
  today,
  viewDate: () => requestedDate ?? today(),
  setViewDate(key) { requestedDate = key; notify(); },
  set(updater) {
    const next = updater(this.state);
    if (next === this.state) return; // nothing changed: no save, no re-render
    this.state = next;
    this.saveFailed = !save(storage, this.state);
    document.getElementById('save-banner').hidden = !this.saveFailed;
    notify();
  },
  subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
  nav,
  redirect: path => location.replace(path), // R5: replace, so Back never lands on the invalid URL
  route: () => parseRoute(location.hash),
};

navigator.storage?.persist?.().catch(() => {});
// iOS ignores user-scalable=no for pinch; zoom is locked by the owner's choice (spec §2).
document.addEventListener('gesturestart', e => e.preventDefault());

const view = document.getElementById('view');
const tabBar = document.querySelector('.tabs');
const tabs = [...tabBar.querySelectorAll('.tab')];
let shown = null;

// Today (Task 12), Tasks (Task 11), Challenge / Day 0 (Task 13), Mission, War Log and entry editor (Task 14), check-ins (Tasks 15–16), Recovery (Task 17), Analytics (Task 18); placeholder screen for Settings (Task 19 replaces it). Text nodes only.
function screen(r) {
  if (r.name === 'today') return renderToday(app);
  if (r.name === 'tasks') return renderTasks(app);
  if (r.name === 'challenge') return app.state.challenge ? renderChallenge(app) : renderDay0(app);
  if (r.name === 'mission') return renderMission(app, r.params);
  if (r.name === 'checkin' && r.params[0] === 'morning') return renderMorning(app);
  if (r.name === 'checkin' && r.params[0] === 'afternoon') return renderAfternoon(app);
  if (r.name === 'checkin' && r.params[0] === 'night') return renderNight(app, r.params.slice(1));
  if (r.name === 'recovery') return renderRecovery(app, r.params);
  if (r.name === 'analytics') return renderAnalytics(app);
  if (r.name === 'warlog') return r.params.length ? renderWarEntry(app, r.params) : renderWarLog(app);
  if (!r.pushed) return [h('p', { class: 'eyebrow' }, 'Lock In'), h('h1', { class: 'ttl' }, r.name[0].toUpperCase() + r.name.slice(1))];
  return [
    h('button', { type: 'button', class: 'back', onClick: () => history.back() }, icon('chevronLeft'), 'Back'),
    h('p', { class: 'eyebrow' }, r.params.join(' · ') || 'Lock In'),
    h('h1', { class: 'ttl' }, r.name),
  ];
}

function render() {
  const r = app.route();
  const key = [r.name, ...r.params].join('/');
  // R8: a tick re-render would rebuild the editor from stored state, wiping unsaved typing and dropping the iOS keyboard.
  const a = document.activeElement;
  if (key === shown && a?.tagName === 'TEXTAREA' && view.contains(a)) return;
  const y = key === shown ? window.scrollY : 0; // keep position on re-render, top on route change
  const focusId = view.contains(document.activeElement) && document.activeElement.id;
  view.replaceChildren(...screen(r));
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  for (const t of tabs) {
    if (t.hash === `#${r.tab}`) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  }
  tabBar.hidden = r.pushed; // the parent tab stays highlighted underneath
  shown = key;
  window.scrollTo(0, y);
}

// On load, every tick and on return to the app (owner ruling I1): auto-close days whose 04:00 grace
// has passed. app.set re-renders only when that changed something; otherwise render here.
function tick() {
  const before = app.state;
  app.set(s => settleMissed(s, Date.now()));
  if (app.state === before) render();
}

for (const t of tabs) t.prepend(icon(t.hash.slice(1)));
app.subscribe(render);
window.addEventListener('hashchange', render);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
window.addEventListener('focus', tick);
setInterval(tick, 30_000); // "today" rolls over at midnight while the app is open
tick();

// Offline (plan Task 20). Relative path: the app lives under a GitHub Pages sub-path.
navigator.serviceWorker?.register('sw.js');
