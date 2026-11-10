"""Mustererkennung für hochgeladene Verträge (app/src/kern.js, vertragErkennen)."""
import pytest

from estmon.params import PROJEKT
from test_app_kern import NODE, js

pytestmark = pytest.mark.skipif(NODE is None, reason="node nicht installiert")

FLIESSTEXT = """Rahmenvertrag über Beratungsleistungen

zwischen der
Müller & Söhne Maschinenbau GmbH & Co. KG, Industriestraße 5, 12345 Musterstadt
– nachfolgend „Auftraggeber“ –
und
Max Beispiel, Beispielweg 1, 00000 Musterstadt
– nachfolgend „Auftragnehmer“ –

§ 1 Vertragsgegenstand
Vertragsgegenstand: Leitung des Programms „Fertigung 2030“.

§ 2 Vertragsdauer
Der Vertrag beginnt am 1. Januar 2027 und endet am 30. Juni 2027, ohne dass es einer Kündigung bedarf.
Er kann von beiden Parteien mit einer Frist von vier Wochen zum Monatsende gekündigt werden.

§ 3 Vergütung
Der Auftragnehmer erhält für seine Tätigkeit ein Honorar in Höhe von 1.650,- € pro Personentag (8 Stunden)
zuzüglich der gesetzlichen Umsatzsteuer. Der geplante Einsatzumfang beträgt 12 Personentage pro Monat.

§ 4 Rechnungsstellung
Die Rechnungsstellung erfolgt monatlich nachträglich. Rechnungen sind innerhalb von 45 Tagen nach
Rechnungseingang ohne Abzug zur Zahlung fällig.

§ 5 Reisekosten
Reisekosten werden gegen Nachweis nach den steuerlichen Sätzen erstattet.

Musterstadt, den 12.11.2026
"""

ENGLISCH = """Consulting Agreement
Client: Acme Robotics Ltd.
Subject: Interim CTO support
Term: 01.02.2027 - 31.07.2027
Fee: EUR 180 per hour, approx. 20 Stunden pro Woche
Invoices are issued monthly and payable within 30 days.
Reverse Charge applies.
"""

SPANNE = """Angebot für die Stadtwerke Beispielstadt AG
Projekt: PMO Smart Meter Rollout
Leistungszeitraum vom 15.03.2027 bis zum 31.12.2027
Umfang: 8 bis 10 Tage pro Monat
Tagessatz 1.450 EUR netto
Zahlungsziel: 21 Tage
Abrechnung quartalsweise
"""

KONTINGENT = """Einzelauftrag
Auftraggeber: Beispiel Handel SE
Der Auftraggeber beauftragt ein Kontingent von insgesamt 60 Beratertagen im Zeitraum 01.04.2027 – 30.09.2027.
Tagessatz: € 1.300
Die Leistung wird nach Abschluss in Rechnung gestellt, zahlbar sofort ohne Abzug.
"""


@pytest.fixture(scope="module")
def erkannt():
    beispiel = [(PROJEKT / "beispiel" / "archiv" / "2026" / n).read_text(encoding="utf-8")
                for n in ("2025-10-20_vertrag_nordwind.md", "2026-03-05_angebot_hansa.md")]
    return js({"texte": beispiel + [FLIESSTEXT, ENGLISCH, SPANNE, KONTINGENT, "Vertrag\n\n(Scan ohne lesbaren Text)"]})["vertraege"]


def test_beispielvertraege_vollstaendig(erkannt):
    n, h = erkannt[0], erkannt[1]
    assert n["felder"] | {"projekt": 0, "reisekosten": 0, "kuendigungsfrist": 0} == {
        "kunde": "Nordwind Logistik AG", "satz_netto": 1400, "einheit": "tag", "menge_pro_monat": 10, "beginn": "2025-11-01",
        "ende": "2026-09-30", "abrechnung": "monatlich", "zahlungsziel_tage": 30, "ust_satz_prozent": 19, "matching": ["Nordwind"],
        "projekt": 0, "reisekosten": 0, "kuendigungsfrist": 0}
    assert n["fehlend"] == [] and "1.400,00 EUR je Beratertag" in n["fundstellen"]["satz_netto"]
    assert (h["felder"]["kunde"], h["felder"]["satz_netto"], h["felder"]["menge_pro_monat"], h["felder"]["zahlungsziel_tage"]) == \
        ("Hansa Maschinenbau GmbH", 1500, 8, 14)
    assert (h["felder"]["beginn"], h["felder"]["ende"]) == ("2026-05-01", "2026-10-31")


def test_fliesstext(erkannt):
    f = erkannt[2]["felder"]
    assert f["kunde"] == "Müller & Söhne Maschinenbau GmbH & Co. KG"
    assert (f["beginn"], f["ende"]) == ("2027-01-01", "2027-06-30")
    assert (f["satz_netto"], f["einheit"], f["menge_pro_monat"]) == (1650, "tag", 12)
    assert (f["abrechnung"], f["zahlungsziel_tage"]) == ("monatlich", 45)
    assert f["projekt"] == "Leitung des Programms Fertigung 2030"
    assert "vier Wochen" in f["kuendigungsfrist"] and "Nachweis" in f["reisekosten"]
    assert erkannt[2]["fehlend"] == []


def test_englisch_stundensatz_wochenumfang_reverse_charge(erkannt):
    e = erkannt[3]
    f = e["felder"]
    assert (f["kunde"], f["satz_netto"], f["einheit"]) == ("Acme Robotics Ltd.", 180, "stunde")
    assert (f["beginn"], f["ende"], f["zahlungsziel_tage"], f["abrechnung"]) == ("2027-02-01", "2027-07-31", 30, "monatlich")
    assert f["menge_pro_monat"] == 86.7 and any("je Woche" in h for h in e["hinweise"])
    assert f["ust_satz_prozent"] == 0 and any("Reverse-Charge" in h for h in e["hinweise"])


def test_spanne_wird_nicht_geraten(erkannt):
    s = erkannt[4]
    assert "menge_pro_monat" not in s["felder"] and "Menge je Monat" in s["fehlend"]
    assert any("Spanne" in h for h in s["hinweise"])
    f = s["felder"]
    assert (f["kunde"], f["satz_netto"], f["zahlungsziel_tage"], f["abrechnung"]) == ("Stadtwerke Beispielstadt AG", 1450, 21, "quartalsweise")
    assert (f["beginn"], f["ende"]) == ("2027-03-15", "2027-12-31")


def test_kontingent_wird_verteilt_und_gekennzeichnet(erkannt):
    k = erkannt[5]
    f = k["felder"]
    assert (f["kunde"], f["satz_netto"], f["menge_pro_monat"]) == ("Beispiel Handel SE", 1300, 10)
    assert (f["abrechnung"], f["zahlungsziel_tage"]) == ("einmalig", 0)
    assert any("Gesamtumfang" in h for h in k["hinweise"])


def test_ohne_text_bleibt_alles_leer(erkannt):
    leer = erkannt[6]
    assert set(leer["felder"]) == {"ust_satz_prozent"}
    assert len(leer["fehlend"]) == 7
