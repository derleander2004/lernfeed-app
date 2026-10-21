// Selbst gezeichnete Symbole je Lehrveranstaltung (SVG, Raster 120 × 120).
// Sie enthalten keine Kursinhalte und dürfen deshalb in die öffentliche App.
//
// Farben kommen aus style.css, damit Hell- und Dunkelmodus automatisch passen:
//   currentColor          = Modulfarbe kräftig (Umrisse, Hauptformen)
//   var(--modul-mittel)   = Nebenteile
//   var(--modul-soft)     = zarte Flächen (Hintergrundkreis)
//   var(--flaeche)        = Kartenfarbe (Lichter, Lücken)
// Entwürfe und Vorschau: entwurf/grafiken/.

import { el } from './hilfen.js';

const MITTEL = 'var(--modul-mittel)';
const SOFT = 'var(--modul-soft)';
const FLAECHE = 'var(--flaeche)';
const KREIS = `<circle cx="60" cy="60" r="52" style="fill:${SOFT}"/>`;

/** Ball mit Nähten (für Pädagogik-Motive). */
const ball = (x, y, r, farbe) => `
  <circle cx="${x}" cy="${y}" r="${r}" style="fill:${farbe}"/>
  <path d="M${x - r} ${y}h${2 * r}M${x} ${y - r}q${-r * 0.6} ${r} 0 ${2 * r}" fill="none" style="stroke:${FLAECHE}" stroke-width="2"/>`;

/** Brustbild einer Person: Kopf und Schultern. */
const person = (x, y) => `
  <circle cx="${x}" cy="${y}" r="8.5"/>
  <path d="M${x - 14} ${y + 25}a14 13 0 0 1 28 0Z"/>`;

const SYMBOLE = {
  // Zelle mit Zellkern, Mitochondrium, endoplasmatischem Retikulum und Golgi-Apparat
  'B1-ANA': `
    <path d="M60 18C86 16 106 34 106 58C106 84 88 104 60 104C32 104 14 86 14 60C14 34 34 20 60 18Z" style="fill:${SOFT}" stroke="currentColor" stroke-width="4"/>
    <path d="M30 34C36 27 44 24 52 23" fill="none" style="stroke:${FLAECHE}" stroke-width="3" stroke-linecap="round" opacity=".7"/>
    <g fill="none" style="stroke:${MITTEL}" stroke-width="3" stroke-linecap="round">
      <path d="M74 36C82 42 85 52 82 62M80 30C90 37 94 50 90 63"/>
      <path d="M30 80q8-5 16 0M32 87q6-4 12 0M34 94q4-3 8 0"/>
    </g>
    <circle cx="50" cy="56" r="18" style="fill:${MITTEL}"/>
    <circle cx="45" cy="51" r="6" fill="currentColor"/>
    <g transform="translate(78 80) rotate(-25)">
      <ellipse rx="15" ry="8" fill="currentColor"/>
      <path d="M-10 0l4-4 4 8 4-8 4 8 4-4" fill="none" style="stroke:${FLAECHE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    </g>
    <circle cx="36" cy="38" r="4" style="fill:${MITTEL}"/>
    <circle cx="58" cy="95" r="3.5" style="fill:${MITTEL}"/>
    <circle cx="64" cy="29" r="2.5" fill="currentColor"/>`,

  // Läufer mit Bewegungsstrichen
  'B1-BSB': `
    ${KREIS}
    <path d="M16 36h16M10 50h20M14 64h12M34 104h52" fill="none" style="stroke:${MITTEL}" stroke-width="5" stroke-linecap="round"/>
    <path d="M66 39L56 66M66 41L78 52L89 45M66 41L54 51L46 61M56 66L74 68L70 86L77 88M56 66L47 82L32 77L30 84" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="72" cy="25" r="9.5" fill="currentColor"/>`,

  // Erwachsene Person legt einem Kind mit Ball die Hand auf die Schulter
  'B2-PAED-VL': `
    ${KREIS}
    <path d="M32 102h56" fill="none" style="stroke:${MITTEL}" stroke-width="5" stroke-linecap="round"/>
    <g fill="none" stroke="currentColor" stroke-linecap="round">
      <path d="M46 46V68" stroke-width="14"/>
      <path d="M42 72L40 97M50 72L52 97" stroke-width="8"/>
      <path d="M40 50L35 70M52 50L70 60" stroke-width="7"/>
      <path d="M78 66V80" stroke-width="11"/>
      <path d="M75.5 83L74.5 97M80.5 83L81.5 97" stroke-width="6.5"/>
      <path d="M83 68L91 75" stroke-width="5.5"/>
    </g>
    <circle cx="46" cy="28" r="9.5" fill="currentColor"/>
    <circle cx="78" cy="53" r="7" fill="currentColor"/>
    ${ball(96, 80, 8.5, MITTEL)}`,

  // Zwei Sprechblasen: eine mit Ball, eine mit „…“ – Austausch im Seminar
  'B2-PAED-SE': `
    <path d="M28 22H58A14 14 0 0 1 72 36V48A14 14 0 0 1 58 62H36L24 74L28 62A14 14 0 0 1 14 48V36A14 14 0 0 1 28 22Z" style="fill:${SOFT}" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>
    ${ball(39, 41, 10, 'currentColor')}
    <path d="M55 36h9M55 45h6" fill="none" style="stroke:${MITTEL}" stroke-width="4" stroke-linecap="round"/>
    <path d="M62 54H92A14 14 0 0 1 106 68V76A14 14 0 0 1 92 90L96 102L84 90H62A14 14 0 0 1 48 76V68A14 14 0 0 1 62 54Z" fill="currentColor" style="stroke:${FLAECHE}" stroke-width="4" stroke-linejoin="round"/>
    <g style="fill:${FLAECHE}"><circle cx="66" cy="72" r="4"/><circle cx="77" cy="72" r="4"/><circle cx="88" cy="72" r="4"/></g>`,

  // Drei verbundene Personen – Gruppe, Gesellschaft
  'B2-SOZ': `
    ${KREIS}
    <path d="M60 42L32 80M60 42L88 80M32 80H88" fill="none" style="stroke:${MITTEL}" stroke-width="4" stroke-linecap="round"/>
    <g fill="currentColor" style="stroke:${FLAECHE}" stroke-width="5" paint-order="stroke">
      ${person(60, 24)}${person(32, 62)}${person(88, 62)}
    </g>`,

  // Klemmbrett mit Spielfeld, Spielern (O, X) und Laufweg – Unterricht planen
  'B3-FD-VL': `
    <rect x="26" y="16" width="68" height="94" rx="10" style="fill:${MITTEL}"/>
    <rect x="33" y="28" width="54" height="74" rx="4" style="fill:${SOFT}"/>
    <rect x="45" y="10" width="30" height="14" rx="5" fill="currentColor"/>
    <circle cx="60" cy="15" r="3" style="fill:${SOFT}"/>
    <g fill="none" stroke-linecap="round">
      <path d="M33 65h54" style="stroke:${MITTEL}" stroke-width="2"/>
      <circle cx="60" cy="65" r="7" style="stroke:${MITTEL}" stroke-width="2"/>
      <g stroke="currentColor" stroke-width="3">
        <circle cx="44" cy="46" r="5"/><circle cx="77" cy="88" r="5"/>
        <path d="M71 40l8 8M79 40l-8 8M41 82l8 8M49 82l-8 8"/>
        <path d="M46 52Q52 72 63.5 75.7" stroke-dasharray="4 3.5"/>
      </g>
    </g>
    <path d="M69.2 77.5L62.4 79L64.6 72.4Z" fill="currentColor"/>`,

  // Pfeife und Hütchen – Unterrichten in der Halle
  'B3-FD-SE': `
    ${KREIS}
    <path d="M62 92L72 50Q76 43 80 50L90 92Z" fill="currentColor"/>
    <path d="M69.1 62H82.9L84.3 68H67.7ZM65.8 76H86.2L87.4 81H64.6Z" style="fill:${FLAECHE}"/>
    <rect x="54" y="88" width="44" height="8" rx="3" fill="currentColor"/>
    <g fill="none" style="stroke:${MITTEL}" stroke-width="3" stroke-linecap="round">
      <path d="M21 48Q14 30 30 20"/>
      <circle cx="24" cy="52" r="5"/>
    </g>
    <path d="M40 50H62A4 4 0 0 1 66 54V58A4 4 0 0 1 62 62H46Z" style="fill:${MITTEL}"/>
    <circle cx="40" cy="68" r="17" style="fill:${MITTEL}"/>
    <rect x="44" y="52" width="9" height="4" rx="1.5" fill="currentColor"/>
    <path d="M30 62a11 11 0 0 1 8-6" fill="none" style="stroke:${FLAECHE}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,

  // Hürde, Kugel und Speer – Laufen, Springen, Werfen
  'DMS1-LSW': `
    ${KREIS}
    <path d="M22 44L88 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 35.5L60 32.5" fill="none" style="stroke:${MITTEL}" stroke-width="7" stroke-linecap="round"/>
    <path d="M96.6 21.4L88.9 26.9L87.1 21.1Z" fill="currentColor"/>
    <path d="M34 62V97M78 62V97M28 98h12M72 98h12" fill="none" style="stroke:${MITTEL}" stroke-width="5" stroke-linecap="round"/>
    <rect x="28" y="52" width="56" height="11" rx="2.5" fill="currentColor"/>
    <g style="fill:${FLAECHE}"><rect x="36" y="52" width="8" height="11"/><rect x="52" y="52" width="8" height="11"/><rect x="68" y="52" width="8" height="11"/></g>
    <circle cx="95" cy="84" r="10" fill="currentColor"/>
    <path d="M89 79a7 7 0 0 1 6-3" fill="none" style="stroke:${FLAECHE}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`,
};

// Für Lehrveranstaltungen ohne eigenes Motiv: zwei Lernkarten mit Fragezeichen
const ERSATZ = `
  ${KREIS}
  <rect x="30" y="30" width="52" height="64" rx="9" style="fill:${MITTEL}" transform="rotate(-10 56 62)"/>
  <g transform="rotate(6 66 60)">
    <rect x="40" y="28" width="52" height="64" rx="9" fill="currentColor"/>
    <path d="M58 50a8 8 0 1 1 11 7.5c-2.5 1-3 2.5-3 5.5" fill="none" style="stroke:${FLAECHE}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="66" cy="73" r="3" style="fill:${FLAECHE}"/>
  </g>`;

const svg = (inhalt) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${inhalt}</svg>`;

/** Symbol-Inhalt (ohne <svg>) für eine Lehrveranstaltung, z. B. "B1-ANA". */
export function symbolInhalt(lv) {
  return SYMBOLE[lv] ?? ERSATZ;
}

/** Alle Lehrveranstaltungen mit eigenem Motiv (für Tests und Vorschau). */
export const LV_MIT_SYMBOL = Object.keys(SYMBOLE);

/** Bild für die Karte. Es nimmt nur den freien Platz zwischen Frage und Antworten ein (siehe .grafik in style.css). */
export function grafik(lv) {
  const g = el('div', { class: 'grafik', 'aria-hidden': 'true' });
  g.innerHTML = svg(symbolInhalt(lv));
  return g;
}

/**
 * Level-Abzeichen: Medaille mit dem Symbol der Lehrveranstaltung.
 * Der Status (CSS-Klasse neu | in-arbeit | geschafft | auffrischen) steuert nur Farben und Zusatzteile.
 * @param anteil 0–1, Fortschrittsring bei "in Arbeit"
 */
export function abzeichen(lv, status, anteil = 0) {
  const ring = Math.round(Math.min(1, Math.max(0, anteil)) * 100);
  const a = el('span', { class: `abzeichen ${status}`, 'aria-hidden': 'true' });
  a.innerHTML = svg(`
    <g class="band" style="fill:${MITTEL}">
      <path d="M40 88L30 116L41 111L47 119L56 96Z"/>
      <path d="M80 88L90 116L79 111L73 119L64 96Z"/>
    </g>
    <circle cx="60" cy="58" r="48" style="fill:${MITTEL}"/>
    <circle cx="60" cy="58" r="42" style="fill:${FLAECHE}"/>
    <circle class="fortschritt" cx="60" cy="58" r="48" fill="none" stroke-width="7" stroke-linecap="round" pathLength="100" style="stroke-dasharray:${Math.max(ring, 3)} 100" transform="rotate(-90 60 58)"/>
    <g transform="translate(60 58) scale(.68) translate(-60 -60)">${symbolInhalt(lv)}</g>
    <g class="marke ok">
      <circle cx="97" cy="21" r="14" style="fill:var(--ok);stroke:${FLAECHE}" stroke-width="3"/>
      <path d="M90.5 21l4.5 4.5 8-8" fill="none" style="stroke:${FLAECHE}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <g class="marke warn">
      <circle cx="97" cy="21" r="14" style="fill:var(--warn);stroke:${FLAECHE}" stroke-width="3"/>
      <path d="M103 21A6 6 0 1 1 97 15" fill="none" style="stroke:${FLAECHE}" stroke-width="3" stroke-linecap="round"/>
      <path d="M102 15L96.5 11V19Z" style="fill:${FLAECHE}"/>
    </g>`);
  return a;
}
