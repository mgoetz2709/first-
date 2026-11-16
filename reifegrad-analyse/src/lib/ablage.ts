/**
 * Ablage einer geprüften Einsendung. Nur serverseitig verwenden.
 *
 * - Google Drive, wenn die drei GOOGLE_*-Variablen gesetzt sind
 * - lokal ./submissions, wenn nicht auf Vercel (Entwicklung)
 * - sonst Fehler: auf Vercel ohne Konfiguration wird nichts angenommen
 *
 * Der Zugriff auf Drive nutzt ein Dienstkonto und kommt ohne Zusatzpakete aus
 * (JWT mit node:crypto, danach Drive-REST-API).
 */
import { createSign } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Erhebung } from './erhebung';

export class AblageNichtKonfiguriert extends Error {}

export interface Umgebung {
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
  VERCEL?: string;
  MOCK_DIR?: string;
}

export function dateiname(e: Erhebung, jetzt: Date = new Date()): string {
  const stempel = jetzt.toISOString().replace(/[:.]/g, '-');
  return `${e.kunde_kuerzel}_${e.antworten[0]?.rolle ?? 'Rolle'}_${stempel}.json`;
}

const b64url = (wert: string | Buffer) => Buffer.from(wert).toString('base64url');

async function googleToken(email: string, schluessel: string): Promise<string> {
  const jetzt = Math.floor(Date.now() / 1000);
  const kopf = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const inhalt = b64url(
    JSON.stringify({
      iss: email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      iat: jetzt,
      exp: jetzt + 300,
    }),
  );
  const signatur = createSign('RSA-SHA256').update(`${kopf}.${inhalt}`).sign(schluessel);
  const antwort = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${kopf}.${inhalt}.${b64url(signatur)}`,
    }),
  });
  if (!antwort.ok) throw new Error(`Google-Anmeldung fehlgeschlagen (HTTP ${antwort.status})`);
  return ((await antwort.json()) as { access_token: string }).access_token;
}

async function nachDrive(e: Erhebung, name: string, env: Required<Pick<Umgebung, 'GOOGLE_SERVICE_ACCOUNT_EMAIL' | 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY' | 'GOOGLE_DRIVE_FOLDER_ID'>>): Promise<void> {
  // In Vercel wird der Schlüssel einzeilig mit \n eingetragen
  const schluessel = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
  const token = await googleToken(env.GOOGLE_SERVICE_ACCOUNT_EMAIL, schluessel);
  const grenze = `mgim-${Date.now()}`;
  const koerper = [
    `--${grenze}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name, parents: [env.GOOGLE_DRIVE_FOLDER_ID], mimeType: 'application/json' }),
    `--${grenze}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(e, null, 2),
    `--${grenze}--`,
    '',
  ].join('\r\n');
  const antwort = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${grenze}` },
      body: koerper,
    },
  );
  if (!antwort.ok) throw new Error(`Ablage in Google Drive fehlgeschlagen (HTTP ${antwort.status})`);
}

export async function ablegen(e: Erhebung, env: Umgebung): Promise<'drive' | 'lokal'> {
  const name = dateiname(e);
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID } = env;
  if (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && GOOGLE_DRIVE_FOLDER_ID) {
    await nachDrive(e, name, { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID });
    return 'drive';
  }
  if (env.VERCEL) throw new AblageNichtKonfiguriert('Google Drive ist nicht konfiguriert');
  const ziel = resolve(env.MOCK_DIR ?? 'submissions');
  await mkdir(ziel, { recursive: true });
  await writeFile(join(ziel, name), JSON.stringify(e, null, 2) + '\n', 'utf8');
  return 'lokal';
}

/** Optionale Liste vergebener Kürzel (kommagetrennt). Leer = jedes gültige Kürzel. */
export function kuerzelErlaubt(kuerzel: string, liste: string | undefined): boolean {
  const erlaubt = (liste ?? '').split(',').map((k) => k.trim()).filter(Boolean);
  return erlaubt.length === 0 || erlaubt.includes(kuerzel);
}
