/* Soulful Sazón · service worker simples. Escopo = a pasta onde ele está (funciona em subpasta do GitHub Pages).
   - arquivos do site (mesma origem): rede primeiro (sempre a versão nova); sem sinal, usa o que está guardado;
   - GSAP/Lenis (jsdelivr) e fontes do Google: guardados na primeira vez, para abrir sem sinal;
   - tudo o mais (Cash App, DoorDash, Uber Eats, mapas, Instagram, tel:, sms:): vai direto para a rede.
   Ao publicar uma versão nova, troque VERSION. */
var VERSION = 'sazon-v2-6';
var CORE = ['./', 'index.html', 'styles.css', 'main.js', 'form.js', 'pwa.js', 'manifest.webmanifest',
  'img/favicon.svg', 'img/favicon.png', 'img/icon-192.png', 'img/logo-selo.webp', 'img/streak.svg', 'img/placard-frame.svg', 'img/trailer.svg', 'img/clamshell.svg',
  'img/hero-chicharron-1000.webp', 'img/hero-chicharron-1300.webp'];
var CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function swr(req, key) {
  return caches.open(VERSION).then(function (c) {
    return c.match(key || req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) c.put(key || req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  });
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    /* rede primeiro para os arquivos do site (quem abre sempre vê a versão nova); sem sinal, usa o que está guardado */
    var key = req.mode === 'navigate' ? new Request('index.html') : req;
    e.respondWith(caches.open(VERSION).then(function (c) {
      return fetch(req).then(function (res) {
        if (res && res.ok) c.put(key, res.clone());
        return res;
      }).catch(function () { return c.match(key); });
    }));
    return;
  }
  if (CDN.test(req.url)) { e.respondWith(swr(req)); return; }
});
