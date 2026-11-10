"""Nachvollziehbarer Rechenweg: jede Zeile hat Bezeichnung, Formel, Ergebnis und Quelle."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Schritt:
    bezeichnung: str
    formel: str
    ergebnis: str
    quelle: str = ""


@dataclass
class Rechenweg:
    schritte: list[Schritt] = field(default_factory=list)

    def add(self, bezeichnung: str, formel: str, ergebnis: str, quelle: str = "") -> None:
        self.schritte.append(Schritt(bezeichnung, formel, ergebnis, quelle))

    def als_liste(self) -> list[dict]:
        return [s.__dict__ for s in self.schritte]
