// Service worker for the novapace individualized-therapy app.
//
// Its only job is offline start: once loaded, the app opens without network.
// The clip is reached over Web Bluetooth, which this worker never sees.
//
// NETWORK FIRST for everything, cache only as the fallback. The patient app
// (sole_hardware_clip_P4) serves assets cache-first and therefore needs a
// build step that derives the cache name from the content — otherwise an
// installed phone stays on its old version. This app has no build step:
// docs/ is published as-is by GitHub Pages. Going to the network first means
// a phone with reception always gets the current files, and the cache name
// below never has to change.
const CACHE = 'novapace-it-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './novapace_logo_horizontal_green_F1uoio.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  // cache: 'no-cache' — without it the fetch below may be answered from the
  // browser's HTTP cache (GitHub Pages sends max-age=600), and "network
  // first" would quietly hand back the previous version for ten minutes.
  // A navigation Request cannot be re-issued with an init object (it throws
  // a TypeError), so pages are fetched by URL.
  const net = req.mode === 'navigate'
    ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(req, { cache: 'no-cache' });
  e.respondWith(
    net
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
        return res;
      })
      .catch(() => caches.match(key, { ignoreSearch: true }))
  );
});
