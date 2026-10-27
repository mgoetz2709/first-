# KI-Anonymisierer

Offline-Werkzeug, um Dokumente **vor** der Bearbeitung in einem KI-Tool
(Claude, ChatGPT, Copilot …) zu pseudonymisieren und die KI-Antwort
**danach** wieder mit den Originaldaten zu befüllen.

```
brief.docx ──anonymisieren──► brief.anonym.md  ──► KI-Tool ──► ki-antwort.md
                 │                                                   │
                 └──► brief.zuordnung.json (bleibt lokal) ──wiederherstellen──► ki-antwort.wiederhergestellt.md
```

- **Läuft komplett lokal.** Die Erkennung nutzt [Microsoft Presidio](https://microsoft.github.io/presidio/)
  (Open Source) mit einem deutschen spaCy-Sprachmodell. Nach der einmaligen
  Installation ist keine Internetverbindung mehr nötig.
- **Konsistente Platzhalter:** Derselbe Name wird überall zum selben Platzhalter
  (`[PERSON_1]`), auch über mehrere Dokumente hinweg, wenn dieselbe
  Zuordnungsdatei verwendet wird. So kann die KI Bezüge korrekt herstellen.
- **Anreden bleiben stehen** („Frau [PERSON_1]“, „Dr. [PERSON_3]“), damit die
  KI Geschlecht und Rolle versteht.
- **Word-Dateien behalten ihre Formatierung:** Schriften, Fettdruck, Tabellen,
  Kopf- und Fußzeilen bleiben erhalten – beim Anonymisieren und beim
  Wiederherstellen.
- **Robust gegenüber der KI:** Leicht veränderte Platzhalter (`[person_1]`,
  `[ PERSON_1 ]`) werden trotzdem erkannt; von der KI erfundene Platzhalter
  werden gemeldet.

## Was wird erkannt?

| Platzhalter | Inhalt |
| --- | --- |
| `PERSON`, `ORT`, `ORGANISATION` | Namen, Orte, Firmen/Einrichtungen (Sprachmodell) |
| `ADRESSE`, `PLZ` | Straße + Hausnummer, Postleitzahl |
| `EMAIL`, `TELEFON`, `URL`, `IP` | Kontaktdaten |
| `IBAN`, `KREDITKARTE`, `UST_ID`, `STEUER_ID`, `STEUERNR`, `HANDELSREGISTER` | Finanz- und Unternehmensdaten |
| `KVNR`, `SVNR`, `LANR`, `BSNR` | Kranken-/Sozialversicherungs-, Arzt- und Betriebsstättennummern |
| `AUSWEIS`, `REISEPASS`, `FUEHRERSCHEIN`, `KFZ` | Ausweisdokumente, Kennzeichen |
| `DATUM` | Datumsangaben (z. B. Geburtsdaten) |
| `BEGRIFF` | Eigene Begriffe aus der Begriffsliste |

Einzelne Typen lassen sich mit `--behalten` ausnehmen, z. B. `--behalten DATUM`,
wenn die KI mit Terminen arbeiten soll.

## Installation (einmalig, benötigt Internet)

Voraussetzung: Python 3.10 oder neuer ([python.org](https://www.python.org/downloads/);
unter Windows bei der Installation „Add Python to PATH“ anhaken).

- **Windows:** Doppelklick auf `installieren.bat`
- **macOS:** Doppelklick auf `installieren.command` (beim ersten Mal ggf.
  Rechtsklick → „Öffnen“, weil die Datei nicht aus dem App Store stammt)

Oder manuell:

```bash
cd tools/ki-anonymisierer
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download de_core_news_md
```

Für bessere Namenserkennung (größer, ca. 550 MB) alternativ
`python -m spacy download de_core_news_lg` installieren und beim Start
`--modell de_core_news_lg` angeben.

## Verwendung mit Oberfläche (empfohlen)

Doppelklick auf `starten.bat` (Windows) bzw. `starten.command` (macOS) –
oder `python oberflaeche.py`. Der Browser öffnet sich mit dem Tool.

1. **Vorgang** benennen (z. B. „Pflegebericht Oktober“). Pro Vorgang wird eine
   Zuordnung angelegt; mehrere Dokumente eines Vorgangs teilen sich die Platzhalter.
2. **Anonymisieren:** Datei hineinziehen oder Text einfügen → Ergebnis
   gegenlesen → Text kopieren bzw. anonymisierte Word-Datei herunterladen und
   ins KI-Tool geben.
3. **Wiederherstellen:** Antwort der KI einfügen oder als Datei ablegen → Text
   kopieren oder als Word-Datei herunterladen. Kam eine Word-Datei zurück,
   bleibt deren Formatierung erhalten; eine Text-/Markdown-Antwort wird in ein
   formatiertes Word-Dokument umgewandelt (Überschriften, Listen, Tabellen, Fettdruck).

Die Oberfläche läuft nur auf diesem Rechner (`127.0.0.1`), ist aus dem Netzwerk
nicht erreichbar und lädt keine externen Inhalte. Zuordnungen und Begriffsliste
liegen im Arbeitsordner `~/KI-Anonymisierer` (änderbar mit `--ordner`).
Beenden mit Strg+C bzw. Schließen des Terminalfensters.

## Verwendung über die Kommandozeile

```bash
# 1. Anonymisieren (.txt, .md, .docx, .pdf)
python ki_anonymisierer.py anonymisieren brief.docx --begriffe begriffe.yaml
#    -> brief.anonym.docx      (formaterhaltend; bei Text/PDF: brief.anonym.md)
#    -> brief.zuordnung.json   (VERTRAULICH, bleibt auf dem Rechner)

# Vorher nur prüfen, was ersetzt würde:
python ki_anonymisierer.py anonymisieren brief.docx --nur-pruefen

# 2. KI-Antwort als Datei speichern, z. B. ki-antwort.md oder ki-antwort.docx

# 3. Wiederherstellen (.docx bleibt formatiert; -o ergebnis.docx wandelt Markdown in Word um)
python ki_anonymisierer.py wiederherstellen ki-antwort.md -z brief.zuordnung.json -o ergebnis.docx
```

Mehrere Dokumente zu einem Vorgang? Einfach dieselbe Zuordnungsdatei angeben
(`-z vorgang.zuordnung.json`) — sie wird erweitert, die Platzhalter bleiben stabil.

### Begriffslisten

Kein Sprachmodell erkennt jeden Namen zuverlässig. Für wiederkehrende Namen
(Mandanten, Einrichtungen, Projekte) `begriffe.beispiel.yaml` nach
`begriffe.yaml` kopieren und ergänzen:

- `immer_anonymisieren`: wird immer ersetzt, egal ob erkannt oder nicht
- `nie_anonymisieren`: Fachbegriffe, die fälschlich als Name erkannt werden

Begriffe ohne passenden Typ (Projekt-, Produktnamen …) unter `BEGRIFF` eintragen
→ Platzhalter `[BEGRIFF_1]`. In der Oberfläche wird die Liste unten auf der
Seite gepflegt (Format `TYP: Begriff`, ohne Typ → `BEGRIFF`).

## Wichtige Hinweise

- **Gegenlesen.** Die Erkennung ist gut, aber nicht perfekt. Den anonymisierten
  Text vor dem Hochladen kurz durchsehen; die Liste der Funde wird nach jedem
  Lauf angezeigt.
- **Pseudonymisierung ≠ Anonymisierung im Sinne der DSGVO.** Solange die
  Zuordnungsdatei existiert, sind die Daten rückführbar. Inhaltliche Details
  (seltene Diagnosen, Ereignisse, Berufe) können eine Person auch ohne Namen
  identifizierbar machen — das erkennt kein Werkzeug automatisch.
- **Zuordnungsdatei schützen.** Sie enthält alle Originaldaten. Sie wird mit
  eingeschränkten Dateirechten gespeichert, gehört aber trotzdem in einen
  geschützten Ordner und nie in ein KI-Tool oder ein Git-Repository
  (die `.gitignore` in diesem Ordner verhindert Letzteres).
- **Word:** Ersetzt werden Fließtext, Tabellen, Textfelder sowie Kopf- und
  Fußzeilen; Autor und Titel werden aus den Dokumenteigenschaften entfernt.
  Fußnoten, Kommentare, nachverfolgte Änderungen und Text in Bildern werden
  **nicht** bearbeitet – vor dem Hochladen in Word über „Dokument prüfen“ entfernen.
- **PDF:** Nur der Text wird übernommen (Ergebnis als Text/Markdown);
  eingescannte Seiten ohne Texterkennung funktionieren nicht.

## Tests

```bash
pip install pytest
python -m pytest tests
```
