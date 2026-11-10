"""Der JavaScript-Kern der HTML-App muss dieselben Zahlen liefern wie der Python-Kern."""
import json
import shutil
import subprocess
from decimal import Decimal as Dec

import pytest
import yaml

from estmon import liquiditaet, luecke, tarif
from estmon.appdaten import als_app_daten
from estmon.params import PROJEKT, steuerparameter

NODE = shutil.which("node")
pytestmark = pytest.mark.skipif(NODE is None, reason="node nicht installiert")


def js(eingabe: dict) -> dict:
    r = subprocess.run([NODE, str(PROJEKT / "app" / "src" / "pruefe.js")], input=json.dumps(eingabe), capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def c(wert) -> int:
    return int((Dec(wert) * 100).to_integral_exact())


@pytest.mark.parametrize("jahr", [2026, 2027])
def test_tarif_identisch_ueber_den_ganzen_bereich(jahr):
    p = steuerparameter(jahr)
    zves = list(range(0, 320000, 137)) + [12348, 12349, 17799, 17800, 69878, 69879, 277825, 277826, 1000000]
    for z, e, s, e2, s2 in js({"jahr": jahr, "zves": zves})["tarif"]:
        pe, pz = tarif.einkommensteuer(z, p, "einzel"), tarif.einkommensteuer(z, p, "zusammen")
        assert (e, e2) == (int(pe), int(pz)), z
        assert s == c(tarif.solidaritaetszuschlag(pe, p, "einzel")) and s2 == c(tarif.solidaritaetszuschlag(pz, p, "zusammen")), z


def vergleiche(daten, einst, faelle):
    aus = js({"daten": als_app_daten(daten, einst), "faelle": [{"jahr": j, "istBis": list(m)} for j, m in faelle]})
    for (jahr, ist_bis), f in zip(faelle, aus["faelle"]):
        st = luecke.status(daten, einst, jahr, ist_bis)
        for s, x in f["szenarien"].items():
            p = st["szenarien"][s]
            erwartet = {"gewinn": c(p["gewinn"]), "einnahmenIst": c(p["einnahmen_ist"]), "prognose": c(p["prognose"]), "ausgaben": c(p["ausgaben"]),
                        "zve": int(p["steuer"]["zve"]), "est": c(p["steuer"]["est"]), "erm": c(p["steuer"]["ermaessigung_35"]),
                        "soli": c(p["steuer"]["soli"]), "kist": c(p["steuer"]["kist"]), "gewst": c(p["steuer"]["gewst"]),
                        "gesamt": c(p["steuer"]["gesamt"]), "vz": c(p["vz"]), "luecke": c(p["luecke"]), "ampel": p["ampel"],
                        "dopGesamt": c(p["doppeleffekt"]["gesamt"]),
                        "posten": [[d["datum"].isoformat(), c(d["betrag"])] for d in p["doppeleffekt"]["posten"]],
                        "zinsJeMonat": c(p["zinsen"]["je_monat"]), "zinsBeginn": p["zinsen"]["zinslauf_beginn"].isoformat()}
            assert x == erwartet, (jahr, ist_bis, s)
        assert f["monate"] == [[m["monat"], c(m["einnahmen_ist"]), c(m["plan"]), c(m["prognose"]["konservativ"]), c(m["prognose"]["basis"]),
                                c(m["prognose"]["runrate"]), c(m["ausgaben"]), c(m["ust"]), c(m["reisekosten"]), c(m["nicht_gewinnwirksam"])]
                               for m in st["monate"]], (jahr, ist_bis)
        assert f["ruecklage"] == [[r["monat"], c(r["konservativ"]), c(r["basis"]), c(r["runrate"])] for r in st["ruecklage"]]
        liq = liquiditaet.vorschau(daten, einst, st)
        assert f["liq"] == [[z["monat"], c(z["einnahmen"]), c(z["ausgaben"]), c(z["vz"]), c(z["steuer_sonder"]), c(z["kumuliert"])] for z in liq["zeilen"]]
        assert len(f["empfehlung"]) == 3
    return aus


def test_beispiel_identisch_fuer_alle_stichtage(beispiel, einst):
    faelle = [(2026, (2026, m)) for m in range(1, 13)] + [(2027, (2026, 3)), (2027, (2026, 12)), (2026, (2025, 12))]
    aus = vergleiche(beispiel, einst, faelle)
    maerz = aus["faelle"][2]["szenarien"]
    assert maerz["konservativ"]["ampel"] == "gelb" and maerz["basis"]["ampel"] == "rot"
    assert maerz["basis"]["luecke"] == 3542552


def test_varianten_identisch(beispiel, einst):
    pfad = beispiel.dir / "vertraege.yaml"
    inhalt = yaml.safe_load(pfad.read_text(encoding="utf-8"))
    inhalt["vertraege"][1].update(status="pipeline", wahrscheinlichkeit_prozent=35, abrechnung="quartalsweise", beginn="2026-05-11",
                                  menge_pro_monat=7.5, satz_netto=1333.33, mengen={"2026-08": 3})
    inhalt["vertraege"].append(dict(inhalt["vertraege"][0], id="V-003", kunde="Dritt AG", matching=["Dritt"], status="zugesagt",
                                    abrechnung="einmalig", beginn="2026-09-15", ende="2027-02-10", zahlungsziel_tage=45))
    pfad.write_text(yaml.safe_dump(inhalt, allow_unicode=True), encoding="utf-8")
    (beispiel.dir / "ausgaben.csv").write_text("monat;betrag_netto;notiz\n2026-02;2100.55;x\n2026-05;980.10;y\n", encoding="utf-8")
    faelle = [(2026, (2026, 2)), (2026, (2026, 6)), (2026, (2026, 11)), (2027, (2026, 11))]
    einst["szenarien"]["gewicht_zugesagt_prozent"] = 80
    einst["annahmen"].update(ruecklage_bereits_gebildet=1000, liquiditaet_startbestand=25000, bescheid_monate_nach_jahresende=14)
    vergleiche(beispiel, einst, faelle)
    einst.update(veranlagung="zusammen", einstufung="gewerblich")
    einst["kirchensteuer"] = {"pflichtig": True, "satz_prozent": 8}
    einst["gewerbesteuer"] = {"hebesatz_prozent": 455}
    einst["szenarien"]["leitszenario"] = "runrate"
    vergleiche(beispiel, einst, faelle)


def test_gebaute_app_ist_aktuell():
    """app/steuer-monitor.html muss dem Stand der Quellen entsprechen (python3 app/bauen.py)."""
    src = PROJEKT / "app" / "src"
    html = (PROJEKT / "app" / "steuer-monitor.html").read_text(encoding="utf-8")
    for datei in ("kern.js", "ui.js", "stil.css"):
        assert (src / datei).read_text(encoding="utf-8").replace("</script", "<\\/script") in html, datei
    eigen = html[:html.index("/*VENDOR-ANFANG*/")] + html[html.index("/*VENDOR-ENDE*/"):]   # ohne pdf.js
    assert "http://" not in eigen and "https://" not in eigen and "fetch(" not in eigen      # keine externen Aufrufe
