import datetime as dt
from decimal import Decimal as Dec

import yaml

from estmon import luecke, szenarien


def test_drei_szenarien_im_beispiel(beispiel, einst):
    r = szenarien.berechne(beispiel, einst, 2026, (2026, 3))["szenarien"]
    # Konservativ: nur V-001 (unterschrieben): 10 × 14.000 − 12 × 1.500
    assert r["konservativ"]["gewinn"] == Dec("122000.00")
    # Basis: zusätzlich V-002 (zugesagt, 100 %): 6 × 12.000
    assert r["basis"]["gewinn"] == Dec("194000.00")
    # Run-Rate: Ø 01-03 = 14.000 × 9 Restmonate
    assert r["runrate"]["prognose"] == Dec("126000.00") and r["runrate"]["gewinn"] == Dec("150000.00")


def _setze_vertrag(beispiel, vid, **kw):
    pfad = beispiel.dir / "vertraege.yaml"
    inhalt = yaml.safe_load(pfad.read_text(encoding="utf-8"))
    for v in inhalt["vertraege"]:
        if v["id"] == vid:
            v.update(kw)
    pfad.write_text(yaml.safe_dump(inhalt, allow_unicode=True), encoding="utf-8")


def test_pipeline_wird_mit_wahrscheinlichkeit_gewichtet(beispiel, einst):
    _setze_vertrag(beispiel, "V-002", status="pipeline", wahrscheinlichkeit_prozent=25)
    r = szenarien.berechne(beispiel, einst, 2026, (2026, 3))["szenarien"]
    assert r["basis"]["gewinn"] - r["konservativ"]["gewinn"] == Dec("18000.00")   # 25 % von 72.000
    assert r["konservativ"]["gewinn"] == Dec("122000.00")


def test_zugesagt_gewicht_konfigurierbar(beispiel, einst):
    einst["szenarien"]["gewicht_zugesagt_prozent"] = 50
    r = szenarien.berechne(beispiel, einst, 2026, (2026, 3))["szenarien"]
    assert r["basis"]["gewinn"] - r["konservativ"]["gewinn"] == Dec("36000.00")


def test_fruehe_zahlung_wird_nicht_doppelt_gezaehlt(beispiel, einst):
    """Stichtag Februar: die Januar-Rechnung (Plan 02.03.) wurde schon am 27.02. bezahlt."""
    stand = [s for s in szenarien.vertragsstand(beispiel, (2026, 2), dt.date(2026, 1, 1)) if s["vertrag"]["id"] == "V-001"][0]
    assert stand["abweichung"] == Dec("14000.00")
    assert sum(b for _, b, _ in stand["kuenftig"]) == Dec("112000.00")           # 140.000 − 28.000 Ist
    r = szenarien.berechne(beispiel, einst, 2026, (2026, 2))["szenarien"]
    assert r["konservativ"]["gewinn"] == Dec("122000.00")


def test_ueberfaellige_rechnung_wird_vorgetragen(beispiel, einst):
    """Stichtag April ohne April-Eingang: die 14.000 € vom 30.04. rutschen in den Mai, nicht ins Nichts."""
    r = szenarien.berechne(beispiel, einst, 2026, (2026, 4))
    assert r["monate"][4]["prognose"]["konservativ"] == Dec("28000.00")
    assert r["szenarien"]["konservativ"]["gewinn"] == Dec("122000.00")


def test_ueberfaellig_im_dezember_faellt_ins_folgejahr(beispiel, einst):
    r26 = szenarien.berechne(beispiel, einst, 2026, (2026, 12))["szenarien"]["konservativ"]
    assert r26["einnahmen_ist"] + r26["prognose"] == Dec("42000.00")             # nur tatsächlich Zugeflossenes
    r27 = szenarien.berechne(beispiel, einst, 2027, (2026, 12))
    assert r27["monate"][0]["prognose"]["konservativ"] == Dec("98000.00")


def test_ampel_schwellen(einst):
    a = einst["ampel"]
    steuer = Dec("50000")
    assert luecke.ampel(Dec("1999.99"), steuer, a) == "gruen"
    assert luecke.ampel(Dec("2000"), steuer, a) == "gelb"          # Eurogrenze gerissen (4 %)
    assert luecke.ampel(Dec("7500"), steuer, a) == "gelb"          # genau 15 %
    assert luecke.ampel(Dec("7500.01"), steuer, a) == "rot"        # > 15 %
    assert luecke.ampel(Dec("10000.01"), Dec("200000"), a) == "rot"  # > 10.000 € trotz 5 %
    assert luecke.ampel(Dec("1500"), Dec("20000"), a) == "gelb"    # 7,5 % trotz < 2.000 €
    assert luecke.ampel(Dec("900"), Dec("20000"), a) == "gruen"
    assert luecke.ampel(Dec("-900"), Dec("20000"), a) == "gruen"
    assert luecke.ampel(Dec("-6000"), steuer, a) == "ueberzahlung"
    assert luecke.ampel(Dec("0"), Dec("0"), a) == "gruen"
    assert luecke.ampel(Dec("-500"), Dec("0"), a) == "ueberzahlung"


def test_ampel_schwellen_konfigurierbar(einst):
    einst["ampel"].update(gelb_bis_prozent=60, gelb_bis_euro=50000)
    assert luecke.ampel(Dec("35000"), Dec("68000"), einst["ampel"]) == "gelb"


def test_beispiel_loest_gelb_und_rot_aus(beispiel, einst):
    st = luecke.status(beispiel, einst, 2026, (2026, 3))
    s = st["szenarien"]
    assert st["vz_est"] == Dec("32584")
    assert (s["konservativ"]["steuer"]["zve"], s["konservativ"]["steuer"]["gesamt"]) == (Dec("108000"), Dec("35875.00"))
    assert s["konservativ"]["luecke"] == Dec("3291.00") and s["konservativ"]["ampel"] == "gelb"
    assert s["basis"]["luecke"] == Dec("35425.52") and s["basis"]["ampel"] == "rot"
    assert s["runrate"]["ampel"] == "rot"


def test_aenderungsbescheid_ersetzt_festsetzung(beispiel, einst):
    pfad = beispiel.dir / "bescheide.yaml"
    inhalt = yaml.safe_load(pfad.read_text(encoding="utf-8"))
    neu = dict(inhalt["bescheide"][0], id="VZ-2026-02", datum=dt.date(2026, 5, 4))
    neu["termine"] = [dict(t) for t in neu["termine"]]
    for t in neu["termine"][1:]:
        t["est"], t["soli"] = 16000, 880
    inhalt["bescheide"].append(neu)
    pfad.write_text(yaml.safe_dump(inhalt, allow_unicode=True), encoding="utf-8")
    st = luecke.status(beispiel, einst, 2026, (2026, 3))
    assert st["bescheid_est"]["id"] == "VZ-2026-02" and st["vz_est"] == Dec("58786")
    # Rückblick zum Stand 31.03. kennt den Änderungsbescheid noch nicht
    alt = luecke.status(beispiel, einst, 2026, (2026, 3), bescheide_stand=dt.date(2026, 3, 31))
    assert alt["vz_est"] == Dec("32584")


def test_doppeleffekt_zinsen_und_ruecklage(beispiel, einst):
    st = luecke.status(beispiel, einst, 2026, (2026, 3))
    b = st["szenarien"]["basis"]
    d = b["doppeleffekt"]
    assert d["nachzahlung"] == Dec("35425.52")
    assert d["erhoehung_folgejahr"] == Dec("35425.52")          # VZ 2027 fortgeschrieben mit 32.584
    assert d["gesamt"] == Dec("70851.04") and d["folgejahr_fortgeschrieben"]
    assert [(p["datum"], p["betrag"]) for p in d["posten"]] == [
        (dt.date(2027, 10, 15), Dec("35425.52")), (dt.date(2027, 12, 10), Dec("35425.52"))]
    z = b["zinsen"]
    assert z["zinslauf_beginn"] == dt.date(2028, 4, 1)
    assert z["bemessung"] == Dec("35400") and z["je_monat"] == Dec("53.10")     # 0,15 % von 35.400
    assert z["monate_bis_bescheid"] == 0
    r = st["ruecklage"]
    assert len(r) == 9 and r[0]["monat"] == "2026-04"
    assert sum(x["basis"] for x in r) == Dec("35425.52") and r[-1]["basis_kumuliert"] == Dec("35425.52")
    assert sum(x["konservativ"] for x in r) == Dec("3291.00")


def test_zinsen_bei_spaetem_bescheid(p2026):
    z = luecke.zinsen_233a(Dec("10049"), 2026, dt.date(2028, 7, 15), p2026)
    assert z["bemessung"] == Dec("10000") and z["monate_bis_bescheid"] == 3 and z["betrag_bis_bescheid"] == Dec("45.00")


def test_empfehlung_hat_drei_saetze(beispiel, einst):
    st = luecke.status(beispiel, einst, 2026, (2026, 3))
    saetze = luecke.empfehlung(st)
    assert len(saetze) == 3 and "beantragen" in saetze[0]


def test_ueberzahlung_wird_erkannt(beispiel, einst):
    _setze_vertrag(beispiel, "V-001", satz_netto=700)
    st = luecke.status(beispiel, einst, 2026, (2026, 12))
    k = st["szenarien"]["konservativ"]
    assert k["luecke"] < 0 and k["ampel"] == "ueberzahlung"
    assert "Herabsetzungsantrag" in luecke.empfehlung({**st, "leitszenario": "konservativ"})[0]


def test_runrate_ignoriert_monate_vor_datenbeginn(beispiel, einst):
    rate, monate = szenarien.runrate(beispiel, einst, (2026, 1))
    assert monate == [(2026, 1)] and rate == Dec("14000.00")


def test_report_dateien(beispiel, einst):
    from estmon import report
    st = luecke.status(beispiel, einst, 2026, (2026, 3))
    pfade = report.schreibe_alles(beispiel.wurzel, beispiel, einst, st)
    namen = sorted(p.name for p in pfade)
    assert namen == ["antrag_anpassung_2026-03.md", "rücklage.csv", "status_2026-03.html", "status_2026-03.xlsx"]
    html = (beispiel.wurzel / "reports" / "status_2026-03.html").read_text(encoding="utf-8")
    assert "ersetzt keine Steuerberatung".lower() in html.lower()
    assert "35.425,52" in html and "<details>" in html and "steuerparameter_2026.yaml" in html
    antrag = (beispiel.wurzel / "reports" / "antrag_anpassung_2026-03.md").read_text(encoding="utf-8")
    assert "[STEUERNUMMER]" in antrag and "194.000" in antrag
    # Leitszenario konservativ (Gelb): kein Antrag
    einst["szenarien"]["leitszenario"] = "konservativ"
    st = luecke.status(beispiel, einst, 2026, (2026, 3))
    (beispiel.wurzel / "reports" / "antrag_anpassung_2026-03.md").unlink()
    assert not any("antrag" in p.name for p in report.schreibe_alles(beispiel.wurzel, beispiel, einst, st))


def test_liquiditaet_18_monate(beispiel, einst):
    from estmon import liquiditaet
    st = luecke.status(beispiel, einst, 2026, (2026, 3))
    liq = liquiditaet.vorschau(beispiel, einst, st)
    z = liq["zeilen"]
    assert len(z) == 18 and z[0]["monat"] == "2026-04" and z[-1]["monat"] == "2027-09"
    juni = z[2]
    assert juni["einnahmen"] == Dec("26000.00") and juni["vz"] == Dec("8146") and juni["saldo"] == Dec("16354.00")
    assert liq["vz_geschaetzt_jahre"] == [2027] and z[11]["vz"] == Dec("8146")      # 03/2027 fortgeschrieben
    assert sum(p["betrag"] for p in liq["danach"]) == Dec("70851.04")
