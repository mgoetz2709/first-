"""Gewinnprognose Gesamtjahr in drei Szenarien (konservativ, basis, runrate)."""
from __future__ import annotations

import datetime as dt
from decimal import Decimal

from .daten import Daten
from .geld import D, NULL, cent, de
from .rechenweg import Rechenweg
from .zufluss import naechster_monat, projektion

SZENARIEN = ("konservativ", "basis", "runrate")
TITEL = {"konservativ": "Konservativ", "basis": "Basis", "runrate": "Run-Rate"}
GEWINNWIRKSAM = ("honorar", "sonstig")
Monat = tuple[int, int]


def _idx(m: Monat) -> int:
    return m[0] * 12 + m[1] - 1


def gewicht(vertrag: dict, szenario: str, einst: dict) -> Decimal:
    status = vertrag["status"]
    if status == "unterschrieben":
        return Decimal(1)
    if szenario != "basis":
        return NULL
    if status == "zugesagt":
        return D(einst.get("szenarien", {}).get("gewicht_zugesagt_prozent", 100)) / 100
    return D(vertrag.get("wahrscheinlichkeit_prozent", 0)) / 100


def daten_ab(daten: Daten, jahr: int) -> dt.date:
    """Ab hier werden Plan und Ist abgeglichen: 1.1. des ersten Jahres mit erfassten Eingängen."""
    jahre = [e.datum.year for e in daten.eingaenge()]
    return dt.date(min(jahre + [jahr]), 1, 1)


def vertragsstand(daten: Daten, ist_bis: Monat, ab: dt.date) -> list[dict]:
    """Je Vertrag: Plan bis Stichtag, Ist, Abweichung und bereinigte künftige Zuflüsse (ungewichtet).

    Abweichung > 0 (überfällig) wird in den Monat nach dem Stichtag vorgetragen,
    Abweichung < 0 (früher bezahlt) mindert die nächsten geplanten Zuflüsse.
    """
    eingaenge = [e for e in daten.eingaenge() if e.art == "honorar" and e.datum >= ab
                 and _idx((e.datum.year, e.datum.month)) <= _idx(ist_bis)]
    aus = []
    for v in daten.vertraege():
        fluesse = [f for f in projektion(v) if f.zufluss >= ab]
        plan_bis = sum((f.netto for f in fluesse if _idx((f.zufluss.year, f.zufluss.month)) <= _idx(ist_bis)), NULL)
        ist = sum((e.netto for e in eingaenge if e.vertrag_id == str(v["id"])), NULL)
        delta = plan_bis - ist
        kuenftig: list[tuple[Monat, Decimal, str]] = []
        if delta > 0:
            kuenftig.append((naechster_monat(*ist_bis), delta, "überfällig, vorgetragen"))
        vorab = -delta if delta < 0 else NULL
        for f in fluesse:
            m = (f.zufluss.year, f.zufluss.month)
            if _idx(m) <= _idx(ist_bis):
                continue
            betrag = f.netto
            if vorab > 0:
                abzug = min(vorab, betrag)
                betrag, vorab = betrag - abzug, vorab - abzug
            if betrag > 0:
                kuenftig.append((m, betrag, f"Leistung {f.leistung}, Rechnung {f.rechnung:%d.%m.%Y}"))
        aus.append({"vertrag": v, "plan_bis": plan_bis, "ist": ist, "abweichung": ist - plan_bis,
                    "kuenftig": kuenftig})
    return aus


def kuenftige_zufluesse(daten: Daten, einst: dict, ist_bis: Monat, ab: dt.date) -> dict[str, dict[Monat, Decimal]]:
    """Gewichtete künftige Netto-Zuflüsse je Szenario und Monat (nur vertragsbasierte Szenarien)."""
    aus: dict[str, dict[Monat, Decimal]] = {"konservativ": {}, "basis": {}}
    for stand in vertragsstand(daten, ist_bis, ab):
        for s in aus:
            g = gewicht(stand["vertrag"], s, einst)
            if g == 0:
                continue
            for m, betrag, _ in stand["kuenftig"]:
                aus[s][m] = aus[s].get(m, NULL) + cent(betrag * g)
    return aus


def plan_original(daten: Daten, einst: dict, ab: dt.date) -> dict[Monat, Decimal]:
    """Ursprünglicher Plan (Basis-Gewichtung) je Zuflussmonat, ohne Abgleich mit dem Ist."""
    aus: dict[Monat, Decimal] = {}
    for v in daten.vertraege():
        g = gewicht(v, "basis", einst)
        for f in projektion(v):
            if f.zufluss >= ab and g > 0:
                m = (f.zufluss.year, f.zufluss.month)
                aus[m] = aus.get(m, NULL) + cent(f.netto * g)
    return aus


def runrate(daten: Daten, einst: dict, ist_bis: Monat) -> tuple[Decimal, list[Monat]]:
    """Durchschnitt der gewinnwirksamen Netto-Zuflüsse der letzten n Ist-Monate."""
    n = int(einst.get("szenarien", {}).get("runrate_monate", 3))
    monate = [naechster_monat(*ist_bis, -i) for i in range(n - 1, -1, -1)]
    eingaenge = daten.eingaenge()
    if eingaenge:
        # Monate vor Beginn der Datenerfassung zählen nicht mit (sonst wäre der Schnitt zu niedrig).
        erster = min((e.datum.year, e.datum.month) for e in eingaenge)
        monate = [m for m in monate if _idx(m) >= _idx(erster)] or monate[-1:]
    summe = sum((e.netto for e in eingaenge
                 if e.art in GEWINNWIRKSAM and (e.datum.year, e.datum.month) in monate), NULL)
    return cent(summe / len(monate)), monate


def ausgaben_monat(daten_ist: dict, einst: dict, m: Monat) -> tuple[Decimal, str]:
    if m in daten_ist:
        return daten_ist[m], "Ist"
    return D(einst["betriebsausgaben"]["monatspauschale"]), "Pauschale"


def berechne(daten: Daten, einst: dict, jahr: int, ist_bis: Monat) -> dict:
    """Gewinnprognose für das Jahr; Ist bis einschließlich Monat ist_bis (jahr, monat)."""
    ab = daten_ab(daten, jahr)
    ausg_ist = daten.ausgaben_ist()
    zukunft = kuenftige_zufluesse(daten, einst, ist_bis, ab)
    rate, rate_monate = runrate(daten, einst, ist_bis)
    plan = plan_original(daten, einst, ab)
    eingaenge = [e for e in daten.eingaenge() if e.datum.year == jahr
                 and _idx((e.datum.year, e.datum.month)) <= _idx(ist_bis)]

    monate = []
    for monat in range(1, 13):
        m = (jahr, monat)
        ist = _idx(m) <= _idx(ist_bis)
        ausg, ausg_quelle = ausgaben_monat(ausg_ist, einst, m)
        im_monat = [e for e in eingaenge if e.datum.month == monat]
        honorar = sum((e.netto for e in im_monat if e.art in GEWINNWIRKSAM), NULL)
        reise = sum((e.netto for e in im_monat if e.art == "reisekosten"), NULL)
        monate.append({
            "monat": f"{jahr}-{monat:02d}", "ist": ist, "einnahmen_ist": honorar,
            "reisekosten": reise, "reisekosten_wirksam": reise if ausg_quelle == "Ist" else NULL,
            "ust": sum((e.ust for e in im_monat), NULL),
            "nicht_gewinnwirksam": sum((e.netto for e in im_monat if e.art in ("durchlaufend", "privat")), NULL),
            "plan": plan.get(m, NULL),
            "prognose": {"konservativ": NULL if ist else zukunft["konservativ"].get(m, NULL),
                         "basis": NULL if ist else zukunft["basis"].get(m, NULL),
                         "runrate": NULL if ist else rate},
            "ausgaben": ausg, "ausgaben_quelle": ausg_quelle,
        })

    einnahmen_ist = sum((m["einnahmen_ist"] for m in monate), NULL)
    reise_wirksam = sum((m["reisekosten_wirksam"] for m in monate), NULL)
    reise_neutral = sum((m["reisekosten"] for m in monate), NULL) - reise_wirksam
    ausgaben = sum((m["ausgaben"] for m in monate), NULL)
    n_pauschal = sum(1 for m in monate if m["ausgaben_quelle"] == "Pauschale")
    n_rest = sum(1 for m in monate if not m["ist"])

    szen = {}
    for s in SZENARIEN:
        prognose = sum((m["prognose"][s] for m in monate), NULL)
        gewinn = einnahmen_ist + reise_wirksam + prognose - ausgaben
        rw = Rechenweg()
        rw.add("Ist-Zuflüsse netto (Honorar, sonstige)", f"Summe data/eingaenge.csv, {jahr} bis {ist_bis[1]:02d}/{ist_bis[0]}",
               f"{de(einnahmen_ist)} €", "data/eingaenge.csv (Zuflussdatum, § 11 EStG)")
        if reise_wirksam or reise_neutral:
            rw.add("Erstattete Reisekosten", f"{de(reise_wirksam)} € als Einnahme (Monate mit Ist-Ausgaben); "
                   f"{de(reise_neutral)} € neutral (Erstattung = Ausgabe, Monate mit Pauschale)",
                   f"{de(reise_wirksam)} €", "data/eingaenge.csv, art = reisekosten")
        if s == "runrate":
            rw.add("Prognose Restjahr", f"Ø {', '.join(f'{m:02d}/{j}' for j, m in rate_monate)} = {de(rate)} € × {n_rest} Monate",
                   f"{de(prognose)} €", "data/eingaenge.csv")
        else:
            was = "nur unterschriebene Verträge" if s == "konservativ" else \
                "unterschrieben + zugesagt + Pipeline × Wahrscheinlichkeit"
            rw.add("Prognose Restjahr", f"Vertragszuflüsse nach Zahlungsziel, {was}", f"{de(prognose)} €",
                   "data/vertraege.yaml; python -m estmon projektion")
        rw.add("Betriebsausgaben", f"{12 - n_pauschal} Monate Ist + {n_pauschal} Monate Pauschale "
               f"à {de(einst['betriebsausgaben']['monatspauschale'])} €", f"− {de(ausgaben)} €",
               "data/ausgaben.csv; config/einstellungen.yaml")
        rw.add("Gewinn (EÜR) Gesamtjahr", "Ist + Prognose − Betriebsausgaben", f"{de(gewinn)} €", "§ 4 Abs. 3 EStG")
        szen[s] = {"einnahmen_ist": einnahmen_ist, "reisekosten_wirksam": reise_wirksam, "prognose": prognose,
                   "ausgaben": ausgaben, "gewinn": gewinn, "rechenweg": rw}
    return {"jahr": jahr, "ist_bis": ist_bis, "monate": monate, "szenarien": szen,
            "runrate_monatswert": rate, "zukunft": zukunft}
