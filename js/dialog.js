// Einfacher Dialog über der App (statt der unschönen Browser-Fenster alert/confirm).

import { el } from './hilfen.js';

/**
 * @param titel   Überschrift
 * @param text    Liste von Absätzen (Texte; null wird übersprungen)
 * @param liste   optionale Aufzählung (z. B. Fehler)
 * @param knoepfe [{ text, wert, haupt? }] – der Wert des gedrückten Knopfs wird zurückgegeben
 * @returns Promise mit dem Wert oder null (geschlossen ohne Auswahl, z. B. mit Escape)
 */
export function zeigeDialog({ titel, text = [], liste = null, knoepfe = [{ text: 'OK', wert: 'ok', haupt: true }] }) {
  return new Promise((ok) => {
    let fertig = false;
    // Der Dialog wird direkt hier beendet – nicht erst im "close"-Ereignis, denn das
    // kommt nicht in jedem Browser zuverlässig an.
    function beende(wert) {
      if (fertig) return;
      fertig = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      ok(wert);
    }

    const dialog = el('dialog', { class: 'dialog' },
      el('h2', {}, titel),
      text.filter(Boolean).map((t) => el('p', {}, t)),
      liste && el('ul', { class: 'dialog-liste' }, liste.map((t) => el('li', {}, t))),
      el('div', { class: 'dialog-knoepfe' },
        knoepfe.map((k) => el('button', {
          class: `knopf ${k.haupt ? 'haupt' : 'mitte'}`,
          type: 'button',
          onclick: () => beende(k.wert),
        }, k.text))));

    dialog.addEventListener('cancel', (e) => { e.preventDefault(); beende(null); }); // Escape / Zurück
    dialog.addEventListener('close', () => beende(null));
    document.body.append(dialog);
    dialog.showModal();
  });
}
