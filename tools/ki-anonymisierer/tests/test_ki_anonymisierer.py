import importlib.util
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ki_anonymisierer as ka  # noqa: E402


def test_mapping_is_consistent_and_case_insensitive():
    m = ka.Mapping()
    assert m.token_for("PERSON", "Erika Mustermann") == "[PERSON_1]"
    assert m.token_for("PERSON", "erika  mustermann") == "[PERSON_1]"
    assert m.token_for("PERSON", "Max Mustermann") == "[PERSON_2]"
    assert m.token_for("ORT", "Berlin") == "[ORT_1]"


def test_mapping_roundtrip_on_disk(tmp_path):
    path = tmp_path / "z.json"
    m = ka.Mapping()
    m.token_for("PERSON", "Erika Mustermann")
    m.save(path)
    loaded = ka.Mapping.load(path)
    assert loaded.token_for("PERSON", "Erika Mustermann") == "[PERSON_1]"
    assert loaded.token_for("PERSON", "Neue Person") == "[PERSON_2]"


def test_restore_tolerates_ai_variations_and_reports_unknown():
    m = ka.Mapping()
    m.token_for("PERSON", "Erika Mustermann")
    m.token_for("ORT", "Berlin")
    text, unknown, unused = ka.restore("Frau [person_1] aus [ ORT_1 ] und [PERSON_7], [Hinweis_1]", m)
    assert text == "Frau Erika Mustermann aus Berlin und [PERSON_7], [Hinweis_1]"
    assert unknown == ["[PERSON_7]"]
    assert unused == []


class _R:
    def __init__(self, start, end, entity_type, score):
        self.start, self.end, self.entity_type, self.score = start, end, entity_type, score


def test_resolve_strips_titles_and_prefers_higher_score():
    text = "Dr. Thomas Weber, IBAN DE89 3704 0044 0532 0130 00."
    results = [
        _R(0, 16, "PERSON", 0.85),
        _R(18, 27, "LOCATION", 0.85),  # Fehlgriff des Sprachmodells, überlappt die IBAN
        _R(23, 50, "IBAN_CODE", 1.0),
    ]
    spans = ka._resolve(text, results)
    assert [(text[s.start : s.end], s.entity) for s in spans] == [
        ("Thomas Weber", "PERSON"),
        ("DE89 3704 0044 0532 0130 00", "IBAN_CODE"),
    ]


@pytest.mark.skipif(importlib.util.find_spec("de_core_news_md") is None, reason="spaCy-Modell fehlt")
def test_end_to_end_with_model():
    text = (
        "Frau Hildegard Schneider, wohnhaft Steinbachstraße 8a, 92361 Berngau, "
        "erreichbar unter pflege@example.de. Frau Schneider hat Pflegegrad 3."
    )
    mapping = ka.Mapping()
    result = ka.Anonymizer().anonymize(
        text, mapping, list(ka.LABELS), deny={"ORGANIZATION": []}, allow=["Pflegegrad"]
    )
    for secret in ("Schneider", "Steinbachstraße", "92361", "Berngau", "pflege@example.de"):
        assert secret not in result.text
    assert "Pflegegrad 3" in result.text
    restored, unknown, _ = ka.restore(result.text, mapping)
    assert restored == text
    assert unknown == []
