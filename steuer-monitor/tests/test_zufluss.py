import datetime as dt
from decimal import Decimal as Dec

import pytest

from estmon.zufluss import leistung_je_monat, projektion, ust_trennen


def vertrag(**kw):
    v = {"id": "T-1", "status": "unterschrieben", "satz_netto": 1000, "menge_pro_monat": 10,
         "beginn": dt.date(2026, 10, 1), "ende": dt.date(2026, 12, 31), "abrechnung": "monatlich",
         "zahlungsziel_tage": 30}
    v.update(kw)
    return v


def test_dezember_rechnung_fliesst_im_januar_zu():
    """Zuflussprinzip § 11 EStG: Rechnung 31.12.2026, Zahlungsziel 30 Tage → Einnahme 2027."""
    f = projektion(vertrag())
    dez = [x for x in f if x.leistung == "2026-12"][0]
    assert dez.rechnung == dt.date(2026, 12, 31)
    assert dez.zufluss == dt.date(2027, 1, 30) and dez.zufluss.year == 2027
    je_jahr = {}
    for x in f:
        je_jahr[x.zufluss.year] = je_jahr.get(x.zufluss.year, 0) + x.netto
    assert je_jahr == {2026: Dec("20000.00"), 2027: Dec("10000.00")}


def test_zahlungsziel_null_bleibt_im_jahr():
    f = projektion(vertrag(zahlungsziel_tage=0))
    assert all(x.zufluss.year == 2026 for x in f)


def test_jahreswechsel_im_status(beispiel, einst):
    """Im Beispiel wird die Dezember-2025-Leistung am 30.01.2026 bezahlt und zählt zu 2026;
    die November-Rechnung (Zufluss 30.12.2025) zählt nicht."""
    from estmon import szenarien
    r = szenarien.berechne(beispiel, einst, 2026, (2026, 3))
    assert r["monate"][0]["einnahmen_ist"] == Dec("14000.00")
    assert r["szenarien"]["konservativ"]["einnahmen_ist"] + r["szenarien"]["konservativ"]["prognose"] == Dec("140000.00")


def test_quartalsweise_und_einmalig():
    q = projektion(vertrag(abrechnung="quartalsweise", beginn=dt.date(2026, 5, 1), ende=dt.date(2026, 9, 30),
                           zahlungsziel_tage=14))
    assert [(x.rechnung, x.netto) for x in q] == [(dt.date(2026, 6, 30), Dec("20000.00")),
                                                  (dt.date(2026, 9, 30), Dec("30000.00"))]
    e = projektion(vertrag(abrechnung="einmalig", zahlungsziel_tage=10))
    assert len(e) == 1 and e[0].netto == Dec("30000.00") and e[0].zufluss == dt.date(2027, 1, 10)


def test_angebrochene_monate_anteilig_und_mengen_ueberschreibbar():
    v = vertrag(beginn=dt.date(2026, 11, 16), ende=dt.date(2026, 12, 31), mengen={"2026-12": 4})
    assert leistung_je_monat(v) == [(2026, 11, Dec("5000.00")), (2026, 12, Dec("4000.00"))]


@pytest.mark.parametrize("brutto,satz,netto,ust", [
    ("16660.00", 19, "14000.00", "2660.00"),
    ("428.40", 19, "360.00", "68.40"),
    ("107.00", 7, "100.00", "7.00"),
    ("5000.00", 0, "5000.00", "0.00"),
    ("100.00", 19, "84.03", "15.97"),
])
def test_netto_ust_trennung(brutto, satz, netto, ust):
    n, u = ust_trennen(brutto, satz)
    assert (n, u) == (Dec(netto), Dec(ust))
    assert n + u == Dec(brutto)
