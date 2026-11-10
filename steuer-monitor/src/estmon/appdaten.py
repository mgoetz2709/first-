"""Umwandlung der YAML/CSV-Daten in die Datendatei der HTML-App (steuer-daten.json)."""
from __future__ import annotations

from .daten import Daten


def _iso(d) -> str:
    return d.isoformat() if hasattr(d, "isoformat") else str(d)


def als_app_daten(daten: Daten, einst: dict) -> dict:
    e = {k: einst[k] for k in ("veranlagung", "kirchensteuer", "einstufung", "gewerbesteuer", "ust_satz_standard_prozent",
                               "betriebsausgaben", "szenarien", "ampel", "annahmen") if k in einst}
    bescheide = []
    for b in daten.bescheide():
        b = dict(b, datum=_iso(b["datum"]), art=b.get("art", "est"))
        b["termine"] = [dict(t, faellig=_iso(t["faellig"])) for t in b["termine"]]
        bescheide.append(b)
    vertraege = [dict(v, beginn=_iso(v["beginn"]), ende=_iso(v["ende"])) for v in daten.vertraege()]
    eingaenge = [{"id": x.id, "datum": _iso(x.datum), "kunde": x.kunde, "verwendungszweck": x.verwendungszweck,
                  "brutto": float(x.brutto), "ust_satz": float(x.ust_satz), "art": x.art, "vertrag_id": x.vertrag_id,
                  "quelle": x.quelle} for x in daten.eingaenge()]
    ausgaben = [{"monat": f"{j}-{m:02d}", "betrag_netto": float(b), "notiz": ""} for (j, m), b in sorted(daten.ausgaben_ist().items())]
    alle = daten._yaml("pauschalen.yaml") or {}
    return {"format": "est-monitor", "version": 1, "einstellungen": e, "bescheide": bescheide, "vertraege": vertraege,
            "eingaenge": eingaenge, "ausgaben": ausgaben, "pauschalen": {str(k): v for k, v in alle.items()}}
