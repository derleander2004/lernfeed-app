// Kartenpaket importieren, Fortschritt sichern und wiederherstellen.
//
// Eine einzige Dateiauswahl erkennt selbst, ob ein Kartenpaket oder ein Backup gewählt wurde.
// Nach Import oder Wiederherstellung lädt die App neu; die Rückmeldung erscheint danach
// (sie wird dafür kurz in den Metadaten abgelegt).

import { el } from './hilfen.js';
import { zeigeDialog } from './dialog.js';
import { pruefePaket } from './pruefung.js';
import { erstelleBackup, pruefeBackup, zusammenfuehren, BACKUP_FORMAT } from './backup.js';
import { ladeAlles, setzeMeta, speicherePaket, ersetzeFortschritt } from './speicher.js';

const OK = [{ text: 'OK', wert: 'ok', haupt: true }];

export function deutschesDatum(iso) {
  if (!iso) return '?';
  const [j, m, t] = iso.slice(0, 10).split('-');
  return `${t}.${m}.${j}`;
}

function anzahl(n, einzahl, mehrzahl) {
  return `${n} ${n === 1 ? einzahl : mehrzahl}`;
}

export function istDemoPaket(paket) {
  return paket.module.every((m) => m.kuerzel === 'DEMO');
}

/** Gibt die Datei über das Teilen-Menü weiter (→ „In Drive speichern“) oder lädt sie herunter. */
async function teileOderLadeHerunter(inhalt, name) {
  // Chrome erlaubt beim Teilen keine .json-Dateien, wohl aber .txt – der Inhalt bleibt JSON.
  const datei = new File([inhalt], `${name}.txt`, { type: 'text/plain' });
  if (navigator.canShare?.({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: 'Lernfeed-Backup' });
      return 'geteilt';
    } catch (e) {
      if (e.name === 'AbortError') return 'abgebrochen';
      // sonst: Teilen nicht möglich → Download als Ausweg
    }
  }
  const url = URL.createObjectURL(new Blob([inhalt], { type: 'application/json' }));
  const a = el('a', { href: url, download: `${name}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'heruntergeladen';
}

/**
 * @param heute          Funktion → heutiges Datum
 * @param aktuellesPaket Funktion → das gerade geladene Paket
 * @param beiAenderung   wird nach einem Backup mit den neuen Metadaten aufgerufen
 */
export function erstelleDatenverwaltung({ heute, aktuellesPaket, beiAenderung }) {
  const eingabe = el('input', { type: 'file', accept: 'application/json,text/plain,.json,.txt', hidden: true });
  document.body.append(eingabe);
  eingabe.addEventListener('change', async () => {
    const datei = eingabe.files[0];
    eingabe.value = '';
    if (datei) await verarbeite(datei);
  });

  async function verarbeite(datei) {
    let daten;
    try {
      daten = JSON.parse(await datei.text());
    } catch {
      await zeigeDialog({ titel: 'Datei nicht lesbar', text: [`„${datei.name}“ ist weder ein Kartenpaket noch ein Backup.`], knoepfe: OK });
      return;
    }
    if (daten?.format === 'sport-lernfeed-paket') await importierePaket(daten);
    else if (daten?.format === BACKUP_FORMAT) await stelleWiederHer(daten);
    else await zeigeDialog({ titel: 'Unbekannte Datei', text: [`„${datei.name}“ ist weder ein Kartenpaket noch ein Backup dieser App.`], knoepfe: OK });
  }

  async function importierePaket(paket) {
    const { fehler } = pruefePaket(paket);
    if (fehler.length) {
      await zeigeDialog({
        titel: 'Paket fehlerhaft',
        text: ['Das Paket wurde nicht importiert, dein bisheriger Stand ist unverändert. Gefundene Fehler:',
          fehler.length > 5 ? `… und ${fehler.length - 5} weitere.` : null],
        liste: fehler.slice(0, 5),
        knoepfe: OK,
      });
      return;
    }

    const alt = aktuellesPaket();
    const altDemo = !alt || istDemoPaket(alt);
    if (!altDemo && paket.erstellt < alt.erstellt) {
      const wahl = await zeigeDialog({
        titel: 'Älteres Paket',
        text: [`Dieses Paket ist vom ${deutschesDatum(paket.erstellt)}, dein aktuelles vom ${deutschesDatum(alt.erstellt)}. Trotzdem importieren?`],
        knoepfe: [{ text: 'Abbrechen', wert: 'nein' }, { text: 'Importieren', wert: 'ja', haupt: true }],
      });
      if (wahl !== 'ja') return;
    }

    const altIds = new Set(altDemo ? [] : alt.karten.map((k) => k.id));
    const neuIds = new Set(paket.karten.map((k) => k.id));
    const meldung = {
      art: 'import',
      karten: paket.karten.length,
      level: paket.level.length,
      neu: paket.karten.filter((k) => !altIds.has(k.id)).length,
      entfernt: [...altIds].filter((id) => !neuIds.has(id)).length,
      erstellt: paket.erstellt,
    };
    await speicherePaket(paket, { letzterImport: heute(), paketErstellt: paket.erstellt, meldungNachStart: meldung });
    location.reload();
  }

  async function stelleWiederHer(backup) {
    const fehler = pruefeBackup(backup);
    if (fehler) {
      await zeigeDialog({ titel: 'Backup fehlerhaft', text: [fehler, 'Es wurde nichts verändert.'], knoepfe: OK });
      return;
    }
    const wahl = await zeigeDialog({
      titel: 'Backup wiederherstellen?',
      text: [
        `Backup vom ${deutschesDatum(backup.erstellt)} mit ${anzahl(backup.fortschritt.length, 'Karten-Stand', 'Karten-Ständen')} und ${anzahl(backup.tage.length, 'Lerntag', 'Lerntagen')}.`,
        'Es wird mit dem Stand auf diesem Handy zusammengeführt: Für jede Karte gilt der jeweils neuere Stand. Es geht nichts verloren.',
      ],
      knoepfe: [{ text: 'Abbrechen', wert: 'nein' }, { text: 'Wiederherstellen', wert: 'ja', haupt: true }],
    });
    if (wahl !== 'ja') return;
    const lokal = await ladeAlles();
    const zusammen = zusammenfuehren(lokal, backup);
    await ersetzeFortschritt(zusammen, {
      letztesBackup: lokal.meta.letztesBackup ?? backup.erstellt,
      meldungNachStart: { art: 'wiederherstellung', karten: zusammen.fortschritt.length, erstellt: backup.erstellt },
    });
    location.reload();
  }

  async function sichern() {
    const daten = await ladeAlles();
    const backup = erstelleBackup(daten, heute());
    const ergebnis = await teileOderLadeHerunter(JSON.stringify(backup), `lernfeed-backup-${heute()}`);
    if (ergebnis === 'abgebrochen') return false;
    await setzeMeta({ letztesBackup: heute() });
    beiAenderung({ letztesBackup: heute() });
    if (ergebnis === 'heruntergeladen') {
      await zeigeDialog({
        titel: 'Backup gespeichert',
        text: ['Die Datei liegt in deinen Downloads. Lade sie in deinen Google Drive hoch, damit sie auch bei einem Handywechsel sicher ist.'],
        knoepfe: OK,
      });
    }
    return true;
  }

  /** Rückmeldung nach dem Neuladen (Import oder Wiederherstellung). */
  async function zeigeMeldungNachStart(meldung) {
    await setzeMeta({ meldungNachStart: null });
    if (meldung.art === 'import') {
      const wahl = await zeigeDialog({
        titel: 'Kartenpaket importiert',
        text: [
          `${meldung.karten} Karten in ${meldung.level} Leveln (Paket vom ${deutschesDatum(meldung.erstellt)}).`,
          meldung.neu ? `Davon ${meldung.neu === 1 ? 'ist 1 Karte' : `sind ${meldung.neu} Karten`} neu.` : 'Keine neuen Karten.',
          meldung.entfernt ? `${meldung.entfernt} Karten sind nicht mehr enthalten; ihr Fortschritt bleibt gespeichert.` : null,
          'Dein Fortschritt bleibt erhalten. Jetzt ist ein guter Moment für ein Backup.',
        ],
        knoepfe: [{ text: 'Später', wert: 'nein' }, { text: 'Fortschritt sichern', wert: 'ja', haupt: true }],
      });
      if (wahl === 'ja') await sichern();
    } else if (meldung.art === 'wiederherstellung') {
      await zeigeDialog({
        titel: 'Backup wiederhergestellt',
        text: [`Der Stand aus dem Backup vom ${deutschesDatum(meldung.erstellt)} wurde übernommen. Jetzt sind ${anzahl(meldung.karten, 'Karten-Stand', 'Karten-Stände')} gespeichert.`],
        knoepfe: OK,
      });
    }
  }

  return { dateiWaehlen: () => eingabe.click(), sichern, zeigeMeldungNachStart };
}
