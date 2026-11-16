/**
 * Ablage einer geprüften Einsendung. Nur serverseitig verwenden.
 *
 * - Vercel Blob (privat), wenn BLOB_READ_WRITE_TOKEN gesetzt ist. Vercel trägt
 *   die Variable selbst ein, sobald ein Blob-Speicher mit dem Projekt verbunden ist.
 * - lokal ./submissions, wenn nicht auf Vercel (Entwicklung)
 * - sonst Fehler: auf Vercel ohne Speicher wird nichts angenommen
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { put } from '@vercel/blob';
import type { Erhebung } from './erhebung';

export class AblageNichtKonfiguriert extends Error {}

export interface Umgebung {
  BLOB_READ_WRITE_TOKEN?: string;
  VERCEL?: string;
  MOCK_DIR?: string;
}

/** Ordner im Blob-Speicher. */
export const BLOB_ORDNER = 'einsendungen';

export function dateiname(e: Erhebung, jetzt: Date = new Date()): string {
  const stempel = jetzt.toISOString().replace(/[:.]/g, '-');
  return `${e.kunde_kuerzel}_${e.antworten[0]?.rolle ?? 'Rolle'}_${stempel}.json`;
}

export async function ablegen(e: Erhebung, env: Umgebung): Promise<'blob' | 'lokal'> {
  const name = dateiname(e);
  const inhalt = JSON.stringify(e, null, 2) + '\n';

  if (env.BLOB_READ_WRITE_TOKEN) {
    // privat: Dateien sind nur mit Anmeldung abrufbar, nie über eine öffentliche Adresse
    await put(`${BLOB_ORDNER}/${e.kunde_kuerzel}/${name}`, inhalt, {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
      addRandomSuffix: true,
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    return 'blob';
  }
  if (env.VERCEL) throw new AblageNichtKonfiguriert('Kein Blob-Speicher verbunden');

  const ziel = resolve(env.MOCK_DIR ?? 'submissions');
  await mkdir(ziel, { recursive: true });
  await writeFile(join(ziel, name), inhalt, 'utf8');
  return 'lokal';
}

/** Optionale Liste vergebener Kürzel (kommagetrennt). Leer = jedes gültige Kürzel. */
export function kuerzelErlaubt(kuerzel: string, liste: string | undefined): boolean {
  const erlaubt = (liste ?? '').split(',').map((k) => k.trim()).filter(Boolean);
  return erlaubt.length === 0 || erlaubt.includes(kuerzel);
}
