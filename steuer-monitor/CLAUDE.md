# ESt-Vorauszahlungs-Monitor

Prüft laufend, ob die festgesetzten Einkommensteuer-Vorauszahlungen zum tatsächlichen und
prognostizierten Gewinn eines selbständigen Unternehmensberaters passen (EÜR, Zuflussprinzip).
Claude Code ist die Oberfläche. Claude Code in diesem Ordner (`steuer-monitor/`) starten, damit
die Slash-Commands gefunden werden.

## Regeln

1. **Keine Steuerberechnung im Kopf.** Jede Zahl im Chat und in Reports stammt aus `./estmon`.
   Claude extrahiert Dokumente und führt den Dialog, mehr nicht. Ausgaben des Rechenkerns werden
   unverändert wiedergegeben.
2. **Erst bestätigen, dann speichern.** Extrahierte Werte werden gezeigt (mit Fundstelle) und erst
   nach ausdrücklichem OK in `data/` geschrieben. Bei unklaren Dokumenten nachfragen, nicht raten.
3. **Alles bleibt lokal.** Keine Cloud-Dienste, keine externen APIs, keine Uploads für Finanzdaten.
   `data/`, `inbox/`, `archiv/`, `reports/` stehen in `.gitignore` und werden nie committet.
   Die Dokumentenextraktion läuft über Claude selbst; darüber hinaus verlassen keine Daten den Rechner.
4. **Antragsentwürfe werden nie versendet.** Sie liegen als Markdown in `reports/`.
5. **Steuerparameter nicht aus dem Gedächtnis.** Änderungen an `config/steuerparameter_JJJJ.yaml`
   nur nach Abgleich mit gesetze-im-internet.de, mit Quelle und Stand im Kommentar. Für den Tarif
   Referenzwerte aus dem BMF-Steuerrechner in `tests/test_tarif.py` ergänzen.
6. Beträge in EUR, deutsches Zahlenformat (1.234,56 €). Intern `Decimal`, nie `float`.
7. Nach Codeänderungen: `python3 -m pytest` muss grün sein.

## Persönliche Konfiguration (`config/einstellungen.yaml`)

Einzelveranlagung (Grundtarif), keine Kirchensteuer, freiberuflich (§ 18 EStG), Bankexport
Sparkasse/VR CSV-CAMT, Betriebsausgaben als Monatspauschale (Platzhalter 1.500 €, anpassen).
Bei `einstufung: gewerblich` rechnet der Kern zusätzlich Gewerbesteuer (Hebesatz konfigurierbar,
Bescheide mit `art: gewst`) und die Anrechnung nach § 35 EStG.

## Befehle

| Slash-Command | Zweck |
|---|---|
| `/bescheid [datei]` | Vorauszahlungsbescheid einlesen, bestätigen, speichern |
| `/vertrag [datei]` | Vertrag/Angebot einlesen, bestätigen, Zuflüsse projizieren |
| `/monat [JJJJ-MM] [datei]` | Zahlungseingänge importieren, zuordnen, Plan/Ist, Neuberechnung |
| `/status [JJJJ-MM]` | Tabelle mit Ampel, drei Sätze Empfehlung, Reports schreiben |

Rechenkern (`./estmon <befehl>`, mit `--wurzel beispiel` auf den Beispieldaten):

| Befehl | Zweck |
|---|---|
| `status [--jahr J] [--stichtag JJJJ-MM] [--json]` | Steuer-Check; `--json` enthält den Rechenweg |
| `report [...]` | `reports/status_JJJJ-MM.html`, `reports/rücklage.csv`, bei Rot `reports/antrag_anpassung_JJJJ-MM.md` |
| `projektion [--vertrag ID] [--datei x.yaml]` | Zuflüsse je Vertrag mit Steuerjahr |
| `planist --stichtag JJJJ-MM` | Plan/Ist je Vertrag, überfällige und vorzeitige Zahlungen |
| `import-vorschlag <csv> [--monat] [--aus x.yaml]` | Bankexport lesen, Vorschlag erzeugen, speichert nichts |
| `import-speichern <x.yaml>` | bestätigten Vorschlag nach `data/eingaenge.csv` |
| `tarif --zve X --jahr J` | ESt/Soli mit Rechenweg |
| `vz [--jahr J]` | geltende Vorauszahlungen |

Der Stichtag ist der letzte Monat, dessen Eingänge vollständig erfasst sind. Ohne Angabe: der
letzte Monat mit Eingängen.

## Verzeichnisse

```
config/   einstellungen.yaml, steuerparameter_JJJJ.yaml (mit Quelle/Stand), bank_sparkasse_camt.yaml
data/     bescheide.yaml, vertraege.yaml, eingaenge.csv, ausgaben.csv, pauschalen.yaml   (lokal, nicht in git)
inbox/    neue Belege; nach Verarbeitung nach archiv/JJJJ/
reports/  Berichte, Rücklage, Antragsentwürfe
beispiel/ fiktiver Testlauf (data/, archiv/, reports/); beispiel/testlauf.sh erzeugt alles neu
src/estmon/  Rechenkern;  tests/  pytest
```

## Datenmodell

`data/bescheide.yaml`: je Jahr und Steuerart gilt der Eintrag mit dem jüngsten `datum`
(Änderungsbescheide führen alle Termine des Jahres vollständig auf, alte Einträge bleiben stehen).

```yaml
bescheide:
  - id: VZ-2026-01
    datum: 2026-01-12
    jahr: 2026
    art: est                      # est | gewst
    beleg: archiv/2026/...
    bemessungsgrundlage_zve: 101000   # optional, laut Bescheid
    termine:
      - {faellig: 2026-03-10, est: 7821, soli: 325, kist: 0}   # bei gewst: {faellig: ..., gewst: ...}
```

`data/vertraege.yaml`:

```yaml
vertraege:
  - id: V-001
    kunde: Nordwind Logistik AG
    projekt: Programmleitung
    status: unterschrieben        # unterschrieben | zugesagt | pipeline
    wahrscheinlichkeit_prozent: 60   # nur bei pipeline
    einheit: tag                  # tag | stunde
    satz_netto: 1400
    menge_pro_monat: 10
    mengen: {"2026-08": 4}        # optional, überschreibt einzelne Monate
    beginn: 2025-11-01
    ende: 2026-09-30
    abrechnung: monatlich         # monatlich | quartalsweise | einmalig
    zahlungsziel_tage: 30
    ust_satz_prozent: 19
    reisekosten: nach Aufwand
    kuendigungsfrist: 4 Wochen zum Monatsende
    matching: ["Nordwind"]        # Stichwörter für die Bankzuordnung
    beleg: archiv/2026/...
```

`data/eingaenge.csv` (Semikolon): `id;datum;kunde;verwendungszweck;brutto;ust_satz;netto;ust;art;vertrag_id;quelle`.
`art`: `honorar`, `sonstig` (gewinnwirksam), `reisekosten` (markiert), `durchlaufend`, `privat`
(kein Gewinn). `datum` ist der Geldeingang und bestimmt das Steuerjahr.

`data/ausgaben.csv`: `monat;betrag_netto;notiz`. Ein Eintrag ersetzt die Pauschale dieses Monats.

`data/pauschalen.yaml`: je Jahr `weitere_einkuenfte`, `abzuege`, `quelle`. Fehlt ein Jahr, gilt
das letzte davor (mit Hinweis).

## Rechenlogik

- **Zufluss:** Rechnung am Ende der Abrechnungsperiode, Zufluss = Rechnungsdatum + Zahlungsziel.
  Eine Dezember-Rechnung mit Zahlung im Januar zählt zum Folgejahr.
- **Plan/Ist-Abgleich je Vertrag:** Überfällige Beträge werden in den Monat nach dem Stichtag
  vorgetragen, vorzeitig gezahlte mindern die nächsten Planzuflüsse. Nichts wird doppelt gezählt.
- **Szenarien Restjahr:** Konservativ = nur unterschrieben. Basis = unterschrieben + zugesagt
  (Gewicht konfigurierbar, Standard 100 %) + Pipeline × Wahrscheinlichkeit. Run-Rate = Durchschnitt
  der letzten 3 Ist-Monate.
- **Gewinn** = Ist-Zuflüsse netto + Prognose − Betriebsausgaben (Ist, sonst Pauschale).
  USt ist nie Gewinn. Erstattete Reisekosten sind in Pauschalmonaten neutral, in Monaten mit
  Ist-Ausgaben Einnahme.
- **zvE** = Gewinn + weitere Einkünfte − Abzüge (Jahrespauschale).
- **Jahressteuer** = ESt (§ 32a) + Soli + KiSt, bei gewerblich + GewSt − Ermäßigung § 35.
- **Lücke** = Jahressteuer − festgesetzte Vorauszahlungen des Jahres.
- **Ampel:** Grün nur unter 5 % *und* unter 2.000 €; Rot über 15 % *oder* über 10.000 €; sonst Gelb.
  Überzahlung jenseits der Grün-Grenzen wird als solche gemeldet. Schwellen in `einstellungen.yaml`.
- **Leitszenario** (Standard Basis) steuert Empfehlung, Rücklage, Liquiditätsvorschau und Antrag.
- **Doppeleffekt:** Nachzahlung für das Jahr (ca. 1 Monat nach dem Bescheid, Annahme September des
  Folgejahres) plus Anhebung der Vorauszahlungen des Folgejahres auf die neue Jahressteuer, fällig
  an den nach dem Bescheid verbleibenden Terminen.
- **Zinsen § 233a AO:** 0,15 % je vollem Monat ab 1. April des übernächsten Jahres, Betrag auf 50 €
  abgerundet.

## Bekannte Vereinfachungen

Keine Detailpflege von Sonderausgaben, Vorsorge, V+V (Jahrespauschale). KiSt ohne § 51a-Korrektur
und ohne Sonderausgabenabzug. GewSt ohne Hinzurechnungen und Kürzungen. Liquiditätsvorschau ohne
Umsatzsteuer und Privatentnahmen. Planungswerkzeug, ersetzt keine Steuerberatung.
