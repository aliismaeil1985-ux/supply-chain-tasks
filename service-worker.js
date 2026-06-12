/* Service Worker - Inventory Dashboard PWA
   استراتيجية: Network-first للصفحة الرئيسية (لأن البيانات حية من Firebase)
   مع تخزين احتياطي للعمل دون اتصال (offline fallback). */

const CACHE = 'inventory-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // لا نتدخل في طلبات Firebase / الخطوط / الـ CDN — نتركها تذهب للشبكة مباشرة
  const passthrough = /gstatic|googleapis|firebase|firestore|jsdelivr|cloudflare|emailjs/i;
  if (passthrough.test(url.hostname)) return;

  // للصفحة والملفات المحلية: شبكة أولاً ثم الكاش عند انقطاع الاتصال
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
