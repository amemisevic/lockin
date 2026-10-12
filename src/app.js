// App container (state, set, subscribe, viewDate), hash router, clock tick, mount.
import { dateKey, resolveViewDate } from './logic.js';
import { load, save } from './core/store.js';
import { settleMissed } from './core/scoring.js';
import { parseRoute, nav } from './router.js';
import { VERSION } from './version.js';
import { icon } from './icons.js';
import { h } from './dom.js';

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
  viewDate: () => resolveViewDate(requestedDate, today()),
  setViewDate(key) { requestedDate = key; notify(); },
  set(updater) {
    this.state = updater(this.state);
    this.saveFailed = !save(storage, this.state);
    document.getElementById('save-banner').hidden = !this.saveFailed;
    notify();
  },
  subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
  nav,
  route: () => parseRoute(location.hash),
};

navigator.storage?.persist?.().catch(() => {});
// iOS ignores user-scalable=no for pinch; zoom is locked by the owner's choice (spec §2).
document.addEventListener('gesturestart', e => e.preventDefault());

const view = document.getElementById('view');
const tabBar = document.querySelector('.tabs');
const tabs = [...tabBar.querySelectorAll('.tab')];
let shown = null;

// Placeholder screens (Tasks 11–19 replace them). Text nodes only.
function screen(r) {
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

// On load and whenever the local date changes: auto-close missed days, then re-render via subscribe.
let day = today();
const settle = () => app.set(s => settleMissed(s, Date.now()));
function tick() {
  if (today() === day) return render();
  day = today();
  settle();
}

for (const t of tabs) t.prepend(icon(t.hash.slice(1)));
app.subscribe(render);
window.addEventListener('hashchange', render);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
window.addEventListener('focus', tick);
setInterval(tick, 30_000); // "today" rolls over at midnight while the app is open
settle();

// Offline (plan Task 20). Relative path: the app lives under a GitHub Pages sub-path.
navigator.serviceWorker?.register('sw.js');
