// Service Worker der Faltwerk-App (huelle.md §7): hält die Dateien der App vor, damit sie offline startet.
// Bücher liegen in IndexedDB, nicht hier. Eine neue Fassung der App wird erst beim nächsten Start aktiv, nie mitten
// im Lesen: kein skipWaiting. Beim Bauen werden Fassung und Dateiliste eingesetzt.

const VERSION = '7bfae4b154282264';
const FILES = ["index.html","app.js","app.css","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png","icon-maskable-512.png"];
const CACHE = `faltwerk-app-${VERSION}`;
const SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Alte Fassungen der App-Dateien weg. Das ist kein Zustand eines Lesers, nur die Umgebung.
    for (const key of await caches.keys()) {
      if (key.startsWith('faltwerk-app-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Bücher von fremden Webspaces (Einlege-Link) gehen am Cache vorbei.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  const path = url.pathname.slice(SCOPE.length);
  const fromCache = (file) => caches.open(CACHE).then((cache) => cache.match(file)).then((hit) => hit ?? fetch(request));
  if (request.mode === 'navigate') {
    // Nur die App selbst kommt aus dem Cache; jede andere Seite unter derselben Adresse geht ans Netz.
    if (path === '' || path === 'index.html') event.respondWith(fromCache('index.html'));
    return;
  }
  if (FILES.includes(path)) event.respondWith(fromCache(path));
});
