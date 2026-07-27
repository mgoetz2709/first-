# Markus Goetz Interim Management (MGIM) — Website

Relaunch der MGIM-Webseite gemäß `MGIM_Projektanweisung_Claude_Code.md`. Next.js
(App Router) + Tailwind CSS, kein CMS — Inhalte liegen als strukturierte
JSON-Content-Dateien im Repository.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** — Farben/Fonts zentral in `src/app/globals.css` (`@theme`)
  und `src/lib/fonts.ts`. Platzhalter-Farbpalette/Typografie, siehe Abschnitt 7
  der Projektanweisung; Austausch erfolgt ausschließlich an diesen zwei Stellen.
- **Kein CMS.** Inhalte pro Seite/Angebot als JSON unter `src/content/*.json`.
- **Serverless Functions** für Kontaktformular (`/api/contact`) und Probeagent
  (`/api/agent`) — laufen auf Vercel ohne weitere Anpassung.

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local   # optional: echte Keys/URLs eintragen
npm run dev
```

Ohne gesetzte Umgebungsvariablen laufen Kontaktformular und Probeagent im
**Mock-Modus** (siehe unten) — die Seite ist vollständig nutz- und testbar,
ohne dass Zugangsdaten vorliegen müssen.

## Umgebungsvariablen (`.env.example`)

| Variable | Zweck | Ohne Wert |
| --- | --- | --- |
| `NEXT_PUBLIC_CALENDAR_EMBED_URL` | Kalender-Buchungslink-Embed (z. B. Calendly) auf `/kontakt` | Zeigt einen klar erkennbaren Platzhalter |
| `NEXT_PUBLIC_CALENDAR_PROVIDER` | Anzeigename des Anbieters | „Platzhalter-Anbieter“ |
| `RESEND_API_KEY` | Transactional-Mail-Versand für das Kontaktformular | Formular loggt die Anfrage serverseitig (Mock), gibt aber Erfolg zurück |
| `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` | Empfänger/Absender der Formular-Mails | Fallback-Adressen |
| `ANTHROPIC_API_KEY` | Aktiviert den echten Probeagenten (`/v1/messages`) | Agent antwortet mit einer klar gekennzeichneten Demo-Antwort |
| `ANTHROPIC_MODEL` | Modell für den Probeagenten | `claude-haiku-4-5-20251001` |
| `AGENT_MAX_TOKENS` | Harte Obergrenze pro Antwort | `400` (Serverseitig auf max. 800 gedeckelt) |
| `AGENT_RATE_LIMIT_MAX` | Max. Nachrichten pro Sitzung/Zeitfenster | `15` |
| `AGENT_RATE_LIMIT_WINDOW_MS` | Länge des Zeitfensters in ms | `1800000` (30 Min.) |
| `AGENT_RATE_LIMIT_SECRET` | Signierschlüssel für das Rate-Limit-Cookie | **In Produktion zwingend setzen** (z. B. `openssl rand -hex 32`) |

Alle Variablen sind zentral in `src/lib/env.ts` gekapselt — kein Code außerhalb
dieser Datei liest `process.env` direkt.

## Inhalte pflegen

Alle Seitentexte liegen unter `src/content/*.json` (z. B. `home.json`,
`offers.json`, `ansatz.json`). Platzhaltertexte sind mit `[Platzhalter: ...]`
markiert und beschreiben Länge/Funktion des finalen Texts. Änderungen an
diesen Dateien erfordern keine Anpassung der Komponenten.

Die Wissensbasis des Probeagenten (`src/lib/agentKnowledge.ts`) liest
dieselben Content-Dateien wie die Webseite ein — Agent und Seite laufen damit
nicht auseinander.

## Probeagent — Sicherheits-/Kostenschutz

`/api/agent` (siehe `src/app/api/agent/route.ts`):

- Signiertes, httpOnly Rate-Limit-Cookie pro Besucher/Sitzung (kein
  externer Store nötig), Standard 15 Nachrichten / 30 Minuten
- Harte `max_tokens`-Obergrenze serverseitig, vom Client nicht überschreibbar
- Strikte Eingabevalidierung (Nachrichtenanzahl, Länge, Rollen) und
  Origin-Prüfung, damit die Funktion nicht als offener Proxy nutzbar ist
- System-Prompt und Modell sind serverseitig fest hinterlegt und vom Client
  nicht beeinflussbar

## Deployment (Vercel)

1. Repository in Vercel importieren (Next.js wird automatisch erkannt)
2. Umgebungsvariablen aus `.env.example` in den Projekteinstellungen setzen
3. Deploy — keine weiteren Anpassungen nötig

## Rechtliches

`/impressum` und `/datenschutz` enthalten die vorbereitete Abschnittsstruktur
mit Platzhaltertexten (u. a. Abschnitte zur Verarbeitung durch die Anthropic
API und zur Formularverarbeitung). Finale juristische Texte folgen separat
und können direkt in `src/content/impressum.json` bzw. `datenschutz.json`
eingesetzt werden.
