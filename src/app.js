// App container (state, set, subscribe, viewDate), hash router, clock tick, mount.
import { dateKey, resolveViewDate, sanitizeTimer } from './logic.js';
import { load, save } from './store.js';
import { VERSION } from './version.js';
import { icon } from './icons.js';
import { renderToday } from './views/today.js';
import { renderPlan } from './views/plan.js';
import { renderProgress } from './views/progress.js';
import { renderSettings } from './views/settings.js';

// Some browsers throw on the localStorage getter itself when storage is blocked.
let storage;
try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem() { throw new Error('Storage blocked'); } }; }

const subscribers = new Set();
const notify = () => subscribers.forEach(fn => fn());
let requestedDate = null; // ephemeral, never saved

const today = () => dateKey(new Date());

export const app = {
  state: sanitizeTimer(load(storage, today())),
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
};

navigator.storage?.persist?.().catch(() => {});
// iOS ignores user-scalable=no for pinch; zoom is locked by the owner's choice (spec §2).
document.addEventListener('gesturestart', e => e.preventDefault());

const routes = { today: renderToday, plan: renderPlan, progress: renderProgress, settings: renderSettings };
const view = document.getElementById('view');
const tabs = [...document.querySelectorAll('.tab')];
let shown = null;

function render() {
  const route = routes[location.hash.slice(1)] ? location.hash.slice(1) : 'today';
  const y = route === shown ? window.scrollY : 0; // keep position on re-render, top on tab switch
  const focusId = view.contains(document.activeElement) && document.activeElement.id;
  view.replaceChildren(routes[route](app));
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  for (const t of tabs) {
    if (t.dataset.tab === route) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  }
  shown = route;
  window.scrollTo(0, y);
}

for (const t of tabs) {
  t.prepend(icon(t.dataset.tab));
  t.addEventListener('click', () => { location.hash = t.dataset.tab; });
}
app.subscribe(render);
window.addEventListener('hashchange', render);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
window.addEventListener('focus', render);
setInterval(render, 30_000); // "today" rolls over at midnight while the app is open
render();
