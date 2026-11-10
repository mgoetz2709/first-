---
description: Vorauszahlungsbescheid aus inbox/ einlesen, Werte bestätigen lassen, speichern
argument-hint: "[Dateiname in inbox/]"
---
Lies einen Vorauszahlungsbescheid des Finanzamts ein. Datei: $ARGUMENTS (ohne Angabe: alle noch nicht verarbeiteten Bescheide in `inbox/` auflisten und fragen, welcher gemeint ist).

1. Lies das Dokument (PDF/Scan/Bild) vollständig. Extrahiere:
   - Bescheiddatum, Jahr, Steuerart (`est` oder `gewst`), Erst- oder Änderungsbescheid
   - je Fälligkeit: ESt, Solidaritätszuschlag, Kirchensteuer (bzw. GewSt)
   - die vom Finanzamt zugrunde gelegten Besteuerungsgrundlagen, sofern angegeben (Einkünfte, Abzüge, zvE)
2. Zeig mir die Werte als Tabelle und als YAML-Eintrag im Format von `data/bescheide.yaml` (siehe CLAUDE.md). Nenne zu jedem Wert, wo er im Dokument steht. Was unleserlich oder mehrdeutig ist, markierst du und fragst nach. Rate keine Beträge.
3. Warte auf meine ausdrückliche Bestätigung. Vorher wird nichts geschrieben.
4. Nach Bestätigung:
   - Eintrag an `data/bescheide.yaml` anhängen (neue `id` nach Muster `VZ-JJJJ-NN`; bei Änderungsbescheid alle Termine des Jahres vollständig aufführen, der alte Eintrag bleibt stehen).
   - Wenn der Bescheid Besteuerungsgrundlagen nennt und `data/pauschalen.yaml` für das Jahr noch leer ist: Übernahme als Jahrespauschale vorschlagen und separat bestätigen lassen.
   - Original nach `archiv/JJJJ/JJJJ-MM-TT_vorauszahlungsbescheid_<art>_<jahr>.<endung>` verschieben und den Pfad als `beleg` eintragen.
5. Prüfe mit `./estmon vz --jahr JJJJ`, dass der Bescheid gelesen wird, und führe danach `./estmon status` aus. Gib die Tabelle unverändert wieder.

Rechne nichts im Kopf. Summen und Steuern kommen ausschließlich aus `./estmon`.
