/**
 * POST /api/submit: nimmt eine Einsendung an, prüft sie gegen das Schema und
 * legt sie ab (Vercel Blob, lokal ./submissions). Läuft auf Vercel als Function.
 * Es wird nichts protokolliert außer Fehlern ohne Inhalt der Einsendung.
 */
import type { APIRoute } from 'astro';
import { EinsendungSchema } from '../../lib/schema';
import { AblageNichtKonfiguriert, ablegen, kuerzelErlaubt } from '../../lib/ablage';

export const prerender = false;

const MAX_BYTES = 100_000;

const antworte = (status: number, inhalt: Record<string, unknown>) =>
  new Response(JSON.stringify(inhalt), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    return antworte(415, { ok: false, fehler: 'JSON erwartet' });
  }
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) return antworte(413, { ok: false, fehler: 'Zu groß' });

  let daten: unknown;
  try {
    daten = JSON.parse(text);
  } catch {
    return antworte(400, { ok: false, fehler: 'Kein gültiges JSON' });
  }

  const pruefung = EinsendungSchema.safeParse(daten);
  if (!pruefung.success) return antworte(422, { ok: false, fehler: 'Schema verletzt' });

  if (!kuerzelErlaubt(pruefung.data.kunde_kuerzel, process.env.ERLAUBTE_KUERZEL)) {
    return antworte(403, { ok: false, fehler: 'Kürzel nicht freigeschaltet' });
  }

  try {
    await ablegen(pruefung.data, process.env);
    return antworte(201, { ok: true });
  } catch (fehler) {
    if (fehler instanceof AblageNichtKonfiguriert) return antworte(503, { ok: false, fehler: 'Ablage nicht konfiguriert' });
    console.error('Ablage fehlgeschlagen:', fehler instanceof Error ? fehler.message : 'unbekannt');
    return antworte(502, { ok: false, fehler: 'Ablage fehlgeschlagen' });
  }
};
