import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Einfacher Ersatz für den Blob-Speicher: merkt sich Aufrufe, kann scheitern
const speicher = vi.hoisted(() => ({ aufrufe: [] as unknown[][], fehler: null as Error | null }));
vi.mock('@vercel/blob', () => ({
  put: async (...a: unknown[]) => {
    speicher.aufrufe.push(a);
    if (speicher.fehler) throw speicher.fehler;
    return { pathname: a[0] };
  },
}));

import { AblageNichtKonfiguriert, ablegen, dateiname, kuerzelErlaubt } from '../src/lib/ablage';
import { ErhebungSchema } from '../src/lib/schema';
import type { Erhebung } from '../src/lib/erhebung';

const erhebung: Erhebung = {
  kunde_kuerzel: 'K-001',
  erhebung_datum: '2026-11-16',
  richtlinie_check: { richtlinie_vorhanden: 'ja', restriktionen_claude: 'nein' },
  antworten: [{ rolle: 'IT', dimension: 'D1', stufe: 2 }],
};

beforeEach(() => {
  speicher.aufrufe.length = 0;
  speicher.fehler = null;
});

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

  it('nimmt auf Vercel ohne verbundenen Speicher nichts an', async () => {
    await expect(ablegen(erhebung, { VERCEL: '1' })).rejects.toBeInstanceOf(AblageNichtKonfiguriert);
    expect(speicher.aufrufe).toHaveLength(0);
  });

  it('legt mit Token privat im Blob-Speicher ab, je Kürzel in einem Ordner', async () => {
    expect(await ablegen(erhebung, { VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'tok' })).toBe('blob');
    const [pfad, inhalt, optionen] = speicher.aufrufe[0] as [string, string, object];
    expect(pfad).toMatch(/^einsendungen\/K-001\/K-001_IT_.+\.json$/);
    expect(ErhebungSchema.safeParse(JSON.parse(inhalt)).success).toBe(true);
    expect(optionen).toMatchObject({ access: 'private', token: 'tok' });
  });

  it('legt mit Store-ID ab (Anmeldung über OIDC), ohne Token', async () => {
    expect(await ablegen(erhebung, { VERCEL: '1', BLOB_STORE_ID: 'store_abc' })).toBe('blob');
    const optionen = speicher.aufrufe[0]![2] as Record<string, unknown>;
    expect(optionen).toMatchObject({ access: 'private', storeId: 'store_abc' });
    expect('token' in optionen).toBe(false);
  });

  it('reicht Fehler des Speichers weiter', async () => {
    speicher.fehler = new Error('Speicher nicht erreichbar');
    await expect(ablegen(erhebung, { BLOB_READ_WRITE_TOKEN: 'tok' })).rejects.toThrow('Speicher nicht erreichbar');
  });

  it('schreibt lokal ohne Token in das Verzeichnis submissions', async () => {
    const ziel = await mkdtemp(join(tmpdir(), 'mgim-'));
    expect(await ablegen(erhebung, { MOCK_DIR: ziel })).toBe('lokal');
    const [datei] = await readdir(ziel);
    expect(JSON.parse(await readFile(join(ziel, datei!), 'utf8'))).toEqual(erhebung);
    expect(speicher.aufrufe).toHaveLength(0);
  });
});
