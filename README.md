# Markus Goetz Interim Management (MGIM) — Website

Relaunch der MGIM-Webseite gemäß `MGIM_Projektanweisung_Claude_Code.md`. Next.js
(App Router) + Tailwind CSS, kein CMS — Inhalte liegen als strukturierte
JSON-Content-Dateien im Repository.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** — Farben/Fonts zentral in `src/app/globals.css` (`@theme`)
  und `src/lib/fonts.ts`. Entspricht dem MGIM Corporate Identity Guide v2
  (MG Grey #6D6E71, MG Blue #3A9AC9, Near Black #231F20; Headlines in Barlow,
  Fließtext in Inter). Logo-Assets liegen unter `public/brand/` (Farb- und
  Weiß-Variante) sowie `src/app/icon.png` (Monogramm-Favicon).
- **Kein CMS.** Inhalte pro Seite/Angebot als JSON unter `src/content/*.json`.
- **Serverless Functions** für Kontaktformular (`/api/contact`), den
  AI-Potenzial-Scout (`/api/agent`) und die Double-Opt-In-Anmeldung
  (`/api/newsletter-signup`, `/api/newsletter-confirm`) — laufen auf Vercel
  ohne weitere Anpassung.

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local   # optional: echte Keys/URLs eintragen
npm run dev
```

Ohne gesetzte Umgebungsvariablen laufen Kontaktformular, AI-Potenzial-Scout
und Double-Opt-In-Versand im **Mock-Modus** (siehe unten) — die Seite ist
vollständig nutz- und testbar, ohne dass Zugangsdaten vorliegen müssen.

## Umgebungsvariablen (`.env.example`)

| Variable | Zweck | Ohne Wert |
| --- | --- | --- |
| `NEXT_PUBLIC_CALENDAR_EMBED_URL` | Kalender-Buchungslink-Embed (z. B. Calendly) auf `/kontakt` | Zeigt einen klar erkennbaren Platzhalter |
| `NEXT_PUBLIC_CALENDAR_PROVIDER` | Anzeigename des Anbieters | „Platzhalter-Anbieter“ |
| `RESEND_API_KEY` | Transactional-Mail-Versand für Kontaktformular & Double-Opt-In | Versand loggt die Mail serverseitig (Mock), gibt aber Erfolg zurück |
| `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` | Empfänger/Absender der Formular-/Scout-Mails | Fallback-Adressen |
| `ANTHROPIC_API_KEY` | Aktiviert den echten AI-Potenzial-Scout (`/v1/messages`) | Scout antwortet mit einer klar gekennzeichneten Demo-Antwort |
| `ANTHROPIC_MODEL` | Modell für den Scout | `claude-sonnet-5` |
| `AGENT_MAX_TOKENS` | Harte `max_tokens`-Obergrenze pro Antwort | `300` (serverseitig nicht über 300 hinaus konfigurierbar) |
| `AGENT_MAX_TURNS` | Max. Antworten pro Sitzung — serverseitiger Hard Stop, unabhängig vom System-Prompt | `6` (max. 20) |
| `AGENT_SESSION_TTL_MS` | Gültigkeitsdauer des Session-Cookies in ms | `1800000` (30 Min.) |
| `AGENT_RATE_LIMIT_SECRET` | Signierschlüssel für das Session-Cookie | **In Produktion zwingend setzen** (z. B. `openssl rand -hex 32`) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Geteilter Zustand für IP-Limit & Tages-/Monatsbudget (Upstash Redis REST API) | IP-Limit und Budget-Deckel inaktiv — nur das Session-Turn-Limit greift |
| `AGENT_MAX_SESSIONS_PER_IP_DAY` | Max. neue Scout-Sitzungen pro IP pro Tag | `2` (max. 50; nur mit Redis aktiv) |
| `AGENT_DAILY_BUDGET_USD` / `AGENT_MONTHLY_BUDGET_USD` | Kostendeckel, danach pausiert der Scout automatisch | `5` / `50` USD (nur mit Redis aktiv) |
| `AGENT_PRICE_INPUT_PER_MTOK` / `AGENT_PRICE_OUTPUT_PER_MTOK` | Für die Budgetberechnung hinterlegter Preis pro Mio. Token | Aktuelle Sonnet-5-Preise (siehe Kommentar in `.env.example`) |
| `NEWSLETTER_TOKEN_SECRET` | Signierschlüssel für die Double-Opt-In-Bestätigungslinks | **In Produktion zwingend setzen** (z. B. `openssl rand -hex 32`) |

Alle Variablen sind zentral in `src/lib/env.ts` gekapselt — kein Code außerhalb
dieser Datei liest `process.env` direkt.

## Inhalte pflegen

Alle Seitentexte liegen unter `src/content/*.json` (z. B. `home.json`,
`offers.json`, `ansatz.json`). Platzhaltertexte sind mit `[Platzhalter: ...]`
markiert und beschreiben Länge/Funktion des finalen Texts. Änderungen an
diesen Dateien erfordern keine Anpassung der Komponenten.

Die Inhalte des AI-Potenzial-Scouts (Branchenauswahl, System-Prompt-Bausteine,
Limit-/Fehlermeldungen, E-Mail-Capture-Texte) liegen in `src/content/agent.json`
bzw. `src/lib/agentSystemPrompt.ts` — ebenfalls ohne Code-Änderung anpassbar.

## AI-Potenzial-Scout — Architektur & Sicherheits-/Kostenschutz

Der frühere offene Q&A-Probeagent wurde durch einen strukturierten,
skriptgeführten **AI-Potenzial-Scout** ersetzt (siehe `requirements.md` /
`architecture.md` im Projektkontext): Der Besucher wählt zunächst per Chip
seine Branche (`ChatWidget.tsx`, kein Freitext), danach führt der Scout ein
kurzes, geführtes Erstgespräch (max. 3-4 Fragen) und liefert erste
AI-Ansatzpunkte.

**Wichtig:** Alle Limits sind serverseitig hart durchgesetzt, unabhängig vom
System-Prompt — ein Prompt-Injection-Versuch im Chat kann sie nicht umgehen,
weil sie vor bzw. unabhängig vom Modellaufruf greifen:

- **Session-Turn-Limit** (`src/lib/rateLimit.ts`): signiertes, httpOnly
  Cookie pro Sitzung, serverseitig generierte Session-ID (dem Client nicht
  vertraut), Standard 6 Antworten/Sitzung — unabhängig vom Redis-Setup immer
  aktiv.
- **IP-Limit & Tages-/Monatsbudget** (`src/lib/redis.ts`,
  `src/app/api/agent/route.ts`): max. 2 neue Sitzungen pro IP/Tag sowie ein
  Kostendeckel, der den Scout bei Erreichen automatisch pausiert. Braucht
  geteilten Zustand über alle Besucher hinweg — dafür Upstash Redis (REST
  API, kein SDK). **Ohne `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`
  sind IP-Limit und Budget-Deckel inaktiv** (Log-Warnung beim Start), nur das
  Session-Turn-Limit greift dann. Für den produktiven Einsatz empfiehlt sich
  die Upstash- bzw. „Vercel KV“-Marketplace-Integration in Vercel — die
  Env-Vars werden dabei i. d. R. automatisch gesetzt.
- **Kostenberechnung**: Nach jedem Modellaufruf werden `input_tokens`/
  `output_tokens` aus der Anthropic-Antwort mit den hinterlegten
  Sonnet-5-Preisen in USD umgerechnet und fire-and-forget in Redis
  aufsummiert (Tages- und Monatszähler mit TTL).
- Harte `max_tokens`-Obergrenze (300) und `AGENT_MAX_TURNS` serverseitig,
  vom Client nicht überschreibbar.
- Strikte Eingabevalidierung (Nachrichtenanzahl, Länge pro Rolle,
  Nutzereingabe max. 300 Zeichen) und Origin-Prüfung, damit die Funktion
  nicht als offener Proxy nutzbar ist.
- System-Prompt und Modell sind serverseitig fest hinterlegt
  (`buildAgentSystemPrompt`) und vom Client nicht beeinflussbar.

**E-Mail-Capture (DSGVO Double-Opt-In):** Bewusst ein vom Chat getrenntes
UI-Element (`emailCapture` in `ChatWidget.tsx`), nicht Teil des Gesprächsflows.
`/api/newsletter-signup` verschickt einen signierten Bestätigungslink
(`src/lib/newsletterToken.ts`, HMAC, 48 h gültig, zustandslos — keine
Datenbank nötig), `/api/newsletter-confirm` prüft den Link und leitet nach
Bestätigung eine Benachrichtigung an `CONTACT_TO_EMAIL` weiter (keine
CRM-Anbindung in diesem Projektumfang, siehe Out-of-Scope in
`requirements.md`).

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
