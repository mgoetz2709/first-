from decimal import Decimal as Dec

from estmon import bankimport, szenarien
from estmon.params import PROJEKT, lade_yaml


def _vorschlag(beispiel, monat=None):
    profil = lade_yaml(PROJEKT / "config" / "bank_sparkasse_camt.yaml")
    csv = next((beispiel.wurzel / "archiv" / "2026").glob("umsaetze_*.csv"))
    return bankimport.vorschlag(csv, profil, beispiel.vertraege(), 19, monat)


def test_nur_eingaenge_und_klassifikation(beispiel):
    v = _vorschlag(beispiel)
    assert len(v) == 6 and all(Dec(e["brutto"]) > 0 for e in v)        # Lastschriften/Überweisungen ignoriert
    arten = {e["verwendungszweck"][:12]: e["art"] for e in v}
    assert arten["RE 2026-001-"] == "reisekosten"
    assert arten["Erstattung E"] == "privat"
    assert arten["Weiterleitun"] == "durchlaufend"
    assert sum(1 for e in v if e["art"] == "honorar" and e["vertrag_id"] == "V-001") == 3


def test_monatsfilter(beispiel):
    assert [e["datum"] for e in _vorschlag(beispiel, "2026-02")] == ["2026-02-27", "2026-02-27"]


def test_ust_ist_kein_gewinn_und_durchlaufende_posten_bleiben_aussen_vor(beispiel, einst):
    r = szenarien.berechne(beispiel, einst, 2026, (2026, 3))
    monate = {m["monat"]: m for m in r["monate"]}
    assert monate["2026-02"]["einnahmen_ist"] == Dec("14000.00")       # netto, ohne 2.660 USt
    assert monate["2026-02"]["ust"] == Dec("2728.40")
    assert monate["2026-02"]["reisekosten"] == Dec("360.00")
    assert monate["2026-02"]["reisekosten_wirksam"] == 0               # Pauschalmonat: neutral
    assert monate["2026-03"]["nicht_gewinnwirksam"] == Dec("562.50")   # FA-Erstattung + durchlaufender Posten
    assert r["szenarien"]["konservativ"]["einnahmen_ist"] == Dec("42000.00")


def test_reisekosten_wirksam_bei_ist_ausgaben(beispiel, einst):
    (beispiel.dir / "ausgaben.csv").write_text("monat;betrag_netto;notiz\n2026-02;2100.00;inkl. Reise\n", encoding="utf-8")
    r = szenarien.berechne(beispiel, einst, 2026, (2026, 3))
    feb = r["monate"][1]
    assert feb["ausgaben"] == Dec("2100.00") and feb["ausgaben_quelle"] == "Ist"
    assert feb["reisekosten_wirksam"] == Dec("360.00")
    # Gewinn: 140.000 + 360 − (11 × 1.500 + 2.100)
    assert r["szenarien"]["konservativ"]["gewinn"] == Dec("121760.00")


def test_doppelimport_wird_uebersprungen(beispiel):
    neu, doppelt = beispiel.eingaenge_anhaengen(bankimport.aus_vorschlag(_vorschlag(beispiel)))
    assert (neu, doppelt) == (0, 6)


def test_speichern_rechnet_netto_neu(beispiel):
    e = _vorschlag(beispiel)[0]
    e["ust_satz"], e["netto"] = "0", "1.00"                            # manipuliertes Netto wird ignoriert
    assert bankimport.aus_vorschlag([e])[0].netto == Dec("16660.00")
