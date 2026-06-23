// 飲控大作戰 Service Worker — 離線可用＋秒開＋推播
const CACHE = 'yk-v3';

self.addEventListener('push', (e) => {
  let d = { title: '飲控大作戰', body: '該記錄囉～' };
  try { d = e.data.json(); } catch (_) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(d.title || '飲控大作戰', {
    body: d.body || '', icon: './icon-512.png', badge: './icon-512.png', vibrate: [12, 40, 20],
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow('./');
  })());
});
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Supabase 資料/儲存/函式：永遠走網路，不快取（離線時前端已有 try/catch 處理）
  if (url.hostname.endsWith('supabase.co')) return;

  // 導覽請求：network-first，離線退回快取的首頁
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 跨網域 CDN（字型/Chart.js/supabase-js）：stale-while-revalidate
  if (url.origin !== location.origin) {
    e.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(r => {
          if ((r && r.status === 200) || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
          return r;
        }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  // 同源靜態：cache-first
  e.respondWith(
    caches.match(req).then(c => c || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(cc => cc.put(req, cp)); return r; }))
  );
});
