"""Zuflussprinzip (§ 11 EStG): Verträge in erwartete Geldeingänge je Monat übersetzen."""
from __future__ import annotations

import calendar
import datetime as dt
from dataclasses import dataclass
from decimal import Decimal

from .daten import als_datum
from .geld import D, NULL, cent


@dataclass
class PlanZufluss:
    vertrag_id: str
    leistung: str          # Leistungsmonat JJJJ-MM (bei Sammelrechnung: letzter Monat)
    rechnung: dt.date
    zufluss: dt.date       # maßgeblich für die Jahreszuordnung
    netto: Decimal


def ust_trennen(brutto, satz_prozent) -> tuple[Decimal, Decimal]:
    """Zerlegt einen Bruttobetrag in (netto, ust). USt ist kein Gewinn."""
    b = D(brutto)
    netto = cent(b / (1 + D(satz_prozent) / 100))
    return netto, b - netto


def monatsende(jahr: int, monat: int) -> dt.date:
    return dt.date(jahr, monat, calendar.monthrange(jahr, monat)[1])


def monate_zwischen(beginn: dt.date, ende: dt.date):
    j, m = beginn.year, beginn.month
    while (j, m) <= (ende.year, ende.month):
        yield j, m
        j, m = (j + 1, 1) if m == 12 else (j, m + 1)


def naechster_monat(jahr: int, monat: int, n: int = 1) -> tuple[int, int]:
    idx = jahr * 12 + (monat - 1) + n
    return idx // 12, idx % 12 + 1


def leistung_je_monat(vertrag: dict) -> list[tuple[int, int, Decimal]]:
    """Netto-Honorar je Leistungsmonat. Angebrochene Monate anteilig nach Kalendertagen;
    'mengen: {JJJJ-MM: x}' überschreibt die Standardmenge."""
    beginn, ende = als_datum(vertrag["beginn"]), als_datum(vertrag["ende"])
    satz = D(vertrag["satz_netto"])
    standard = D(vertrag.get("menge_pro_monat"))
    mengen = {str(k): D(v) for k, v in (vertrag.get("mengen") or {}).items()}
    aus = []
    for j, m in monate_zwischen(beginn, ende):
        key = f"{j}-{m:02d}"
        if key in mengen:
            menge = mengen[key]
        else:
            tage = calendar.monthrange(j, m)[1]
            von = max(beginn, dt.date(j, m, 1))
            bis = min(ende, dt.date(j, m, tage))
            menge = standard * Decimal((bis - von).days + 1) / Decimal(tage)
        aus.append((j, m, cent(satz * menge)))
    return aus


def projektion(vertrag: dict) -> list[PlanZufluss]:
    """Erwartete Zuflüsse eines Vertrags: Rechnung am Ende der Abrechnungsperiode,
    Zufluss = Rechnungsdatum + Zahlungsziel."""
    ende = als_datum(vertrag["ende"])
    ziel = dt.timedelta(days=int(vertrag.get("zahlungsziel_tage", 0)))
    rhythmus = vertrag.get("abrechnung", "monatlich")
    gruppen: dict[dt.date, list] = {}
    for j, m, betrag in leistung_je_monat(vertrag):
        if rhythmus == "monatlich":
            stichtag = monatsende(j, m)
        elif rhythmus == "quartalsweise":
            stichtag = monatsende(j, ((m - 1) // 3) * 3 + 3)
        elif rhythmus == "einmalig":
            stichtag = ende
        else:
            raise ValueError(f"Vertrag {vertrag['id']}: abrechnung '{rhythmus}' unbekannt")
        rechnung = min(stichtag, ende)
        gruppen.setdefault(rechnung, []).append((j, m, betrag))
    aus = []
    for rechnung in sorted(gruppen):
        teile = gruppen[rechnung]
        j, m, _ = teile[-1]
        aus.append(PlanZufluss(str(vertrag["id"]), f"{j}-{m:02d}", rechnung, rechnung + ziel,
                               sum((t[2] for t in teile), NULL)))
    return aus
