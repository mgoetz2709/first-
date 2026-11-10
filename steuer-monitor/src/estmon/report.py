"""Monatsbericht (HTML), Rücklage (CSV) und Antragsentwurf (Markdown)."""
from __future__ import annotations

import csv
import datetime as dt
from html import escape
from pathlib import Path

from . import diagramm, liquiditaet, luecke, szenarien as sz
from .daten import Daten, vz_termine
from .geld import D, NULL, de, euro_ab
from .zufluss import monatsende, naechster_monat

MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
STATUSFARBE = {"gruen": "#0ca30c", "gelb": "#fab219", "rot": "#d03b3b", "ueberzahlung": "#2a78d6"}
STATUSZEICHEN = {"gruen": "✓", "gelb": "!", "rot": "✕", "ueberzahlung": "↓"}


def _kurz(monat: str) -> str:
    j, m = monat.split("-")
    return f"{MONATE[int(m) - 1]} {j[2:]}"


def _ampel(farbe: str) -> str:
    return (f'<span class="ampel"><i style="background:{STATUSFARBE[farbe]}">{STATUSZEICHEN[farbe]}</i>'
            f'{luecke.AMPEL_TEXT[farbe]}</span>')


def _tabelle(kopf: list[str], zeilen: list[list[str]], rechts_ab: int = 1, klasse: str = "") -> str:
    def zelle(i, v, tag):
        return f'<{tag}{" class=r" if i >= rechts_ab else ""}>{v}</{tag}>'
    h = "".join(zelle(i, k, "th") for i, k in enumerate(kopf))
    b = "".join("<tr>" + "".join(zelle(i, v, "td") for i, v in enumerate(z)) + "</tr>" for z in zeilen)
    return f'<table class="{klasse}"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>'


def lueckenverlauf(daten: Daten, einst: dict, st: dict) -> list[dict]:
    """Lücke je Stichtag Januar bis heute, rückgerechnet mit den Daten und Bescheiden,
    die zum jeweiligen Monatsende vorlagen."""
    jahr, bis = st["jahr"], st["ist_bis"]
    letzter = 12 if bis[0] > jahr else bis[1]
    aus = []
    for m in range(1, letzter + 1):
        teil = luecke.status(daten, einst, jahr, (jahr, m), bescheide_stand=monatsende(jahr, m))
        aus.append({"monat": f"{jahr}-{m:02d}", **{s: teil["szenarien"][s]["luecke"] for s in sz.SZENARIEN}})
    return aus


def schreibe_ruecklage(pfad: Path, st: dict) -> None:
    with open(pfad, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Monat", "Rücklage Konservativ", "Rücklage Basis", "Rücklage Run-Rate",
                    f"Kumuliert Leitszenario ({st['szenarien'][st['leitszenario']]['titel']})"])
        for z in st["ruecklage"]:
            w.writerow([z["monat"], de(z["konservativ"]), de(z["basis"]), de(z["runrate"]),
                        de(z[f"{st['leitszenario']}_kumuliert"])])


def antrag(daten: Daten, st: dict) -> str:
    """Formloser Antrag auf Anpassung der Vorauszahlungen (Entwurf, wird nie versendet)."""
    jahr, leit = st["jahr"], st["szenarien"][st["leitszenario"]]
    steuer = leit["steuer"]
    est_neu = steuer["est"] - steuer["ermaessigung_35"]
    stichtag = monatsende(*st["ist_bis"])
    termine = (st["bescheid_est"] or {}).get("termine", [])
    def summe(feld):
        return sum((D(t.get(feld)) for t in termine), NULL)
    offen = [t for t in termine if t["faellig"] > stichtag]
    zeilen = []
    for feld, name, neu in (("est", "Einkommensteuer", est_neu), ("soli", "Solidaritätszuschlag", steuer["soli"]),
                            ("kist", "Kirchensteuer", steuer["kist"])):
        if neu == 0 and summe(feld) == 0:
            continue
        zeilen.append(f"| {name} | {de(summe(feld))} € | {de(euro_ab(neu), 0)},00 € | {de(euro_ab(neu) - summe(feld))} € |")
    vertraege = []
    for v in daten.vertraege():
        g = sz.gewicht(v, st["leitszenario"], st["einstellungen"])
        if g > 0:
            vertraege.append(f"- {v['kunde']}, {v.get('projekt', '')}: {de(v['satz_netto'])} € je {v.get('einheit', 'tag').capitalize()}, "
                             f"{de(v['menge_pro_monat'], 0)} je Monat, Laufzeit {v['beginn']:%d.%m.%Y} bis {v['ende']:%d.%m.%Y} "
                             f"({v['status']})")
    if offen:
        verteilung = (f"Ich bitte, den Erhöhungsbetrag auf die noch ausstehenden Vorauszahlungstermine {jahr} "
                      f"({', '.join(f'{t['faellig']:%d.%m.%Y}' for t in offen)}) zu verteilen.")
    else:
        verteilung = (f"Die Vorauszahlungstermine {jahr} sind abgelaufen. Ich bitte um nachträgliche Anpassung "
                      f"nach § 37 Abs. 3 Satz 3 EStG.")
    gesamt_neu = euro_ab(est_neu) + euro_ab(steuer["soli"]) + euro_ab(steuer["kist"])
    return f"""<!-- ENTWURF. Wird nicht automatisch versendet. Vor dem Versand prüfen, Platzhalter ersetzen. -->

[Vorname Name]
[Straße Hausnummer]
[PLZ Ort]

Finanzamt [Name des Finanzamts]
[Anschrift]

[Ort], {dt.date.today():%d.%m.%Y}

**Steuernummer: [STEUERNUMMER]**

**Antrag auf Anpassung der Vorauszahlungen zur Einkommensteuer {jahr} (§ 37 Abs. 3 Satz 3 EStG)**

Sehr geehrte Damen und Herren,

ich beantrage, die Vorauszahlungen für {jahr} wie folgt neu festzusetzen:

| Steuerart | bisher festgesetzt {jahr} | beantragt {jahr} | Differenz |
|---|---:|---:|---:|
{chr(10).join(zeilen)}

{verteilung} Für {jahr + 1} beantrage ich Vorauszahlungen in gleicher Jahreshöhe ({de(gesamt_neu, 0)},00 €, je Termin {de(euro_ab(gesamt_neu / 4), 0)},00 €).

**Begründung**

Der Gewinn aus selbständiger Arbeit (Einnahmenüberschussrechnung nach § 4 Abs. 3 EStG) wird {jahr} voraussichtlich {de(euro_ab(leit['gewinn']), 0)} € betragen. Die Prognose setzt sich zusammen aus:

- Betriebseinnahmen bis {stichtag:%d.%m.%Y} (zugeflossen, netto): {de(leit['einnahmen_ist'])} €
- erwartete Betriebseinnahmen bis 31.12.{jahr} aus laufenden Aufträgen: {de(leit['prognose'])} €
- Betriebsausgaben {jahr}: {de(leit['ausgaben'])} €

Grundlage der erwarteten Einnahmen:

{chr(10).join(vertraege) or "- [Auftragslage ergänzen]"}

Unter Berücksichtigung der übrigen Besteuerungsgrundlagen (weitere Einkünfte {de(st['pauschale'].get('weitere_einkuenfte', 0))} €, Abzüge {de(st['pauschale'].get('abzuege', 0))} €) ergibt sich ein zu versteuerndes Einkommen von voraussichtlich {de(steuer['zve'], 0)} €{f" (bisher zugrunde gelegt: {de(st['bemessungsgrundlage_fa'], 0)} €)" if st.get('bemessungsgrundlage_fa') else ""}. Darauf entfallen {de(est_neu, 0)} € Einkommensteuer und {de(steuer['soli'])} € Solidaritätszuschlag.

Mit freundlichen Grüßen

[Unterschrift]

<!-- Rechengrundlage: Szenario {leit['titel']}, Stichtag {st['ist_bis'][1]:02d}/{st['ist_bis'][0]}, {st['params']['_datei']} (Stand {st['params']['stand']}). Planungswerkzeug, ersetzt keine Steuerberatung. -->
"""


CSS = """
:root{--ink:#0b0b0b;--ink2:#52514e;--linie:#e4e3df;--flaeche:#fcfcfb;--karte:#f4f3ef}
*{box-sizing:border-box}
body{font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--flaeche);margin:0}
main{max-width:920px;margin:0 auto;padding:28px 20px 48px}
h1{font-size:26px;line-height:1.2;margin:0 0 4px} h2{font-size:18px;margin:36px 0 10px;padding-top:14px;border-top:1px solid var(--linie)}
h3{font-size:15px;margin:18px 0 6px}
.unter{color:var(--ink2);margin:0 0 18px}
.kacheln{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:18px 0}
.kachel{background:var(--karte);border-radius:8px;padding:12px 14px}
.kachel small{display:block;color:var(--ink2)} .kachel b{font-size:22px;font-variant-numeric:tabular-nums}
.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;font-size:14px}
th,td{padding:6px 10px;border-bottom:1px solid var(--linie);text-align:left;vertical-align:top}
th{font-weight:600;color:var(--ink2);font-size:12.5px} .r{text-align:right;white-space:nowrap}
tr.leit td{font-weight:600}
.ampel{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.ampel i{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;color:#fff;font-style:normal;font-size:12px;font-weight:700}
.empfehlung{background:var(--karte);border-left:4px solid var(--ink);padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0}
.empfehlung p{margin:0 0 6px} .empfehlung p:last-child{margin:0}
.hinweis{color:var(--ink2);font-size:13px}
figure{margin:12px 0 4px} svg{width:100%;height:auto;display:block}
.legende{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:var(--ink2);margin:4px 0 0 64px}
.legende i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px}
details{border:1px solid var(--linie);border-radius:8px;margin:8px 0;padding:0 12px}
summary{cursor:pointer;padding:9px 0;font-weight:600} details[open]{padding-bottom:10px}
.klein td,.klein th{font-size:12.5px;padding:4px 8px}
footer{margin-top:36px;padding-top:14px;border-top:1px solid var(--linie);color:var(--ink2);font-size:13px}
@media print{body{background:#fff;font-size:11pt}main{max-width:none;padding:0}h2{break-after:avoid}figure,table,.empfehlung,.kachel{break-inside:avoid}
 .kachel,.empfehlung{-webkit-print-color-adjust:exact;print-color-adjust:exact}.ampel i,.legende i{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
"""


def html(daten: Daten, einst: dict, st: dict, antrag_datei: str | None = None) -> str:
    jahr, bis, leitname = st["jahr"], st["ist_bis"], st["leitszenario"]
    leit = st["szenarien"][leitname]
    liq = liquiditaet.vorschau(daten, einst, st)
    verlauf = lueckenverlauf(daten, einst, st)
    e = escape
    t: list[str] = []
    t.append(f"<h1>Steuer-Check {jahr}</h1><p class=unter>Stand {bis[1]:02d}/{bis[0]} (Ist bis {monatsende(*bis):%d.%m.%Y}) · "
             f"erstellt am {dt.date.today():%d.%m.%Y} · {'Freiberuflich (§ 18 EStG)' if einst['einstufung'] == 'freiberuflich' else 'Gewerblich (§ 15 EStG)'}, "
             f"{'Grundtarif' if einst['veranlagung'] == 'einzel' else 'Splittingtarif'}, "
             f"{'Kirchensteuer ' + str(einst['kirchensteuer']['satz_prozent']) + ' %' if einst['kirchensteuer'].get('pflichtig') else 'ohne Kirchensteuer'}</p>")
    t.append('<div class=kacheln>'
             f'<div class=kachel><small>Leitszenario {e(leit["titel"])}</small><b>{_ampel(leit["ampel"])}</b></div>'
             f'<div class=kachel><small>Deckungslücke {jahr}</small><b>{de(leit["luecke"], 0)} €</b></div>'
             f'<div class=kachel><small>Erwartete Jahressteuer</small><b>{de(leit["steuer"]["gesamt"], 0)} €</b></div>'
             f'<div class=kachel><small>Liquiditätsbedarf inkl. Folgejahr</small><b>{de(leit["doppeleffekt"]["gesamt"], 0)} €</b></div></div>')
    zeilen = []
    for s in sz.SZENARIEN:
        x = st["szenarien"][s]
        zeilen.append([e(x["titel"]) + (" (Leitszenario)" if s == leitname else ""), f"{de(x['gewinn'])} €",
                       f"{de(x['steuer']['gesamt'])} €", f"{de(x['vz'])} €",
                       f"{de(x['luecke'])} € ({de(x['luecke_prozent'], 1)} %)", _ampel(x["ampel"])])
    tab = _tabelle(["Szenario", "Gewinn", "Jahressteuer", "festgesetzte VZ", "Lücke", "Ampel"], zeilen)
    tab = tab.replace("<tr><td>" + e(leit["titel"]) + " (Leitszenario)", '<tr class=leit><td>' + e(leit["titel"]) + " (Leitszenario)")
    t.append(f"<div class=wrap>{tab}</div>")
    t.append('<div class=empfehlung>' + "".join(f"<p>{e(s)}</p>" for s in luecke.empfehlung(st)) + "</div>")
    if antrag_datei:
        t.append(f"<p class=hinweis>Antragsentwurf: <code>reports/{e(antrag_datei)}</code>. Der Entwurf wird nicht automatisch versendet.</p>")
    a = einst["ampel"]
    t.append(f"<p class=hinweis>Ampel: Grün bei Lücke unter {de(a['gruen_bis_prozent'], 0)} % der Jahressteuer und unter {de(a['gruen_bis_euro'], 0)} €; "
             f"Gelb bis {de(a['gelb_bis_prozent'], 0)} % und bis {de(a['gelb_bis_euro'], 0)} €; darüber Rot. Es gilt jeweils die strengere Grenze "
             f"(config/einstellungen.yaml).</p>")
    for w in st["warnungen"]:
        t.append(f"<p class=hinweis><b>Hinweis:</b> {e(w)}</p>")

    # Doppeleffekt
    d, z = leit["doppeleffekt"], leit["zinsen"]
    t.append(f"<h2>Doppeleffekt und Zinsrisiko ({e(leit['titel'])})</h2>")
    if d["posten"]:
        t.append("<div class=wrap>" + _tabelle(["Fällig ca.", "Posten", "Betrag"],
                 [[f"{p['datum']:%d.%m.%Y}", e(p["text"]), f"{de(p['betrag'])} €"] for p in d["posten"]]
                 + [["", "<b>Liquiditätsbedarf gesamt</b>", f"<b>{de(d['gesamt'])} €</b>"]], rechts_ab=2) + "</div>")
        t.append(f"<p class=hinweis>Annahme: Steuerbescheid {jahr} ca. {d['bescheid_geschaetzt']:%m/%Y}, Zahlungsfrist ein Monat. "
                 f"Mit dem Bescheid hebt das Finanzamt die Vorauszahlungen {jahr + 1} auf die neue Jahressteuer an "
                 f"(bisher {de(d['vz_folgejahr'])} €{', fortgeschrieben aus ' + str(jahr) if d['folgejahr_fortgeschrieben'] else ''}); "
                 f"der Erhöhungsbetrag fällt auf die verbleibenden Termine (§ 37 Abs. 3 und 4 EStG).</p>")
    else:
        t.append("<p>Keine Nachzahlung im Leitszenario.</p>")
    t.append(f"<p class=hinweis>Nachzahlungszinsen nach § 233a AO: {de(z['satz_pro_monat'] * 100, 2)} % je vollem Monat ab {z['zinslauf_beginn']:%d.%m.%Y} "
             f"(15 Monate Karenzzeit). Auf die Lücke wären das {de(z['je_monat'])} € je Monat; beim angenommenen Bescheidtermin "
             f"{de(z['betrag_bis_bescheid'])} €. Quelle: §§ 233a Abs. 2, 238 Abs. 1a AO, {e(st['params']['_datei'])}.</p>")

    # Plan vs. Ist
    mon = st["monate"]
    t.append(f"<h2>Zuflüsse {jahr}: Plan und Ist</h2>")
    t.append("<figure>" + diagramm.saeulen([MONATE[i] for i in range(12)],
             [("Plan (Basis)", "plan", [m["plan"] for m in mon]),
              ("Ist", "ist", [m["einnahmen_ist"] if m["ist"] else None for m in mon])],
             f"Netto-Zuflüsse {jahr} je Monat, Plan und Ist in Euro") + diagramm.legende([("Plan (Basis, netto)", "plan"), ("Ist (netto)", "ist")]) + "</figure>")
    zeilen = []
    for m in mon:
        ist = m["ist"]
        zeilen.append([_kurz(m["monat"]), f"{de(m['plan'])}", de(m["einnahmen_ist"]) if ist else "",
                       de(m["einnahmen_ist"] - m["plan"]) if ist else "", de(m["reisekosten"]) if ist and m["reisekosten"] else "",
                       de(m["ust"]) if ist else "", de(m["nicht_gewinnwirksam"]) if ist and m["nicht_gewinnwirksam"] else "",
                       f"{de(m['ausgaben'])} ({m['ausgaben_quelle']})"])
    t.append("<details><summary>Monatswerte als Tabelle</summary><div class=wrap>" + _tabelle(
        ["Monat", "Plan netto", "Ist netto", "Abweichung", "Reisekosten erstattet", "USt (kein Gewinn)", "durchlaufend/privat", "Betriebsausgaben"],
        zeilen, klasse="klein") + "</div></details>")

    # Lückenverlauf
    t.append("<h2>Lücke über die Monate</h2>")
    t.append("<figure>" + diagramm.linien([_kurz(v["monat"]) for v in verlauf],
             [(st["szenarien"][s]["titel"], s, [v[s] for v in verlauf]) for s in sz.SZENARIEN],
             "Deckungslücke je Stichtag und Szenario in Euro") + diagramm.legende([(st["szenarien"][s]["titel"], s) for s in sz.SZENARIEN]) + "</figure>")
    t.append("<p class=hinweis>Je Stichtag neu berechnet mit den Eingängen bis zu diesem Monat und den damals vorliegenden Bescheiden. "
             "Verträge gehen mit ihrem heutigen Stand ein.</p>")
    t.append("<details><summary>Werte als Tabelle</summary><div class=wrap>" + _tabelle(["Stichtag", "Konservativ", "Basis", "Run-Rate"],
             [[_kurz(v["monat"])] + [f"{de(v[s])} €" for s in sz.SZENARIEN] for v in verlauf], klasse="klein") + "</div></details>")

    # Rücklage
    t.append("<h2>Empfohlene Steuerrücklage</h2>")
    t.append("<div class=wrap>" + _tabelle(["Monat", "Konservativ", "Basis", "Run-Rate", "kumuliert (Leitszenario)"],
             [[_kurz(r["monat"]), f"{de(r['konservativ'])} €", f"{de(r['basis'])} €", f"{de(r['runrate'])} €",
               f"{de(r[leitname + '_kumuliert'])} €"] for r in st["ruecklage"]]) + "</div>")
    t.append("<p class=hinweis>Gleichmäßig verteilt, sodass die Lücke bis Jahresende gedeckt ist. Als CSV: <code>reports/rücklage.csv</code>.</p>")

    # Liquidität
    zl = liq["zeilen"]
    t.append(f"<h2>Liquiditätsvorschau 18 Monate ({e(leit['titel'])})</h2>")
    t.append("<figure>" + diagramm.linien([_kurz(x["monat"]) for x in zl], [("Kumulierter Saldo", leitname, [x["kumuliert"] for x in zl])],
             "Kumulierter Liquiditätssaldo in Euro") + "</figure>")
    mi = liq["minimum"]
    t.append(f"<p class=hinweis>Kumulierter Saldo aus Netto-Zuflüssen, Betriebsausgaben und Steuerzahlungen, ab Startbestand "
             f"{de(einst.get('annahmen', {}).get('liquiditaet_startbestand', 0))} €. Tiefpunkt: {de(mi['kumuliert'])} € im {_kurz(mi['monat'])}. "
             f"Ohne Umsatzsteuer und Privatentnahmen. Zuflüsse enden mit den erfassten Verträgen."
             + (f" Vorauszahlungen {', '.join(map(str, liq['vz_geschaetzt_jahre']))} sind mangels Bescheid aus dem Vorjahr fortgeschrieben." if liq["vz_geschaetzt_jahre"] else "")
             + (" Nach dem Vorschauzeitraum fällig: " + "; ".join(f"{e(p['text'])} {de(p['betrag'])} € am {p['datum']:%d.%m.%Y}" for p in liq["danach"]) + "." if liq["danach"] else "") + "</p>")
    t.append("<div class=wrap>" + _tabelle(["Monat", "Zuflüsse netto", "Betriebsausgaben", "Vorauszahlungen", "Nachzahlung/Erhöhung", "Saldo", "kumuliert"],
             [[_kurz(x["monat"]), de(x["einnahmen"]), de(-x["ausgaben"]), de(-x["vz"]) if x["vz"] else "",
               (de(-x["steuer_sonder"]) + f'<br><span class=hinweis>{e(x["sonder_text"])}</span>') if x["steuer_sonder"] else "",
               de(x["saldo"]), de(x["kumuliert"])] for x in zl], klasse="klein") + "</div>")

    # Rechenweg
    t.append("<h2>Rechenweg und Belege</h2>")
    for s in sz.SZENARIEN:
        x = st["szenarien"][s]
        t.append(f"<details><summary>Rechenweg {e(x['titel'])}: Lücke {de(x['luecke'])} €</summary><div class=wrap>" + _tabelle(
            ["Schritt", "Rechnung", "Ergebnis", "Quelle"],
            [[e(r.bezeichnung), e(r.formel), e(r.ergebnis), e(r.quelle)] for r in x["rechenweg"].schritte], rechts_ab=99, klasse="klein")
            + "</div></details>")
    b = st["bescheid_est"]
    if b:
        t.append(f"<details><summary>Vorauszahlungsbescheid {e(str(b['id']))} vom {b['datum']:%d.%m.%Y}</summary><div class=wrap>" + _tabelle(
            ["Fällig", "ESt", "Soli", "KiSt", "Summe"],
            [[f"{x['faellig']:%d.%m.%Y}", de(x.get("est", 0)), de(x.get("soli", 0)), de(x.get("kist", 0)),
              de(D(x.get("est")) + D(x.get("soli")) + D(x.get("kist")))] for x in b["termine"]], klasse="klein")
            + f"</div><p class=hinweis>Beleg: {e(str(b.get('beleg', 'nicht angegeben')))}"
            + (f" · vom Finanzamt zugrunde gelegtes zvE: {de(b['bemessungsgrundlage_zve'], 0)} €" if b.get("bemessungsgrundlage_zve") else "") + "</p></details>")
    t.append("<details><summary>Verträge und Gewichtung</summary><div class=wrap>" + _tabelle(
        ["ID", "Kunde", "Status", "Gewicht Basis", "Satz netto", "Menge/Monat", "Laufzeit", "Zahlungsziel", "Beleg"],
        [[e(str(v["id"])), e(v.get("kunde", "")), e(v["status"]), f"{de(sz.gewicht(v, 'basis', einst) * 100, 0)} %", f"{de(v['satz_netto'])} €",
          de(v["menge_pro_monat"], 0), f"{v['beginn']:%d.%m.%Y}–{v['ende']:%d.%m.%Y}", f"{v.get('zahlungsziel_tage', 0)} Tage",
          e(str(v.get("beleg", "")))] for v in daten.vertraege()], rechts_ab=99, klasse="klein") + "</div></details>")
    eing = [x for x in daten.eingaenge() if x.datum.year == jahr and (x.datum.year, x.datum.month) <= bis]
    t.append(f"<details><summary>Zahlungseingänge {jahr} ({len(eing)} Buchungen)</summary><div class=wrap>" + _tabelle(
        ["Datum", "Kunde / Zweck", "Art", "Vertrag", "Brutto", "USt", "Netto", "Quelle"],
        [[f"{x.datum:%d.%m.%Y}", e(x.kunde) + "<br><span class=hinweis>" + e(x.verwendungszweck) + " · " + e(x.id) + "</span>", e(x.art),
          e(x.vertrag_id), de(x.brutto), de(x.ust), de(x.netto), e(x.quelle)] for x in eing], rechts_ab=99, klasse="klein") + "</div></details>")
    p = st["params"]
    t.append(f"<details><summary>Parameter und Annahmen</summary><p>Steuerparameter: <code>{e(p['_datei'])}</code>, Stand {e(str(p['stand']))}, "
             f"Status {e(p['status'])}. Jeder Wert ist dort mit Fundstelle im Gesetz (gesetze-im-internet.de) kommentiert; der Tarif ist gegen "
             f"den BMF-Steuerrechner getestet (tests/test_tarif.py).</p><p>Jahrespauschale {jahr}: weitere Einkünfte "
             f"{de(st['pauschale'].get('weitere_einkuenfte', 0))} €, Abzüge {de(st['pauschale'].get('abzuege', 0))} € "
             f"({e(str(st['pauschale'].get('quelle', 'ohne Quelle')))}).</p><p>Betriebsausgaben: Pauschale "
             f"{de(einst['betriebsausgaben']['monatspauschale'])} € je Monat, ersetzt durch Ist-Werte aus data/ausgaben.csv, wo vorhanden. "
             f"Erstattete Reisekosten sind in Pauschalmonaten gewinnneutral angesetzt.</p></details>")
    t.append("<footer>Planungswerkzeug. Ersetzt keine Steuerberatung. Alle Werte sind Schätzungen auf Basis der erfassten Daten und "
             "vereinfachter Annahmen (unter anderem Jahrespauschalen für weitere Einkünfte und Abzüge); verbindlich ist allein der Steuerbescheid.</footer>")
    return (f'<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f"<title>Steuer-Check {jahr}-{bis[1]:02d}</title><style>{CSS}</style></head><body><main>{''.join(t)}</main>"
            "<script>addEventListener('beforeprint',()=>document.querySelectorAll('details').forEach(d=>d.open=true))</script></body></html>")


def schreibe_alles(wurzel: Path, daten: Daten, einst: dict, st: dict) -> list[Path]:
    ziel = Path(wurzel) / "reports"
    ziel.mkdir(parents=True, exist_ok=True)
    marke = f"{st['ist_bis'][0]}-{st['ist_bis'][1]:02d}"
    pfade = []
    antrag_name = None
    if st["szenarien"][st["leitszenario"]]["ampel"] == "rot":
        antrag_name = f"antrag_anpassung_{marke}.md"
        (ziel / antrag_name).write_text(antrag(daten, st), encoding="utf-8")
        pfade.append(ziel / antrag_name)
    bericht = ziel / f"status_{marke}.html"
    bericht.write_text(html(daten, einst, st, antrag_name), encoding="utf-8")
    schreibe_ruecklage(ziel / "rücklage.csv", st)
    return [bericht, ziel / "rücklage.csv"] + pfade
