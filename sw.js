// Offline cache (plan Task 20). Any change to a shipped file bumps VERSION here and in src/version.js.
const VERSION = '1.0.23';
const CACHE = `lockin-${VERSION}`;
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'screens.css',
  'manifest.webmanifest',
  'src/app.js',
  'src/core/model.js',
  'src/core/store.js',
  'src/core/tasks.js',
  'src/core/challenge.js',
  'src/core/scoring.js',
  'src/core/recovery.js',
  'src/core/warlog.js',
  'src/core/pack.js',
  'src/core/stats.js',
  'src/bg/frieze@2x.webp',
  'src/bg/steps@2x.webp',
  'src/bg/wall-tile@2x.webp',
  'src/dom.js',
  'src/fonts/OFL-AlegreyaSans.txt',
  'src/fonts/OFL-Cinzel.txt',
  'src/fonts/OFL-CormorantGaramond.txt',
  'src/fonts/alegreya-sans-latin-400-normal.woff2',
  'src/fonts/alegreya-sans-latin-500-normal.woff2',
  'src/fonts/alegreya-sans-latin-700-normal.woff2',
  'src/fonts/cinzel-latin-500-normal.woff2',
  'src/fonts/cinzel-latin-600-normal.woff2',
  'src/fonts/cinzel-latin-700-normal.woff2',
  'src/fonts/cormorant-garamond-latin-600-italic.woff2',
  'src/fonts/cormorant-garamond-latin-700-italic.woff2',
  'src/fonts/fonts.css',
  'src/icons.js',
  'src/logic.js',
  'src/router.js',
  'src/sheet.js',
  'src/ui/chrome.js',
  'src/ui/controls.js',
  'src/ui/taskRow.js',
  'src/views/challenge.js',
  'src/views/challengeLogic.js',
  'src/views/day0.js',
  'src/views/mission.js',
  'src/views/taskSheet.js',
  'src/views/tasks.js',
  'src/views/tasksLogic.js',
  'src/views/today.js',
  'src/views/todayLogic.js',
  'src/views/warlog.js',
  'src/views/warlogLogic.js',
  'src/version.js',
  'icons/favicon-16.png',
  'icons/favicon-32.png',
  'icons/icon-120.png',
  'icons/icon-152.png',
  'icons/icon-167.png',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-48.png',
  'icons/icon-512.png',
  'icons/icon-60.png',
];

// No skipWaiting: a new version waits until every window of the old one is closed (a full relaunch).
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));

self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));

// Cache first for same-origin GETs; navigations fall back to index.html.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: req.mode === 'navigate' })
    .then(hit => hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
