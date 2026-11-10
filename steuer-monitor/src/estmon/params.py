"""Laden von Einstellungen und Steuerparametern."""
from __future__ import annotations

from pathlib import Path

import yaml

PROJEKT = Path(__file__).resolve().parents[2]


class KonfigFehler(Exception):
    pass


def lade_yaml(pfad: Path):
    with open(pfad, encoding="utf-8") as f:
        return yaml.safe_load(f)


def steuerparameter(jahr: int, config_dir: Path | None = None) -> dict:
    pfad = (config_dir or PROJEKT / "config") / f"steuerparameter_{jahr}.yaml"
    if not pfad.exists():
        raise KonfigFehler(
            f"Keine Steuerparameter für {jahr} ({pfad}). Datei anlegen und Werte gegen "
            "gesetze-im-internet.de verifizieren."
        )
    p = lade_yaml(pfad)
    if int(p["jahr"]) != int(jahr):
        raise KonfigFehler(f"{pfad}: Feld 'jahr' passt nicht zum Dateinamen.")
    p["_datei"] = f"config/{pfad.name}"
    return p


def einstellungen(wurzel: Path | None = None) -> dict:
    """Einstellungen der Datenwurzel; fehlt dort eine Datei, gelten die des Projekts."""
    for kandidat in ([wurzel / "config" / "einstellungen.yaml"] if wurzel else []) + [
        PROJEKT / "config" / "einstellungen.yaml"
    ]:
        if kandidat.exists():
            e = lade_yaml(kandidat)
            pruefe_einstellungen(e)
            return e
    raise KonfigFehler("config/einstellungen.yaml fehlt.")


def pruefe_einstellungen(e: dict) -> None:
    if e.get("veranlagung") not in ("einzel", "zusammen"):
        raise KonfigFehler("veranlagung muss 'einzel' oder 'zusammen' sein.")
    if e.get("einstufung") not in ("freiberuflich", "gewerblich"):
        raise KonfigFehler("einstufung muss 'freiberuflich' oder 'gewerblich' sein.")
    if e.get("szenarien", {}).get("leitszenario", "basis") not in ("konservativ", "basis", "runrate"):
        raise KonfigFehler("szenarien.leitszenario ungültig.")
