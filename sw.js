const CACHE='trip-planner-shell-v2';
const SCOPE=new URL(self.registration.scope);
const SHELL=new URL('index.html',SCOPE).href;
const STATIC=['manifest.json','icon-192.png','icon-512.png'].map(p=>new URL(p,SCOPE).href);
let updating=null;
async function broadcast(data){for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage(data)}
async function timedFetch(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);try{return await fetch(url,{cache:'no-store',signal:c.signal})}finally{clearTimeout(timer)}}
async function refreshShell(){if(updating)return updating;updating=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);let r,text;try{r=await fetch(SHELL,{cache:'no-store',signal:controller.signal});if(!r.ok||r.redirected)throw Error('shell unavailable');text=await r.clone().text()}finally{clearTimeout(timer)};if(!text.includes('appVersionBadge'))throw Error('not app HTML');const cache=await caches.open(CACHE),old=await cache.match(SHELL),before=old?await old.text():null;if(before!==text){await cache.put(SHELL,r.clone());if(before!==null){const m=text.match(/גרסה\s+(v[\d.]+)/);await broadcast({type:'TP_UPDATE_READY',version:m?m[1]:''})}}return r})().finally(()=>{updating=null});return updating}
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);if(!await cache.match(SHELL)){const old=await caches.match(SHELL);if(old)await cache.put(SHELL,old);else await refreshShell()}await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('message',event=>{if(event.data?.type==='TP_CHECK_UPDATE')event.waitUntil(refreshShell().catch(()=>{}))});
self.addEventListener('fetch',event=>{const req=event.request,u=new URL(req.url);if(req.method!=='GET'||u.origin!==SCOPE.origin||!u.pathname.startsWith(SCOPE.pathname))return;
if(u.searchParams.has('__tp_net_probe')||u.pathname.endsWith('/sw.js'))return;
if(req.mode==='navigate'&&(u.pathname.endsWith('/')||u.pathname.endsWith('.html'))){const fresh=refreshShell();event.waitUntil(fresh.then(()=>{},()=>{}));event.respondWith((async()=>{const cached=await(await caches.open(CACHE)).match(SHELL);if(cached)return cached;try{return await fresh}catch(e){return new Response('<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><p>אין עותק מקומי זמין. יש לפתוח את האתר פעם אחת עם חיבור לרשת.</p></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}})}})());return}
if(STATIC.includes(u.href)){const fresh=timedFetch(u.href).then(async r=>{if(r.ok)await(await caches.open(CACHE)).put(req,r.clone());return r});event.waitUntil(fresh.then(()=>{},()=>{}));event.respondWith((async()=>{return await(await caches.open(CACHE)).match(req)||await caches.match(req)||await fresh})())}
});
