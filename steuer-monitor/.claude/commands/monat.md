---
description: Zahlungseingänge eines Monats importieren, zuordnen, Netto/USt trennen, Plan/Ist zeigen
argument-hint: "[JJJJ-MM] [Bankexport in inbox/]"
---
Importiere die Zahlungseingänge eines Monats. Argumente: $ARGUMENTS (ohne Monat: der Vormonat; ohne Datei: neueste CSV in `inbox/`).

1. Vorschlag erzeugen, ohne zu speichern:
   `./estmon import-vorschlag inbox/<datei>.csv --monat JJJJ-MM --aus <temp.yaml>`
   Meldet der Befehl fehlende Spalten, zeig mir die Kopfzeile und schlag die Anpassung in `config/bank_sparkasse_camt.yaml` vor.
   Liegt statt eines Bankexports eine einfache Liste vor (Datum, Kunde, Brutto, USt-Satz), erzeuge die Vorschlagsdatei im selben YAML-Format von Hand; Netto und USt lässt du leer, die rechnet der Kern.
2. Zeig mir alle Eingänge als Tabelle: Datum | Zahler | Zweck | Brutto | USt-Satz | Netto | USt | Art | Vertrag | Hinweis. Die Werte kommen aus der Vorschlagsdatei.
3. Kläre mit mir jeden Eintrag mit Hinweis und jeden ohne Vertrag:
   - `honorar`: Betriebseinnahme, Vertrag zuordnen
   - `reisekosten`: erstattete Reisekosten (markiert, in Pauschalmonaten gewinnneutral)
   - `durchlaufend`: im Namen und für Rechnung des Kunden verauslagt, kein Gewinn
   - `privat`: Einlagen, Steuererstattungen, Umbuchungen, kein Gewinn
   - `sonstig`: sonstige Betriebseinnahme
   Enthält eine Zahlung Honorar und Reisekosten, teile sie in zwei Einträge mit den IDs `<id>-1` und `<id>-2`. Abweichender USt-Satz (0 % Reverse-Charge, 7 %): `ust_satz` ändern, Netto nicht selbst rechnen.
4. Warte auf meine ausdrückliche Bestätigung der Liste. Dann:
   `./estmon import-speichern <temp.yaml>`
   Bankexport nach `archiv/JJJJ/` verschieben, temporäre Datei löschen.
5. Frag, ob es für den Monat echte Betriebsausgaben gibt (sonst gilt die Pauschale). Wenn ja: Zeile `JJJJ-MM;betrag_netto;notiz` an `data/ausgaben.csv` anhängen.
6. Abweichungen zeigen: `./estmon planist --stichtag JJJJ-MM`. Gib die Tabelle unverändert wieder und nenne in einem Satz, was überfällig ist oder früher kam.
7. Neuberechnung: `./estmon status --stichtag JJJJ-MM` und `./estmon report --stichtag JJJJ-MM`. Antworte wie bei `/status`.
