// Fortschritts-Backup: Erstellen, Prüfen und Zusammenführen.
// Das Backup enthält nur deinen Lernstand – keine Karteninhalte. Die kommen aus dem Kartenpaket.

export const BACKUP_FORMAT = 'sport-lernfeed-backup';

export function erstelleBackup({ fortschritt, tage, meta }, heute) {
  return {
    format: BACKUP_FORMAT,
    formatVersion: 1,
    erstellt: heute,
    fortschritt,
    tage,
    meta: { letzterImport: meta?.letzterImport ?? null, paketErstellt: meta?.paketErstellt ?? null },
  };
}

/** @returns Fehlertext oder null */
export function pruefeBackup(b) {
  if (b?.format !== BACKUP_FORMAT) return 'Die Datei ist kein Backup dieser App.';
  if (b.formatVersion !== 1) return `Backup-Version ${b.formatVersion} wird nicht unterstützt.`;
  if (!Array.isArray(b.fortschritt) || !Array.isArray(b.tage)) return 'Das Backup ist unvollständig.';
  const kaputt = b.fortschritt.find((e) => typeof e?.id !== 'string' || !Number.isInteger(e.box) || !Array.isArray(e.richtigeTage));
  if (kaputt) return 'Das Backup enthält beschädigte Einträge.';
  if (b.tage.some((t) => typeof t?.datum !== 'string' || !Number.isInteger(t.beantwortet))) return 'Das Backup enthält beschädigte Tageseinträge.';
  return null;
}

/** Ist Eintrag a neuer als b? Entscheidend ist das Datum der letzten Antwort, dann die Anzahl Antworten. */
function istNeuer(a, b) {
  const da = a.letzte?.datum ?? '';
  const db = b.letzte?.datum ?? '';
  if (da !== db) return da > db;
  return (a.richtig + a.falsch) > (b.richtig + b.falsch);
}

/**
 * Führt den Stand auf dem Handy mit einem Backup zusammen, ohne etwas zu verlieren:
 * je Karte gilt der neuere Stand, je Tag die höhere Anzahl Antworten.
 */
export function zusammenfuehren(lokal, backup) {
  const fortschritt = new Map(lokal.fortschritt.map((e) => [e.id, e]));
  for (const e of backup.fortschritt) {
    const l = fortschritt.get(e.id);
    if (!l || istNeuer(e, l)) fortschritt.set(e.id, e);
  }
  const tage = new Map(lokal.tage.map((t) => [t.datum, t]));
  for (const t of backup.tage) {
    const l = tage.get(t.datum);
    if (!l || t.beantwortet > l.beantwortet) tage.set(t.datum, t);
  }
  return { fortschritt: [...fortschritt.values()], tage: [...tage.values()] };
}
