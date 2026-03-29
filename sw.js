// Service Worker — caches all study pages for offline use
const CACHE = 'medstudy-v1';
const URLS = [
  '.',
  './index.html',
  './anatomy/back.html',
  './microbiology/index.html',
  './hebrew/index.html',
  './tools/clostridium_MASTER.html',
  './tools/staph_aureus_MASTER.html',
  './tools/streptococcus_MASTER.html',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
