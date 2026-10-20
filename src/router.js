// Hash router: '#name/param…' → {name, params, tab, pushed}. Pure except nav(). Unknown → Today.
const TABS = ['today', 'tasks', 'challenge', 'analytics', 'gym', 'settings'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseRoute(hash) {
  let s = hash.startsWith('#') ? hash.slice(1) : hash;
  if (s.endsWith('/')) s = s.slice(0, -1);
  const [name, ...p] = s.split('/');
  const pushed = tab => ({ name, params: p, tab, pushed: true });
  if (TABS.includes(name) && !p.length) return { name, params: [], tab: name, pushed: false };
  if (name === 'checkin') {
    if (p.length === 1 && (p[0] === 'morning' || p[0] === 'afternoon')) return pushed('today');
    if (p.length === 2 && p[0] === 'night' && DATE.test(p[1])) return pushed('today');
  }
  if (name === 'gym' && p.length === 1 && p[0] === 'exercises') return pushed('gym');
  if (name === 'recovery' && p.length === 1 && DATE.test(p[0])) return pushed('challenge');
  if (name === 'mission' && p.length === 1 && /^\d+$/.test(p[0])) return pushed('challenge');
  if (name === 'warlog' && (!p.length || (p.length === 1 && p[0]))) return pushed('challenge');
  return { name: 'today', params: [], tab: 'today', pushed: false };
}

export const nav = path => { location.hash = path; };
