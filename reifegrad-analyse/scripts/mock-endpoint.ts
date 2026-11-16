/**
 * Eigenständiger Mock für einen externen SUBMIT_ENDPOINT (mit CORS). Für die
 * normale Entwicklung nicht nötig: `npm run dev` bringt /api/submit mit.
 * Nur für Entwicklung und Tests:
 * nimmt POST /submit entgegen, prüft gegen das Schema und schreibt die
 * Einsendung als Datei nach ./submissions (steht in .gitignore).
 *
 * Start: npm run mock   (Port über MOCK_PORT änderbar, Standard 8787)
 */
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { EinsendungSchema } from '../src/lib/schema';

const PORT = Number(process.env.MOCK_PORT ?? 8787);
const ZIEL = resolve(process.env.MOCK_DIR ?? 'submissions');
const MAX_BYTES = 100_000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const server = createServer(async (req, res) => {
  const antworte = (status: number, inhalt: unknown) => {
    res.writeHead(status, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(inhalt));
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.url !== '/submit') {
    antworte(404, { ok: false, fehler: 'Nur POST /submit' });
    return;
  }

  const teile: Buffer[] = [];
  let groesse = 0;
  for await (const teil of req) {
    groesse += (teil as Buffer).length;
    if (groesse > MAX_BYTES) {
      antworte(413, { ok: false, fehler: 'Zu groß' });
      return;
    }
    teile.push(teil as Buffer);
  }

  let daten: unknown;
  try {
    daten = JSON.parse(Buffer.concat(teile).toString('utf8'));
  } catch {
    antworte(400, { ok: false, fehler: 'Kein gültiges JSON' });
    return;
  }

  const pruefung = EinsendungSchema.safeParse(daten);
  if (!pruefung.success) {
    antworte(422, { ok: false, fehler: 'Schema verletzt', details: pruefung.error.issues });
    return;
  }

  const e = pruefung.data;
  const stempel = new Date().toISOString().replace(/[:.]/g, '-');
  const datei = `${e.kunde_kuerzel}_${e.antworten[0]!.rolle}_${stempel}.json`;
  await mkdir(ZIEL, { recursive: true });
  await writeFile(join(ZIEL, datei), JSON.stringify(e, null, 2) + '\n', 'utf8');
  console.log(`gespeichert: submissions/${datei}`);
  antworte(201, { ok: true, datei });
});

server.listen(PORT, () => {
  console.log(`Mock-Endpoint: http://localhost:${PORT}/submit  ->  ${ZIEL}`);
});
