"""Excel-Export des Steuer-Checks (reports/status_JJJJ-MM.xlsx).

Steuerbeträge stammen aus dem Rechenkern und stehen als Werte in der Mappe (Quelle: Blatt
"Rechenweg"). Summen, Lücke, Abweichungen und kumulierte Werte sind Excel-Formeln.
"""
from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from . import liquiditaet, luecke, szenarien as sz
from .daten import Daten
from .geld import D, de
from .zufluss import monatsende

EUR = '#,##0.00 "€";[Red]-#,##0.00 "€"'
PROZ = "0.0%"
SCHRIFT = "Arial"
FETT = Font(name=SCHRIFT, bold=True)
KOPF_FUELLUNG = PatternFill("solid", fgColor="E8E7E2")
AMPEL_FUELLUNG = {"gruen": "C6EFCE", "gelb": "FFEB9C", "rot": "FFC7CE", "ueberzahlung": "BDD7EE"}
LINIE = Border(bottom=Side(style="thin", color="BFBFBF"))


def _f(wert) -> float:
    return float(D(wert))


def _kopf(ws, zeile: int, titel: list[str]) -> None:
    for i, t in enumerate(titel, start=1):
        c = ws.cell(row=zeile, column=i, value=t)
        c.font, c.fill, c.border = FETT, KOPF_FUELLUNG, LINIE
        c.alignment = Alignment(wrap_text=True, vertical="top", horizontal="left" if i == 1 else "right")


def _fertig(ws, breiten: list[int], fixiert: str | None = None) -> None:
    for i, b in enumerate(breiten, start=1):
        ws.column_dimensions[get_column_letter(i)].width = b
    for zeile in ws.iter_rows():
        for c in zeile:
            if c.font is None or c.font.name != SCHRIFT:
                c.font = Font(name=SCHRIFT, bold=bool(c.font and c.font.bold))
    if fixiert:
        ws.freeze_panes = fixiert


def schreibe(pfad: Path, daten: Daten, einst: dict, st: dict) -> Path:
    jahr, bis, leitname = st["jahr"], st["ist_bis"], st["leitszenario"]
    leit = st["szenarien"][leitname]
    wb = Workbook()

    # --- Übersicht --------------------------------------------------------
    ws = wb.active
    ws.title = "Übersicht"
    ws["A1"] = f"Steuer-Check {jahr}"
    ws["A1"].font = Font(name=SCHRIFT, bold=True, size=16)
    ws["A2"] = (f"Stand {bis[1]:02d}/{bis[0]} (Ist bis {monatsende(*bis):%d.%m.%Y}). "
                f"Leitszenario: {leit['titel']}. Planungswerkzeug, ersetzt keine Steuerberatung.")
    _kopf(ws, 4, ["Szenario", "Gewinn", "zvE", "Jahressteuer", "festgesetzte VZ", "Lücke", "Lücke in % der Steuer", "Ampel"])
    for i, s in enumerate(sz.SZENARIEN):
        z, x = 5 + i, st["szenarien"][s]
        ws.cell(z, 1, x["titel"] + (" (Leitszenario)" if s == leitname else ""))
        ws.cell(z, 2, _f(x["gewinn"])).number_format = EUR
        ws.cell(z, 3, _f(x["steuer"]["zve"])).number_format = EUR
        ws.cell(z, 4, _f(x["steuer"]["gesamt"])).number_format = EUR
        ws.cell(z, 5, _f(x["vz"])).number_format = EUR
        ws.cell(z, 6, f"=D{z}-E{z}").number_format = EUR
        ws.cell(z, 7, f"=IF(D{z}=0,0,ABS(F{z})/D{z})").number_format = PROZ
        a = ws.cell(z, 8, luecke.AMPEL_TEXT[x["ampel"]])
        a.fill, a.alignment = PatternFill("solid", fgColor=AMPEL_FUELLUNG[x["ampel"]]), Alignment(horizontal="center")
        if s == leitname:
            for sp in range(1, 9):
                ws.cell(z, sp).font = FETT
    ws["A8"] = ("Gewinn, zvE und Jahressteuer kommen aus dem Rechenkern (Herleitung im Blatt Rechenweg), "
                "festgesetzte VZ aus data/bescheide.yaml. Lücke und Prozent sind Formeln.")
    ws["A8"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells("A8:H8")
    ws.row_dimensions[8].height = 30

    ws["A10"] = "Empfehlung"
    ws["A10"].font = FETT
    for i, satz in enumerate(luecke.empfehlung(st)):
        c = ws.cell(11 + i, 1, satz)
        c.alignment = Alignment(wrap_text=True, vertical="top")
        ws.merge_cells(start_row=11 + i, start_column=1, end_row=11 + i, end_column=8)
        ws.row_dimensions[11 + i].height = 32

    z = 15
    ws.cell(z, 1, f"Doppeleffekt ({leit['titel']})").font = FETT
    _kopf(ws, z + 1, ["Posten", "Fällig ca.", "Betrag"])
    posten = leit["doppeleffekt"]["posten"]
    for i, p in enumerate(posten):
        ws.cell(z + 2 + i, 1, p["text"])
        d = ws.cell(z + 2 + i, 2, p["datum"])
        d.number_format, d.alignment = "DD.MM.YYYY", Alignment(horizontal="right")
        ws.cell(z + 2 + i, 3, _f(p["betrag"])).number_format = EUR
    ende = z + 2 + len(posten)
    ws.cell(ende, 1, "Liquiditätsbedarf gesamt").font = FETT
    summe = ws.cell(ende, 3, f"=SUM(C{z + 2}:C{ende - 1})" if posten else 0)
    summe.number_format, summe.font = EUR, FETT
    zi = leit["zinsen"]
    ws.cell(ende + 2, 1, (f"Zinsrisiko § 233a AO: {de(zi['satz_pro_monat'] * 100, 2)} % je vollem Monat ab "
                          f"{zi['zinslauf_beginn']:%d.%m.%Y}; auf die Lücke {de(zi['je_monat'])} € je Monat. "
                          f"Annahme: Steuerbescheid {jahr} ca. {leit['doppeleffekt']['bescheid_geschaetzt']:%m/%Y}."))
    ws.cell(ende + 2, 1).alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells(start_row=ende + 2, start_column=1, end_row=ende + 2, end_column=8)
    ws.row_dimensions[ende + 2].height = 32
    for i, w in enumerate(st["warnungen"]):
        ws.cell(ende + 4 + i, 1, f"Hinweis: {w}")
    _fertig(ws, [44, 16, 16, 16, 18, 16, 14, 14])

    # --- Plan und Ist -----------------------------------------------------
    ws = wb.create_sheet("Plan und Ist")
    _kopf(ws, 1, ["Monat", "Plan netto (Basis)", "Ist netto", "Abweichung", "Reisekosten erstattet", "USt (kein Gewinn)",
                  "durchlaufend / privat", "Betriebsausgaben", "Quelle Ausgaben"])
    for i, m in enumerate(st["monate"]):
        z = 2 + i
        ws.cell(z, 1, m["monat"])
        ws.cell(z, 2, _f(m["plan"])).number_format = EUR
        if m["ist"]:
            ws.cell(z, 3, _f(m["einnahmen_ist"])).number_format = EUR
            ws.cell(z, 4, f"=C{z}-B{z}").number_format = EUR
            ws.cell(z, 5, _f(m["reisekosten"])).number_format = EUR
            ws.cell(z, 6, _f(m["ust"])).number_format = EUR
            ws.cell(z, 7, _f(m["nicht_gewinnwirksam"])).number_format = EUR
        ws.cell(z, 8, _f(m["ausgaben"])).number_format = EUR
        ws.cell(z, 9, m["ausgaben_quelle"]).alignment = Alignment(horizontal="right")
    ws.cell(14, 1, "Summe").font = FETT
    for sp in "BCDEFGH":
        c = ws[f"{sp}14"]
        c.value, c.number_format, c.font = f"=SUM({sp}2:{sp}13)", EUR, FETT
    ws["A16"] = "Plan = ursprüngliche Vertragsprojektion nach Zahlungsziel. Ist nur bis zum Stichtag; maßgeblich ist der Geldeingang (§ 11 EStG)."
    _fertig(ws, [12, 18, 16, 16, 18, 18, 18, 18, 16], "B2")

    # --- Rücklage ---------------------------------------------------------
    ws = wb.create_sheet("Rücklage")
    _kopf(ws, 1, ["Monat", "Konservativ", "Basis", "Run-Rate", f"kumuliert ({leit['titel']})"])
    spalte = {"konservativ": "B", "basis": "C", "runrate": "D"}[leitname]
    for i, r in enumerate(st["ruecklage"]):
        z = 2 + i
        ws.cell(z, 1, r["monat"])
        for sp, s in enumerate(sz.SZENARIEN, start=2):
            ws.cell(z, sp, _f(r[s])).number_format = EUR
        ws.cell(z, 5, f"=SUM({spalte}$2:{spalte}{z})").number_format = EUR
    z = 2 + len(st["ruecklage"])
    ws.cell(z, 1, "Summe = Lücke").font = FETT
    for sp in "BCD":
        c = ws[f"{sp}{z}"]
        c.value, c.number_format, c.font = f"=SUM({sp}2:{sp}{z - 1})", EUR, FETT
    ws.cell(z + 2, 1, "Gleichmäßig verteilt, sodass die Lücke bis Jahresende gedeckt ist.")
    _fertig(ws, [16, 16, 16, 16, 20], "B2")

    # --- Liquidität -------------------------------------------------------
    liq = liquiditaet.vorschau(daten, einst, st)
    ws = wb.create_sheet("Liquidität")
    _kopf(ws, 1, ["Monat", "Zuflüsse netto", "Betriebsausgaben", "Vorauszahlungen", "Nachzahlung / Erhöhung", "Saldo", "kumuliert", "Anmerkung"])
    start = _f(einst.get("annahmen", {}).get("liquiditaet_startbestand", 0))
    for i, x in enumerate(liq["zeilen"]):
        z = 2 + i
        ws.cell(z, 1, x["monat"])
        ws.cell(z, 2, _f(x["einnahmen"])).number_format = EUR
        ws.cell(z, 3, -_f(x["ausgaben"])).number_format = EUR
        ws.cell(z, 4, -_f(x["vz"])).number_format = EUR
        ws.cell(z, 5, -_f(x["steuer_sonder"])).number_format = EUR
        ws.cell(z, 6, f"=SUM(B{z}:E{z})").number_format = EUR
        ws.cell(z, 7, f"={start}+F{z}" if i == 0 else f"=G{z - 1}+F{z}").number_format = EUR
        ws.cell(z, 8, x["sonder_text"])
    z = 2 + len(liq["zeilen"]) + 1
    hinweise = [f"Szenario {leit['titel']}, Startbestand {de(start)} €. Ohne Umsatzsteuer und Privatentnahmen; Zuflüsse enden mit den erfassten Verträgen."]
    if liq["vz_geschaetzt_jahre"]:
        hinweise.append(f"Vorauszahlungen {', '.join(map(str, liq['vz_geschaetzt_jahre']))} sind mangels Bescheid aus dem Vorjahr fortgeschrieben.")
    for p in liq["danach"]:
        hinweise.append(f"Nach dem Vorschauzeitraum fällig: {p['text']} {de(p['betrag'])} € am {p['datum']:%d.%m.%Y}.")
    for i, h in enumerate(hinweise):
        ws.cell(z + i, 1, h)
    _fertig(ws, [12, 16, 18, 18, 22, 16, 16, 44], "B2")

    # --- Rechenweg --------------------------------------------------------
    ws = wb.create_sheet("Rechenweg")
    _kopf(ws, 1, ["Szenario", "Schritt", "Rechnung", "Ergebnis", "Quelle"])
    z = 2
    for s in sz.SZENARIEN:
        for r in st["szenarien"][s]["rechenweg"].schritte:
            for sp, v in enumerate([st["szenarien"][s]["titel"], r.bezeichnung, r.formel, r.ergebnis, r.quelle], start=1):
                c = ws.cell(z, sp, v)
                c.alignment = Alignment(wrap_text=True, vertical="top", horizontal="right" if sp == 4 else "left")
            z += 1
    for sp in range(1, 6):
        ws.cell(1, sp).alignment = Alignment(horizontal="left")
    ws.cell(z + 1, 1, f"Steuerparameter: {st['params']['_datei']}, Stand {st['params']['stand']}, Status {st['params']['status']} "
                      "(jede Zahl dort mit Fundstelle auf gesetze-im-internet.de).")
    _fertig(ws, [14, 34, 70, 18, 60], "A2")

    # --- Eingänge ---------------------------------------------------------
    ws = wb.create_sheet("Eingänge")
    _kopf(ws, 1, ["Datum", "Kunde", "Verwendungszweck", "Art", "Vertrag", "Brutto", "USt-Satz %", "USt", "Netto", "Quelle", "ID"])
    for sp in (2, 3, 4, 5, 10, 11):
        ws.cell(1, sp).alignment = Alignment(horizontal="left")
    eing = [e for e in daten.eingaenge() if e.datum.year == jahr and (e.datum.year, e.datum.month) <= bis]
    for i, e in enumerate(eing):
        z = 2 + i
        ws.cell(z, 1, e.datum).number_format = "DD.MM.YYYY"
        for sp, v in ((2, e.kunde), (3, e.verwendungszweck), (4, e.art), (5, e.vertrag_id), (10, e.quelle), (11, e.id)):
            ws.cell(z, sp, v)
        ws.cell(z, 6, _f(e.brutto)).number_format = EUR
        ws.cell(z, 7, _f(e.ust_satz))
        ws.cell(z, 8, f"=F{z}-I{z}").number_format = EUR
        ws.cell(z, 9, _f(e.netto)).number_format = EUR
    if eing:
        z = 2 + len(eing)
        ws.cell(z, 1, "Summe").font = FETT
        for sp in "FHI":
            c = ws[f"{sp}{z}"]
            c.value, c.number_format, c.font = f"=SUM({sp}2:{sp}{z - 1})", EUR, FETT
    _fertig(ws, [12, 26, 52, 14, 10, 16, 11, 14, 16, 36, 26], "A2")

    pfad.parent.mkdir(parents=True, exist_ok=True)
    wb.save(pfad)
    return pfad
