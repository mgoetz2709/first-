"""Einkommensteuer (§ 32a EStG), Solidaritätszuschlag (SolzG 1995), Kirchensteuer."""
from __future__ import annotations

from decimal import Decimal

from .geld import D, NULL, cent_ab, de, euro_ab
from .rechenweg import Rechenweg


def _grundtarif(zve: Decimal, zonen: list[dict]) -> tuple[Decimal, str]:
    x = euro_ab(zve)
    if x < 0:
        x = NULL
    for nr, zone in enumerate(zonen, start=1):
        if zone["bis"] is not None and x > D(zone["bis"]):
            continue
        typ = zone.get("typ")
        if not typ:
            return NULL, f"Zone {nr} (Grundfreibetrag bis {de(zone['bis'], 0)} €): 0"
        if typ == "quadratisch":
            v = (x - D(zone["basis"])) / Decimal(10000)
            a, b, c = D(zone["a"]), D(zone["b"]), D(zone["c"])
            st = (a * v + b) * v + c
            formel = (
                f"Zone {nr}: ({de(a)} · v + {de(b, 0)}) · v + {de(c)}"
                f" mit v = ({de(x, 0)} − {de(zone['basis'], 0)}) / 10.000 = {de(v, 4)}"
            )
        elif typ == "linear":
            st = D(zone["satz"]) * x - D(zone["abzug"])
            formel = f"Zone {nr}: {de(zone['satz'])} · {de(x, 0)} − {de(zone['abzug'])}"
        else:
            raise ValueError(f"Unbekannter Zonentyp {typ}")
        return euro_ab(st), formel
    raise ValueError("Tarifzonen unvollständig")


def einkommensteuer(zve, params: dict, veranlagung: str = "einzel", rw: Rechenweg | None = None) -> Decimal:
    """Tarifliche ESt in vollen Euro. veranlagung: 'einzel' oder 'zusammen' (Splitting)."""
    zonen = params["est_tarif"]["zonen"]
    zve = euro_ab(max(D(zve), NULL))
    quelle = f"§ 32a Abs. 1 EStG; {params['_datei']} (Stand {params['stand']})"
    if veranlagung == "zusammen":
        halb, formel = _grundtarif(euro_ab(zve / 2), zonen)
        est = halb * 2
        if rw is not None:
            rw.add("Einkommensteuer (Splitting)", f"2 × Steuer auf {de(euro_ab(zve / 2), 0)} €; {formel}",
                   f"{de(est, 0)} €", quelle + ", Abs. 5")
        return est
    est, formel = _grundtarif(zve, zonen)
    if rw is not None:
        rw.add("Einkommensteuer (Grundtarif)", formel + ", abgerundet auf volle Euro", f"{de(est, 0)} €", quelle)
    return est


def solidaritaetszuschlag(est, params: dict, veranlagung: str = "einzel", rw: Rechenweg | None = None) -> Decimal:
    p = params["solidaritaetszuschlag"]
    est = D(est)
    grenze = D(p["freigrenze_zusammen"] if veranlagung == "zusammen" else p["freigrenze_einzel"])
    quelle = f"§§ 3 Abs. 3, 4 SolzG 1995; {params['_datei']}"
    if est <= grenze:
        soli, formel = NULL, f"ESt {de(est, 0)} € ≤ Freigrenze {de(grenze, 0)} €"
    else:
        voll = cent_ab(est * D(p["satz"]))
        gemildert = cent_ab((est - grenze) * D(p["milderung_satz"]))
        soli = min(voll, gemildert)
        formel = (
            f"min({de(D(p['satz']) * 100, 1)} % · {de(est, 0)} = {de(voll)}; "
            f"{de(D(p['milderung_satz']) * 100, 1)} % · ({de(est, 0)} − {de(grenze, 0)}) = {de(gemildert)})"
        )
    if rw is not None:
        rw.add("Solidaritätszuschlag", formel, f"{de(soli)} €", quelle)
    return soli


def kirchensteuer(est, einst: dict, rw: Rechenweg | None = None) -> Decimal:
    k = einst.get("kirchensteuer") or {}
    if not k.get("pflichtig"):
        if rw is not None:
            rw.add("Kirchensteuer", "nicht kirchensteuerpflichtig", "0,00 €", "config/einstellungen.yaml")
        return NULL
    satz = D(k["satz_prozent"]) / 100
    kist = cent_ab(D(est) * satz)
    if rw is not None:
        rw.add("Kirchensteuer", f"{de(k['satz_prozent'], 0)} % · {de(est, 0)} (vereinfacht, ohne § 51a-Korrektur)",
               f"{de(kist)} €", "Landes-KiStG; config/einstellungen.yaml")
    return kist
