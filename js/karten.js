// Baut die Ansicht einer einzelnen Karte – je nach Kartentyp.
// Jede Karte meldet genau einmal "beiAntwort(richtig)" und zeigt danach Feedback und "Weiter".

import { el, mische } from './hilfen.js';
import { grafik } from './grafiken.js';

const RF_SCHWELLE = 90; // so weit (px) muss man eine Richtig/Falsch-Karte zur Seite wischen

/**
 * @param karte    Karte aus dem Paket
 * @param kontext  { modul, levelNr, levelTitel } für die Etiketten oben
 * @param aktionen { beiAntwort(richtig), beiWeiter() }
 * @returns ansicht { el, ziehen?(dx), loslassen?(dx) } – ziehen/loslassen nur bei Richtig/Falsch
 */
export function baueKarte(karte, kontext, { beiAntwort, beiWeiter }) {
  const inhalt = el('div', { class: 'karte-inhalt' });
  const unten = el('div', { class: 'karte-aktionen' });
  const kartenEl = el('article', { class: 'karte', 'data-typ': karte.typ, 'data-modul': kontext.modul },
    el('div', { class: 'karte-kopf' },
      el('span', { class: 'etikett modul' }, kontext.modul),
      kontext.levelTitel && el('span', { class: 'etikett' }, `Level ${kontext.levelNr} · ${kontext.levelTitel}`),
      kontext.art && el('span', { class: `etikett art ${kontext.art === 'Neu' ? 'neu' : ''}` }, kontext.art)),
    inhalt,
    unten);

  const ansicht = { el: kartenEl, beantwortet: false };

  function abschliessen(richtig, zusatz = {}) {
    if (ansicht.beantwortet) return;
    ansicht.beantwortet = true;
    const fb = feedback(karte, richtig, zusatz);
    inhalt.append(fb);
    unten.replaceChildren(
      el('button', { class: 'knopf haupt', type: 'button', onclick: beiWeiter }, 'Weiter'),
      el('p', { class: 'weiter-hinweis' }, 'oder nach oben wischen ↑'));
    // Nur den Karteninhalt scrollen – scrollIntoView würde auch den Feed verschieben.
    requestAnimationFrame(() => inhalt.scrollTo({ top: inhalt.scrollHeight, behavior: 'smooth' }));
    beiAntwort(richtig);
  }

  BAUER[karte.typ](karte, inhalt, abschliessen, ansicht);
  // Symbolbild der Lehrveranstaltung in den freien Raum über den Antworten
  inhalt.insertBefore(grafik(karte.lv), inhalt.querySelector('.antwortbereich'));
  return ansicht;
}

/**
 * Abschlusskarte, wenn nichts mehr fällig ist und keine neuen Karten anstehen.
 * @param info { grund: "limit" | "leer", heute: Anzahl beantworteter Karten heute }
 */
export function baueEndeKarte(info, { beiFreiesUeben, beiFokusEnde }) {
  const titelEl = el('h2', { class: 'frage' });
  const grundEl = el('p', { class: 'anleitung' });
  const heuteEl = el('p', { class: 'anleitung' });
  const freiHinweisEl = el('p', { class: 'weiter-hinweis' });
  const fokusKnopf = knopf('Zurück zum gemischten Feed', 'mitte', beiFokusEnde);
  const kartenEl = el('article', { class: 'karte ende' },
    el('div', { class: 'karte-inhalt' },
      el('p', { class: 'ende-symbol', 'aria-hidden': 'true' }, '🎉'),
      titelEl,
      grundEl,
      heuteEl,
      el('div', { class: 'antwortbereich' },
        knopf('Freies Üben', 'haupt', beiFreiesUeben),
        freiHinweisEl,
        fokusKnopf)));

  function aktualisiere({ grund, heute, fokus }) {
    titelEl.textContent = fokus ? `${fokus} erledigt` : 'Alles erledigt';
    const wo = fokus ? ` in ${fokus}` : '';
    grundEl.textContent = grund === 'limit'
      ? `Alle Wiederholungen${wo} sind erledigt, und das Tageslimit für neue Karten ist erreicht.`
      : `Alle Wiederholungen${wo} sind erledigt, und es gibt gerade keine neuen Karten.`;
    heuteEl.textContent = `Heute beantwortet: ${heute} ${heute === 1 ? 'Karte' : 'Karten'}.`;
    freiHinweisEl.textContent = fokus
      ? `nur ${fokus}, mit Schwerpunkt auf Karten, die du oft falsch hattest`
      : 'mit Schwerpunkt auf Karten, die du oft falsch hattest';
    fokusKnopf.hidden = !fokus;
  }
  aktualisiere(info);
  return { el: kartenEl, beantwortet: false, istEnde: true, aktualisiere };
}

/** Feedback-Kasten: richtig/falsch, Erklärung, ggf. Unklar-Hinweis, Quelle. */
function feedback(karte, richtig, { titel, text }) {
  return el('div', { class: `feedback ${richtig ? 'ok' : 'nicht-ok'}`, role: 'status' },
    el('p', { class: 'feedback-titel' }, `${richtig ? '✓' : '✗'} ${titel ?? (richtig ? 'Richtig' : 'Falsch')}`),
    text && el('p', {}, text),
    el('p', {}, karte.erklaerung),
    karte.unklar && el('p', { class: 'hinweis-unklar' }, `⚠ Im Material unklar: ${karte.unklar}`),
    el('p', { class: 'quelle' }, `Quelle: ${karte.quelle.datei} · ${karte.quelle.stelle}`));
}

function knopf(text, klasse, onclick) {
  return el('button', { class: `knopf ${klasse}`, type: 'button', onclick }, text);
}

/** Zwei Knöpfe zur Selbstbewertung bei Karteikarte und Erklärkarte. */
function selbstbewertung(abschliessen) {
  const nein = knopf('✗ Nicht gewusst', 'mitte', () => waehle(false));
  const ja = knopf('✓ Gewusst', 'mitte', () => waehle(true));
  function waehle(gewusst) {
    nein.disabled = ja.disabled = true;
    (gewusst ? ja : nein).classList.add(gewusst ? 'gewaehlt-ok' : 'gewaehlt-nicht-ok');
    abschliessen(gewusst, { titel: gewusst ? 'Gewusst' : 'Nicht gewusst' });
  }
  return el('div', { class: 'zwei-spalten' }, nein, ja);
}

const BAUER = {
  karteikarte(k, inhalt, abschliessen) {
    const bereich = el('div', { class: 'antwortbereich' },
      knopf('Antwort zeigen', 'haupt', () => {
        bereich.replaceChildren(el('div', { class: 'loesung' }, k.antwort), selbstbewertung(abschliessen));
      }));
    inhalt.append(
      el('p', { class: 'typ' }, 'Karteikarte'),
      el('h2', { class: 'frage' }, k.frage),
      bereich);
  },

  erklaerkarte(k, inhalt, abschliessen) {
    const bereich = el('div', { class: 'antwortbereich' },
      knopf('Musterantwort zeigen', 'haupt', () => {
        bereich.replaceChildren(
          el('ul', { class: 'kernpunkte' }, k.kernpunkte.map((p) => el('li', {}, p))),
          el('p', { class: 'anleitung' }, 'Hattest du die Kernpunkte?'),
          selbstbewertung(abschliessen));
      }));
    inhalt.append(
      el('p', { class: 'typ' }, 'Erklärkarte'),
      el('h2', { class: 'frage' }, k.frage),
      el('p', { class: 'anleitung' }, 'Formuliere die Antwort im Kopf oder halblaut – dann vergleiche.'),
      bereich);
  },

  mc(k, inhalt, abschliessen) {
    const knoepfe = mische(k.optionen.map((text, i) => ({ text, i }))).map(({ text, i }) => {
      const b = knopf(text, 'option', () => {
        knoepfe.forEach((x) => { x.disabled = true; });
        knoepfe.find((x) => Number(x.dataset.i) === k.richtig).classList.add('richtig');
        if (i !== k.richtig) b.classList.add('falsch');
        abschliessen(i === k.richtig);
      });
      b.dataset.i = i;
      return b;
    });
    inhalt.append(
      el('p', { class: 'typ' }, 'Multiple Choice'),
      el('h2', { class: 'frage' }, k.frage),
      el('div', { class: 'antwortbereich' }, knoepfe));
  },

  richtigfalsch(k, inhalt, abschliessen, ansicht) {
    const karteEl = ansicht.el;
    const stempelR = el('div', { class: 'stempel rechts', 'aria-hidden': 'true' }, 'RICHTIG');
    const stempelF = el('div', { class: 'stempel links', 'aria-hidden': 'true' }, 'FALSCH');
    karteEl.append(stempelR, stempelF);

    const falschK = knopf('← Falsch', 'mitte', () => antworte(false));
    const richtigK = knopf('Richtig →', 'mitte', () => antworte(true));

    function antworte(wert) {
      if (ansicht.beantwortet) return;
      falschK.disabled = richtigK.disabled = true;
      (wert ? richtigK : falschK).classList.add(wert === k.richtig ? 'gewaehlt-ok' : 'gewaehlt-nicht-ok');
      // Stempel kurz zeigen, dann ausblenden, damit er die Aussage nicht verdeckt
      for (const s of [stempelR, stempelF]) s.style.transition = 'opacity 0.4s 0.5s';
      stempelR.style.opacity = stempelF.style.opacity = 0;
      abschliessen(wert === k.richtig, { text: `Die Aussage ist ${k.richtig ? 'richtig' : 'falsch'}.` });
    }

    // Wischen nach links/rechts – der Feed ruft das auf, solange die Karte offen ist.
    ansicht.ziehen = (dx) => {
      karteEl.style.transition = 'none';
      karteEl.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
      stempelR.style.opacity = Math.max(0, Math.min(1, dx / RF_SCHWELLE));
      stempelF.style.opacity = Math.max(0, Math.min(1, -dx / RF_SCHWELLE));
    };
    ansicht.loslassen = (dx) => {
      karteEl.style.transition = 'transform 0.25s cubic-bezier(.2,.8,.2,1)';
      karteEl.style.transform = '';
      if (Math.abs(dx) >= RF_SCHWELLE) antworte(dx > 0);
      else stempelR.style.opacity = stempelF.style.opacity = 0;
    };

    inhalt.append(
      el('p', { class: 'typ' }, 'Richtig oder falsch?'),
      el('h2', { class: 'frage' }, k.aussage),
      el('p', { class: 'anleitung' }, 'Wische nach rechts für richtig, nach links für falsch.'),
      el('div', { class: 'antwortbereich' }, el('div', { class: 'zwei-spalten' }, falschK, richtigK)));
  },

  lueckentext(k, inhalt, abschliessen) {
    const [vorher, nachher] = k.text.split('___');
    const luecke = el('span', { class: 'luecke' }, ' ');
    const knoepfe = mische(k.optionen).map((text) => {
      const b = knopf(text, 'option mitte', () => {
        const richtig = text === k.loesung;
        knoepfe.forEach((x) => { x.disabled = true; });
        knoepfe.find((x) => x.textContent === k.loesung).classList.add('richtig');
        if (!richtig) b.classList.add('falsch');
        luecke.classList.add(richtig ? 'ok' : 'nicht-ok');
        luecke.replaceChildren(...(richtig ? [text] : [el('s', {}, text), ' ', el('span', { class: 'korrektur' }, k.loesung)]));
        abschliessen(richtig);
      });
      return b;
    });
    const kurz = k.optionen.every((o) => o.length <= 18);
    inhalt.append(
      el('p', { class: 'typ' }, 'Lückentext'),
      el('p', { class: 'lueckentext' }, vorher, luecke, nachher),
      el('div', { class: 'antwortbereich' }, kurz ? el('div', { class: 'zwei-spalten' }, knoepfe) : knoepfe));
  },
};
