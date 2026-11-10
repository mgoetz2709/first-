# ESt-Vorauszahlungs-Monitor

Planungswerkzeug für einen selbständigen Unternehmensberater: vergleicht die festgesetzten
Einkommensteuer-Vorauszahlungen mit der erwarteten Jahressteuer und leitet eine Empfehlung ab.
Ersetzt keine Steuerberatung.

## Benutzen

1. `app/steuer-monitor.html` herunterladen und per Doppelklick im Browser öffnen.
2. Zum Ausprobieren oben rechts „Beispieldaten“ wählen.
3. Eigene Daten erfassen (Einstellungen, Bescheide, Verträge, Eingänge) und mit „Speichern“ als
   `steuer-daten.json` auf dem eigenen Rechner ablegen. Beim nächsten Mal „Datei öffnen“.

Die App braucht keine Installation und keine Internetverbindung. Deine Daten bleiben in deiner Datei.

## Entwickeln

Regeln, Aufbau und Rechenlogik stehen in `CLAUDE.md`.

```bash
pip install pyyaml pytest openpyxl
```

```bash
python3 app/bauen.py && python3 -m pytest
```
