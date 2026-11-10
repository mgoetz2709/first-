---
description: Vertrag oder Angebot einlesen, Honorarparameter bestätigen lassen, Zuflüsse projizieren
argument-hint: "[Dateiname in inbox/]"
---
Lies einen Vertrag oder ein Angebot ein. Datei: $ARGUMENTS (ohne Angabe: Dateien in `inbox/` auflisten und fragen).

1. Lies das Dokument (PDF/DOCX) vollständig. Für DOCX: mit `python3 -c "import zipfile,re,sys;print(re.sub('<[^>]+>',' ',zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode()))" <datei>` in Text umwandeln. Extrahiere:
   - Kunde, Projekt
   - Tages- oder Stundensatz netto, Volumen je Monat (Tage/Stunden), abweichende Monatsmengen
   - Laufzeit (Beginn, Ende), Verlängerungsoptionen
   - Abrechnungsrhythmus (`monatlich`, `quartalsweise`, `einmalig`), Zahlungsziel in Tagen
   - Reisekostenregelung, Kündigungsfristen, USt-Satz (0 bei Reverse-Charge)
2. Frag mich nach dem Status: `unterschrieben`, `zugesagt` (mündlich) oder `pipeline` mit Wahrscheinlichkeit in %. Frag auch nach Stichwörtern für die Bankzuordnung (`matching`), wenn der Kundenname im Verwendungszweck anders lauten könnte.
3. Zeig mir den YAML-Eintrag im Format von `data/vertraege.yaml` (siehe CLAUDE.md) mit Fundstelle je Wert. Fehlt eine Angabe oder ist sie unklar (z. B. "ca. 8–10 Tage"), frag nach statt zu raten.
4. Schreib den Entwurf in eine temporäre Datei außerhalb von `data/` und zeig die Projektion: `./estmon projektion --datei <temp.yaml>`. Gib die Tabelle (Leistungsmonat, Rechnung, Zufluss, Steuerjahr, Netto) unverändert wieder und weise auf Zuflüsse hin, die ins Folgejahr fallen.
5. Warte auf meine ausdrückliche Bestätigung. Erst dann: Eintrag an `data/vertraege.yaml` anhängen (neue `id` nach Muster `V-NNN`), Original nach `archiv/JJJJ/` verschieben, Pfad als `beleg` eintragen, temporäre Datei löschen.
6. Führe `./estmon status` aus und gib die Tabelle unverändert wieder.

Bei Statusänderung eines bestehenden Vertrags (z. B. zugesagt → unterschrieben): nur das Feld ändern, vorher bestätigen lassen.
