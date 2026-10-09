// Offline cache (plan Task 10). Any change to a shipped file bumps VERSION here and in src/version.js.
const VERSION = '1.0.23';
const CACHE = `lockin-${VERSION}`;
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'screens.css',
  'manifest.webmanifest',
  'src/app.js',
  'src/dom.js',
  'src/fonts/OFL-Archivo.txt',
  'src/fonts/OFL-Cinzel.txt',
  'src/fonts/OFL-CormorantGaramond.txt',
  'src/fonts/archivo-latin.woff2',
  'src/fonts/cinzel-600-latin.woff2',
  'src/fonts/cormorant-garamond-700i-latin.woff2',
  'src/fonts/fonts.css',
  'src/icons.js',
  'src/logic.js',
  'src/redlines.js',
  'src/sheet.js',
  'src/store.js',
  'src/timeLog.js',
  'src/version.js',
  'src/views/blockRow.js',
  'src/views/blockSheet.js',
  'src/views/plan.js',
  'src/views/progress.js',
  'src/views/redLineLog.js',
  'src/views/settings.js',
  'src/views/settingsSheets.js',
  'src/views/today.js',
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
