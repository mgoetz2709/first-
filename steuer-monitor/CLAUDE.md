# ESt-Vorauszahlungs-Monitor

Prüft, ob die festgesetzten Einkommensteuer-Vorauszahlungen zum tatsächlichen und prognostizierten
Gewinn eines selbständigen Unternehmensberaters passen (EÜR, Zuflussprinzip).

## Prinzip (seit 10.11.2026)

Das Werkzeug ist **eine lokale App in einer einzigen HTML-Datei**: `app/steuer-monitor.html`.
Der Nutzer öffnet sie per Doppelklick im Browser. Kein Terminal, keine Installation, kein Server.

- Daten liegen in einer Datei auf dem Rechner des Nutzers (`steuer-daten.json`), die die App über
  „Datei öffnen“ lädt und über „Speichern“ schreibt. Die App lädt nichts ins Netz.
- Erfassung über Formulare und Bank-CSV in der App. Zusätzlich „Import von Claude“ (siehe unten).
- Die App wird hier im Repo weiterentwickelt. Der Nutzer arbeitet nicht im Terminal: Änderungen
  baut Claude, testet sie und liefert die neue HTML-Datei aus.

## Regeln

1. **Rechnen nur im Kern.** Alle Zahlen kommen aus `app/src/kern.js`. `app/src/ui.js` zeigt nur an.
   Claude rechnet keine Steuer im Kopf und nennt im Chat nur Zahlen, die der Kern geliefert hat.
2. **Zwei Kerne, ein Ergebnis.** `src/estmon` (Python) ist die Referenz. `tests/test_app_kern.py`
   vergleicht beide Kerne Cent für Cent. Jede Änderung an der Rechenlogik erfolgt in beiden.
3. **Erst bestätigen, dann speichern.** Die App zeigt importierte Werte (Bank-CSV, Import von
   Claude) immer erst als Vorschau. Bei unklaren Dokumenten fragt Claude nach, statt zu raten.
4. **Keine echten Finanzdaten ins Repo.** `data/`, `inbox/`, `archiv/`, `reports/` sind ignoriert;
   `steuer-daten.json` gehört nicht in git. Committet werden nur Code und die fiktiven Beispieldaten.
5. **Antragsentwürfe werden nie versendet.** Die App zeigt den Text zum Kopieren oder Sichern.
6. **Steuerparameter nicht aus dem Gedächtnis.** Sie stehen in `config/steuerparameter_JJJJ.yaml`
   und gespiegelt in `PARAMS` in `app/src/kern.js`, jeweils mit Quelle und Stand. Änderungen nur
   nach Abgleich mit gesetze-im-internet.de; für den Tarif Referenzwerte aus dem BMF-Steuerrechner
   in `tests/test_tarif.py` ergänzen. 2027 ist als „vorläufig“ markiert.
7. Beträge in EUR, deutsches Zahlenformat. Intern ganze Cent (JS) bzw. `Decimal` (Python), nie float.
   Der ESt-Tarif rechnet in JS mit BigInt.
8. Nach jeder Änderung: `python3 app/bauen.py`, dann `python3 -m pytest` (muss grün sein), dann
   die App im Browser durchklicken (Playwright ist in der Cloud-Umgebung vorhanden).

## Aufbau

```
app/steuer-monitor.html   die fertige App (gebaut, wird committet und an den Nutzer geschickt)
app/src/kern.js           Rechenkern: Tarif, Soli, KiSt, GewSt/§ 35, Zufluss, Szenarien, Ampel,
                          Doppeleffekt, § 233a, Rücklage, Liquidität, Bankimport, Antrag
app/src/ui.js             Oberfläche (Reiter, Formulare, Diagramme, Datei öffnen/speichern)
app/src/stil.css, index.html, pruefe.js (Testbrücke für pytest)
app/vendor/               pdf.js 3.11.174 (unverändert, Apache-2.0) zum lokalen Lesen von PDF-Text
app/bauen.py              fügt alles zu einer Datei zusammen, bettet die Beispieldaten ein
src/estmon/               Python-Referenzkern mit CLI (./estmon), Excel- und HTML-Report
config/                   Steuerparameter je Jahr mit Quelle/Stand, Standard-Einstellungen
beispiel/                 fiktiver Fall (1 Bescheid, 2 Verträge, 3 Monate Eingänge)
tests/                    pytest: BMF-Referenzwerte, Zufluss, USt, Szenarien, Ampel, Kernvergleich
```

## Vertrag hochladen (lokal, ohne KI)

Im Reiter „Verträge“ wählt der Nutzer ein PDF oder eine Word-Datei (.docx). `ui.js` liest den Text
lokal (PDF über das eingebettete pdf.js aus `app/vendor/`, DOCX über einen eigenen ZIP-Leser),
`Kern.vertragErkennen()` sucht per Mustererkennung Kunde, Projekt, Satz, Einheit, Menge je Monat,
Laufzeit, Abrechnung, Zahlungsziel, Reisekosten, Kündigung und Reverse-Charge. Das Formular wird
vorbefüllt, jede Angabe mit Fundstelle gezeigt; der Status muss gewählt und der Vertrag bestätigt
werden. Grundsätze: nichts raten (Spannen wie „8 bis 10 Tage“ bleiben leer, mit Hinweis), Scans
ohne Text werden abgewiesen mit Verweis auf „Import von Claude“. Neue Formulierungen, die nicht
erkannt werden, als Testfall in `tests/test_vertragserkennung.py` aufnehmen und das Muster erweitern.
pdf.js (Apache-2.0) wird unverändert eingebettet und macht keine Netzwerkzugriffe.

## Import von Claude

Lädt der Nutzer im Chat einen Bescheid oder Vertrag hoch (PDF, Scan, DOCX), liest Claude die Werte
aus, zeigt sie mit Fundstelle, klärt Unklares und liefert dann eine Datei `import_<was>.json`:

```json
{
  "format": "est-monitor-import",
  "bescheide": [
    {"datum": "2026-01-12", "jahr": 2026, "art": "est", "bemessungsgrundlage_zve": 101000,
     "beleg": "Vorauszahlungsbescheid 2026 vom 12.01.2026",
     "termine": [{"faellig": "2026-03-10", "est": 7821, "soli": 325}]}
  ],
  "vertraege": [
    {"kunde": "Nordwind Logistik AG", "projekt": "Programmleitung", "status": "unterschrieben",
     "wahrscheinlichkeit_prozent": 0, "einheit": "tag", "satz_netto": 1400, "menge_pro_monat": 10,
     "beginn": "2025-11-01", "ende": "2026-09-30", "abrechnung": "monatlich",
     "zahlungsziel_tage": 30, "ust_satz_prozent": 19, "reisekosten": "nach Aufwand",
     "kuendigungsfrist": "4 Wochen zum Monatsende", "matching": ["Nordwind"], "beleg": "Vertrag vom 20.10.2025"}
  ],
  "pauschalen": {"2026": {"weitere_einkuenfte": 4000, "abzuege": 18000, "quelle": "Bescheid vom 12.01.2026"}},
  "hinweise": ["Kündigungsfrist im Scan nicht lesbar"]
}
```

`art`: `est` oder `gewst` (Termine dann mit `gewst`). `status`: `unterschrieben`, `zugesagt`,
`pipeline`. `abrechnung`: `monatlich`, `quartalsweise`, `einmalig`. Datumsangaben ISO, Beträge als
Zahlen in Euro. IDs vergibt die App. Bei einem Änderungsbescheid alle Termine des Jahres aufführen.
Den Status eines Vertrags erfragt Claude beim Nutzer, wenn er nicht aus dem Dokument hervorgeht.
Bankexporte liest die App selbst; dafür ist kein Import nötig.

## Datendatei `steuer-daten.json`

`format: "est-monitor"`, `version: 1`, dazu `einstellungen`, `bescheide`, `vertraege`, `eingaenge`
(`id, datum, kunde, verwendungszweck, brutto, ust_satz, art, vertrag_id, quelle`; Netto und USt
rechnet der Kern aus Brutto und Satz), `ausgaben` (`monat, betrag_netto, notiz`), `pauschalen`
(je Jahr `weitere_einkuenfte, abzuege, quelle`). `art` eines Eingangs: `honorar`, `sonstig`
(gewinnwirksam), `reisekosten`, `durchlaufend`, `privat`. Neue Felder immer mit Standardwert in
`leereDaten()`/`pruefeDaten()` ergänzen, damit alte Dateien weiter laden.

## Rechenlogik

- **Zufluss:** Rechnung am Ende der Abrechnungsperiode, Zufluss = Rechnungsdatum + Zahlungsziel.
  Eine Dezember-Rechnung mit Zahlung im Januar zählt zum Folgejahr (§ 11 EStG).
- **Plan/Ist je Vertrag:** Überfälliges wird in den Monat nach dem Stichtag vorgetragen, vorzeitig
  Gezahltes mindert die nächsten Planzuflüsse.
- **Szenarien Restjahr:** Konservativ = nur unterschrieben. Basis = unterschrieben + zugesagt
  (Gewicht einstellbar) + Pipeline × Wahrscheinlichkeit. Run-Rate = Durchschnitt der letzten 3
  Ist-Monate (Monate vor Datenbeginn zählen nicht).
- **Gewinn** = Ist-Zuflüsse netto + Prognose − Betriebsausgaben (Ist, sonst Pauschale). USt ist nie
  Gewinn. Erstattete Reisekosten: in Pauschalmonaten neutral, in Monaten mit Ist-Ausgaben Einnahme.
- **zvE** = Gewinn + weitere Einkünfte − Abzüge (Jahrespauschale).
- **Jahressteuer** = ESt (§ 32a) + Soli + KiSt, bei gewerblich + GewSt − Ermäßigung § 35.
- **Lücke** = Jahressteuer − festgesetzte Vorauszahlungen des Jahres (jüngster Bescheid je Art).
- **Ampel:** Grün nur unter 5 % *und* unter 2.000 €; Rot über 15 % *oder* über 10.000 €; sonst Gelb.
  Überzahlung jenseits der Grün-Grenzen wird gesondert gemeldet.
- **Leitszenario** (Standard Basis) steuert Empfehlung, Rücklage, Liquidität und Antrag.
- **Doppeleffekt:** Nachzahlung (ca. 1 Monat nach dem Bescheid, Annahme September des Folgejahres)
  plus Anhebung der Vorauszahlungen des Folgejahres auf die neue Jahressteuer, fällig an den nach
  dem Bescheid verbleibenden Terminen. Bei gewerblich dasselbe für die Gewerbesteuer.
- **Zinsen § 233a AO:** 0,15 % je vollem Monat ab 1. April des übernächsten Jahres, auf 50 € abgerundet.

## Kirchensteuer

Der Nutzer ist nicht kirchensteuerpflichtig. Die App zeigt und erfasst keine Kirchensteuer
(entfernt am 10.11.2026 auf Wunsch). Die Kerne können sie weiter rechnen (`kirchensteuer.pflichtig`,
Standard `false`), damit alte Dateien laden und der Kernvergleich vollständig bleibt.

## Bekannte Vereinfachungen

Jahrespauschale statt Detailpflege von Sonderausgaben, Vorsorge, V+V. KiSt ohne § 51a-Korrektur und
ohne Sonderausgabenabzug. GewSt ohne Hinzurechnungen und Kürzungen, gleicher Bescheidzeitpunkt wie
ESt. Liquiditätsvorschau ohne Umsatzsteuer und Privatentnahmen. Planungswerkzeug, ersetzt keine
Steuerberatung.
