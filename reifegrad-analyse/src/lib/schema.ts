import { z } from 'zod';
import { DIMENSIONEN, FREITEXT_MAX, JA_NEIN_UNKLAR, KUERZEL_MUSTER, ROLLEN } from './erhebung';

/**
 * Verbindliches Ausgabe-Schema der Erhebung (siehe CLAUDE.md).
 * Zusätzliche Felder sind nicht erlaubt, damit kein Klarname oder sonstiges
 * Merkmal versehentlich mitgeschickt wird.
 */
const JaNeinUnklar = z.enum(JA_NEIN_UNKLAR);

export const AntwortSchema = z.strictObject({
  rolle: z.enum(ROLLEN),
  dimension: z.enum(DIMENSIONEN),
  stufe: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  freitext: z.string().max(FREITEXT_MAX).optional(),
});

export const ErhebungSchema = z
  .strictObject({
    kunde_kuerzel: z.string().regex(KUERZEL_MUSTER, 'Kürzel im Format K-000 erwartet'),
    erhebung_datum: z.iso.date('Datum im Format YYYY-MM-DD erwartet'),
    richtlinie_check: z.strictObject({
      richtlinie_vorhanden: JaNeinUnklar,
      restriktionen_claude: JaNeinUnklar,
    }),
    antworten: z.array(AntwortSchema).min(1).max(ROLLEN.length * DIMENSIONEN.length),
  })
  .superRefine((erhebung, ctx) => {
    const gesehen = new Set<string>();
    erhebung.antworten.forEach((a, index) => {
      const schluessel = `${a.rolle}/${a.dimension}`;
      if (gesehen.has(schluessel)) {
        ctx.addIssue({
          code: 'custom',
          path: ['antworten', index],
          message: `Doppelte Antwort für ${schluessel}`,
        });
      }
      gesehen.add(schluessel);
    });
  });

export type ErhebungGeprueft = z.infer<typeof ErhebungSchema>;

/** Eine Einsendung aus dem Fragebogen: genau eine Rolle, alle 11 Dimensionen. */
export const EinsendungSchema = ErhebungSchema.refine(
  (e) => new Set(e.antworten.map((a) => a.rolle)).size === 1 && e.antworten.length === DIMENSIONEN.length,
  { message: 'Eine Einsendung enthält genau eine Rolle und alle 11 Dimensionen', path: ['antworten'] },
);
