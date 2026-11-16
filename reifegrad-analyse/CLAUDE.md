# MGIM KI-Reifegrad-Analyse: Regeln für Änderungen

Astro (Seiten statisch, eine Server-Route `/api/submit` über den Vercel-Adapter),
TypeScript strict, Tailwind 3 über PostCSS, Fragebogen als Vanilla-TS-Insel.
Befehle: `npm run dev`, `npm run build`, `npm test`. Sprache der Seite: Deutsch, Sie-Form, direkt, ergebnisorientiert.
Keine Buzzwords („holistisch", „Synergien", „innovative Lösungen").

Dieses Projekt liegt im Unterordner `reifegrad-analyse/`. Die Next.js-Website
im Repo-Root gehört nicht dazu und wird nicht verändert.

## Arbeitsweise

- Bei Widersprüchen oder offenen CI-Punkten fragen, nicht improvisieren.
- Nicht committen ohne Okay des Auftraggebers.
- Keine Platzhalter auf der Seite. Fehlende Fakten (Zahlen, Preise) weglassen
  und beim Auftraggeber erfragen. Angaben zu Person, Mandaten, Kontakt und
  Impressum stammen von www.markusgoetz.net. Keine Kundenlogos, Testimonials
  oder Statistiken erfinden.
- Nach Änderungen an der Oberfläche: Screenshots bei 390, 768 und 1280 px
  prüfen, Lighthouse (Performance, Accessibility, SEO je ≥ 95).

## CI (verbindlich)

Leitfrage: Wirkt es wie ein erfahrener Interim Manager oder wie ein Chatbot?
Im Zweifel mehr Weißraum, weniger Farbe, stärkere Struktur.

### Farben

Als CSS-Variablen in `src/styles/global.css`, benannt in `tailwind.config.ts`.
Keine anderen Farben, keine Hex-Werte in Komponenten.

| Name | Wert | Verwendung |
| --- | --- | --- |
| MG Grey | `#6D6E71` | Headlines H1/H3, Struktur |
| MG Blue | `#3A9AC9` | Akzent, CTAs, Trennlinien. Nie dominant |
| Near Black | `#231F20` | Fließtext, H2 |
| Light Grey | `#E8E8E9` | Boxen, Tabellenzeilen |
| Mid Grey | `#A8A9AD` | Captions, Labels, Footer (siehe Kontrast) |
| Off White | `#F5F5F5` | Hintergrund |
| Deep Blue | `#1F6A9A` | sparsam |

Höchstens 3 Palettenfarben pro Layoutelement.

### Kontrast (WCAG AA, mit dem Auftraggeber abgestimmt)

- MG Blue nie als Fließtext. Nur Flächen, Linien und große Schrift.
  Fließtext-Links in Deep Blue.
- Mid Grey als Text nur auf Near Black (Footer). Captions und Labels auf hellem
  Grund in MG Grey (4,68:1 auf Off White).
- CTA: MG-Blue-Fläche mit Near-Black-Schrift (5,16:1). Weiß auf MG Blue hat nur 3,16:1.
- Auf Light Grey steht Text in Near Black (MG Grey hätte nur 4,16:1), Links in Deep Blue.

### Schrift

- Headlines: Barlow Bold/SemiBold. Body: Inter Regular. Fallback Arial.
- Selbst gehostet (`public/fonts/*.woff2`). Kein Google-Fonts-CDN.
- Inter ist nur in Regular eingebunden; Hervorhebungen laufen über Barlow SemiBold.
- Fließtext linksbündig, nie zentriert. Zeilenhöhe Body 1,5, Headlines 1,2.
- Labels mit Letter Spacing +0.02 em (`tracking-label`). Festgelegt.

### Gestaltung

- Keine Verläufe, keine Schatten, keine Clip Art, keine Stock-Fotos.
- Keine Animationen außer einem dezenten Fokus-/Hover-Zustand.
- Signature-Element: diagonaler blauer Slash (`Slash.astro`, SVG) als Divider
  oder Bullet-Akzent. Sparsam.
- Highlight-Boxen: Light-Grey-Hintergrund, 4 px MG-Blue-Rand links (`.highlight-box`).
- Logo: Originaldateien unter `public/brand/` (`Logo.astro`): Farbvariante auf
  hellem Grund (Header), Weißvariante auf Near Black (Footer). Nicht nachbauen,
  nicht verzerren (Seitenverhältnis 226:90), nicht umfärben.
- Mobile first, danach Tablet und Desktop.

## Fragebogen

- 11 Dimensionen D1 bis D11, je Stufe 1 bis 3 (1 = ad hoc, 2 = teilweise,
  3 = etabliert). Rollen: Geschaeftsfuehrung, IT, Fachbereich, Betriebsrat, Datenschutz.
- Texte und Phasen-Zuordnung stehen in `src/data/dimensionen.json`, nicht im Code.
- Sechs Schritte: Start (Rolle, Richtlinien-Check), vier Phasen, Prüfen und absenden.
- Kürzel kommt aus `?k=K-001` (Format `K-` plus drei Ziffern). Ohne Link ist
  der Fragebogen trotzdem ausfüllbar: Schritt 1 zeigt ein optionales Feld für
  das Kürzel; bleibt es leer, wird `K-000` (ohne Zuordnung) gesendet.
  Es wird nie ein Klarname erhoben.
- Eine Einsendung = eine Rolle, alle 11 Dimensionen. Freitext optional
  (max. 1000 Zeichen), leer wird er weggelassen. Am Freitextfeld steht der
  Hinweis: keine Namen, keine Kundendaten, keine personenbezogenen Daten.
- Zwischenspeicherung nur im `sessionStorage`. Tastaturbedienung und sichtbare
  Fokuszustände müssen erhalten bleiben.
- Absenden: POST an `/api/submit` (`SUBMIT_ENDPOINT` überschreibt das beim Build).
  Die Route prüft gegen das Schema und legt in einem privaten
  Vercel-Blob-Speicher ab (`src/lib/ablage.ts`, immer `access: 'private'`);
  lokal ohne Token nach `./submissions`.
- Die Route protokolliert keine Inhalte von Einsendungen. Zugangsdaten nur als
  Environment Variables, nie im Repo.

### Ausgabe-Schema (exakt, nicht ändern ohne Rücksprache)

```json
{
  "kunde_kuerzel": "K-001",
  "erhebung_datum": "YYYY-MM-DD",
  "richtlinie_check": { "richtlinie_vorhanden": "ja|nein|unklar", "restriktionen_claude": "ja|nein|unklar" },
  "antworten": [ { "rolle": "Geschaeftsfuehrung|IT|Fachbereich|Betriebsrat|Datenschutz", "dimension": "D1", "stufe": 1, "freitext": "optional" } ]
}
```

Umsetzung: `src/lib/schema.ts` (Zod, zusätzliche Felder verboten),
`src/lib/erhebung.ts` (baut das JSON). Jede Änderung braucht passende Tests in
`tests/schema.test.ts` mit gültigen und ungültigen Beispielen.

## Datenschutz und Recht (nur vorbereiten, nicht entscheiden)

- Keine externen Requests beim Laden. Fonts, Skripte lokal; Analytics gar nicht.
- Kein Drittanbieter-Tracking, keine Cookies außer technisch notwendigen
  (derzeit: keine).
- `/impressum` und `/datenschutz` stehen in `src/data/recht.ts`. Impressum und
  allgemeine Abschnitte sind von www.markusgoetz.net übernommen; bei Änderungen
  dort hier nachziehen. Keine Anschrift, Steuernummer oder Rechtstexte erfinden.
- Einwilligungs-Checkbox vor dem Absenden (`fragebogen.einwilligung` in
  `src/data/inhalte.ts`). Text und der Abschnitt zum Fragebogen in der
  Datenschutzerklärung sind noch nicht anwaltlich geprüft.
- Ändert sich die Verarbeitung (Speicherort, Dienstleister, erhobene Felder),
  müssen Einwilligungstext und Datenschutzerklärung mitgeändert werden.
- Die rechtliche Prüfung liegt beim Auftraggeber.
