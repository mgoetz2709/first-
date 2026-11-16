/**
 * Reine Funktionen und Konstanten rund um die Erhebung. Bewusst ohne Zod,
 * damit das Fragebogen-Skript klein bleibt; das Schema liegt in schema.ts.
 */

export const ROLLEN = ['Geschaeftsfuehrung', 'IT', 'Fachbereich', 'Betriebsrat', 'Datenschutz'] as const;
export const DIMENSIONEN = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11'] as const;
export const JA_NEIN_UNKLAR = ['ja', 'nein', 'unklar'] as const;
export const FREITEXT_MAX = 1000;

export type Rolle = (typeof ROLLEN)[number];
export type Dimension = (typeof DIMENSIONEN)[number];
export type JaNeinUnklar = (typeof JA_NEIN_UNKLAR)[number];
export type Stufe = 1 | 2 | 3;

export interface Antwort {
  rolle: Rolle;
  dimension: Dimension;
  stufe: Stufe;
  freitext?: string;
}

export interface Erhebung {
  kunde_kuerzel: string;
  erhebung_datum: string;
  richtlinie_check: {
    richtlinie_vorhanden: JaNeinUnklar;
    restriktionen_claude: JaNeinUnklar;
  };
  antworten: Antwort[];
}

/** Kürzel werden von MGIM vergeben: „K-" plus genau drei Ziffern. */
export const KUERZEL_MUSTER = /^K-\d{3}$/;

/** Kürzel für Einsendungen ohne Zuordnung zu einem Kunden (kein Link, kein Kürzel eingegeben). */
export const KUERZEL_OHNE_ZUORDNUNG = 'K-000';

/** Bringt eine Eingabe wie " k-001 " in die Form "K-001". */
export function normalisiereKuerzel(wert: string): string {
  return wert.trim().toUpperCase();
}

export function istGueltigesKuerzel(wert: unknown): wert is string {
  return typeof wert === 'string' && KUERZEL_MUSTER.test(wert);
}

/** Lokales Datum als YYYY-MM-DD (nicht UTC, damit das Datum des Teilnehmers gilt). */
export function lokalesDatum(d: Date = new Date()): string {
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

export interface Eingaben {
  kuerzel: string;
  datum: string;
  rolle: Rolle;
  richtlinie_vorhanden: JaNeinUnklar;
  restriktionen_claude: JaNeinUnklar;
  /** Je Dimension die gewählte Stufe und ein optionaler Freitext. */
  antworten: Partial<Record<Dimension, { stufe: Stufe; freitext?: string }>>;
}

/** Baut das Ausgabe-JSON. Leerer Freitext wird weggelassen. */
export function baueErhebung(e: Eingaben): Erhebung {
  const antworten: Antwort[] = [];
  for (const dimension of DIMENSIONEN) {
    const a = e.antworten[dimension];
    if (!a) continue;
    const antwort: Antwort = { rolle: e.rolle, dimension, stufe: a.stufe };
    const freitext = a.freitext?.trim();
    if (freitext) antwort.freitext = freitext.slice(0, FREITEXT_MAX);
    antworten.push(antwort);
  }
  return {
    kunde_kuerzel: e.kuerzel,
    erhebung_datum: e.datum,
    richtlinie_check: {
      richtlinie_vorhanden: e.richtlinie_vorhanden,
      restriktionen_claude: e.restriktionen_claude,
    },
    antworten,
  };
}
