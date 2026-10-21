// Prüft ein Kartenpaket vor dem Import (Kurzfassung von tools/pruefe_paket.py).
// Ein fehlerhaftes Paket wird gar nicht erst gespeichert – der bisherige Stand bleibt unberührt.

const KARTENTYPEN = {
  karteikarte: ['frage', 'antwort'],
  erklaerkarte: ['frage', 'kernpunkte'],
  mc: ['frage', 'optionen', 'richtig'],
  richtigfalsch: ['aussage', 'richtig'],
  lueckentext: ['text', 'loesung', 'optionen'],
};

const istText = (w) => typeof w === 'string' && w.trim() !== '';
const vierTexte = (liste) => Array.isArray(liste) && liste.length === 4 && liste.every(istText);
const mcOptionen = (liste) => Array.isArray(liste) && (liste.length === 4 || liste.length === 5) && liste.every(istText);

/** @returns { fehler: string[] } – leer, wenn das Paket in Ordnung ist */
export function pruefePaket(p) {
  const fehler = [];
  const f = (wo, was) => fehler.push(`${wo}: ${was}`);

  if (p?.format !== 'sport-lernfeed-paket') return { fehler: ['Die Datei ist kein Kartenpaket.'] };
  if (p.formatVersion !== 1) f('Paket', `Formatversion ${p.formatVersion} wird von dieser App-Version nicht unterstützt`);
  if (!Array.isArray(p.module) || !p.module.length) f('Paket', 'keine Module enthalten');
  if (!Array.isArray(p.level)) f('Paket', 'keine Level enthalten');
  if (!Array.isArray(p.karten) || !p.karten.length) f('Paket', 'keine Karten enthalten');
  if (fehler.length) return { fehler };

  const module = new Set();
  const lvs = new Set();
  for (const m of p.module) {
    if (!istText(m?.kuerzel)) { f('Modul', 'ohne Kürzel'); continue; }
    module.add(m.kuerzel);
    if (!Array.isArray(m.lehrveranstaltungen)) { f(`Modul ${m.kuerzel}`, 'Lehrveranstaltungen fehlen'); continue; }
    for (const lv of m.lehrveranstaltungen) lvs.add(`${m.kuerzel}-${lv.kuerzel}`);
  }

  const level = new Set();
  for (const l of p.level) {
    if (!istText(l?.id)) { f('Level', 'ohne ID'); continue; }
    const wo = `Level ${l.id}`;
    if (level.has(l.id)) f(wo, 'ID kommt doppelt vor');
    level.add(l.id);
    if (!module.has(l.modul)) f(wo, `unbekanntes Modul ${l.modul}`);
    if (!lvs.has(l.lv)) f(wo, `unbekannte Lehrveranstaltung ${l.lv}`);
    if (!Number.isInteger(l.nr)) f(wo, 'Nummer fehlt');
    if (!istText(l.titel)) f(wo, 'Titel fehlt');
  }

  const ids = new Set();
  for (const k of p.karten) {
    if (!istText(k?.id)) { f('Karte', 'ohne ID'); continue; }
    const wo = `Karte ${k.id}`;
    if (ids.has(k.id)) f(wo, 'ID kommt doppelt vor');
    ids.add(k.id);
    if (!level.has(k.level)) f(wo, `unbekanntes Level ${k.level}`);
    if (!module.has(k.modul)) f(wo, `unbekanntes Modul ${k.modul}`);
    if (!lvs.has(k.lv)) f(wo, `unbekannte Lehrveranstaltung ${k.lv}`);

    const felder = KARTENTYPEN[k.typ];
    if (!felder) { f(wo, `unbekannter Kartentyp ${k.typ}`); continue; }
    for (const feld of felder) if (!(feld in k)) f(wo, `Feld „${feld}“ fehlt`);
    if (!istText(k.erklaerung)) f(wo, 'Erklärung fehlt');
    if (!istText(k.quelle?.datei) || !istText(k.quelle?.stelle)) f(wo, 'Quellenangabe fehlt');

    if (k.typ === 'karteikarte' && !(istText(k.frage) && istText(k.antwort))) f(wo, 'Frage oder Antwort leer');
    if (k.typ === 'erklaerkarte' && !(istText(k.frage) && Array.isArray(k.kernpunkte) && k.kernpunkte.length && k.kernpunkte.every(istText))) f(wo, 'Frage oder Kernpunkte leer');
    if (k.typ === 'mc' && !(istText(k.frage) && mcOptionen(k.optionen) && Number.isInteger(k.richtig) && k.richtig >= 0 && k.richtig < k.optionen.length)) f(wo, 'braucht eine Frage, 4 oder 5 Optionen und einen gültigen Index „richtig“');
    if (k.typ === 'richtigfalsch' && !(istText(k.aussage) && typeof k.richtig === 'boolean')) f(wo, 'braucht eine Aussage und „richtig“ true/false');
    if (k.typ === 'lueckentext' && !(typeof k.text === 'string' && k.text.split('___').length === 2 && vierTexte(k.optionen) && k.optionen.includes(k.loesung))) f(wo, 'braucht genau eine Lücke ___, 4 Optionen und die Lösung unter den Optionen');
  }
  return { fehler };
}
