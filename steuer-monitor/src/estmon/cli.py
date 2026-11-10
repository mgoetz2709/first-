"""Kommandozeile: python -m estmon <befehl>. Alle Zahlen im Chat und in Reports stammen von hier."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from decimal import Decimal
from pathlib import Path

import yaml

from . import bankimport, luecke, szenarien as sz, tarif
from .daten import Daten, vz_termine
from .geld import D, NULL, de
from .params import PROJEKT, einstellungen, lade_yaml, steuerparameter
from .rechenweg import Rechenweg
from .zufluss import naechster_monat, projektion


def _monat(text: str) -> tuple[int, int]:
    j, m = text.split("-")
    return int(j), int(m)


def _standard_stichtag(daten: Daten) -> tuple[int, int]:
    """Letzter Monat mit erfassten Eingängen, sonst der Vormonat."""
    eing = daten.eingaenge()
    if eing:
        d = max(e.datum for e in eing)
        return d.year, d.month
    h = dt.date.today()
    return naechster_monat(h.year, h.month, -1)


def _json(obj):
    def konv(o):
        if isinstance(o, Decimal):
            return str(o)
        if isinstance(o, (dt.date, dt.datetime)):
            return o.isoformat()
        if isinstance(o, Rechenweg):
            return o.als_liste()
        if isinstance(o, tuple):
            return list(o)
        raise TypeError(type(o))
    def schluessel(o):
        if isinstance(o, dict):
            return {(f"{k[0]}-{k[1]:02d}" if isinstance(k, tuple) else k): schluessel(v) for k, v in o.items()}
        if isinstance(o, (list, tuple)):
            return [schluessel(v) for v in o]
        return o
    return json.dumps(schluessel(obj), default=konv, ensure_ascii=False, indent=2)


def _kontext(args):
    wurzel = Path(args.wurzel).resolve() if args.wurzel else PROJEKT
    daten = Daten(wurzel)
    einst = einstellungen(wurzel)
    ist_bis = _monat(args.stichtag) if getattr(args, "stichtag", None) else _standard_stichtag(daten)
    jahr = getattr(args, "jahr", None) or ist_bis[0]
    return wurzel, daten, einst, jahr, ist_bis


def tabelle(st: dict) -> str:
    kopf = "| Szenario | Gewinn | Jahressteuer | festgesetzte VZ | Lücke | Ampel |\n|---|---:|---:|---:|---:|---|"
    zeilen = [kopf]
    for s in sz.SZENARIEN:
        e = st["szenarien"][s]
        leit = " *" if s == st["leitszenario"] else ""
        zeilen.append(f"| {e['titel']}{leit} | {de(e['gewinn'])} € | {de(e['steuer']['gesamt'])} € | {de(e['vz'])} € | "
                      f"{de(e['luecke'])} € ({de(e['luecke_prozent'], 1)} %) | "
                      f"{luecke.AMPEL_SYMBOL[e['ampel']]} {luecke.AMPEL_TEXT[e['ampel']]} |")
    return "\n".join(zeilen)


def cmd_status(args) -> int:
    wurzel, daten, einst, jahr, ist_bis = _kontext(args)
    st = luecke.status(daten, einst, jahr, ist_bis)
    if args.json:
        print(_json({k: v for k, v in st.items() if k not in ("params", "einstellungen")}))
        return 0
    print(f"Steuer-Check {jahr}, Ist bis {ist_bis[1]:02d}/{ist_bis[0]} (* = Leitszenario)\n")
    print(tabelle(st))
    print()
    for satz in luecke.empfehlung(st):
        print(satz)
    for w in st["warnungen"]:
        print(f"Hinweis: {w}")
    return 0


def cmd_report(args) -> int:
    from . import report
    wurzel, daten, einst, jahr, ist_bis = _kontext(args)
    st = luecke.status(daten, einst, jahr, ist_bis)
    for pfad in report.schreibe_alles(wurzel, daten, einst, st):
        print(pfad)
    return 0


def cmd_projektion(args) -> int:
    wurzel, daten, einst, jahr, ist_bis = _kontext(args)
    vertraege = [v for v in daten.vertraege() if not args.vertrag or str(v["id"]) == args.vertrag]
    if args.datei:
        vertraege = (lade_yaml(Path(args.datei)) or {}).get("vertraege", [])
        from .daten import als_datum
        for v in vertraege:
            v["beginn"], v["ende"] = als_datum(v["beginn"]), als_datum(v["ende"])
    for v in vertraege:
        print(f"\n{v['id']} {v.get('kunde', '')} ({v['status']}), Gewicht Basis {de(sz.gewicht(v, 'basis', einst) * 100, 0)} %")
        print("| Leistung | Rechnung | Zufluss | Steuerjahr | Netto |\n|---|---|---|---|---:|")
        summen: dict[int, Decimal] = {}
        for f in projektion(v):
            summen[f.zufluss.year] = summen.get(f.zufluss.year, NULL) + f.netto
            print(f"| {f.leistung} | {f.rechnung:%d.%m.%Y} | {f.zufluss:%d.%m.%Y} | {f.zufluss.year} | {de(f.netto)} € |")
        print("Summe je Steuerjahr (Zufluss): " + ", ".join(f"{j}: {de(b)} €" for j, b in sorted(summen.items())))
    return 0


def cmd_planist(args) -> int:
    wurzel, daten, einst, jahr, ist_bis = _kontext(args)
    ab = sz.daten_ab(daten, jahr)
    print(f"Plan/Ist je Vertrag, kumuliert ab {ab:%d.%m.%Y} bis {ist_bis[1]:02d}/{ist_bis[0]}\n")
    print("| Vertrag | Kunde | Plan | Ist | Abweichung | Folge |\n|---|---|---:|---:|---:|---|")
    for s in sz.vertragsstand(daten, ist_bis, ab):
        v, a = s["vertrag"], s["abweichung"]
        folge = "im Plan" if a == 0 else ("überfällig, in Folgemonat vorgetragen" if a < 0
                                         else "früher bezahlt, mindert künftige Zuflüsse")
        print(f"| {v['id']} | {v.get('kunde', '')} | {de(s['plan_bis'])} € | {de(s['ist'])} € | {de(a)} € | {folge} |")
    ohne = [e for e in daten.eingaenge() if e.art == "honorar" and not e.vertrag_id
            and (e.datum.year, e.datum.month) == ist_bis]
    for e in ohne:
        print(f"Ohne Vertrag: {e.datum:%d.%m.%Y} {e.kunde} {de(e.netto)} € netto")
    return 0


def cmd_import_vorschlag(args) -> int:
    wurzel, daten, einst, _, _ = _kontext(args)
    profil = lade_yaml(PROJEKT / einst["bankimport"]["profil"])
    eintraege = bankimport.vorschlag(Path(args.csv), profil, daten.vertraege(), einst["ust_satz_standard_prozent"], args.monat)
    vorhanden = {e.id for e in daten.eingaenge()}
    for e in eintraege:
        if e["id"] in vorhanden:
            e["hinweise"].append("Bereits erfasst; wird beim Speichern übersprungen.")
    ziel = Path(args.aus) if args.aus else None
    text = yaml.safe_dump({"eingaenge": eintraege}, allow_unicode=True, sort_keys=False)
    if ziel:
        ziel.write_text(text, encoding="utf-8")
        print(f"{len(eintraege)} Zahlungseingänge als Vorschlag in {ziel} (noch nicht gespeichert).")
    else:
        print(text)
    return 0


def cmd_import_speichern(args) -> int:
    wurzel, daten, einst, _, _ = _kontext(args)
    eintraege = (lade_yaml(Path(args.vorschlag)) or {}).get("eingaenge", [])
    neu, doppelt = daten.eingaenge_anhaengen(bankimport.aus_vorschlag(eintraege))
    print(f"{neu} Eingänge gespeichert, {doppelt} bereits vorhanden und übersprungen.")
    return 0


def cmd_tarif(args) -> int:
    einst = einstellungen(Path(args.wurzel).resolve() if args.wurzel else None)
    params = steuerparameter(args.jahr)
    rw = Rechenweg()
    veranlagung = args.veranlagung or einst["veranlagung"]
    est = tarif.einkommensteuer(D(args.zve), params, veranlagung, rw)
    soli = tarif.solidaritaetszuschlag(est, params, veranlagung, rw)
    tarif.kirchensteuer(est, einst, rw)
    for s in rw.schritte:
        print(f"{s.bezeichnung}: {s.formel} = {s.ergebnis}  [{s.quelle}]")
    print(f"Summe ESt + Soli: {de(est + soli)} €")
    return 0


def cmd_vz(args) -> int:
    wurzel, daten, einst, jahr, _ = _kontext(args)
    for art in ("est", "gewst"):
        b = daten.vz_bescheid(jahr, art)
        if not b:
            continue
        print(f"{art.upper()} {jahr}: Bescheid {b['id']} vom {b['datum']}")
        for d, betrag in vz_termine(b):
            print(f"  {d:%d.%m.%Y}  {de(betrag)} €")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="estmon", description="ESt-Vorauszahlungs-Monitor (Rechenkern)")
    p.add_argument("--wurzel", help="Datenwurzel mit data/ und reports/ (Standard: Projektordner; Beispiel: beispiel)")
    sub = p.add_subparsers(dest="befehl", required=True)

    def gemeinsam(sp):
        sp.add_argument("--jahr", type=int)
        sp.add_argument("--stichtag", help="Ist bis einschließlich JJJJ-MM (Standard: letzter Monat mit Eingängen)")

    s = sub.add_parser("status", help="Steuer-Check mit Ampel"); gemeinsam(s)
    s.add_argument("--json", action="store_true"); s.set_defaults(f=cmd_status)
    s = sub.add_parser("report", help="HTML-Bericht, rücklage.csv und ggf. Antragsentwurf schreiben"); gemeinsam(s)
    s.set_defaults(f=cmd_report)
    s = sub.add_parser("projektion", help="Zuflüsse je Vertrag projizieren"); gemeinsam(s)
    s.add_argument("--vertrag"); s.add_argument("--datei", help="YAML mit noch nicht gespeicherten Verträgen")
    s.set_defaults(f=cmd_projektion)
    s = sub.add_parser("planist", help="Plan/Ist je Vertrag bis Stichtag"); gemeinsam(s); s.set_defaults(f=cmd_planist)
    s = sub.add_parser("import-vorschlag", help="Bankexport lesen, Vorschlag erzeugen (speichert nichts)")
    s.add_argument("csv"); s.add_argument("--monat", help="JJJJ-MM"); s.add_argument("--aus", help="Ziel-YAML")
    s.set_defaults(f=cmd_import_vorschlag)
    s = sub.add_parser("import-speichern", help="Bestätigten Vorschlag in data/eingaenge.csv übernehmen")
    s.add_argument("vorschlag"); s.set_defaults(f=cmd_import_speichern)
    s = sub.add_parser("tarif", help="ESt/Soli für ein zvE mit Rechenweg")
    s.add_argument("--zve", required=True); s.add_argument("--jahr", type=int, required=True)
    s.add_argument("--veranlagung", choices=["einzel", "zusammen"]); s.set_defaults(f=cmd_tarif)
    s = sub.add_parser("vz", help="Festgesetzte Vorauszahlungen anzeigen"); gemeinsam(s); s.set_defaults(f=cmd_vz)

    args = p.parse_args(argv)
    try:
        return args.f(args)
    except Exception as e:  # klare Fehlermeldung statt Traceback
        if isinstance(e, (KeyboardInterrupt,)):
            raise
        print(f"Fehler: {e}", file=sys.stderr)
        return 1
