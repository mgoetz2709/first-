import shutil
from pathlib import Path

import pytest

from estmon.daten import Daten
from estmon.params import PROJEKT, einstellungen, steuerparameter


@pytest.fixture(scope="session")
def p2026():
    return steuerparameter(2026)


@pytest.fixture()
def einst():
    """Feste Test-Einstellungen, unabhängig von der persönlichen config/einstellungen.yaml."""
    return {
        "veranlagung": "einzel", "kirchensteuer": {"pflichtig": False, "satz_prozent": 9},
        "einstufung": "freiberuflich", "gewerbesteuer": {"hebesatz_prozent": 400},
        "ust_satz_standard_prozent": 19, "betriebsausgaben": {"monatspauschale": 1500},
        "szenarien": {"leitszenario": "basis", "gewicht_zugesagt_prozent": 100, "runrate_monate": 3},
        "ampel": {"gruen_bis_prozent": 5, "gruen_bis_euro": 2000, "gelb_bis_prozent": 15, "gelb_bis_euro": 10000},
        "annahmen": {"bescheid_monate_nach_jahresende": 9, "zahlungsfrist_monate": 1,
                     "ruecklage_bereits_gebildet": 0, "liquiditaet_startbestand": 0},
        "bankimport": {"profil": "config/bank_sparkasse_camt.yaml"},
    }


@pytest.fixture()
def beispiel(tmp_path):
    """Kopie der Beispieldaten mit frisch importierten Eingängen."""
    from estmon import bankimport
    from estmon.params import lade_yaml
    ziel = tmp_path / "beispiel"
    shutil.copytree(PROJEKT / "beispiel", ziel, ignore=shutil.ignore_patterns("reports", "eingaenge.csv"))
    d = Daten(ziel)
    profil = lade_yaml(PROJEKT / "config" / "bank_sparkasse_camt.yaml")
    csv = next((ziel / "archiv" / "2026").glob("umsaetze_*.csv"))
    d.eingaenge_anhaengen(bankimport.aus_vorschlag(bankimport.vorschlag(csv, profil, d.vertraege(), 19)))
    return d
