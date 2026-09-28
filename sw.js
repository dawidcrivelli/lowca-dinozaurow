/* Offline: pliki aplikacji z pamięci podręcznej, w tle odświeżane z sieci (stale-while-revalidate).
   Zmień VERSION przy wydaniu, żeby wyczyścić stare pliki. */
const VERSION = 'dino-v4';
const CORE = ['./', 'index.html', 'css/app.css', 'js/species.js', 'js/artspec.js', 'js/art.js', 'js/battle.js', 'js/voices.js', 'js/arena3d.js', 'vendor/three.min.js', 'js/app.js', 'manifest.json', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
