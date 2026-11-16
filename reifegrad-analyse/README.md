# MGIM KI-Reifegrad-Analyse

Einseitige Landingpage mit Online-Fragebogen. Eigenständiges Astro-Projekt im
Unterordner `reifegrad-analyse/`; die MGIM-Website (Next.js) im Repo-Root ist
davon unabhängig.

Einwilligungstext und der Fragebogen-Abschnitt der Datenschutzerklärung sind
noch nicht anwaltlich geprüft.

## Start

Voraussetzung: Node.js 22 oder neuer.

```bash
cd reifegrad-analyse
npm install
npm run dev     # Seite und /api/submit auf http://localhost:4321
```

Mit persönlichem Link steht das Kürzel fest: <http://localhost:4321/?k=K-001>.
Ohne Link ist der Fragebogen ebenfalls ausfüllbar. Schritt 1 zeigt dann ein
optionales Feld für das Kürzel; bleibt es leer, wird `K-000` (ohne Zuordnung)
gesendet.

Lokal schreibt `/api/submit` jede Einsendung nach `./submissions/` (nicht im
Git), solange kein Speicher-Token gesetzt ist.

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
Einsendung gegen das Schema (`src/lib/schema.ts`) und legt sie als Datei in
einem **privaten Vercel-Blob-Speicher** ab (`src/lib/ablage.ts`):

```
einsendungen/<Kürzel>/<Kürzel>_<Rolle>_<Zeitstempel>-<Zufall>.json
```

Privat heißt: Die Dateien haben keine öffentlich abrufbare Adresse. Der Inhalt
wird nicht protokolliert.

| Variable | Zweck |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Zugang zum Speicher. Setzt Vercel selbst beim Verbinden |
| `ERLAUBTE_KUERZEL` | optional: nur diese Kürzel annehmen, z. B. `K-000,K-001,K-002`. `K-000` aufnehmen, wenn Einsendungen ohne Zuordnung erlaubt sein sollen |
| `SUBMIT_ENDPOINT` | optional: anderer Endpoint statt `/api/submit` |

Auf Vercel ohne verbundenen Speicher antwortet die Route mit 503 und speichert
nichts.

### Speicher einrichten (einmalig)

1. Im Vercel-Projekt links **Storage** öffnen, **Create Database → Blob**.
2. Zugriff **Private** wählen, als Region Frankfurt, falls angeboten.
3. Den Speicher mit dem Projekt verbinden (**Connect Project**), alle
   Umgebungen angehakt lassen.
4. Unter **Deployments** das letzte Deployment über **Redeploy** neu bauen.

### Antworten abholen

Im Vercel-Dashboard unter **Storage → (Speicher) → Browser** liegen die Dateien
im Ordner `einsendungen/`, je Kürzel ein Unterordner. Dort lassen sie sich
herunterladen und löschen.

Speicherort, Auftragsverarbeitung (Vercel) und Einwilligung sind vor dem
Livegang rechtlich zu klären.

## Deploy auf Vercel

1. **Add New → Project**, dieses GitHub-Repo importieren (zusätzlich zum
   bestehenden Projekt der Website).
2. **Root Directory:** `reifegrad-analyse`. **Framework Preset:** Astro. Build-
   und Output-Einstellungen unverändert lassen.
3. **Deploy.**
4. Speicher einrichten (siehe oben) und neu deployen.
5. **Settings → Domains:** Domain zuweisen.

Hinweis: `npm audit` meldet eine Schwachstelle in `path-to-regexp`, das der
Vercel-Adapter nur beim Build verwendet. Die Route nimmt darüber keine
Nutzereingaben entgegen. Mit einem Adapter-Update beheben, sobald verfügbar.

## Inhalte pflegen

| Was | Wo |
| --- | --- |
| Stufentexte, Fragen, Phasen-Zuordnung, Rollenbezeichnungen | `src/data/dimensionen.json` |
| Texte der Abschnitte, Einwilligungstext | `src/data/inhalte.ts` |
| Impressum, Datenschutz | `src/data/recht.ts` |
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
src/lib/             erhebung.ts (JSON bauen), schema.ts (Zod), ablage.ts (Vercel Blob)
src/pages/           index, impressum, datenschutz, api/submit.ts
src/styles/          global.css
tests/               schema.test.ts, ablage.test.ts
```

## Datenschutz-Eigenschaften der Technik

- Keine externen Requests beim Laden: Fonts und Skripte liegen im Projekt.
- Der Browser spricht nur mit der eigenen Domain. Der Speicher wird
  ausschließlich vom Server angesprochen.
- Keine Cookies, kein Tracking. Zwischenstand und Kürzel liegen im
  `sessionStorage` und verschwinden mit dem Schließen des Fensters; der
  Zwischenstand wird nach erfolgreichem Absenden gelöscht.
- Es wird kein Name erhoben. Das Schema lehnt zusätzliche Felder ab.
