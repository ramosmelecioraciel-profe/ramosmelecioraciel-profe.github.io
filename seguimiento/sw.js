/* Seguimiento de alumnos — permite abrir la app sin internet.
   La página se pide primero a internet (para recibir mejoras) y, si no hay señal, se usa la copia guardada.
   Nunca guarda ni intercepta los datos que se mandan a tu Hoja de Google. */
const CACHE = 'seguimiento-v1';
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'icono-192.png', 'icono-512.png', 'icono-maskable-512.png', 'apple-touch-icon.png', 'formato252.xlsx', 'codigo-hoja-google.txt'];
const EXTERNOS = ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(BASE);
    for (const u of EXTERNOS) { try { await c.add(new Request(u, { mode: 'cors' })); } catch (x) {} }
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;                                   // los guardados a Google pasan directo
  if (u.hostname.endsWith('google.com') || u.hostname.endsWith('googleusercontent.com')) return;
  const propio = u.origin === self.location.origin;
  const fuente = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname) || u.hostname === 'cdnjs.cloudflare.com';
  if (!propio && !fuente) return;
  if (propio && (r.mode === 'navigate' || /\.html$|\/$/.test(u.pathname))) {
    // página: primero internet, si no hay, la copia guardada
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); return res; })
      .catch(() => caches.match('index.html')));
    return;
  }
  if (propio && /formato252\.xlsx$|codigo-hoja-google\.txt$/.test(u.pathname)) {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r)));
    return;
  }
  // íconos, tipografías y librerías: copia guardada primero
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })));
});
