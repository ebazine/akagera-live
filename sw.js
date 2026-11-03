/* Offline support: the app, map data and fonts are cached so the map, your GPS position,
   routing and saved reports keep working without signal in the park.
   - Own files: network first, but after 3 s of weak signal the saved copy is used.
   - Map tiles, the official park map and animal photos: saved copy first.
   - Offline mode (switched on in the app): nothing goes to the network. */
const VERSION = 'akl-v3.2.0';
const CORE = ['./', 'index.html', 'app.css', 'app.js', 'config.js', 'species.js', 'emergency.js', 'manifest.webmanifest', 'data/board.json', 'data/osm.json', 'data/official.json', 'icons/icon-192.png', 'icons/icon-512.png', 'lib/qrcode.js'];
const FLAG = new URL('__akl_offline', self.registration.scope).href;
const WAIT_MS = 3000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'akl-tiles' && k !== 'akl-ext').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const offlineMode = () => caches.match(FLAG).then(r => !!r).catch(() => false);
const gone = () => new Response('', {status: 504, statusText: 'Offline'});

async function savedFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req); if (hit) return hit;
  if (await offlineMode()) return gone();
  try { const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; } catch (err) { return gone(); }
}
async function savedThenRefresh(req) {                 // fonts, Firebase code, Wikipedia: answer at once, refresh in the background
  const c = await caches.open('akl-ext');
  const hit = await c.match(req);
  if (await offlineMode()) return hit || gone();
  const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit || gone());
  return hit || net;
}
async function ownFile(req) {
  const cached = await caches.match(req, {ignoreSearch: true});
  if (await offlineMode()) return cached || caches.match('index.html');
  const net = fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; });
  if (!cached) return net.catch(() => caches.match('index.html'));
  // weak signal: do not keep the driver waiting for the network
  return Promise.race([net.catch(() => cached), new Promise(res => setTimeout(() => res(cached), WAIT_MS))]);
}

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.href === FLAG) return;
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('googleapis.com') && url.pathname.includes('identitytoolkit')) return; // live sharing: the Firebase library handles offline itself
  if (url.hostname.includes('api.open-meteo.com')) { e.respondWith(offlineMode().then(off => off ? gone() : fetch(req).catch(gone))); return; }
  if (url.hostname === 'server.arcgisonline.com' || url.hostname === 'upload.wikimedia.org') { e.respondWith(savedFirst(req, 'akl-tiles')); return; }
  if (url.origin !== location.origin) { e.respondWith(savedThenRefresh(req)); return; }
  if (url.pathname.includes('/data/official/') && !url.pathname.endsWith('.json')) { e.respondWith(savedFirst(req, 'akl-tiles')); return; }
  e.respondWith(ownFile(req));
});
