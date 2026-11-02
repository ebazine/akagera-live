/* Offline support: the app, map data and fonts are cached so the map, your GPS position,
   routing and saved reports keep working without signal in the park. */
const VERSION = 'akl-v2.8.0';
const CORE = ['./', 'index.html', 'app.css', 'app.js', 'config.js', 'species.js', 'emergency.js', 'manifest.webmanifest', 'data/board.json', 'data/osm.json', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'akl-tiles' && k !== 'akl-ext').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('api.open-meteo.com')) return; // live data: network only
  if (url.hostname === 'server.arcgisonline.com' || url.hostname === 'upload.wikimedia.org') {                 // satellite tiles: cache as you browse
    e.respondWith(caches.open('akl-tiles').then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      try { const r = await fetch(e.request); if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; } catch (err) { return new Response('', {status: 504}); }
    }));
    return;
  }
  if (url.origin !== location.origin) {                              // fonts, Firebase SDK
    e.respondWith(caches.open('akl-ext').then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // own files: network first (fresh map data and code), cache when offline
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: true}).then(h => h || caches.match('index.html'))));
});
