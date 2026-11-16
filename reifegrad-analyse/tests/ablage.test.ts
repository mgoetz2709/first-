import { generateKeyPairSync, createVerify } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AblageNichtKonfiguriert, ablegen, dateiname, kuerzelErlaubt } from '../src/lib/ablage';
import type { Erhebung } from '../src/lib/erhebung';

const erhebung: Erhebung = {
  kunde_kuerzel: 'K-001',
  erhebung_datum: '2026-11-16',
  richtlinie_check: { richtlinie_vorhanden: 'ja', restriktionen_claude: 'nein' },
  antworten: [{ rolle: 'IT', dimension: 'D1', stufe: 2 }],
};

afterEach(() => vi.unstubAllGlobals());

describe('Ablage', () => {
  it('bildet Dateinamen aus Kürzel, Rolle und Zeitstempel', () => {
    expect(dateiname(erhebung, new Date('2026-11-16T08:30:00.000Z'))).toBe('K-001_IT_2026-11-16T08-30-00-000Z.json');
  });

  it('prüft die optionale Kürzel-Liste', () => {
    expect(kuerzelErlaubt('K-001', undefined)).toBe(true);
    expect(kuerzelErlaubt('K-001', '')).toBe(true);
    expect(kuerzelErlaubt('K-001', 'K-001, K-002')).toBe(true);
    expect(kuerzelErlaubt('K-003', 'K-001, K-002')).toBe(false);
  });

  it('nimmt auf Vercel ohne Drive-Konfiguration nichts an', async () => {
    await expect(ablegen(erhebung, { VERCEL: '1' })).rejects.toBeInstanceOf(AblageNichtKonfiguriert);
  });

  it('meldet sich mit signiertem JWT an und lädt die Datei in den Ordner', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    const aufrufe: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      aufrufe.push({ url, init });
      return new Response(JSON.stringify(url.includes('oauth2') ? { access_token: 'tok' } : { id: 'abc' }), { status: 200 });
    });

    const ziel = await ablegen(erhebung, {
      VERCEL: '1',
      GOOGLE_SERVICE_ACCOUNT_EMAIL: 'dienst@projekt.iam.gserviceaccount.com',
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: pem.replace(/\n/g, '\\n'), // wie in Vercel eingetragen
      GOOGLE_DRIVE_FOLDER_ID: 'ordner123',
    });
    expect(ziel).toBe('drive');

    const [anmeldung, upload] = aufrufe;
    const jwt = (anmeldung!.init.body as URLSearchParams).get('assertion')!;
    const [kopf, inhalt, signatur] = jwt.split('.');
    expect(createVerify('RSA-SHA256').update(`${kopf}.${inhalt}`).verify(publicKey, Buffer.from(signatur!, 'base64url'))).toBe(true);
    expect(JSON.parse(Buffer.from(inhalt!, 'base64url').toString()).iss).toBe('dienst@projekt.iam.gserviceaccount.com');

    expect(upload!.url).toContain('supportsAllDrives=true');
    expect((upload!.init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    const koerper = upload!.init.body as string;
    expect(koerper).toContain('"parents":["ordner123"]');
    expect(koerper).toContain('"kunde_kuerzel": "K-001"');
  });

  it('meldet einen Fehler, wenn Drive ablehnt', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    vi.stubGlobal('fetch', async (url: string) =>
      url.includes('oauth2') ? new Response('{"access_token":"t"}') : new Response('{}', { status: 403 }),
    );
    await expect(
      ablegen(erhebung, {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: 'a@b',
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
        GOOGLE_DRIVE_FOLDER_ID: 'x',
      }),
    ).rejects.toThrow('HTTP 403');
  });
});
