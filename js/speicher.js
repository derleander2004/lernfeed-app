// Speicher auf dem Handy (IndexedDB, im Browser eingebaut). Nichts davon verlässt das Gerät.
//
// Bereiche ("Stores"):
//   inhalt       – das zuletzt importierte Kartenpaket (Schlüssel "paket")
//   fortschritt  – ein Eintrag pro Karte: Box, fällig am, richtige Tage, Zähler
//   tage         – ein Eintrag pro Tag: beantwortet, richtig, neu (für Streak und Tageslimit)
//   meta         – Kleinkram wie Datum des letzten Imports oder Backups

const DB_NAME = 'lernfeed';
const DB_VERSION = 1;

let verbindung = null;

function oeffne() {
  return new Promise((ok, fehler) => {
    const anfrage = indexedDB.open(DB_NAME, DB_VERSION);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      db.createObjectStore('inhalt');
      db.createObjectStore('fortschritt', { keyPath: 'id' });
      db.createObjectStore('tage', { keyPath: 'datum' });
      db.createObjectStore('meta');
    };
    anfrage.onsuccess = () => ok(anfrage.result);
    anfrage.onerror = () => fehler(anfrage.error);
  });
}

function db() {
  verbindung ??= oeffne();
  return verbindung;
}

function ergebnis(anfrage) {
  return new Promise((ok, fehler) => {
    anfrage.onsuccess = () => ok(anfrage.result);
    anfrage.onerror = () => fehler(anfrage.error);
  });
}

function fertig(tx) {
  return new Promise((ok, fehler) => {
    tx.oncomplete = () => ok();
    tx.onerror = tx.onabort = () => fehler(tx.error);
  });
}

/** Lädt Paket, Fortschritt, Tagesstatistik und Metadaten auf einmal. */
export async function ladeAlles() {
  const tx = (await db()).transaction(['inhalt', 'fortschritt', 'tage', 'meta']);
  const metaStore = tx.objectStore('meta');
  const [paket, fortschritt, tage, metaSchluessel, metaWerte] = await Promise.all([
    ergebnis(tx.objectStore('inhalt').get('paket')),
    ergebnis(tx.objectStore('fortschritt').getAll()),
    ergebnis(tx.objectStore('tage').getAll()),
    ergebnis(metaStore.getAllKeys()),
    ergebnis(metaStore.getAll()),
  ]);
  const meta = Object.fromEntries(metaSchluessel.map((k, i) => [k, metaWerte[i]]));
  return { paket: paket ?? null, fortschritt, tage, meta };
}

/** Setzt Metadaten; ein Wert null löscht den Eintrag. */
function schreibeMeta(store, werte) {
  for (const [k, v] of Object.entries(werte)) {
    if (v == null) store.delete(k);
    else store.put(v, k);
  }
}

export async function setzeMeta(werte) {
  const tx = (await db()).transaction('meta', 'readwrite');
  schreibeMeta(tx.objectStore('meta'), werte);
  return fertig(tx);
}

/** Ersetzt das Kartenpaket (der Fortschritt bleibt unberührt) und setzt dabei Metadaten. */
export async function speicherePaket(paket, meta = {}) {
  const tx = (await db()).transaction(['inhalt', 'meta'], 'readwrite');
  tx.objectStore('inhalt').put(paket, 'paket');
  schreibeMeta(tx.objectStore('meta'), meta);
  return fertig(tx);
}

/** Schreibt Fortschritt und Tage vollständig neu (nach dem Zusammenführen mit einem Backup). */
export async function ersetzeFortschritt({ fortschritt, tage }, meta = {}) {
  const tx = (await db()).transaction(['fortschritt', 'tage', 'meta'], 'readwrite');
  const f = tx.objectStore('fortschritt');
  const t = tx.objectStore('tage');
  f.clear();
  t.clear();
  for (const e of fortschritt) f.put(e);
  for (const e of tage) t.put(e);
  schreibeMeta(tx.objectStore('meta'), meta);
  return fertig(tx);
}

/** Speichert eine Antwort: den neuen Kartenstand (falls geändert) und den Tageszähler. */
export async function speichereAntwort(fortschritt, tag) {
  const tx = (await db()).transaction(['fortschritt', 'tage'], 'readwrite');
  if (fortschritt) tx.objectStore('fortschritt').put(fortschritt);
  tx.objectStore('tage').put(tag);
  return fertig(tx);
}

/** Bittet den Browser, die Daten nicht bei Speicherknappheit zu löschen. */
export async function bitteUmDauerhaftenSpeicher() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch { /* nicht überall verfügbar – kein Problem */ }
}
