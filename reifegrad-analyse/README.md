# MGIM KI-Reifegrad-Analyse

Einseitige Landingpage mit Online-Fragebogen. Eigenständiges Astro-Projekt im
Unterordner `reifegrad-analyse/`; die MGIM-Website (Next.js) im Repo-Root ist
davon unabhängig.

Stand: Entwurf. Texte, Stufentexte und Rechtsseiten enthalten Platzhalter in
eckigen Klammern.

## Start

Voraussetzung: Node.js 22 oder neuer.

```bash
cd reifegrad-analyse
npm install
npm run dev     # Seite und /api/submit auf http://localhost:4321
```

Der Fragebogen öffnet sich nur mit Kürzel: <http://localhost:4321/?k=K-001>.
Ohne gültiges Kürzel (Format `K-` plus drei Ziffern) bleibt er gesperrt.

Lokal schreibt `/api/submit` jede Einsendung nach `./submissions/` (nicht im
Git), solange keine Drive-Variablen gesetzt sind.

## Befehle

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver mit `/api/submit` |
| `npm run build` | Typprüfung und Build für Vercel (`.vercel/output`) |
| `npm test` | Tests für Schema und Ablage (Vitest, Zod) |
| `npm run mock` | Eigenständiger Mock auf Port 8787, nur für Tests mit externem `SUBMIT_ENDPOINT` |

## Wohin die Antworten gehen

Der Browser sendet das JSON an `/api/submit` (gleiche Domain, daher kein CORS).
Die Route läuft auf Vercel als Function in Frankfurt (`vercel.json`), prüft die
Einsendung gegen das Schema (`src/lib/schema.ts`) und legt sie als Datei
`<Kürzel>_<Rolle>_<Zeitstempel>.json` in einem Google-Drive-Ordner ab
(`src/lib/ablage.ts`). Der Inhalt wird nicht protokolliert.

| Variable | Zweck |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-Mail-Adresse des Dienstkontos |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Privater Schlüssel des Dienstkontos (geheim) |
| `GOOGLE_DRIVE_FOLDER_ID` | Zielordner in einer geteilten Ablage |
| `ERLAUBTE_KUERZEL` | optional: nur diese Kürzel annehmen, z. B. `K-001,K-002` |
| `SUBMIT_ENDPOINT` | optional: anderer Endpoint statt `/api/submit` |

Auf Vercel ohne Drive-Variablen antwortet die Route mit 503 und speichert nichts.

### Google einrichten (einmalig, Google Workspace)

1. In Google Drive eine **geteilte Ablage** anlegen, darin einen Ordner für die
   Einsendungen. Ein Ordner in „Meine Ablage" genügt nicht: Dienstkonten haben
   keinen eigenen Speicherplatz.
2. In der Google Cloud Console ein Projekt anlegen und die **Google Drive API**
   aktivieren.
3. Unter „IAM und Verwaltung → Dienstkonten" ein Dienstkonto erstellen, dann
   „Schlüssel → Schlüssel hinzufügen → JSON". Die Datei sicher aufbewahren.
4. Die E-Mail-Adresse des Dienstkontos in der geteilten Ablage als
   **Mitbearbeiter** hinzufügen.
5. Die Ordner-ID ist der letzte Teil der Ordner-URL
   (`.../folders/<ID>`).

Speicherort, Auftragsverarbeitung (Google, Vercel) und Einwilligung sind vor
dem Livegang rechtlich zu klären.

## Deploy auf Vercel

1. **Add New → Project**, dieses GitHub-Repo importieren (zusätzlich zum
   bestehenden Projekt der Website).
2. **Root Directory:** `reifegrad-analyse`. **Framework Preset:** Astro. Build-
   und Output-Einstellungen unverändert lassen.
3. **Environment Variables:** die drei `GOOGLE_*`-Variablen eintragen. Aus der
   JSON-Schlüsseldatei: `client_email` und `private_key` (den Wert ohne die
   äußeren Anführungszeichen, mit den `\n` wie in der Datei).
4. **Deploy.** Nach jeder Änderung an Variablen neu deployen.
5. **Settings → Domains:** Domain zuweisen.

Hinweis: `npm audit` meldet eine Schwachstelle in `path-to-regexp`, das der
Vercel-Adapter nur beim Build verwendet. Die Route nimmt darüber keine
Nutzereingaben entgegen. Mit einem Adapter-Update beheben, sobald verfügbar.

## Inhalte pflegen

| Was | Wo |
| --- | --- |
| Stufentexte, Fragen, Phasen-Zuordnung, Rollenbezeichnungen | `src/data/dimensionen.json` |
| Texte der Abschnitte, Einwilligungstext | `src/data/inhalte.ts` |
| Impressum, Datenschutz | `src/pages/impressum.astro`, `src/pages/datenschutz.astro` |
| Logo | `public/brand/`, `src/components/Logo.astro` |
| Farben | `src/styles/global.css` (CSS-Variablen) |

Die IDs `D1` bis `D11` und die Rollenwerte sind Teil des Ausgabe-Schemas und
dürfen nicht umbenannt werden. Ein Test prüft, dass `dimensionen.json` dazu passt.

## Struktur

```
public/fonts/        Barlow 600/700, Inter 400 (woff2, OFL-Lizenzen liegen bei)
scripts/             mock-endpoint.ts (optional)
src/components/      Abschnitte, Fragebogen.astro, fragebogen.ts (Insel-Skript)
src/data/            dimensionen.json, inhalte.ts
src/layouts/         Basis.astro
src/lib/             erhebung.ts (JSON bauen), schema.ts (Zod), ablage.ts (Drive)
src/pages/           index, impressum, datenschutz, api/submit.ts
src/styles/          global.css
tests/               schema.test.ts, ablage.test.ts
```

## Datenschutz-Eigenschaften der Technik

- Keine externen Requests beim Laden: Fonts und Skripte liegen im Projekt.
- Der Browser spricht nur mit der eigenen Domain. Google Drive wird
  ausschließlich vom Server angesprochen.
- Keine Cookies, kein Tracking. Zwischenstand und Kürzel liegen im
  `sessionStorage` und verschwinden mit dem Schließen des Fensters; der
  Zwischenstand wird nach erfolgreichem Absenden gelöscht.
- Es wird kein Name erhoben. Das Schema lehnt zusätzliche Felder ab.
