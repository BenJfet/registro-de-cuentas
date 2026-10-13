// Service worker: hace la app instalable y que abra rápido.
// Los datos (/api) SIEMPRE van al servidor: nunca se muestran cifras viejas desde caché.
const CACHE = 'caja-del-dia-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  // Archivos con hash (/assets/...) no cambian nunca: primero caché.
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then((enCache) => enCache || fetch(request).then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copia));
        }
        return res;
      })),
    );
    return;
  }

  // Páginas: primero red (para recibir actualizaciones); sin conexión, la última versión guardada.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copia));
          return res;
        })
        .catch(() => caches.match('/')),
    );
  }
});
