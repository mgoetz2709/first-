from decimal import Decimal as Dec

from estmon import gewst, luecke


def test_gewerbesteuer_und_anrechnung(p2026):
    g = gewst.gewerbesteuer("100050", 400, p2026)
    assert g.gewerbeertrag == Dec("75500")            # 100.000 (abgerundet) − 24.500
    assert g.messbetrag == Dec("2642.50")             # 3,5 %
    assert g.gewerbesteuer == Dec("10570.00")         # × 400 %
    # § 35: 4 × Messbetrag = 10.570 = GewSt → volle Anrechnung bei Hebesatz 400 %
    assert gewst.ermaessigung_35(30000, g, 100050, 100050, p2026) == Dec("10570.00")


def test_anrechnung_begrenzt_auf_gezahlte_gewst_und_hoechstbetrag(p2026):
    g = gewst.gewerbesteuer(100000, 300, p2026)
    assert gewst.ermaessigung_35(30000, g, 100000, 100000, p2026) == g.gewerbesteuer   # GewSt < 4 × Messbetrag
    g = gewst.gewerbesteuer(100000, 500, p2026)
    assert gewst.ermaessigung_35(30000, g, 100000, 100000, p2026) == Dec("10570.00")   # 4 × Messbetrag
    # Höchstbetrag: nur die Hälfte der positiven Einkünfte ist gewerblich
    assert gewst.ermaessigung_35(8000, g, 100000, 200000, p2026) == Dec("4000.00")


def test_freibetrag(p2026):
    assert gewst.gewerbesteuer(24500, 400, p2026).gewerbesteuer == 0


def test_jahressteuer_gewerblich_hoeher_als_freiberuflich_bei_hohem_hebesatz(einst, p2026):
    pauschale = {"weitere_einkuenfte": 0, "abzuege": 0}
    frei = luecke.jahressteuer(100000, pauschale, einst, p2026)
    einst["einstufung"] = "gewerblich"
    einst["gewerbesteuer"]["hebesatz_prozent"] = 480
    gew = luecke.jahressteuer(100000, pauschale, einst, p2026)
    assert gew["gewst"] == Dec("12684.00") and gew["ermaessigung_35"] == Dec("10570.00")
    # Soli bemisst sich nach der um § 35 geminderten ESt
    assert gew["soli"] < frei["soli"]
    assert gew["gesamt"] > frei["gesamt"]
    einst["gewerbesteuer"]["hebesatz_prozent"] = 400
    neutral = luecke.jahressteuer(100000, pauschale, einst, p2026)
    assert neutral["gesamt"] < frei["gesamt"] + 1     # bei 400 % voll angerechnet, Soli sogar niedriger
