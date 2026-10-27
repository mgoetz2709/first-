#!/usr/bin/env python3
"""KI-Anonymisierer — Dokumente offline pseudonymisieren und wiederherstellen.

Ablauf:
  1. `anonymisieren`  ersetzt personenbezogene Daten durch Platzhalter wie
     [PERSON_1] und legt eine lokale Zuordnungsdatei (Platzhalter -> Original) an.
  2. Der anonymisierte Text wird in einem KI-Tool bearbeitet.
  3. `wiederherstellen` setzt die Originalwerte in die KI-Antwort wieder ein.

Die Erkennung läuft vollständig lokal mit Microsoft Presidio und einem
spaCy-Sprachmodell. Es werden keine Daten an externe Dienste übertragen.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

from dokumente import DocxText, Replacement, apply_replacements, markdown_to_docx, read_text

# Presidio-Typ -> Platzhalter-Bezeichnung (deutsch, damit die KI den Kontext versteht)
LABELS: dict[str, str] = {
    "PERSON": "PERSON",
    "LOCATION": "ORT",
    "ORGANIZATION": "ORGANISATION",
    "ADRESSE": "ADRESSE",
    "DE_PLZ": "PLZ",
    "EMAIL_ADDRESS": "EMAIL",
    "PHONE_NUMBER": "TELEFON",
    "URL": "URL",
    "IP_ADDRESS": "IP",
    "IBAN_CODE": "IBAN",
    "CREDIT_CARD": "KREDITKARTE",
    "DATE_TIME": "DATUM",
    "DE_HEALTH_INSURANCE": "KVNR",
    "DE_SOCIAL_SECURITY": "SVNR",
    "DE_TAX_ID": "STEUER_ID",
    "DE_TAX_NUMBER": "STEUERNR",
    "DE_VAT_ID": "UST_ID",
    "DE_ID_CARD": "AUSWEIS",
    "DE_PASSPORT": "REISEPASS",
    "DE_FUEHRERSCHEIN": "FUEHRERSCHEIN",
    "DE_KFZ": "KFZ",
    "DE_LANR": "LANR",
    "DE_BSNR": "BSNR",
    "DE_HANDELSREGISTER": "HANDELSREGISTER",
    "BEGRIFF": "BEGRIFF",  # nur über die Begriffsliste (z. B. Projekt- oder Produktnamen)
}
ENTITY_BY_LABEL = {label: entity for entity, label in LABELS.items()}

# Straße + Hausnummer, z. B. "Steinbachstraße 8a", "Am Ring 3", "Hauptstr. 12-14"
ADDRESS_PATTERN = (
    r"\b(?:[A-ZÄÖÜ][a-zäöüß]+(?:[-\s][A-ZÄÖÜ]?[a-zäöüß]+)*"
    r"(?:straße|strasse|str\.|weg|platz|allee|gasse|ring|damm|ufer|steig|pfad|chaussee)"
    r"|(?:Am|An der|Im|In der|Auf dem|Zum|Zur)\s+[A-ZÄÖÜ][a-zäöüß]+)"
    r"\s+\d{1,4}\s?[a-zA-Z]?(?:\s?[-–/]\s?\d{1,4}\s?[a-zA-Z]?)?\b"
)

# Anrede/Titel bleiben im Text stehen ("Frau [PERSON_1]"), damit die KI Bezüge versteht
TITLE_RE = re.compile(
    r"(?:(?:Frau|Herrn?|Fr\.|Hr\.|Dr\.|Prof\.|med\.|rer\.|nat\.|Dipl\.-[A-Za-zä]+\.?)\s+)+"
)

PLACEHOLDER_RE = re.compile(r"\[\s*([A-Za-zÄÖÜäöü_]+?)_(\d+)\s*\]")


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()


# --------------------------------------------------------------------------- #
# Zuordnung (Platzhalter <-> Original)
# --------------------------------------------------------------------------- #


@dataclass
class Mapping:
    """Konsistente Zuordnung: gleicher Wert -> gleicher Platzhalter, dokumentübergreifend."""

    tokens: dict[str, dict[str, str]] = field(default_factory=dict)  # token -> {typ, wert}
    _index: dict[tuple[str, str], str] = field(default_factory=dict, repr=False)

    def __post_init__(self) -> None:
        for token, entry in self.tokens.items():
            self._index[(entry["typ"], _normalize(entry["wert"]))] = token

    def token_for(self, label: str, value: str) -> str:
        key = (label, _normalize(value))
        if key not in self._index:
            n = 1 + sum(1 for entry in self.tokens.values() if entry["typ"] == label)
            token = f"[{label}_{n}]"
            self.tokens[token] = {"typ": label, "wert": value.strip()}
            self._index[key] = token
        return self._index[key]

    def values_by_entity(self) -> dict[str, list[str]]:
        result: dict[str, list[str]] = {}
        for entry in self.tokens.values():
            entity = ENTITY_BY_LABEL.get(entry["typ"])
            if entity:
                result.setdefault(entity, []).append(entry["wert"])
        return result

    @classmethod
    def load(cls, path: Path) -> "Mapping":
        if not path.exists():
            return cls()
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls(tokens=data.get("platzhalter", {}))

    def save(self, path: Path) -> None:
        data = {
            "hinweis": "VERTRAULICH: Enthält die Originaldaten. Nicht an KI-Dienste weitergeben.",
            "aktualisiert": datetime.now().isoformat(timespec="seconds"),
            "platzhalter": self.tokens,
        }
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass


# --------------------------------------------------------------------------- #
# Begriffslisten
# --------------------------------------------------------------------------- #


def parse_terms(data: dict) -> tuple[dict[str, list[str]], list[str]]:
    """Wertet eine Begriffsliste aus: immer bzw. nie zu anonymisierende Begriffe."""
    deny: dict[str, list[str]] = {}
    for label, values in (data.get("immer_anonymisieren") or {}).items():
        entity = ENTITY_BY_LABEL.get(str(label).upper())
        if entity is None:
            raise ValueError(
                f"Unbekannter Typ '{label}' in der Begriffsliste. "
                f"Erlaubt: {', '.join(sorted(ENTITY_BY_LABEL))}"
            )
        deny.setdefault(entity, []).extend(str(v).strip() for v in values or [] if str(v).strip())
    allow = [str(v).strip() for v in data.get("nie_anonymisieren") or [] if str(v).strip()]
    return deny, allow


def load_terms(path: Path | None) -> tuple[dict[str, list[str]], list[str]]:
    if path is None or not path.exists():
        return {}, []
    import yaml

    return parse_terms(yaml.safe_load(path.read_text(encoding="utf-8")) or {})


# --------------------------------------------------------------------------- #
# Erkennung und Ersetzung
# --------------------------------------------------------------------------- #


def _make_offline() -> None:
    """Presidio prüft E-Mail-Domains mit tldextract, das sonst online die Public
    Suffix List nachlädt. Wir erzwingen die mitgelieferte Offline-Kopie."""
    import tldextract

    offline = tldextract.TLDExtract(suffix_list_urls=())
    try:
        from presidio_analyzer.predefined_recognizers.generic import email_recognizer
    except ImportError:  # ältere Presidio-Versionen
        from presidio_analyzer.predefined_recognizers import email_recognizer
    email_recognizer.tldextract = SimpleNamespace(extract=offline)


def build_analyzer(model: str):
    from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer
    from presidio_analyzer import predefined_recognizers as pr
    from presidio_analyzer.nlp_engine import NlpEngineProvider

    _make_offline()
    logging.getLogger("presidio-analyzer").setLevel(logging.ERROR)

    nlp_engine = NlpEngineProvider(
        nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "de", "model_name": model}],
            "ner_model_configuration": {
                "model_to_presidio_entity_mapping": {
                    "PER": "PERSON",
                    "PERSON": "PERSON",
                    "LOC": "LOCATION",
                    "GPE": "LOCATION",
                    "ORG": "ORGANIZATION",
                },
                "labels_to_ignore": ["MISC"],
            },
        }
    ).create_engine()
    analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["de"])
    registry = analyzer.registry

    # Deutsche Telefonnummern: Presidio-Standard ist auf Englisch und zu vorsichtig
    registry.remove_recognizer("PhoneRecognizer")

    class GermanPhoneRecognizer(pr.PhoneRecognizer):
        SCORE = 0.6

    registry.add_recognizer(
        GermanPhoneRecognizer(
            supported_language="de",
            supported_regions=("DE", "AT", "CH"),
            context=["telefon", "tel", "telefonisch", "mobil", "handy", "fax", "rufnummer", "erreichbar"],
        )
    )

    # Deutsche Ausweis-, Versicherungs- und Steuernummern (in Presidio enthalten,
    # aber nicht standardmäßig aktiv)
    registered = {e for r in registry.recognizers for e in r.supported_entities}
    for name in dir(pr):
        if name.startswith("De") and name.endswith("Recognizer"):
            recognizer = getattr(pr, name)()
            if not set(recognizer.supported_entities) & registered:
                registry.add_recognizer(recognizer)

    case_sensitive = re.DOTALL | re.MULTILINE
    registry.add_recognizer(
        PatternRecognizer(
            supported_entity="ADRESSE",
            supported_language="de",
            patterns=[Pattern("Straße und Hausnummer", ADDRESS_PATTERN, 0.9)],
            context=["wohnhaft", "adresse", "anschrift", "wohnt"],
            global_regex_flags=case_sensitive,
        )
    )
    registry.add_recognizer(
        PatternRecognizer(
            supported_entity="DE_PLZ",
            supported_language="de",
            patterns=[Pattern("PLZ vor Ortsname", r"\b\d{5}(?=\s+[A-ZÄÖÜ][a-zäöüß])", 0.6)],
            global_regex_flags=case_sensitive,
            name="PlzVorOrtRecognizer",
        )
    )
    return analyzer


@dataclass
class Span:
    start: int
    end: int
    entity: str
    score: float


def _resolve(text: str, results) -> list[Span]:
    """Bereinigt Treffer: Anreden/Titel abtrennen, Überlappungen auflösen
    (höhere Konfidenz gewinnt, bei Gleichstand der längere Treffer)."""
    spans: list[Span] = []
    for r in results:
        start, end = r.start, r.end
        while start < end and text[start].isspace():
            start += 1
        while end > start and text[end - 1] in " \t\n.,;:":
            end -= 1
        if r.entity_type == "PERSON":
            m = TITLE_RE.match(text, start, end)
            if m:
                start = m.end()
        if end - start >= 2:
            spans.append(Span(start, end, r.entity_type, r.score))

    chosen: list[Span] = []
    for span in sorted(spans, key=lambda s: (-s.score, -(s.end - s.start), s.start)):
        if all(span.end <= c.start or span.start >= c.end for c in chosen):
            chosen.append(span)
    return sorted(chosen, key=lambda s: s.start)


@dataclass
class Result:
    text: str
    findings: list[tuple[str, str, str]]  # (platzhalter, typ, original)


class Anonymizer:
    def __init__(self, model: str = "de_core_news_md", threshold: float = 0.5):
        self.analyzer = build_analyzer(model)
        self.threshold = threshold

    def _analyze(self, text, entities, allow, known: dict[str, list[str]]) -> list[Span]:
        from presidio_analyzer import PatternRecognizer

        ad_hoc = [
            PatternRecognizer(
                supported_entity=entity,
                supported_language="de",
                deny_list=sorted(set(values), key=len, reverse=True),
                deny_list_score=1.0,
                name=f"Begriffsliste_{entity}",
            )
            for entity, values in known.items()
            if values and entity in entities
        ]
        results = self.analyzer.analyze(
            text=text,
            language="de",
            entities=entities,
            score_threshold=self.threshold,
            allow_list=allow or None,
            ad_hoc_recognizers=ad_hoc,
        )
        return _resolve(text, results)

    def find(
        self,
        text: str,
        mapping: Mapping,
        entities: list[str],
        deny: dict[str, list[str]] | None = None,
        allow: list[str] | None = None,
    ) -> tuple[list[Replacement], list[tuple[str, str, str]]]:
        """Findet alle zu ersetzenden Stellen und vergibt Platzhalter."""
        known = {e: list(v) for e, v in (deny or {}).items()}
        for entity, values in mapping.values_by_entity().items():
            known.setdefault(entity, []).extend(values)

        # Pass 1: Sprachmodell + Muster + Begriffsliste + bekannte Werte
        spans = self._analyze(text, entities, allow, known)

        # Pass 2: Jeder gefundene Wert (bei Personen auch der Nachname allein) wird
        # überall ersetzt, auch wo das Sprachmodell ihn im ersten Durchlauf übersehen hat.
        allowed = {_normalize(a) for a in allow or []}
        for s in spans:
            value = text[s.start : s.end]
            candidates = [value]
            if s.entity == "PERSON":
                candidates.append(value.split()[-1])
            for candidate in candidates:
                if len(candidate) >= 3 and _normalize(candidate) not in allowed:
                    known.setdefault(s.entity, []).append(candidate)
        spans = self._analyze(text, entities, allow, known)

        replacements: list[Replacement] = []
        findings: dict[str, tuple[str, str, str]] = {}
        for s in spans:
            label = LABELS.get(s.entity, s.entity)
            token = mapping.token_for(label, text[s.start : s.end])
            findings[token] = (token, label, mapping.tokens[token]["wert"])
            replacements.append((s.start, s.end, token))
        return replacements, sorted(findings.values())

    def anonymize(self, text: str, mapping: Mapping, entities: list[str], deny=None, allow=None) -> Result:
        replacements, findings = self.find(text, mapping, entities, deny, allow)
        return Result(text=apply_replacements(text, replacements), findings=findings)


def find_placeholders(text: str, mapping: Mapping) -> tuple[list[Replacement], list[str], list[str]]:
    """Sucht Platzhalter und liefert die Ersetzungen durch die Originalwerte.

    Toleriert, dass die KI Platzhalter leicht verändert ([person_1], [ PERSON_1 ]).
    Gibt (Ersetzungen, unbekannte Platzhalter, nicht mehr vorkommende Platzhalter) zurück.
    """
    replacements: list[Replacement] = []
    unknown: set[str] = set()
    used: set[str] = set()
    for match in PLACEHOLDER_RE.finditer(text):
        token = f"[{match.group(1).upper()}_{match.group(2)}]"
        entry = mapping.tokens.get(token)
        if entry is None:
            if match.group(1).upper() in ENTITY_BY_LABEL:
                unknown.add(match.group(0))
            continue
        used.add(token)
        replacements.append((match.start(), match.end(), entry["wert"]))
    return replacements, sorted(unknown), sorted(set(mapping.tokens) - used)


def restore(text: str, mapping: Mapping) -> tuple[str, list[str], list[str]]:
    replacements, unknown, unused = find_placeholders(text, mapping)
    return apply_replacements(text, replacements), unknown, unused


@dataclass
class Processed:
    text: str  # Ergebnis als Text
    docx: bytes | None = None  # formaterhaltendes Word-Ergebnis (nur bei .docx-Eingabe)
    findings: list[tuple[str, str, str]] = field(default_factory=list)
    unknown: list[str] = field(default_factory=list)


def anonymize_document(anonymizer: Anonymizer, name: str, data: bytes, mapping: Mapping,
                       entities: list[str], deny=None, allow=None) -> Processed:
    if name.lower().endswith(".docx"):
        doc = DocxText(data)
        replacements, findings = anonymizer.find(doc.text, mapping, entities, deny, allow)
        doc.replace(replacements)
        doc.clear_metadata()
        return Processed(text=doc.text, docx=doc.save(), findings=findings)
    result = anonymizer.anonymize(read_text(name, data), mapping, entities, deny, allow)
    return Processed(text=result.text, findings=result.findings)


def restore_document(name: str, data: bytes, mapping: Mapping) -> Processed:
    if name.lower().endswith(".docx"):
        doc = DocxText(data)
        replacements, unknown, _ = find_placeholders(doc.text, mapping)
        doc.replace(replacements)
        return Processed(text=doc.text, docx=doc.save(), unknown=unknown)
    text, unknown, _ = restore(read_text(name, data), mapping)
    return Processed(text=text, unknown=unknown)


# --------------------------------------------------------------------------- #
# Kommandozeile
# --------------------------------------------------------------------------- #


def _default_path(source: Path, suffix: str) -> Path:
    return source.with_name(source.stem + suffix)


def _read_input(source: Path) -> tuple[str, bytes]:
    if str(source) == "-":
        return "eingabe.txt", sys.stdin.buffer.read()
    return source.name, source.read_bytes()


def _write_output(output: Path | None, result: Processed) -> None:
    if output is None or str(output) == "-":
        sys.stdout.write(result.text)
    elif output.suffix.lower() == ".docx":
        output.write_bytes(result.docx if result.docx is not None else markdown_to_docx(result.text))
    else:
        output.write_text(result.text, encoding="utf-8")


def entities_without(keep: list[str]) -> list[str]:
    keep_set = {label.upper() for label in keep}
    unknown = keep_set - set(ENTITY_BY_LABEL)
    if unknown:
        raise ValueError(f"Unbekannte Typen: {', '.join(sorted(unknown))}")
    return [entity for entity, label in LABELS.items() if label not in keep_set]


def cmd_anonymize(args: argparse.Namespace) -> int:
    source = Path(args.eingabe)
    if str(source) == "-" and not args.zuordnung:
        raise SystemExit("Bei Eingabe über stdin bitte --zuordnung angeben.")
    mapping_path = Path(args.zuordnung) if args.zuordnung else _default_path(source, ".zuordnung.json")
    is_docx = source.suffix.lower() == ".docx"
    output = Path(args.ausgabe) if args.ausgabe else (
        None if str(source) == "-" else _default_path(source, ".anonym.docx" if is_docx else ".anonym.md")
    )

    try:
        entities = entities_without(args.behalten)
        deny, allow = load_terms(Path(args.begriffe) if args.begriffe else None)
    except ValueError as error:
        raise SystemExit(str(error))
    mapping = Mapping.load(mapping_path)
    name, data = _read_input(source)

    print("Lade Sprachmodell …", file=sys.stderr)
    anonymizer = Anonymizer(model=args.modell, threshold=args.schwelle)
    result = anonymize_document(anonymizer, name, data, mapping, entities, deny, allow)

    print(f"\n{len(result.findings)} Platzhalter:", file=sys.stderr)
    for token, _label, value in result.findings:
        print(f"  {token:<22} {value}", file=sys.stderr)

    if args.nur_pruefen:
        print("\n--nur-pruefen: Es wurde nichts gespeichert.", file=sys.stderr)
        return 0

    _write_output(output, result)
    mapping.save(mapping_path)
    print(
        f"\nAnonymisiert:  {output or 'stdout'}\n"
        f"Zuordnung:     {mapping_path}  (vertraulich, bleibt lokal)\n\n"
        "Bitte den anonymisierten Text vor dem Hochladen kurz gegenlesen —\n"
        "automatische Erkennung findet nicht jeden Namen.",
        file=sys.stderr,
    )
    return 0


def cmd_restore(args: argparse.Namespace) -> int:
    mapping_path = Path(args.zuordnung)
    if not mapping_path.exists():
        raise SystemExit(f"Zuordnungsdatei nicht gefunden: {mapping_path}")
    mapping = Mapping.load(mapping_path)
    source = Path(args.eingabe)
    is_docx = source.suffix.lower() == ".docx"
    output = Path(args.ausgabe) if args.ausgabe else (
        None if str(source) == "-"
        else _default_path(source, ".wiederhergestellt.docx" if is_docx else ".wiederhergestellt.md")
    )

    name, data = _read_input(source)
    result = restore_document(name, data, mapping)
    _write_output(output, result)

    if output is not None:
        print(f"Wiederhergestellt: {output}", file=sys.stderr)
    if result.unknown:
        print(
            "Achtung — diese Platzhalter stehen nicht in der Zuordnung "
            f"(evtl. von der KI erfunden): {', '.join(result.unknown)}",
            file=sys.stderr,
        )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="ki_anonymisierer",
        description="Dokumente offline pseudonymisieren (für KI-Tools) und wiederherstellen.",
    )
    sub = parser.add_subparsers(dest="befehl", required=True)

    p = sub.add_parser("anonymisieren", help="Personenbezogene Daten durch Platzhalter ersetzen")
    p.add_argument("eingabe", help="Datei (.txt, .md, .docx, .pdf) oder '-' für stdin")
    p.add_argument("-o", "--ausgabe", help="Zieldatei (Standard: <name>.anonym.docx bei Word, sonst <name>.anonym.md)")
    p.add_argument(
        "-z", "--zuordnung",
        help="Zuordnungsdatei; existiert sie, wird sie erweitert (Standard: <name>.zuordnung.json)",
    )
    p.add_argument("-b", "--begriffe", help="YAML-Datei mit festen Begriffen (siehe begriffe.beispiel.yaml)")
    p.add_argument(
        "--behalten", nargs="+", default=[], metavar="TYP",
        help=f"Diese Typen nicht ersetzen, z. B. DATUM ORT. Verfügbar: {', '.join(LABELS.values())}",
    )
    p.add_argument("--schwelle", type=float, default=0.5, help="Mindest-Konfidenz 0–1 (Standard 0.5)")
    p.add_argument("--modell", default="de_core_news_md", help="spaCy-Modell (Standard: de_core_news_md)")
    p.add_argument("--nur-pruefen", action="store_true", help="Nur Funde anzeigen, nichts speichern")
    p.set_defaults(func=cmd_anonymize)

    r = sub.add_parser("wiederherstellen", help="Platzhalter durch Originalwerte ersetzen")
    r.add_argument("eingabe", help="KI-Antwort als Datei (.txt, .md, .docx) oder '-' für stdin")
    r.add_argument("-z", "--zuordnung", required=True, help="Zuordnungsdatei aus dem Anonymisieren")
    r.add_argument("-o", "--ausgabe", help="Zieldatei; .docx erzeugt eine Word-Datei (Standard: wie Eingabeformat)")
    r.set_defaults(func=cmd_restore)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
