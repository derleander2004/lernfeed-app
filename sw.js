// Service Worker: speichert alle App-Dateien auf dem Gerät, damit die App ohne Netz läuft.
//
// Ablauf bei einer neuen Version: Der Browser bemerkt, dass sich diese Datei geändert hat
// (VERSION unten), lädt alle Dateien neu in einen frischen Speicher und löscht den alten.
// Die neue Version gilt ab dem nächsten Öffnen der App.
//
// VERSION und DATEIEN werden von tools/sw-version.py eingetragen – nicht von Hand ändern.

// ---- automatisch erzeugt: Anfang ----
const VERSION = '1fccc2c01d1d';
const DATEIEN = [
  "./",
  "demo/demo-paket.json",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "index.html",
  "js/backup.js",
  "js/datenverwaltung.js",
  "js/datum.js",
  "js/dialog.js",
  "js/farbschema.js",
  "js/feed.js",
  "js/grafiken.js",
  "js/hilfen.js",
  "js/karten.js",
  "js/main.js",
  "js/planer.js",
  "js/pruefung.js",
  "js/speicher.js",
  "js/uebersicht.js",
  "manifest.json",
  "style.css"
];
// ---- automatisch erzeugt: Ende ----

const CACHE = `lernfeed-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache: 'reload' umgeht den Browser-Cache, damit wirklich die neuen Dateien geladen werden
    await cache.addAll(DATEIEN.map((d) => new Request(d, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('lernfeed-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const anfrage = event.request;
  const url = new URL(anfrage.url);
  if (anfrage.method !== 'GET' || url.origin !== self.location.origin) return;

  const startPfad = new URL('./', self.registration.scope).pathname;
  const istStartseite = anfrage.mode === 'navigate' && (url.pathname === startPfad || url.pathname === `${startPfad}index.html`);

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Startseite immer aus dem Speicher (auch mit ?heute=… zum Testen)
    const treffer = istStartseite
      ? await cache.match('index.html')
      : await cache.match(anfrage, { ignoreSearch: true });
    return treffer ?? fetch(anfrage);
  })());
});
