"""Liquiditätsvorschau über 18 Monate ab dem Monat nach dem Stichtag."""
from __future__ import annotations

import datetime as dt

from . import szenarien as sz
from .daten import Daten, vz_termine
from .geld import D, NULL
from .zufluss import naechster_monat


def _vz_fortgeschrieben(daten: Daten, art: str, jahre: list[int]) -> tuple[dict, list[int]]:
    """VZ je Monat; für Jahre ohne Bescheid werden die Termine des letzten Bescheids fortgeschrieben."""
    aus: dict[tuple[int, int], D] = {}
    geschaetzt = []
    letzter = None
    for jahr in jahre:
        b = daten.vz_bescheid(jahr, art)
        if b:
            termine, letzter = vz_termine(b), b
        elif letzter:
            termine = [(dt.date(jahr, d.month, d.day), betrag) for d, betrag in vz_termine(letzter)]
            geschaetzt.append(jahr)
        else:
            termine = []
        for d, betrag in termine:
            aus[(d.year, d.month)] = aus.get((d.year, d.month), NULL) + betrag
    return aus, geschaetzt


def vorschau(daten: Daten, einst: dict, st: dict, monate: int = 18) -> dict:
    """Netto-Sicht ohne Umsatzsteuer (durchlaufend). Einnahmen nach Leitszenario."""
    ist_bis = st["ist_bis"]
    leit = st["leitszenario"]
    start = naechster_monat(*ist_bis)
    reihe = [naechster_monat(*start, i) for i in range(monate)]
    jahre = sorted({j for j, _ in reihe} | {st["jahr"]})
    vz_est, gesch = _vz_fortgeschrieben(daten, "est", [min(jahre) - 1] + jahre)
    vz_gew = {}
    if einst["einstufung"] == "gewerblich":
        vz_gew, _ = _vz_fortgeschrieben(daten, "gewst", [min(jahre) - 1] + jahre)
    ausg_ist = daten.ausgaben_ist()
    zukunft = sz.kuenftige_zufluesse(daten, einst, ist_bis, sz.daten_ab(daten, st["jahr"]))
    rate = st["runrate_monatswert"]
    sonder: dict[tuple[int, int], list] = {}
    for p in st["szenarien"][leit]["doppeleffekt"]["posten"]:
        sonder.setdefault((p["datum"].year, p["datum"].month), []).append(p)
    stand = D(einst.get("annahmen", {}).get("liquiditaet_startbestand", 0))
    zeilen = []
    for m in reihe:
        ein = rate if leit == "runrate" else zukunft[leit].get(m, NULL)
        ausg, _ = sz.ausgaben_monat(ausg_ist, einst, m)
        vz = vz_est.get(m, NULL) + vz_gew.get(m, NULL)
        extra = sum((p["betrag"] for p in sonder.get(m, [])), NULL)
        saldo = ein - ausg - vz - extra
        stand += saldo
        zeilen.append({"monat": f"{m[0]}-{m[1]:02d}", "einnahmen": ein, "ausgaben": ausg, "vz": vz,
                       "steuer_sonder": extra, "sonder_text": "; ".join(p["text"] for p in sonder.get(m, [])),
                       "saldo": saldo, "kumuliert": stand})
    ende = reihe[-1]
    danach = [p for p in st["szenarien"][leit]["doppeleffekt"]["posten"]
              if (p["datum"].year, p["datum"].month) > ende]
    return {"zeilen": zeilen, "szenario": leit, "danach": danach, "vz_geschaetzt_jahre": [j for j in gesch if j in jahre],
            "minimum": min(zeilen, key=lambda z: z["kumuliert"])}
