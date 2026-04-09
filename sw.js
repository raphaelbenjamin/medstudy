const CACHE = 'medstudy-v10';
const URLS = [
  '.','./index.html',
  './anatomy/index.html','./anatomy/back.html','./anatomy/netter.html','./anatomy/study-tool.html',
  './microbiology/index.html','./microbiology/hub.html','./microbiology/chapters.html','./microbiology/exam-framework.html',
  './hebrew/index.html','./hebrew/vocab.html','./hebrew/checklist.html',
  './italian/index.html','./italian/practice.html','./italian/grammar.html',
  './tools/clostridium_MASTER.html',
  './tools/staph_aureus_MASTER.html',
  './tools/streptococcus_MASTER.html',
  './site-admin.js',
    './italian/italian-conversation-b1.html',
    './microbiology/micro_guide.html',
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',e=>{
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(res=>{
        if(!res||res.status!==200)return res;
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
        return res;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
