// Kleine Hilfsfunktionen, die überall gebraucht werden.

/**
 * Baut ein HTML-Element. Texte werden immer als Text eingefügt (nie als HTML),
 * damit Inhalte aus Kartenpaketen nichts Unerwartetes ausführen können.
 *   el('button', { class: 'knopf', onclick: f }, 'Text')
 */
export function el(tag, attrs = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [name, wert] of Object.entries(attrs)) {
    if (wert == null || wert === false) continue;
    if (name.startsWith('on')) e.addEventListener(name.slice(2), wert);
    else if (name === 'class') e.className = wert;
    else e.setAttribute(name, wert === true ? '' : wert);
  }
  for (const kind of kinder.flat()) {
    if (kind == null || kind === false) continue;
    e.append(kind instanceof Node ? kind : String(kind));
  }
  return e;
}

/** Gibt eine zufällig gemischte Kopie der Liste zurück (Fisher-Yates). */
export function mische(liste) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
