"""Import von Zahlungseingängen (Sparkasse/VR CSV-CAMT oder einfache Liste)."""
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import io
from pathlib import Path

from .daten import ARTEN, Eingang, als_datum
from .geld import D, parse_de
from .zufluss import ust_trennen


def _lies_text(pfad: Path, encodings: list[str]) -> str:
    roh = Path(pfad).read_bytes()
    for enc in encodings:
        try:
            return roh.decode(enc)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"{pfad}: Zeichensatz nicht lesbar ({encodings})")


def _datum(text: str, formate: list[str]) -> dt.date:
    for f in formate:
        try:
            return dt.datetime.strptime(text.strip(), f).date()
        except ValueError:
            continue
    raise ValueError(f"Datum nicht lesbar: {text!r}")


def eingang_id(datum: dt.date, brutto, name: str, zweck: str, teil: int = 0) -> str:
    h = hashlib.sha1(f"{datum.isoformat()}|{D(brutto)}|{name}|{zweck}".encode("utf-8")).hexdigest()[:10]
    return f"E-{datum:%Y%m%d}-{h}" + (f"-{teil}" if teil else "")


def _art_vorschlag(zweck: str, name: str, erkennung: dict) -> tuple[str, str]:
    text = f"{zweck} {name}".lower()
    for art in ("durchlaufend", "privat", "reisekosten"):
        for wort in erkennung.get(art, []):
            if wort.lower() in text:
                return art, f"Stichwort '{wort}'"
    return "honorar", ""


def _vertrag_vorschlag(zweck: str, name: str, vertraege: list[dict]) -> str:
    text = f"{zweck} {name}".lower()
    treffer = [str(v["id"]) for v in vertraege
               if any(str(s).lower() in text for s in (v.get("matching") or [v.get("kunde", "")]) if s)]
    return treffer[0] if len(treffer) == 1 else ""


def vorschlag(csv_pfad: Path, profil: dict, vertraege: list[dict], ust_standard, monat: str | None = None) -> list[dict]:
    """Liest den Bankexport und liefert je Zahlungseingang (Betrag > 0) einen Vorschlag.

    Gespeichert wird nichts: Der Vorschlag wird geprüft, bestätigt und erst dann mit
    speichern() übernommen.
    """
    text = _lies_text(csv_pfad, profil.get("encoding", ["utf-8-sig", "cp1252"]))
    sp = profil["spalten"]
    leser = csv.DictReader(io.StringIO(text), delimiter=profil.get("trennzeichen", ";"))
    fehlend = [s for s in (sp["datum"], sp["name"], sp["zweck"], sp["betrag"]) if s not in (leser.fieldnames or [])]
    if fehlend:
        raise ValueError(f"Spalten fehlen im Export: {fehlend}. Mapping im Bankprofil anpassen. "
                         f"Vorhanden: {leser.fieldnames}")
    ust_je_vertrag = {str(v["id"]): D(v.get("ust_satz_prozent", ust_standard)) for v in vertraege}
    aus = []
    for z in leser:
        betrag = parse_de(z[sp["betrag"]])
        if betrag <= 0:
            continue
        datum = _datum(z[sp["datum"]], profil.get("datumsformate", ["%d.%m.%y", "%d.%m.%Y"]))
        if monat and f"{datum:%Y-%m}" != monat:
            continue
        name, zweck = z[sp["name"]].strip(), " ".join(z[sp["zweck"]].split())
        art, grund = _art_vorschlag(zweck, name, profil.get("erkennung", {}))
        vertrag_id = _vertrag_vorschlag(zweck, name, vertraege)
        satz = D(0) if art in ("durchlaufend", "privat") else ust_je_vertrag.get(vertrag_id, D(ust_standard))
        netto, ust = ust_trennen(betrag, satz)
        hinweise = []
        if grund:
            hinweise.append(f"Art '{art}' vorgeschlagen wegen {grund}; bitte bestätigen.")
        if not vertrag_id and art == "honorar":
            hinweise.append("Kein Vertrag eindeutig zugeordnet.")
        aus.append({"id": eingang_id(datum, betrag, name, zweck), "datum": datum.isoformat(), "kunde": name,
                    "verwendungszweck": zweck, "brutto": str(betrag), "ust_satz": str(satz), "netto": str(netto),
                    "ust": str(ust), "art": art, "vertrag_id": vertrag_id, "quelle": Path(csv_pfad).name,
                    "hinweise": hinweise})
    return aus


def aus_vorschlag(eintraege: list[dict]) -> list[Eingang]:
    """Prüft bestätigte Einträge und rechnet Netto/USt aus Brutto und Satz neu (deterministisch)."""
    aus = []
    for e in eintraege:
        if e["art"] not in ARTEN:
            raise ValueError(f"{e['id']}: art '{e['art']}' unbekannt ({ARTEN})")
        brutto, satz = D(e["brutto"]), D(e["ust_satz"])
        netto, ust = ust_trennen(brutto, satz)
        aus.append(Eingang(str(e["id"]), als_datum(e["datum"]), e["kunde"], e["verwendungszweck"], brutto, satz,
                           netto, ust, e["art"], str(e.get("vertrag_id") or ""), e.get("quelle", "")))
    ids = [e.id for e in aus]
    if len(ids) != len(set(ids)):
        raise ValueError("Doppelte IDs im Vorschlag (bei Aufteilung einer Zahlung '-1', '-2' anhängen).")
    return aus
