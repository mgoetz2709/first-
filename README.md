# Process AI Navigator

Web-App zur E2E-Prozessanalyse: Interviews mit Process Ownern/Experten und vorhandene
Prozessdokumentation werden erfasst und gegen die kundenspezifische AI-Strategie analysiert.
Für jedes gefundene Problem wird eine Lösung klassifiziert und als konkretes Artefakt generiert:

- **Engineered Prompt** – für einmalige/seltene Probleme (Action-Prinzip)
- **AI Agent** – für wiederkehrende, klar definierte Teilaufgaben
- **Vibe-Code System** – für Probleme, die eine echte Software-/Tooling-Lösung brauchen (z.B. umsetzbar mit Claude Code)

## Setup

```bash
cp .env.example .env
# .env: ANTHROPIC_API_KEY eintragen

npm install
npm run db:push   # legt die SQLite-Datenbank an
npm run dev
```

App läuft danach auf http://localhost:3000.

## Ablauf

1. **Kunde anlegen** und AI-Strategie hinterlegen (Reifegrad, Risikobereitschaft, erlaubte Tools, Governance) – dieser Text ist der verbindliche Rahmen für alle Analysen des Kunden.
2. **Prozess anlegen** und Prozessschritte erfassen.
3. **Interviews** mit Process Ownern/Experten als Transkript/Notizen einfügen, **Prozessdokumentation** hochladen oder einfügen.
4. **Analyse starten** – ein Claude-Aufruf identifiziert Findings je Prozessschritt und schlägt klassifizierte, sofort nutzbare Lösungsartefakte vor.
5. Findings & Empfehlungen prüfen, Artefakte bei Bedarf bearbeiten und Status pflegen (Entwurf → Review → Freigegeben → Umgesetzt).

## Tech-Stack

Next.js (App Router, Server Actions) · TypeScript · Prisma + SQLite · Anthropic SDK (Claude) · Tailwind CSS
