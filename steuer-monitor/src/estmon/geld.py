"""Geldbeträge als Decimal, Rundung und deutsches Zahlenformat."""
from __future__ import annotations

from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")
NULL = Decimal("0")


def D(wert) -> Decimal:
    """Wandelt int/str/float/None exakt (über str) in Decimal."""
    if wert is None or wert == "":
        return NULL
    if isinstance(wert, Decimal):
        return wert
    return Decimal(str(wert))


def cent(wert) -> Decimal:
    """Kaufmännische Rundung auf Cent."""
    return D(wert).quantize(CENT, rounding=ROUND_HALF_UP)


def cent_ab(wert) -> Decimal:
    """Abrunden auf Cent (Bruchteile eines Cents bleiben außer Ansatz)."""
    return D(wert).quantize(CENT, rounding=ROUND_DOWN)


def euro_ab(wert) -> Decimal:
    """Abrunden auf volle Euro."""
    return D(wert).quantize(Decimal("1"), rounding=ROUND_DOWN)


def abrunden_auf(wert, schritt) -> Decimal:
    """Abrunden auf das nächste Vielfache von schritt (z. B. 50 oder 100)."""
    s = D(schritt)
    return (D(wert) / s).quantize(Decimal("1"), rounding=ROUND_DOWN) * s


def de(wert, stellen: int = 2) -> str:
    """Deutsches Zahlenformat: 1.234,56"""
    q = Decimal(1).scaleb(-stellen)
    w = D(wert).quantize(q, rounding=ROUND_HALF_UP)
    if w == 0:
        w = abs(w)
    roh = f"{w:,.{stellen}f}"
    return roh.replace(",", "X").replace(".", ",").replace("X", ".")


def eur(wert, stellen: int = 2) -> str:
    return f"{de(wert, stellen)} €"


def prozent(wert, stellen: int = 1) -> str:
    return f"{de(D(wert) * 100, stellen)} %"


def parse_de(text: str) -> Decimal:
    """Liest '1.234,56' oder '1234.56' oder '-595,00'."""
    t = str(text).strip().replace("€", "").replace(" ", "").replace(" ", "")
    if "," in t:
        t = t.replace(".", "").replace(",", ".")
    return Decimal(t)
