# ESt-Vorauszahlungs-Monitor

Planungswerkzeug für einen selbständigen Unternehmensberater: vergleicht die festgesetzten
Einkommensteuer-Vorauszahlungen mit der erwarteten Jahressteuer und leitet eine Empfehlung ab.
Ersetzt keine Steuerberatung.

```bash
pip install pyyaml pytest
```

```bash
python3 -m pytest
```

```bash
bash beispiel/testlauf.sh
```

Der Testlauf arbeitet mit fiktiven Daten und schreibt `beispiel/reports/status_2026-03.html`.
Für die eigene Nutzung Claude Code in diesem Ordner starten und `/bescheid`, `/vertrag`, `/monat`,
`/status` verwenden. Regeln, Datenmodell und Rechenlogik stehen in `CLAUDE.md`.

Echte Daten (`data/`, `inbox/`, `archiv/`, `reports/`) sind per `.gitignore` von der
Versionierung ausgeschlossen.
