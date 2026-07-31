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

## Setup

```bash
cp .env.example .env
# .env: ANTHROPIC_API_KEY eintragen

npm install
npm run db:push   # legt die SQLite-Datenbank an
npm run dev
```

App läuft danach auf http://localhost:3000.

## Ablauf in der App

1. **Kunde anlegen** und AI-Strategie hinterlegen (Reifegrad, Risikobereitschaft, erlaubte
   Tools, Governance) – verbindlicher Rahmen für jede Pipeline-Stufe.
2. **Prozess anlegen**, mindestens ein Interview erfassen und strukturieren.
3. Dokumentation erstellen → Pain Points analysieren → Validierung ausführen → bei Bedarf
   Korrekturrunde(n) → Lösungskonzepte entwerfen → priorisieren → Artefakte generieren →
   Abschlussbericht erstellen.

## Tech-Stack

Next.js (App Router, Server Actions) · TypeScript · Prisma + SQLite · Anthropic SDK (Claude) · Tailwind CSS
