"""Gewerbesteuer (§ 11 GewStG) und Anrechnung auf die ESt (§ 35 EStG)."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from .geld import D, NULL, abrunden_auf, cent, cent_ab, de
from .rechenweg import Rechenweg


@dataclass
class GewStErgebnis:
    gewerbeertrag: Decimal
    messbetrag: Decimal
    gewerbesteuer: Decimal


def gewerbesteuer(gewinn, hebesatz_prozent, params: dict, rw: Rechenweg | None = None) -> GewStErgebnis:
    """Vereinfachung: Gewerbeertrag = Gewinn aus Gewerbebetrieb (ohne Hinzurechnungen/Kürzungen)."""
    p = params["gewerbesteuer"]
    ertrag = abrunden_auf(max(D(gewinn), NULL), p["abrundung_gewerbeertrag"])
    nach_freibetrag = max(ertrag - D(p["freibetrag"]), NULL)
    messbetrag = cent_ab(nach_freibetrag * D(p["messzahl"]))
    gst = cent(messbetrag * D(hebesatz_prozent) / 100)
    if rw is not None:
        q = f"§ 11 GewStG; {params['_datei']}"
        rw.add("Gewerbeertrag", f"Gewinn abgerundet auf volle 100 € − Freibetrag {de(p['freibetrag'], 0)} €",
               f"{de(nach_freibetrag, 0)} €", q)
        rw.add("Steuermessbetrag", f"{de(D(p['messzahl']) * 100, 1)} % · {de(nach_freibetrag, 0)}", f"{de(messbetrag)} €", q)
        rw.add("Gewerbesteuer", f"Messbetrag · Hebesatz {de(hebesatz_prozent, 0)} %", f"{de(gst)} €",
               "§ 16 GewStG; config/einstellungen.yaml")
    return GewStErgebnis(nach_freibetrag, messbetrag, gst)


def ermaessigung_35(est, gew: GewStErgebnis, gewerbliche_einkuenfte, summe_positive_einkuenfte,
                    params: dict, rw: Rechenweg | None = None) -> Decimal:
    """Steuerermäßigung nach § 35 Abs. 1 EStG.

    Minimum aus (a) Faktor × Messbetrag, (b) tatsächlich zu zahlender GewSt,
    (c) Ermäßigungshöchstbetrag = ESt × gewerbliche Einkünfte / Summe positiver Einkünfte.
    """
    faktor = D(params["gewerbesteuer"]["anrechnungsfaktor"])
    est = D(est)
    a = gew.messbetrag * faktor
    b = gew.gewerbesteuer
    gewerbl = max(D(gewerbliche_einkuenfte), NULL)
    summe = max(D(summe_positive_einkuenfte), NULL)
    c = est * gewerbl / summe if summe > 0 else NULL
    erm = cent_ab(max(min(a, b, c, est), NULL))
    if rw is not None:
        rw.add("Ermäßigung § 35 EStG",
               f"min({de(faktor, 0)} × Messbetrag = {de(a)}; GewSt = {de(b)}; Höchstbetrag = {de(c)})",
               f"{de(erm)} €", f"§ 35 Abs. 1 EStG; {params['_datei']}")
    return erm
