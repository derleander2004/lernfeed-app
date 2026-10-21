// Datumsrechnung mit lokalen Kalendertagen im Format "JJJJ-MM-TT".
// Ein Lerntag beginnt um Mitternacht (Ortszeit des Handys).

function format(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parse(s) {
  const [j, m, t] = s.split('-').map(Number);
  return new Date(j, m - 1, t, 12); // 12 Uhr mittags: robust gegen die Zeitumstellung
}

/** Heutiges Datum. Zum Testen lässt es sich mit ?heute=2026-11-03 in der Adresse überschreiben. */
export function heute() {
  const test = new URLSearchParams(location.search).get('heute');
  if (test && /^\d{4}-\d{2}-\d{2}$/.test(test)) return test;
  return format(new Date());
}

export function plusTage(datum, n) {
  const d = parse(datum);
  d.setDate(d.getDate() + n);
  return format(d);
}

/** Anzahl Tage von a bis b (positiv, wenn b später ist). */
export function tageZwischen(a, b) {
  return Math.round((parse(b) - parse(a)) / 86400000);
}
