"""ESt-Tarif § 32a EStG, Soli und KiSt.

Referenzwerte: BMF-Steuerrechner (https://www.bmf-steuerrechner.de/ekst/), Berechnungsjahr 2026,
abgerufen am 10.11.2026. Die Werte wurden vom Rechner übernommen, nicht selbst berechnet.
"""
from decimal import Decimal as Dec

import pytest

from estmon import tarif
from estmon.params import steuerparameter

# (zvE, ESt, Soli) laut BMF-Steuerrechner 2026, alleinstehend
BMF_2026_GRUNDTARIF = [
    (12348, "0", "0.00"),
    (15000, "435", "0.00"),
    (17800, "1035", "0.00"),
    (30000, "4217", "0.00"),
    (50000, "10548", "0.00"),
    (69879, "18213", "0.00"),
    (100000, "30864", "1251.16"),
    (150000, "51864", "2852.52"),
    (277826, "105551", "5805.30"),
    (300000, "115529", "6354.09"),
]


@pytest.mark.parametrize("zve,est,soli", BMF_2026_GRUNDTARIF)
def test_grundtarif_gegen_bmf(p2026, zve, est, soli):
    e = tarif.einkommensteuer(zve, p2026, "einzel")
    assert e == Dec(est)
    assert tarif.solidaritaetszuschlag(e, p2026, "einzel") == Dec(soli)


def test_splitting_gegen_bmf(p2026):
    # BMF-Steuerrechner 2026, verheiratet, zvE 100.000: ESt 21.096,00, Soli 0,00
    e = tarif.einkommensteuer(100000, p2026, "zusammen")
    assert e == Dec("21096")
    assert tarif.solidaritaetszuschlag(e, p2026, "zusammen") == Dec("0")


def test_zve_wird_auf_volle_euro_abgerundet(p2026):
    assert tarif.einkommensteuer("50000.99", p2026) == tarif.einkommensteuer(50000, p2026)
    assert tarif.einkommensteuer(-5000, p2026) == 0


def test_soli_freigrenze_und_milderungszone(p2026):
    assert tarif.solidaritaetszuschlag(20350, p2026) == 0
    assert tarif.solidaritaetszuschlag(20351, p2026) == Dec("0.11")          # 11,9 % von 1 €, Cent abgerundet
    assert tarif.solidaritaetszuschlag(200000, p2026) == Dec("11000.00")     # volle 5,5 %
    assert tarif.solidaritaetszuschlag(40700, p2026, "zusammen") == 0


def test_kirchensteuer(einst):
    assert tarif.kirchensteuer(10000, einst) == 0
    einst["kirchensteuer"] = {"pflichtig": True, "satz_prozent": 8}
    assert tarif.kirchensteuer(10548, einst) == Dec("843.84")


def test_rechenweg_nennt_quelle(p2026):
    from estmon.rechenweg import Rechenweg
    rw = Rechenweg()
    tarif.einkommensteuer(50000, p2026, "einzel", rw)
    assert "§ 32a" in rw.schritte[0].quelle and "steuerparameter_2026.yaml" in rw.schritte[0].quelle


@pytest.mark.parametrize("jahr", [2026, 2027])
def test_parameterdateien_haben_quelle_und_stand(jahr):
    from estmon.params import PROJEKT
    p = steuerparameter(jahr)
    assert p["stand"] and p["status"] in ("verifiziert", "vorlaeufig")
    text = (PROJEKT / "config" / f"steuerparameter_{jahr}.yaml").read_text(encoding="utf-8")
    for abschnitt in ("§ 32a", "SolzG", "§ 11", "§ 35", "§ 37", "§ 233a", "§ 238"):
        assert abschnitt in text
    assert text.count("gesetze-im-internet.de") >= 6
    # Zonen lückenlos aufsteigend
    grenzen = [z["bis"] for z in p["est_tarif"]["zonen"]]
    assert grenzen[-1] is None and grenzen[:-1] == sorted(grenzen[:-1])
