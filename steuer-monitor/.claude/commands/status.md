---
description: Aktueller Steuer-Check mit Ampel und Empfehlung
argument-hint: "[JJJJ-MM]"
---
Zeig den aktuellen Steuer-Check. Stichtag: $ARGUMENTS (ohne Angabe: letzter Monat mit erfassten Eingängen).

1. Führe aus: `./estmon status` (mit `--stichtag JJJJ-MM`, falls angegeben) und `./estmon report` mit denselben Optionen.
2. Antworte genau so:
   - die Tabelle Szenario | Gewinn | Jahressteuer | festgesetzte VZ | Lücke | Ampel, unverändert aus der Ausgabe
   - danach die drei Sätze Empfehlung aus der Ausgabe, unverändert
   - eine Zeile mit den Pfaden der geschriebenen Dateien
   - Zeilen, die mit "Hinweis:" beginnen, gibst du wieder
3. Kein weiterer Text, keine eigene Rechnung, keine Umformulierung der Beträge. Fragen zum Rechenweg beantwortest du aus `./estmon status --json` (Feld `rechenweg`) oder verweist auf den aufklappbaren Rechenweg im HTML-Bericht.
4. Den Antragsentwurf versendest du nie. Du weist nur auf die Datei hin.
