// Übersicht (Menü ☰): Tagesstand, je Modul Prüfungsreife und Prüfungstermin,
// darunter die Level nach Lehrveranstaltungen mit Status.
// Die Zurück-Taste bzw. -Geste des Handys schließt die Übersicht wieder.

import { el } from './hilfen.js';
import { abzeichen } from './grafiken.js';
import { tageZwischen } from './datum.js';
import { deutschesDatum, istDemoPaket } from './datenverwaltung.js';

const ERINNERN_NACH_TAGEN = 7;

/** Welche Erinnerungen gerade anstehen (Backup zu alt, schon länger kein neues Paket). */
export function berechneErinnerungen({ planer, paket, meta }) {
  const heute = planer.heute;
  const lerntage = planer.tage.size;
  const backupFaellig = meta.letztesBackup
    ? tageZwischen(meta.letztesBackup, heute) >= ERINNERN_NACH_TAGEN
    : lerntage >= 2; // noch nie gesichert: ab dem zweiten Lerntag erinnern
  const demo = istDemoPaket(paket);
  const paketFaellig = !demo && Boolean(meta.letzterImport) && tageZwischen(meta.letzterImport, heute) >= ERINNERN_NACH_TAGEN;
  return { backupFaellig, paketFaellig, demo, irgendwas: backupFaellig || paketFaellig };
}

function vorTagen(datum, heute) {
  const n = tageZwischen(datum, heute);
  if (n <= 0) return 'heute';
  if (n === 1) return 'gestern';
  return `vor ${n} Tagen`;
}

function baueDatenbereich({ planer, paket, meta, daten }, erinnerung) {
  const heute = planer.heute;
  const paketText = erinnerung.demo
    ? 'Demo-Paket – noch kein eigenes Kartenpaket importiert.'
    : `Paket vom ${deutschesDatum(paket.erstellt)} · ${paket.karten.length} Karten${meta.letzterImport ? ` · importiert ${vorTagen(meta.letzterImport, heute)}` : ''}`;
  const backupText = meta.letztesBackup ? `Letztes Backup: ${vorTagen(meta.letztesBackup, heute)}` : 'Noch kein Backup erstellt.';

  return el('section', { class: `modul-block daten${erinnerung.irgendwas ? ' mit-erinnerung' : ''}` },
    el('h2', { class: 'modul-titel' }, 'Daten'),
    el('p', { class: 'modul-termin' }, paketText),
    erinnerung.paketFaellig && el('p', { class: 'hinweis-unklar' },
      `Seit ${tageZwischen(meta.letzterImport, heute)} Tagen kein neues Paket – liegt ein neues in deinem Google Drive?`),
    el('div', { class: 'daten-knoepfe' },
      el('button', { class: 'knopf haupt', type: 'button', onclick: daten.dateiWaehlen }, 'Kartenpaket importieren')),
    el('p', { class: 'modul-termin' }, backupText),
    erinnerung.backupFaellig && el('p', { class: 'hinweis-unklar' },
      'Dein Fortschritt liegt nur auf diesem Handy. Sichere ihn jetzt in deinem Google Drive.'),
    el('div', { class: 'daten-knoepfe' },
      el('button', { class: 'knopf mitte', type: 'button', onclick: daten.sichern }, 'Fortschritt sichern'),
      el('button', { class: 'text-knopf', type: 'button', onclick: daten.dateiWaehlen }, 'Backup wiederherstellen')));
}

const PRUEFUNGSFORM = {
  klausur: 'Klausur',
  muendlich: 'Mündliche Prüfung',
  praktisch: 'Praktische Prüfung',
  portfolio: 'Portfolio',
  hausarbeit: 'Hausarbeit',
  lehrprobe: 'Lehrprobe',
  offen: 'Prüfungsform noch offen',
};

const STATUS_KLASSE = { neu: 'neu', 'in Arbeit': 'in-arbeit', geschafft: 'geschafft', auffrischen: 'auffrischen' };

function inTagen(tage) {
  if (tage < 0) return 'vorbei';
  if (tage === 0) return 'heute';
  if (tage === 1) return 'morgen';
  return `in ${tage} Tagen`;
}

function terminText(art, datum, vorlaeufig, heute) {
  if (!datum) return `${art} · Datum noch offen`;
  return `${art} am ${deutschesDatum(datum)}${vorlaeufig ? ' (vorläufig)' : ''} · ${inTagen(tageZwischen(heute, datum))}`;
}

function zahl(label, wert) {
  return el('div', { class: 'kennzahl' }, el('span', { class: 'kennzahl-wert' }, wert), el('span', { class: 'kennzahl-label' }, label));
}

function baueModul(modul, levelListe, { planer, setzeFokus }) {
  const heute = planer.heute;
  const block = el('section', { class: `modul-block${modul.aktiv === false ? ' ruht' : ''}`, 'data-modul': modul.kuerzel });

  block.append(
    el('h2', { class: 'modul-titel' },
      el('span', { class: 'etikett modul' }, modul.kuerzel), ' ', modul.name,
      modul.aktiv === false && el('span', { class: 'status neu' }, 'ruht')),
    el('p', { class: 'modul-termin' },
      terminText(PRUEFUNGSFORM[modul.pruefungsform] ?? 'Prüfung', modul.pruefungsdatum, modul.pruefungsdatum_vorlaeufig, heute)));

  if (!levelListe.length) {
    block.append(el('p', { class: 'leer' }, 'Noch keine Karten.'));
    return block;
  }

  const reife = planer.pruefungsreife(modul.kuerzel);
  block.append(
    el('div', { class: 'reife' },
      el('div', { class: 'reife-zeile' },
        el('span', {}, 'Prüfungsreife'),
        el('strong', {}, `${reife.prozent} %`)),
      el('div', { class: 'balken', role: 'progressbar', 'aria-valuenow': reife.prozent, 'aria-valuemin': 0, 'aria-valuemax': 100 },
        el('span', { style: `width: ${reife.prozent}%` })),
      el('p', { class: 'reife-detail' }, `${reife.sicher} von ${reife.gesamt} Karten sitzen sicher`)));

  // Nur dieses Modul üben – der gemischte Feed bleibt davon unberührt.
  if (modul.aktiv !== false) {
    const imFokus = planer.fokus === modul.kuerzel;
    block.append(el('button', {
      class: `knopf mitte fokus-knopf${imFokus ? '' : ' modul-farbe'}`,
      type: 'button',
      onclick: () => { setzeFokus(imFokus ? null : modul.kuerzel); history.back(); },
    }, imFokus ? 'Zurück zum gemischten Feed' : `Nur ${modul.kuerzel} üben`));
  }

  for (const lv of modul.lehrveranstaltungen) {
    const lvId = `${modul.kuerzel}-${lv.kuerzel}`;
    const level = levelListe.filter((l) => l.lv === lvId).sort((a, b) => a.nr - b.nr);
    if (!level.length) continue;
    block.append(el('h3', { class: 'lv-titel' }, lv.titel));
    if (lv.testat) block.append(el('p', { class: 'modul-termin' }, terminText('Testat', lv.testat, false, heute)));
    block.append(
      el('ul', { class: 'level-liste' }, level.map((l) => {
        const info = planer.levelInfo(l.id);
        const klasse = STATUS_KLASSE[info.status];
        return el('li', { class: 'level-zeile' },
          abzeichen(lvId, klasse, info.gesamt ? info.sicher / info.gesamt : 0),
          el('span', { class: 'level-text' },
            el('span', { class: 'level-name' }, l.titel),
            el('span', { class: 'level-detail' }, `Level ${l.nr} · ${info.gesehen}/${info.gesamt} gesehen · ${info.sicher} sicher`)),
          el('span', { class: `status ${STATUS_KLASSE[info.status]}` }, info.status));
      })));
  }
  return block;
}

function baueInhalt(stand) {
  const { planer, paket } = stand;
  const erinnerung = berechneErinnerungen(stand);
  const datenbereich = baueDatenbereich(stand, erinnerung);
  const neuHeute = Math.min(planer.neueAnzahl(), planer.neueHeuteUebrig());
  const teile = [
    el('div', { class: 'kennzahlen' },
      zahl('Tage Streak', planer.streak()),
      zahl('heute beantwortet', planer.heuteBeantwortet()),
      zahl('noch fällig', planer.faelligAnzahl()),
      zahl('neue heute möglich', neuHeute)),
  ];
  // Steht eine Erinnerung an, kommt der Datenbereich nach oben, sonst ans Ende.
  if (erinnerung.irgendwas || erinnerung.demo) teile.push(datenbereich);
  for (const modul of paket.module) {
    const levelListe = paket.level.filter((l) => l.modul === modul.kuerzel);
    if (modul.aktiv === false && !levelListe.length) continue;
    teile.push(baueModul(modul, levelListe, stand));
  }
  if (!erinnerung.irgendwas && !erinnerung.demo) teile.push(datenbereich);
  teile.push(el('details', { class: 'legende' },
    el('summary', {}, 'Was bedeuten die Angaben?'),
    el('dl', {},
      el('dt', {}, el('span', { class: 'status neu' }, 'neu')), el('dd', {}, 'Noch keine Karte beantwortet.'),
      el('dt', {}, el('span', { class: 'status in-arbeit' }, 'in Arbeit')), el('dd', {}, 'Angefangen, aber noch nicht jede Karte an zwei verschiedenen Tagen richtig.'),
      el('dt', {}, el('span', { class: 'status geschafft' }, 'geschafft')), el('dd', {}, 'Jede Karte an mindestens zwei verschiedenen Tagen richtig.'),
      el('dt', {}, el('span', { class: 'status auffrischen' }, 'auffrischen')), el('dd', {}, 'War geschafft, aber bei mindestens 20 % der Karten war die letzte Antwort falsch.'),
      el('dt', {}, 'sicher'), el('dd', {}, 'Karte mehrmals an verschiedenen Tagen richtig (Box 3 oder höher), zuletzt richtig.'),
      el('dt', {}, 'Prüfungsreife'), el('dd', {}, 'Anteil der Karten eines Moduls, die gerade sicher sitzen.'))));
  return teile;
}

/**
 * @param knopf     Menüknopf in der Kopfleiste
 * @param holeDaten Funktion → { planer, paket, meta, daten } (aktueller Stand beim Öffnen;
 *                  daten = { dateiWaehlen(), sichern() } aus der Datenverwaltung)
 * @returns { aktualisiere() } – baut die Übersicht neu, falls sie gerade offen ist
 */
export function starteUebersicht(knopf, holeDaten) {
  const inhalt = el('div', { class: 'uebersicht-inhalt' });
  const schliessen = el('button', { class: 'icon-knopf', type: 'button', 'aria-label': 'Übersicht schließen' }, '✕');
  const panel = el('div', { class: 'uebersicht', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Übersicht' },
    el('header', { class: 'uebersicht-kopf' }, el('h1', {}, 'Übersicht'), schliessen),
    inhalt);
  panel.inert = true;
  document.body.append(panel);

  let offen = false;

  function oeffne() {
    if (offen) return;
    offen = true;
    inhalt.replaceChildren(...baueInhalt(holeDaten()));
    panel.scrollTop = 0;
    panel.inert = false;
    panel.classList.add('offen');
    document.body.classList.add('overlay-offen');
    history.pushState({ uebersicht: true }, '');
    schliessen.focus({ preventScroll: true });
  }

  function zu() {
    if (!offen) return;
    offen = false;
    panel.classList.remove('offen');
    panel.inert = true;
    document.body.classList.remove('overlay-offen');
    knopf.focus({ preventScroll: true });
  }

  knopf.addEventListener('click', oeffne);
  // Schließen über ✕ oder Escape geht den Verlaufseintrag zurück – wie die Zurück-Taste.
  // (Ist gerade ein Dialog offen, schließt Escape nur den Dialog.)
  schliessen.addEventListener('click', () => history.back());
  document.addEventListener('keydown', (e) => {
    if (offen && e.key === 'Escape' && !document.querySelector('dialog[open]')) history.back();
  });
  window.addEventListener('popstate', zu);

  return {
    aktualisiere() {
      if (offen) inhalt.replaceChildren(...baueInhalt(holeDaten()));
    },
  };
}
