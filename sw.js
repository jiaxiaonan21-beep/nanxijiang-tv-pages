const PREFIX='nanxijiang-pages-',CACHE=PREFIX+'1.0.0';
const SHELL=['./','./index.html','./style.css','./app.js','./core.js','./vendor/hls.min.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url),base=new URL(self.registration.scope);if(e.request.method!=='GET'||e.request.headers.has('range')||u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return;const files=SHELL.map(p=>new URL(p,base).href);if(!files.includes(u.href))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();void caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request)));});
