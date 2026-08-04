# Process AI Navigator

Web-App zur E2E-Prozessanalyse: Interviews mit Process Ownern/Experten und ergänzende
Prozessdokumentation werden erfasst und in einer gestuften, gate-basierten Pipeline gegen die
kundenspezifische AI-Strategie analysiert — bis hin zu konkreten, priorisierten Lösungskonzepten
und einem formalen Abschlussbericht.

## Pipeline

1. **Interview** – Interviews sind Pflicht-Quelle; Prozessdokumente sind immer nur
   Ergänzung, nie alleinige Quelle. Jedes Interview wird nach der Fünf-Phasen-Methodik
   (Scope, Happy Path, Decision Points, Exceptions, Handoffs & Metrics) strukturiert.
2. **Dokumentation** – konsolidiert alle strukturierten Interviews + Dokumente zu
   Prozessschritten, Decision Points, Exceptions, Handoffs, einem Mermaid-Diagramm und
   explizit geflaggten Lücken (nie mit Annahmen gefüllt).
3. **Pain Points** – kategorisiert und priorisiert Probleme (7 Kategorien, Frequenz,
   Impact) ausschließlich auf Basis der Dokumentation, inkl. Top-3-Zusammenfassung.
4. **Validierung** – Qualitäts-Gate: prüft Dokumentation und Pain-Point-Report
   zusammen, nie isoliert. Bei Problemen: hybrider Korrektur-Loop — interne Nachbesserung
   bei vorhandenen aber falsch verarbeiteten Daten, Rückfragen an den
   Stakeholder bei echten Wissenslücken. Volle Freigabe nur wenn beide Listen leer sind.
5. **Lösungsdesign** – erst nach voller Freigabe. Pro Pain Point ein konzeptionelles
   Lösungskonzept aus dem 5-Wege-Spektrum Prompt / AI Agent / Automation / Template /
   Vibe-Code-System (minimal wirksame Lösung, kein Automatismus zu "Agent"), jeweils mit
   drei Impact-Dimensionen (Zeitersparnis, Qualität, Vertrauen). Der Berater priorisiert
   manuell die relevanten Konzepte.
6. **Artefakte** – nur für priorisierte Konzepte: fertiger Prompt-Text, Agent-Spezifikation,
   Automation-Spec, Template/Checkliste oder Vibe-Code-Build-Brief.
7. **Abschlussbericht** – formaler, kundenpräsentationsfähiger Report in deutscher
   Geschäftssprache mit Executive Summary, Konzeptbeschreibungen, priorisierten Konzepten
   und nächstem Schritt.

## Setup (lokal)

Für lokale Entwicklung reicht eine beliebige Postgres-Instanz (lokal installiert, Docker,
oder direkt schon die spätere Neon/Vercel-Datenbank).

```bash
cp .env.example .env
# .env: DATABASE_URL + DIRECT_URL (lokales Postgres reicht, z.B. postgresql://user:pass@localhost:5432/db),
# ANTHROPIC_API_KEY eintragen. APP_PASSWORD lokal leer lassen, dann kein Login nötig.

npm install
npm run db:push
npm run dev
```

App läuft danach auf http://localhost:3000.

## Deployment (Vercel)

1. **Repo verbinden**: In Vercel → "Add New Project" → dieses GitHub-Repo auswählen.
   Next.js wird automatisch erkannt, keine Build-Einstellungen nötig.
2. **Datenbank anlegen**: Im Vercel-Projekt unter "Storage" → "Create Database" →
   Postgres (powered by Neon). Vercel legt automatisch mehrere Env-Vars an; davon
   brauchst du:
   - `DATABASE_URL` = Wert von `POSTGRES_PRISMA_URL` (gepoolte Verbindung, für den
     laufenden Betrieb)
   - `DIRECT_URL` = Wert von `POSTGRES_URL_NON_POOLING` (direkte Verbindung, für
     `prisma db push`/Migrationen)
3. **Weitere Env-Vars setzen** (Project Settings → Environment Variables):
   - `ANTHROPIC_API_KEY` – dein Anthropic-API-Key
   - `APP_PASSWORD` – ein gemeinsames Passwort für den Zugriffsschutz. **Ohne diese
     Variable ist die App komplett offen** (jeder mit der URL hat vollen Zugriff auf
     alle Kundendaten) – für Produktivbetrieb also unbedingt setzen.
4. **Schema auf die Datenbank bringen**: einmalig lokal mit den Vercel-Postgres-
   Zugangsdaten in `.env` ausführen: `npx prisma db push`. Bei jeder Schemaänderung
   danach erneut.
5. **Deploy** anstoßen (passiert bei verbundenem Repo automatisch bei jedem Push auf
   den Produktions-Branch).

Der Zugriffsschutz ist ein einfacher, für die ganze App gemeinsamer Passwortschutz
(HTTP Basic Auth, Benutzername beliebig) – ausreichend für internen/Team-Gebrauch,
aber kein Ersatz für individuelle Accounts, falls später mehrere Kollegen mit
unterschiedlichen Rechten arbeiten sollen.

## Ablauf in der App

1. **Kunde anlegen** und AI-Strategie hinterlegen (Reifegrad, Risikobereitschaft, erlaubte
   Tools, Governance) – verbindlicher Rahmen für jede Pipeline-Stufe.
2. **Prozess anlegen**, mindestens ein Interview erfassen und strukturieren.
3. Dokumentation erstellen → Pain Points analysieren → Validierung ausführen → bei Bedarf
   Korrekturrunde(n) → Lösungskonzepte entwerfen → priorisieren → Artefakte generieren →
   Abschlussbericht erstellen.

## Tech-Stack

Next.js (App Router, Server Actions) · TypeScript · Prisma + Postgres · Anthropic SDK (Claude) · Tailwind CSS
