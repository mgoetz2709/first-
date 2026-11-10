"""Schlanke SVG-Diagramme für den Bericht (ohne externe Bibliotheken)."""
from __future__ import annotations

from decimal import Decimal
from html import escape

from .geld import D, de

B, H = 720, 250
L, R, O, U = 64, 96, 14, 30
FARBEN = {"basis": "#2a78d6", "runrate": "#eb6834", "konservativ": "#1baf7a", "ist": "#52514e", "plan": "#2a78d6"}
GITTER, TEXT = "#e4e3df", "#52514e"


def _skala(werte: list[Decimal]) -> tuple[float, float, float]:
    lo, hi = min([float(w) for w in werte] + [0.0]), max([float(w) for w in werte] + [0.0])
    if hi == lo:
        hi = lo + 1
    roh = (hi - lo) / 4
    potenz = 10 ** len(str(int(roh))) / 10 if roh >= 1 else 1
    schritt = next(s * potenz for s in (1, 2, 2.5, 5, 10) if s * potenz >= roh)
    import math
    return math.floor(lo / schritt) * schritt, math.ceil(hi / schritt) * schritt, schritt


def _rahmen(lo, hi, schritt, beschriftungen: list[str], x_pos) -> tuple[list[str], callable]:
    def y(w) -> float:
        return O + (H - O - U) * (1 - (float(w) - lo) / (hi - lo))
    t = [f'<svg viewBox="0 0 {B} {H}" role="img" xmlns="http://www.w3.org/2000/svg" font-family="inherit" font-size="11">']
    w = lo
    while w <= hi + 1e-9:
        t.append(f'<line x1="{L}" x2="{B - R}" y1="{y(w):.1f}" y2="{y(w):.1f}" stroke="{"#9a9994" if abs(w) < 1e-9 else GITTER}" stroke-width="1"/>')
        t.append(f'<text x="{L - 8}" y="{y(w) + 4:.1f}" text-anchor="end" fill="{TEXT}">{de(w, 0)}</text>')
        w += schritt
    jeder = 1 if len(beschriftungen) <= 12 else 2
    for i, b in enumerate(beschriftungen):
        if i % jeder == 0:
            t.append(f'<text x="{x_pos(i):.1f}" y="{H - 10}" text-anchor="middle" fill="{TEXT}">{escape(b)}</text>')
    return t, y


def saeulen(beschriftungen: list[str], reihen: list[tuple[str, str, list]], titel: str) -> str:
    """Gruppierte Säulen. reihen: (name, farbschlüssel, werte); None = kein Balken."""
    werte = [D(w) for _, _, ws in reihen for w in ws if w is not None]
    lo, hi, schritt = _skala(werte)
    n = len(beschriftungen)
    band = (B - L - R) / n
    dicke = min(14.0, (band - 8) / len(reihen) - 2)
    t, y = _rahmen(lo, hi, schritt, beschriftungen, lambda i: L + band * (i + 0.5))
    t.insert(1, f"<title>{escape(titel)}</title>")
    for r, (name, farbe, ws) in enumerate(reihen):
        for i, w in enumerate(ws):
            if w is None or D(w) == 0:
                continue
            x = L + band * (i + 0.5) + (r - len(reihen) / 2) * (dicke + 2) + 1
            oben, unten = min(y(w), y(0)), max(y(w), y(0))
            h = max(unten - oben, 1)
            rad = min(4, h)
            pfad = (f"M{x:.1f},{unten:.1f} V{oben + rad:.1f} Q{x:.1f},{oben:.1f} {x + rad:.1f},{oben:.1f} "
                    f"H{x + dicke - rad:.1f} Q{x + dicke:.1f},{oben:.1f} {x + dicke:.1f},{oben + rad:.1f} V{unten:.1f} Z")
            t.append(f'<path d="{pfad}" fill="{FARBEN[farbe]}"><title>{escape(beschriftungen[i])} {escape(name)}: {de(w)} €</title></path>')
    t.append("</svg>")
    return "".join(t)


def linien(beschriftungen: list[str], reihen: list[tuple[str, str, list]], titel: str, endwerte: bool = True) -> str:
    """Linien mit Punkten. Endwert je Linie direkt beschriftet (Kollisionen werden auseinandergezogen)."""
    werte = [D(w) for _, _, ws in reihen for w in ws if w is not None]
    lo, hi, schritt = _skala(werte)
    n = len(beschriftungen)
    weite = (B - L - R) / max(n - 1, 1)
    xp = (lambda i: L + weite * i) if n > 1 else (lambda i: (L + B - R) / 2)
    t, y = _rahmen(lo, hi, schritt, beschriftungen, xp)
    t.insert(1, f"<title>{escape(titel)}</title>")
    enden = []
    for name, farbe, ws in reihen:
        pkt = [(xp(i), y(w), w) for i, w in enumerate(ws) if w is not None]
        if not pkt:
            continue
        if len(pkt) > 1:
            t.append(f'<polyline points="{" ".join(f"{x:.1f},{yy:.1f}" for x, yy, _ in pkt)}" fill="none" '
                     f'stroke="{FARBEN[farbe]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>')
        for i, (x, yy, w) in enumerate(pkt):
            idx = [k for k, v in enumerate(ws) if v is not None][i]
            t.append(f'<circle cx="{x:.1f}" cy="{yy:.1f}" r="4" fill="{FARBEN[farbe]}" stroke="#fff" stroke-width="2">'
                     f'<title>{escape(beschriftungen[idx])} {escape(name)}: {de(w)} €</title></circle>')
        enden.append([pkt[-1][0], pkt[-1][1], pkt[-1][2]])
    if endwerte:
        enden.sort(key=lambda e: e[1])
        for a, b in zip(enden, enden[1:]):
            if b[1] - a[1] < 13:
                b[1] = a[1] + 13
        for x, yy, w in enden:
            t.append(f'<text x="{x + 9:.1f}" y="{yy + 4:.1f}" fill="#0b0b0b">{de(w, 0)} €</text>')
    t.append("</svg>")
    return "".join(t)


def legende(eintraege: list[tuple[str, str]]) -> str:
    return '<div class="legende">' + "".join(
        f'<span><i style="background:{FARBEN[f]}"></i>{escape(n)}</span>' for n, f in eintraege) + "</div>"
