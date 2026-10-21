// Start der App: Speicher laden, Planer anlegen, Feed, Übersicht und Datenverwaltung starten.
// Beim allerersten Start (noch kein Paket importiert) wird das Demo-Paket eingespielt.

import { starteFeed } from './feed.js';
import { starteFarbschema } from './farbschema.js';
import { el } from './hilfen.js';
import { heute } from './datum.js';
import { Planer, STREAK_MINIMUM } from './planer.js';
import { ladeAlles, speicherePaket, speichereAntwort, bitteUmDauerhaftenSpeicher } from './speicher.js';
import { starteUebersicht, berechneErinnerungen } from './uebersicht.js';
import { erstelleDatenverwaltung } from './datenverwaltung.js';

starteFarbschema(document.getElementById('theme-knopf'));

// Offline-Fähigkeit: Service Worker anmelden (geht nur über HTTPS oder localhost, nicht im WLAN-Test).
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch((fehler) => console.warn('Service Worker nicht registriert', fehler));
}

const feedEl = document.getElementById('feed');
const streakEl = document.querySelector('.streak');
const streakZahlEl = document.getElementById('streak-zahl');
const heuteEl = document.getElementById('heute');
const menueKnopf = document.getElementById('menue-knopf');
const fokusSchild = document.getElementById('fokus-schild');

// Fokus (nur ein Modul üben) gilt bis zum Beenden, höchstens bis zum Ende des Tages.
// Er steht im Browser-Speicher, damit er bleibt, wenn Android die App zwischendurch schließt.
function leseFokus() {
  try {
    const f = JSON.parse(localStorage.getItem('fokus'));
    return f?.tag === heute() ? f.modul : null;
  } catch { return null; }
}
function merkeFokus(modul) {
  try {
    if (modul) localStorage.setItem('fokus', JSON.stringify({ modul, tag: heute() }));
    else localStorage.removeItem('fokus');
  } catch { /* ohne Speicher gilt der Fokus nur bis zum Schließen */ }
}

function zeigeKopf(planer) {
  const n = planer.heuteBeantwortet();
  const geschafft = n >= STREAK_MINIMUM;
  streakZahlEl.textContent = planer.streak();
  streakEl.classList.toggle('offen', !geschafft);
  // Im Fokus ist die Kopfleiste voller – dann ohne das Wort „heute“
  const wort = planer.fokus ? '' : ' heute';
  heuteEl.textContent = geschafft ? `✓ ${n}${wort}` : `${n} / ${STREAK_MINIMUM}${wort}`;
  heuteEl.classList.toggle('geschafft', geschafft);
  fokusSchild.hidden = !planer.fokus;
  if (planer.fokus) {
    fokusSchild.dataset.modul = planer.fokus;
    fokusSchild.textContent = `Nur ${planer.fokus} ✕`;
    fokusSchild.setAttribute('aria-label', `Fokus auf ${planer.fokus} beenden`);
  }
}

async function ladeDemoPaket() {
  const antwort = await fetch('demo/demo-paket.json');
  if (!antwort.ok) throw new Error(`Demo-Paket: HTTP ${antwort.status}`);
  const paket = await antwort.json();
  await speicherePaket(paket);
  return paket;
}

async function start() {
  bitteUmDauerhaftenSpeicher();
  const gespeichert = await ladeAlles();
  const paket = gespeichert.paket ?? await ladeDemoPaket();
  const meta = gespeichert.meta;
  const planer = new Planer(paket, gespeichert.fortschritt, gespeichert.tage, heute);
  const level = new Map(paket.level.map((l) => [l.id, l]));

  // Roter Punkt am Menü, wenn ein Backup oder ein neues Paket ansteht
  function zeigeErinnerung() {
    const { irgendwas } = berechneErinnerungen({ planer, paket, meta });
    menueKnopf.classList.toggle('mit-punkt', irgendwas);
    menueKnopf.setAttribute('aria-label', irgendwas ? 'Übersicht öffnen (Erinnerung)' : 'Übersicht öffnen');
  }

  const daten = erstelleDatenverwaltung({
    heute,
    aktuellesPaket: () => paket,
    beiAenderung(neu) {
      Object.assign(meta, neu);
      zeigeErinnerung();
      uebersicht.aktualisiere();
    },
  });

  const uebersicht = starteUebersicht(menueKnopf, () => {
    planer.aktualisiereHeute();
    return { planer, paket, meta, daten, setzeFokus };
  });

  const gemerkterFokus = leseFokus();
  if (gemerkterFokus && planer.module.get(gemerkterFokus)?.aktiv !== false) planer.setzeFokus(gemerkterFokus);
  else merkeFokus(null);

  /** Fokus setzen (Modulkürzel) oder mit null zurück zum gemischten Feed. */
  function setzeFokus(modul) {
    if (planer.fokus === modul) return;
    planer.setzeFokus(modul);
    merkeFokus(modul);
    zeigeKopf(planer);
    feed.neuStart();
  }
  fokusSchild.addEventListener('click', () => setzeFokus(null));

  zeigeKopf(planer);
  zeigeErinnerung();

  const feed = starteFeed(feedEl, {
    naechste: () => planer.naechste(),
    kontext(karte) {
      const l = level.get(karte.level);
      return { modul: karte.modul, levelNr: l?.nr, levelTitel: l?.titel, art: planer.herkunft.get(karte.id) };
    },
    beantwortet(karte, richtig) {
      const { fortschritt, tag } = planer.beantwortet(karte, richtig);
      zeigeKopf(planer);
      speichereAntwort(fortschritt, tag).catch((fehler) => console.error('Speichern fehlgeschlagen', fehler));
    },
    endeInfo: () => ({ grund: planer.grundFuerEnde(), heute: planer.heuteBeantwortet(), fokus: planer.fokus }),
    starteFreiesUeben: () => { planer.freiesUeben = true; },
    beendeFokus: () => setzeFokus(null),
    freigeben: (karte) => planer.freigeben(karte),
  });

  // Nach Mitternacht: Kopfzeile und Erinnerungen auf den neuen Tag umstellen.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    planer.aktualisiereHeute();
    if (planer.fokus && !leseFokus()) setzeFokus(null); // neuer Tag → wieder gemischt
    zeigeKopf(planer);
    zeigeErinnerung();
  });

  // Rückmeldung nach Import oder Wiederherstellung
  if (meta.meldungNachStart) {
    const meldung = meta.meldungNachStart;
    delete meta.meldungNachStart;
    daten.zeigeMeldungNachStart(meldung);
  }
}

start().catch((fehler) => {
  console.error(fehler);
  feedEl.append(el('p', { class: 'feed-meldung' }, `Die App konnte nicht starten: ${fehler.message}`));
});
