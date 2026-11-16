import { describe, expect, it } from 'vitest';
import { EinsendungSchema, ErhebungSchema } from '../src/lib/schema';
import { DIMENSIONEN, baueErhebung, istGueltigesKuerzel, lokalesDatum, type Eingaben } from '../src/lib/erhebung';
import daten from '../src/data/dimensionen.json';

const gueltig = () => ({
  kunde_kuerzel: 'K-001',
  erhebung_datum: '2026-11-16',
  richtlinie_check: { richtlinie_vorhanden: 'ja', restriktionen_claude: 'unklar' },
  antworten: [
    { rolle: 'Geschaeftsfuehrung', dimension: 'D1', stufe: 1, freitext: 'Ideen kommen aus dem Vertrieb.' },
    { rolle: 'IT', dimension: 'D1', stufe: 3 },
    { rolle: 'IT', dimension: 'D11', stufe: 2 },
  ],
});

/** Kopie des gültigen Beispiels mit einer gezielten Änderung. */
const mit = (aendern: (e: any) => void) => {
  const e: any = gueltig();
  aendern(e);
  return e;
};

describe('ErhebungSchema: gültige Beispiele', () => {
  it('akzeptiert das Beispiel aus der Spezifikation', () => {
    expect(ErhebungSchema.safeParse(gueltig()).success).toBe(true);
  });

  it('akzeptiert Antworten ohne Freitext und alle Rollen', () => {
    for (const rolle of ['Geschaeftsfuehrung', 'IT', 'Fachbereich', 'Betriebsrat', 'Datenschutz']) {
      const e = mit((x) => (x.antworten = [{ rolle, dimension: 'D5', stufe: 2 }]));
      expect(ErhebungSchema.safeParse(e).success, rolle).toBe(true);
    }
  });

  it('akzeptiert nein/unklar im Richtlinien-Check', () => {
    const e = mit((x) => (x.richtlinie_check = { richtlinie_vorhanden: 'nein', restriktionen_claude: 'nein' }));
    expect(ErhebungSchema.safeParse(e).success).toBe(true);
  });
});

describe('ErhebungSchema: ungültige Beispiele', () => {
  const faelle: [string, any][] = [
    ['Kürzel ohne Präfix', mit((e) => (e.kunde_kuerzel = '001'))],
    ['Kürzel mit vier Ziffern', mit((e) => (e.kunde_kuerzel = 'K-0001'))],
    ['Klarname statt Kürzel', mit((e) => (e.kunde_kuerzel = 'Muster GmbH'))],
    ['Datum im deutschen Format', mit((e) => (e.erhebung_datum = '16.11.2026'))],
    ['unmögliches Datum', mit((e) => (e.erhebung_datum = '2026-02-30'))],
    ['Richtlinien-Check fehlt', mit((e) => delete e.richtlinie_check)],
    ['Richtlinien-Check mit unbekanntem Wert', mit((e) => (e.richtlinie_check.richtlinie_vorhanden = 'vielleicht'))],
    ['Richtlinien-Check unvollständig', mit((e) => delete e.richtlinie_check.restriktionen_claude)],
    ['unbekannte Rolle', mit((e) => (e.antworten[0].rolle = 'Vorstand'))],
    ['Rolle mit Umlauten', mit((e) => (e.antworten[0].rolle = 'Geschäftsführung'))],
    ['Dimension D12', mit((e) => (e.antworten[0].dimension = 'D12'))],
    ['Dimension klein geschrieben', mit((e) => (e.antworten[0].dimension = 'd1'))],
    ['Stufe 0', mit((e) => (e.antworten[0].stufe = 0))],
    ['Stufe 4', mit((e) => (e.antworten[0].stufe = 4))],
    ['Stufe als Text', mit((e) => (e.antworten[0].stufe = '2'))],
    ['Stufe 1,5', mit((e) => (e.antworten[0].stufe = 1.5))],
    ['Freitext zu lang', mit((e) => (e.antworten[0].freitext = 'x'.repeat(1001)))],
    ['Freitext kein Text', mit((e) => (e.antworten[0].freitext = 42))],
    ['keine Antworten', mit((e) => (e.antworten = []))],
    ['Antworten fehlen', mit((e) => delete e.antworten)],
    ['doppelte Antwort je Rolle und Dimension', mit((e) => e.antworten.push({ rolle: 'IT', dimension: 'D1', stufe: 1 }))],
    ['Zusatzfeld auf oberster Ebene', mit((e) => (e.name = 'Erika Mustermann'))],
    ['Zusatzfeld in einer Antwort', mit((e) => (e.antworten[0].email = 'a@b.de'))],
    ['kein Objekt', 'K-001'],
  ];

  it.each(faelle)('lehnt ab: %s', (_name, e) => {
    expect(ErhebungSchema.safeParse(e).success).toBe(false);
  });
});

describe('baueErhebung und EinsendungSchema', () => {
  const eingaben = (): Eingaben => ({
    kuerzel: 'K-042',
    datum: '2026-11-16',
    rolle: 'Fachbereich',
    richtlinie_vorhanden: 'unklar',
    restriktionen_claude: 'nein',
    antworten: Object.fromEntries(DIMENSIONEN.map((d, i) => [d, { stufe: ((i % 3) + 1) as 1 | 2 | 3, freitext: '' }])),
  });

  it('erzeugt eine gültige Einsendung mit 11 Antworten in fester Reihenfolge', () => {
    const e = baueErhebung(eingaben());
    expect(EinsendungSchema.safeParse(e).success).toBe(true);
    expect(e.antworten.map((a) => a.dimension)).toEqual([...DIMENSIONEN]);
    expect(Object.keys(e)).toEqual(['kunde_kuerzel', 'erhebung_datum', 'richtlinie_check', 'antworten']);
  });

  it('lässt leeren Freitext weg und kürzt Leerraum', () => {
    const ein = eingaben();
    ein.antworten.D2 = { stufe: 2, freitext: '  Gremium tagt monatlich.  ' };
    const e = baueErhebung(ein);
    expect('freitext' in e.antworten[0]!).toBe(false);
    expect(e.antworten[1]!.freitext).toBe('Gremium tagt monatlich.');
  });

  it('EinsendungSchema lehnt unvollständige Einsendungen ab', () => {
    const ein = eingaben();
    delete ein.antworten.D7;
    expect(EinsendungSchema.safeParse(baueErhebung(ein)).success).toBe(false);
  });

  it('prüft Kürzel und Datumsformat', () => {
    expect(istGueltigesKuerzel('K-001')).toBe(true);
    for (const k of ['k-001', 'K-01', 'K-0011', ' K-001', null, undefined, 7]) expect(istGueltigesKuerzel(k)).toBe(false);
    expect(lokalesDatum(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('dimensionen.json passt zum Schema', () => {
  it('enthält genau D1 bis D11, je drei Stufentexte, und die fünf Rollen', () => {
    const ids = daten.phasen.flatMap((p) => p.dimensionen.map((d) => d.id));
    expect(ids).toEqual([...DIMENSIONEN]);
    for (const d of daten.phasen.flatMap((p) => p.dimensionen)) {
      expect(Object.keys(d.stufen)).toEqual(['1', '2', '3']);
      for (const text of Object.values(d.stufen)) expect(text.length).toBeGreaterThan(20);
    }
    expect(daten.rollen.map((r) => r.wert)).toEqual(['Geschaeftsfuehrung', 'IT', 'Fachbereich', 'Betriebsrat', 'Datenschutz']);
  });
});
