// Lernlogik: Leitner-Boxen, Reihenfolge im Feed, Level-Status, Prüfungsreife, Streak.
// Die Regeln sind in docs/lernlogik.md erklärt. Diese Datei greift weder auf den Speicher
// noch auf die Oberfläche zu – dadurch lässt sie sich in app/tests/ einzeln prüfen.

import { plusTage, tageZwischen } from './datum.js';

export const INTERVALLE = [1, 2, 4, 8, 16]; // Tage bis zur nächsten Wiederholung für Box 1–5
export const NEU_PRO_TAG = 40;              // weiche Obergrenze für neue Karten pro Tag
export const NOCHMAL_NACH = 5;              // falsch beantwortet → kommt nach so vielen Karten nochmal
export const NOCHMAL_HOECHSTENS = 2;        // … aber höchstens so oft pro Tag (danach wieder morgen)
export const STREAK_MINIMUM = 10;           // so viele Antworten braucht ein Tag für die Streak
export const AUFFRISCHEN_ANTEIL = 0.2;      // ab diesem Anteil falscher Karten: "auffrischen"
export const SICHER_AB_BOX = 3;             // ab dieser Box gilt eine Karte als sicher (Prüfungsreife)
export const WIEDERHOLUNG_ANTEIL = 2 / 3;   // gibt es beides, kommen etwa 2 Wiederholungen auf 1 neue Karte
export const GLEICHES_MODUL_HOECHSTENS = 2; // so oft darf dasselbe Modul direkt hintereinander kommen
const GEWICHT = { hoch: 3, mittel: 2, niedrig: 1 };

/** Der nächste noch kommende Termin (nach heute) aus einer Liste von Daten – oder null. */
export function naechsterTermin(termine, heute) {
  return termine.filter((d) => d && d > heute).sort()[0] ?? null;
}

/**
 * Leitner-Schritt für die erste Antwort des Tages auf eine Karte.
 * richtig → eine Box weiter; falsch → zurück in Box 1.
 * Der Abstand ist höchstens halb so lang wie die Zeit bis zum nächsten Termin.
 */
export function leitnerSchritt(alt, richtig, heute, termin) {
  const e = alt
    ? { ...alt, richtigeTage: [...alt.richtigeTage] }
    : { box: 0, faellig: null, richtigeTage: [], richtig: 0, falsch: 0, letzte: null };

  if (richtig) {
    e.box = Math.min(INTERVALLE.length, e.box + 1);
    e.richtig += 1;
    if (!e.richtigeTage.includes(heute)) e.richtigeTage.push(heute);
  } else {
    e.box = 1;
    e.falsch += 1;
  }

  let abstand = INTERVALLE[e.box - 1];
  if (termin) abstand = Math.min(abstand, Math.max(1, Math.floor(tageZwischen(heute, termin) / 2)));
  e.faellig = plusTage(heute, abstand);
  e.letzte = { datum: heute, richtig };
  return e;
}

export class Planer {
  /**
   * @param paket       das Kartenpaket (module, level, karten)
   * @param fortschritt Liste gespeicherter Karteneinträge
   * @param tage        Liste gespeicherter Tageseinträge
   * @param heuteFn     Funktion, die das heutige Datum liefert (für Tests austauschbar)
   * @param zufall      Zufallszahl zwischen 0 und 1 (für Tests austauschbar)
   */
  constructor(paket, fortschritt, tage, heuteFn, zufall = Math.random) {
    this.heuteFn = heuteFn;
    this.zufall = zufall;
    this.heute = heuteFn();
    this.karten = paket.karten;
    this.module = new Map(paket.module.map((m) => [m.kuerzel, m]));
    this.level = new Map(paket.level.map((l) => [l.id, l]));
    this.testat = new Map();
    for (const m of paket.module) {
      for (const lv of m.lehrveranstaltungen) this.testat.set(`${m.kuerzel}-${lv.kuerzel}`, lv.testat ?? null);
    }
    this.fortschritt = new Map(fortschritt.map((f) => [f.id, f]));
    this.tage = new Map(tage.map((t) => [t.datum, t]));

    // Karten je Level in Paket-Reihenfolge; Level nach Datum, dann LV, dann Nummer
    this.kartenJeLevel = new Map();
    for (const k of this.karten) {
      if (!this.kartenJeLevel.has(k.level)) this.kartenJeLevel.set(k.level, []);
      this.kartenJeLevel.get(k.level).push(k);
    }
    this.levelReihenfolge = [...this.level.values()].sort((a, b) =>
      (a.datum ?? '9999').localeCompare(b.datum ?? '9999') || a.lv.localeCompare(b.lv) || a.nr - b.nr);

    // Zustand dieser Sitzung (wird nicht gespeichert)
    this.reserviert = new Set();   // Karten, die gerade angezeigt werden oder vorbereitet sind
    this.herkunft = new Map();     // Karten-ID → "Wiederholung" | "Neu" | "Nochmal" | "Freies Üben"
    this.nochmal = [];             // { id, ab } – falsch beantwortete Karten für später in der Sitzung
    this.nochmalZaehler = new Map(); // "Datum|Karten-ID" → wie oft heute schon nochmal gezeigt
    this.gezaehlt = 0;             // in dieser Sitzung beantwortete Karten
    this.zuletztModule = [];       // Module der zuletzt gezogenen Karten (neueste vorn)
    this.freiesUeben = false;
    this.zuletztFrei = [];
    this.fokus = null;             // Modulkürzel, wenn nur ein Modul geübt wird – sonst null
  }

  // ---------- Hilfen ----------

  aktualisiereHeute() {
    this.heute = this.heuteFn();
  }

  istAktiv(karte) {
    return this.module.get(karte.modul)?.aktiv !== false;
  }

  /** Darf die Karte gerade im Feed kommen? (aktives Modul und – im Fokus – das gewählte Modul) */
  imFeed(karte) {
    return this.istAktiv(karte) && (!this.fokus || karte.modul === this.fokus);
  }

  /**
   * Fokus auf ein Modul setzen (oder mit null aufheben). Es gilt dieselbe Lernlogik, nur auf
   * dieses Modul beschränkt; Antworten zählen ganz normal. Freies Üben beginnt wieder von vorn.
   */
  setzeFokus(modul) {
    this.fokus = modul;
    this.freiesUeben = false;
    this.zuletztModule = [];
    this.zuletztFrei = [];
  }

  /** Gibt eine vorbereitete, noch nicht beantwortete Karte wieder frei (z. B. beim Wechsel des Fokus). */
  freigeben(karte) {
    if (!this.reserviert.delete(karte.id)) return;
    if (this.herkunft.get(karte.id) === 'Nochmal') this.nochmal.unshift({ id: karte.id, ab: this.gezaehlt });
    this.herkunft.delete(karte.id);
  }

  termin(karte) {
    return naechsterTermin([this.testat.get(karte.lv), this.module.get(karte.modul)?.pruefungsdatum], this.heute);
  }

  tag(datum = this.heute) {
    return this.tage.get(datum) ?? { datum, beantwortet: 0, richtig: 0, neu: 0 };
  }

  reserviere(karte, art) {
    this.reserviert.add(karte.id);
    this.herkunft.set(karte.id, art);
    this.zuletztModule = [karte.modul, ...this.zuletztModule].slice(0, GLEICHES_MODUL_HOECHSTENS);
    return karte;
  }

  /** Zufälliges Element einer Liste. */
  zufaellig(liste) {
    return liste[Math.floor(this.zufall() * liste.length)];
  }

  /** Modul, das gerade zu oft hintereinander kam – oder null. */
  gesperrtesModul() {
    const z = this.zuletztModule;
    return z.length >= GLEICHES_MODUL_HOECHSTENS && z.every((m) => m === z[0]) ? z[0] : null;
  }

  /**
   * Wählt per Zufall ein Modul aus, gewichtet nach Priorität (hoch : mittel : niedrig = 3 : 2 : 1).
   * Ein Modul, das gerade zu oft hintereinander kam, ist ausgenommen, solange es Alternativen gibt.
   */
  waehleModul(kuerzel) {
    const gesperrt = this.gesperrtesModul();
    const auswahl = kuerzel.some((m) => m !== gesperrt) ? kuerzel.filter((m) => m !== gesperrt) : kuerzel;
    const gewichte = auswahl.map((m) => GEWICHT[this.module.get(m)?.prioritaet] ?? 2);
    let rest = this.zufall() * gewichte.reduce((s, g) => s + g, 0);
    let i = 0;
    while (rest >= gewichte[i] && i < gewichte.length - 1) rest -= gewichte[i++];
    return auswahl[i];
  }

  // ---------- Reihenfolge ----------

  /** Die nächste Karte für den Feed – oder null, wenn alles erledigt ist. */
  naechste() {
    this.aktualisiereHeute();
    // Gibt es Wiederholungen und neue Karten, wird gemischt: meist eine Wiederholung, manchmal neu.
    const zuerstWiederholung = this.zufall() < WIEDERHOLUNG_ANTEIL;
    return this.ausNochmal(true)
      ?? (zuerstWiederholung ? this.faelligeKarte() ?? this.neueKarte() : this.neueKarte() ?? this.faelligeKarte())
      ?? this.ausNochmal(false)
      ?? (this.freiesUeben ? this.freieKarte() : null);
  }

  /** Falsch beantwortete Karte erneut zeigen – nach NOCHMAL_NACH Karten oder wenn sonst nichts mehr da ist. */
  ausNochmal(nurWennDran) {
    // Im Fokus bleiben Karten anderer Module in der Warteschlange, bis der Fokus endet.
    const i = this.nochmal.findIndex((n) => (!nurWennDran || n.ab <= this.gezaehlt) && !this.reserviert.has(n.id)
      && (!this.fokus || n.id.startsWith(`${this.fokus}-`)));
    if (i < 0) return null;
    const [n] = this.nochmal.splice(i, 1);
    const karte = this.karten.find((k) => k.id === n.id);
    return karte ? this.reserviere(karte, 'Nochmal') : null;
  }

  /**
   * Eine fällige Wiederholung in zufälliger Reihenfolge, Module gemischt.
   * Nur nach einer Pause gehen überfällige Karten (fällig vor heute) den heute fälligen vor.
   */
  faelligeKarte() {
    let kandidaten = this.karten.filter((k) => {
      const f = this.fortschritt.get(k.id);
      return f && f.faellig <= this.heute && f.letzte?.datum !== this.heute
        && !this.reserviert.has(k.id) && this.imFeed(k);
    });
    if (!kandidaten.length) return null;
    const ueberfaellig = kandidaten.filter((k) => this.fortschritt.get(k.id).faellig < this.heute);
    if (ueberfaellig.length) kandidaten = ueberfaellig;
    const modul = this.waehleModul([...new Set(kandidaten.map((k) => k.modul))]);
    return this.reserviere(this.zufaellig(kandidaten.filter((k) => k.modul === modul)), 'Wiederholung');
  }

  neueHeute() {
    let n = this.tag().neu;
    for (const id of this.reserviert) if (!this.fortschritt.has(id)) n += 1;
    return n;
  }

  /**
   * Noch nie gesehene Karten aus dem aktuellen Level jeder Lehrveranstaltung:
   * Map LV-ID → Karten. Die Level einer LV kommen nacheinander dran, die Karten darin gemischt.
   */
  neueJeLv() {
    const jeLv = new Map();
    for (const level of this.levelReihenfolge) {
      if (jeLv.has(level.lv) || this.module.get(level.modul)?.aktiv === false) continue;
      if (this.fokus && level.modul !== this.fokus) continue;
      const offen = (this.kartenJeLevel.get(level.id) ?? [])
        .filter((k) => !this.fortschritt.has(k.id) && !this.reserviert.has(k.id));
      if (offen.length) jeLv.set(level.lv, offen);
    }
    return jeLv;
  }

  /** Neue Karte: Modul per Zufall nach Priorität, dann Lehrveranstaltung und Karte per Zufall. */
  neueKarte() {
    if (this.neueHeute() >= NEU_PRO_TAG) return null;
    const jeLv = this.neueJeLv();
    if (!jeLv.size) return null;
    const listen = [...jeLv.values()];
    const modul = this.waehleModul([...new Set(listen.map((l) => l[0].modul))]);
    const lv = this.zufaellig(listen.filter((l) => l[0].modul === modul));
    return this.reserviere(this.zufaellig(lv), 'Neu');
  }

  /** Freies Üben: bereits gesehene Karten, häufig falsch beantwortete deutlich öfter. */
  freieKarte() {
    const kandidaten = this.karten.filter((k) =>
      this.fortschritt.has(k.id) && !this.reserviert.has(k.id) && !this.zuletztFrei.includes(k.id) && this.imFeed(k));
    if (!kandidaten.length) return null;
    const gewichte = kandidaten.map((k) => {
      const f = this.fortschritt.get(k.id);
      return 1 + 2 * f.falsch + (f.letzte?.richtig === false ? 2 : 0);
    });
    let zufall = Math.random() * gewichte.reduce((s, g) => s + g, 0);
    let i = 0;
    while (zufall >= gewichte[i] && i < gewichte.length - 1) zufall -= gewichte[i++];
    const karte = kandidaten[i];
    this.zuletztFrei = [karte.id, ...this.zuletztFrei].slice(0, Math.min(5, Math.floor(kandidaten.length / 2)));
    return this.reserviere(karte, 'Freies Üben');
  }

  /** Warum nichts mehr kommt: "limit" (Tageslimit neuer Karten erreicht) oder "leer". */
  grundFuerEnde() {
    return this.neueJeLv().size ? 'limit' : 'leer';
  }

  // ---------- Antworten ----------

  /**
   * Verarbeitet eine Antwort. Gibt zurück, was gespeichert werden muss.
   * Nur die erste Antwort des Tages zählt für Leitner und Level; Wiederholungen in derselben
   * Sitzung ("Nochmal") und Freies Üben dienen dem Üben und zählen nur für die Streak.
   */
  beantwortet(karte, richtig) {
    this.aktualisiereHeute();
    const art = this.herkunft.get(karte.id);
    this.reserviert.delete(karte.id);
    this.herkunft.delete(karte.id);
    this.gezaehlt += 1;

    const tag = { ...this.tag() };
    tag.beantwortet += 1;
    if (richtig) tag.richtig += 1;

    let eintrag = null;
    const alt = this.fortschritt.get(karte.id);
    if (art !== 'Freies Üben' && alt?.letzte?.datum !== this.heute) {
      if (!alt) tag.neu += 1;
      eintrag = { id: karte.id, ...leitnerSchritt(alt, richtig, this.heute, this.termin(karte)) };
      this.fortschritt.set(karte.id, eintrag);
    }
    if (!richtig && art !== 'Freies Üben') {
      const schluessel = `${this.heute}|${karte.id}`;
      const schonNochmal = this.nochmalZaehler.get(schluessel) ?? 0;
      if (schonNochmal < NOCHMAL_HOECHSTENS) {
        this.nochmalZaehler.set(schluessel, schonNochmal + 1);
        this.nochmal.push({ id: karte.id, ab: this.gezaehlt + NOCHMAL_NACH });
      }
    }

    this.tage.set(tag.datum, tag);
    return { fortschritt: eintrag, tag };
  }

  // ---------- Auswertungen ----------

  heuteBeantwortet() {
    return this.tag().beantwortet;
  }

  /** Tage in Folge mit mindestens STREAK_MINIMUM Antworten. Heute zählt mit, sobald es geschafft ist. */
  streak() {
    let d = this.heute;
    if (this.tag(d).beantwortet < STREAK_MINIMUM) d = plusTage(d, -1);
    let n = 0;
    while (this.tag(d).beantwortet >= STREAK_MINIMUM) {
      n += 1;
      d = plusTage(d, -1);
    }
    return n;
  }

  /** "neu" | "in Arbeit" | "geschafft" | "auffrischen" */
  levelStatus(levelId) {
    const karten = this.kartenJeLevel.get(levelId) ?? [];
    const eintraege = karten.map((k) => this.fortschritt.get(k.id));
    if (eintraege.every((e) => !e)) return 'neu';
    if (!eintraege.every((e) => e && e.richtigeTage.length >= 2)) return 'in Arbeit';
    const falsch = eintraege.filter((e) => e.letzte && !e.letzte.richtig).length;
    return falsch >= Math.ceil(karten.length * AUFFRISCHEN_ANTEIL) ? 'auffrischen' : 'geschafft';
  }

  /** Status und Zahlen eines Levels für die Übersicht. */
  levelInfo(levelId) {
    const karten = this.kartenJeLevel.get(levelId) ?? [];
    let gesehen = 0;
    let sicher = 0;
    for (const k of karten) {
      const f = this.fortschritt.get(k.id);
      if (!f) continue;
      gesehen += 1;
      if (f.box >= SICHER_AB_BOX && f.letzte?.richtig) sicher += 1;
    }
    return { status: this.levelStatus(levelId), gesamt: karten.length, gesehen, sicher };
  }

  /** Wie viele Karten heute noch als Wiederholung fällig sind. */
  faelligAnzahl() {
    return this.karten.filter((k) => {
      const f = this.fortschritt.get(k.id);
      return f && f.faellig <= this.heute && f.letzte?.datum !== this.heute && this.istAktiv(k);
    }).length;
  }

  /** Wie viele Karten noch nie gezeigt wurden (in aktiven Modulen). */
  neueAnzahl() {
    return this.karten.filter((k) => !this.fortschritt.has(k.id) && this.istAktiv(k)).length;
  }

  /** Wie viele neue Karten heute noch erlaubt sind. */
  neueHeuteUebrig() {
    return Math.max(0, NEU_PRO_TAG - this.tag().neu);
  }

  /** Anteil der Karten eines Moduls, die aktuell sicher sitzen. */
  pruefungsreife(modul) {
    const karten = this.karten.filter((k) => k.modul === modul);
    const sicher = karten.filter((k) => {
      const f = this.fortschritt.get(k.id);
      return f && f.box >= SICHER_AB_BOX && f.letzte?.richtig;
    }).length;
    return { sicher, gesamt: karten.length, prozent: karten.length ? Math.round((100 * sicher) / karten.length) : 0 };
  }
}
