// Der Feed: eine Karte pro Bildschirm, nach oben wischen = nächste Karte.
//
// Es liegen immer zwei Karten bereit: die aktuelle und die nächste (unsichtbar darunter).
// Beim Wischen schieben sich beide gemeinsam nach oben – so gibt es keine Ladezeit.
// Weiter geht es erst, wenn die aktuelle Karte beantwortet ist.

import { baueKarte, baueEndeKarte } from './karten.js';
import { el } from './hilfen.js';

const WEITER_ANTEIL = 0.18;   // so viel der Höhe muss man nach oben wischen …
const WEITER_TEMPO = 0.5;     // … oder so schnell (px pro ms) wischen
const ACHSEN_SCHWELLE = 8;    // ab so vielen px steht fest, ob waagerecht oder senkrecht gewischt wird
const ANIMATION_MS = 280;

/**
 * @param container  das <main>-Element
 * @param quelle     {
 *   naechste() → Karte | null (null = alles erledigt),
 *   kontext(karte) → Angaben für die Etiketten,
 *   beantwortet(karte, richtig),
 *   endeInfo() → { grund, heute, fokus } für die Abschlusskarte,
 *   starteFreiesUeben(),
 *   beendeFokus(),
 *   freigeben(karte) – vorbereitete, unbeantwortete Karte zurückgeben
 * }
 * @returns { neuStart() } – verwirft die vorbereiteten Karten und beginnt neu (z. B. nach Fokuswechsel)
 */
export function starteFeed(container, quelle) {
  const hinweis = el('div', { class: 'feed-hinweis', role: 'status' });
  container.append(hinweis);
  // Sicherheitsnetz für ältere Browser ohne "overflow: clip": der Feed selbst scrollt nie.
  container.addEventListener('scroll', () => { container.scrollTop = 0; container.scrollLeft = 0; });

  let aktuell = null;    // { karte, el, ansicht }
  let naechster = null;
  let animiert = false;
  let geste = null;

  // ---------- Slides anlegen und verschieben ----------

  /** Legt einen Slide an – für eine Karte oder (bei null) die Abschlusskarte "Alles erledigt". */
  function neuerSlide(karte) {
    const slide = el('section', { class: 'slide' });
    const eintrag = { karte, el: slide, ansicht: null };
    eintrag.ansicht = karte
      ? baueKarte(karte, quelle.kontext(karte), {
        beiAntwort: (richtig) => quelle.beantwortet(karte, richtig),
        beiWeiter: weiter,
      })
      : baueEndeKarte(quelle.endeInfo(), { beiFreiesUeben: starteFreiesUeben, beiFokusEnde: quelle.beendeFokus });
    slide.append(eintrag.ansicht.el);
    container.append(slide);
    return eintrag;
  }

  function istEnde(eintrag) {
    return Boolean(eintrag?.ansicht.istEnde);
  }

  /** Ersetzt die Abschlusskarte durch eine echte Karte, falls wieder etwas da ist. */
  function verlasseEnde(karte) {
    if (!karte) return false;
    if (istEnde(aktuell)) {
      naechster?.el.remove();
      naechster = neuerSlide(karte);
      naechster.el.inert = true;
      setze(naechster, '100%');
      aktuell.ansicht.beantwortet = true;
      weiter();
    } else if (istEnde(naechster)) {
      naechster.el.remove();
      naechster = neuerSlide(karte);
      naechster.el.inert = true;
      setze(naechster, '100%');
    }
    return true;
  }

  function starteFreiesUeben() {
    quelle.starteFreiesUeben();
    if (!verlasseEnde(quelle.naechste())) zeigeHinweis('Noch keine Karten zum Üben.');
  }

  function setze(eintrag, y, animiert = false) {
    if (!eintrag) return;
    eintrag.el.style.transition = animiert ? `transform ${ANIMATION_MS}ms cubic-bezier(.2,.8,.2,1)` : 'none';
    eintrag.el.style.transform = `translate3d(0, ${y}, 0)`;
  }

  function legeNaechstenBereit() {
    // Nach der Abschlusskarte kommt nichts – erst "Freies Üben" oder ein neuer Tag bringt Karten.
    if (istEnde(aktuell)) { naechster = null; return; }
    naechster = neuerSlide(quelle.naechste());
    naechster.el.inert = true; // unsichtbare Karte darf keinen Fokus bekommen
    setze(naechster, '100%');
  }

  function zeigeHinweis(text) {
    hinweis.textContent = text;
    hinweis.classList.add('sichtbar');
    clearTimeout(zeigeHinweis.timer);
    zeigeHinweis.timer = setTimeout(() => hinweis.classList.remove('sichtbar'), 1600);
  }

  function zuruecksetzen() {
    setze(aktuell, '0px', true);
    setze(naechster, '100%', true);
  }

  function weiter() {
    if (animiert || !aktuell) return;
    if (istEnde(aktuell) && !aktuell.ansicht.beantwortet) { zuruecksetzen(); zeigeHinweis('Tippe auf „Freies Üben“.'); return; }
    if (!aktuell.ansicht.beantwortet) { zuruecksetzen(); zeigeHinweis('Erst beantworten, dann weiter.'); return; }
    if (!naechster) { zuruecksetzen(); return; }
    // Die Abschlusskarte wurde vorbereitet, bevor die aktuelle Karte beantwortet war.
    // Inzwischen kann wieder etwas da sein (z. B. eine falsch beantwortete Karte für "Nochmal").
    if (istEnde(naechster)) verlasseEnde(quelle.naechste());
    animiert = true;
    const alt = aktuell;
    setze(alt, '-100%', true);
    setze(naechster, '0px', true);
    setTimeout(() => {
      alt.el.remove();
      aktuell = naechster;
      aktuell.el.inert = false;
      if (istEnde(aktuell)) aktuell.ansicht.aktualisiere(quelle.endeInfo());
      legeNaechstenBereit();
      animiert = false;
    }, ANIMATION_MS);
  }

  // ---------- Gesten (Finger und Maus) ----------

  function rfOffen() {
    return aktuell && aktuell.ansicht.ziehen && !aktuell.ansicht.beantwortet;
  }

  function start(x, y) {
    if (animiert || !aktuell) return;
    const scroller = aktuell.el.querySelector('.karte-inhalt');
    geste = {
      x0: x, y0: y, t0: performance.now(), dx: 0, dy: 0,
      achse: null, uebernommen: false,
      scroller, scrollbar: scroller.scrollHeight > scroller.clientHeight + 1,
      h: container.clientHeight,
    };
  }

  function bewege(x, y, ev) {
    if (!geste) return;
    const g = geste;
    g.dx = x - g.x0;
    g.dy = y - g.y0;
    if (!g.achse && Math.hypot(g.dx, g.dy) > ACHSEN_SCHWELLE) {
      g.achse = rfOffen() && Math.abs(g.dx) > Math.abs(g.dy) ? 'x' : 'y';
    }

    // Lässt sich der Karteninhalt noch nach unten scrollen, darf der Browser normal scrollen.
    if (!g.uebernommen) {
      const amEnde = g.scroller.scrollTop + g.scroller.clientHeight >= g.scroller.scrollHeight - 2;
      if (rfOffen() || !g.scrollbar) g.uebernommen = true;
      else if (g.achse === 'y') {
        if (amEnde && g.dy < 0) g.uebernommen = true;
        else { geste = null; return; }
      }
    }
    if (!g.uebernommen) return;
    if (ev && ev.cancelable) ev.preventDefault();
    if (!g.achse) return;

    if (g.achse === 'x') { aktuell.ansicht.ziehen(g.dx); return; }

    if (g.dy > 0) {
      setze(aktuell, `${g.dy * 0.15}px`); // nach unten nur leichter Widerstand
    } else if (aktuell.ansicht.beantwortet && naechster) {
      setze(aktuell, `${g.dy}px`);
      setze(naechster, `${g.h + g.dy}px`);
    } else {
      setze(aktuell, `${g.dy * 0.25}px`); // noch nicht beantwortet: gebremst
    }
  }

  function ende() {
    if (!geste) return;
    const g = geste;
    geste = null;
    if (!g.uebernommen || !g.achse) return;

    if (g.achse === 'x') { aktuell.ansicht.loslassen(g.dx); return; }

    const tempo = g.dy / Math.max(1, performance.now() - g.t0);
    const weitGenug = g.dy < -g.h * WEITER_ANTEIL || (g.dy < -40 && tempo < -WEITER_TEMPO);
    if (weitGenug) weiter();
    else zuruecksetzen();
  }

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) start(e.touches[0].clientX, e.touches[0].clientY);
    else geste = null;
  }, { passive: true });
  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) bewege(e.touches[0].clientX, e.touches[0].clientY, e);
  }, { passive: false });
  container.addEventListener('touchend', ende);
  container.addEventListener('touchcancel', () => { geste = null; zuruecksetzen(); });

  // Maus (zum Testen am Mac)
  container.addEventListener('mousedown', (e) => { if (e.button === 0) start(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => { if (geste) bewege(e.clientX, e.clientY, e); });
  window.addEventListener('mouseup', ende);

  // Mausrad und Tastatur
  container.addEventListener('wheel', (e) => {
    if (e.deltaY > 30 && aktuell?.ansicht.beantwortet) weiter();
  }, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('overlay-offen')) return; // Übersicht ist offen
    if (['ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); weiter(); }
    if (rfOffen() && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      aktuell.ansicht.loslassen(e.key === 'ArrowRight' ? 999 : -999);
    }
  });

  // Kommt die App zurück in den Vordergrund (z. B. am nächsten Morgen), kann wieder etwas fällig sein.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || animiert) return;
    if (istEnde(aktuell) || istEnde(naechster)) verlasseEnde(quelle.naechste());
  });

  // ---------- Start ----------

  function beginne() {
    aktuell = neuerSlide(quelle.naechste());
    setze(aktuell, '0px');
    legeNaechstenBereit();
  }

  /** Verwirft die angezeigte (falls unbeantwortet) und die vorbereitete Karte und beginnt neu. */
  function neuStart() {
    if (animiert) { setTimeout(neuStart, ANIMATION_MS + 20); return; }
    geste = null;
    for (const eintrag of [aktuell, naechster]) {
      if (!eintrag) continue;
      if (eintrag.karte && !eintrag.ansicht.beantwortet) quelle.freigeben(eintrag.karte);
      eintrag.el.remove();
    }
    aktuell = naechster = null;
    beginne();
  }

  beginne();
  return { neuStart };
}
