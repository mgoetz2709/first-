"""Datenhaltung in data/ (YAML/CSV, menschenlesbar)."""
from __future__ import annotations

import csv
import datetime as dt
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import yaml

from .geld import D, NULL

ARTEN = ("honorar", "reisekosten", "durchlaufend", "privat", "sonstig")
STATUS = ("unterschrieben", "zugesagt", "pipeline")
EINGANG_FELDER = ["id", "datum", "kunde", "verwendungszweck", "brutto", "ust_satz", "netto", "ust",
                  "art", "vertrag_id", "quelle"]


class DatenFehler(Exception):
    pass


def als_datum(wert) -> dt.date:
    if isinstance(wert, dt.datetime):
        return wert.date()
    if isinstance(wert, dt.date):
        return wert
    return dt.date.fromisoformat(str(wert))


@dataclass
class Eingang:
    id: str
    datum: dt.date
    kunde: str
    verwendungszweck: str
    brutto: Decimal
    ust_satz: Decimal
    netto: Decimal
    ust: Decimal
    art: str
    vertrag_id: str
    quelle: str

    def als_zeile(self) -> dict:
        z = dict(self.__dict__)
        z["datum"] = self.datum.isoformat()
        for k in ("brutto", "ust_satz", "netto", "ust"):
            z[k] = str(z[k])
        return z


class Daten:
    def __init__(self, wurzel: Path):
        self.wurzel = Path(wurzel)
        self.dir = self.wurzel / "data"

    # --- YAML -------------------------------------------------------------
    def _yaml(self, name: str, schluessel: str | None = None):
        pfad = self.dir / name
        if not pfad.exists():
            return [] if schluessel else {}
        with open(pfad, encoding="utf-8") as f:
            inhalt = yaml.safe_load(f) or {}
        return (inhalt.get(schluessel) or []) if schluessel else inhalt

    def bescheide(self) -> list[dict]:
        return self._yaml("bescheide.yaml", "bescheide")

    def vertraege(self) -> list[dict]:
        vs = self._yaml("vertraege.yaml", "vertraege")
        for v in vs:
            if v.get("status") not in STATUS:
                raise DatenFehler(f"Vertrag {v.get('id')}: status muss einer von {STATUS} sein.")
            v["beginn"], v["ende"] = als_datum(v["beginn"]), als_datum(v["ende"])
        return vs

    def pauschalen(self, jahr: int) -> dict:
        """Jahrespauschale weitere Einkünfte/Abzüge; fehlt das Jahr, gilt das letzte davor."""
        alle = {int(k): v for k, v in (self._yaml("pauschalen.yaml") or {}).items()}
        kandidaten = [j for j in alle if j <= jahr]
        if not kandidaten:
            return {"weitere_einkuenfte": 0, "abzuege": 0, "quelle": "keine Angabe (data/pauschalen.yaml)",
                    "jahr_der_angabe": None}
        j = max(kandidaten)
        p = dict(alle[j])
        p["jahr_der_angabe"] = j
        return p

    # --- CSV --------------------------------------------------------------
    def eingaenge(self) -> list[Eingang]:
        pfad = self.dir / "eingaenge.csv"
        if not pfad.exists():
            return []
        aus = []
        with open(pfad, encoding="utf-8", newline="") as f:
            for z in csv.DictReader(f, delimiter=";"):
                if z["art"] not in ARTEN:
                    raise DatenFehler(f"Eingang {z['id']}: art muss einer von {ARTEN} sein.")
                aus.append(Eingang(z["id"], als_datum(z["datum"]), z["kunde"], z["verwendungszweck"],
                                   D(z["brutto"]), D(z["ust_satz"]), D(z["netto"]), D(z["ust"]),
                                   z["art"], z.get("vertrag_id") or "", z.get("quelle") or ""))
        return sorted(aus, key=lambda e: (e.datum, e.id))

    def eingaenge_anhaengen(self, neue: list[Eingang]) -> tuple[int, int]:
        """Hängt neue Eingänge an; bereits vorhandene IDs werden übersprungen."""
        vorhandene = {e.id for e in self.eingaenge()}
        frisch = [e for e in neue if e.id not in vorhandene]
        pfad = self.dir / "eingaenge.csv"
        self.dir.mkdir(parents=True, exist_ok=True)
        neu_anlegen = not pfad.exists()
        with open(pfad, "a", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=EINGANG_FELDER, delimiter=";")
            if neu_anlegen:
                w.writeheader()
            for e in frisch:
                w.writerow(e.als_zeile())
        return len(frisch), len(neue) - len(frisch)

    def ausgaben_ist(self) -> dict[tuple[int, int], Decimal]:
        """Ist-Betriebsausgaben je Monat (netto). Schlüssel (jahr, monat)."""
        pfad = self.dir / "ausgaben.csv"
        aus: dict[tuple[int, int], Decimal] = {}
        if not pfad.exists():
            return aus
        with open(pfad, encoding="utf-8", newline="") as f:
            for z in csv.DictReader(f, delimiter=";"):
                j, m = z["monat"].split("-")
                aus[(int(j), int(m))] = aus.get((int(j), int(m)), NULL) + D(z["betrag_netto"])
        return aus

    # --- Vorauszahlungen --------------------------------------------------
    def vz_bescheid(self, jahr: int, art: str = "est", stand: dt.date | None = None) -> dict | None:
        """Jüngster Bescheid (inkl. Änderungsbescheide) für Jahr und Steuerart bis zum Stand."""
        passend = [b for b in self.bescheide()
                   if int(b["jahr"]) == jahr and b.get("art", "est") == art
                   and (stand is None or als_datum(b["datum"]) <= stand)]
        if not passend:
            return None
        return max(passend, key=lambda b: (als_datum(b["datum"]), str(b["id"])))


def vz_termine(bescheid: dict | None) -> list[tuple[dt.date, Decimal]]:
    """Fälligkeiten mit Gesamtbetrag (ESt + Soli + KiSt bzw. GewSt)."""
    if not bescheid:
        return []
    aus = []
    for t in bescheid["termine"]:
        summe = sum((D(t.get(k)) for k in ("est", "soli", "kist", "gewst")), NULL)
        aus.append((als_datum(t["faellig"]), summe))
    return sorted(aus)


def vz_summe(bescheid: dict | None) -> Decimal:
    return sum((b for _, b in vz_termine(bescheid)), NULL)
