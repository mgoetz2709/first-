#!/usr/bin/env python3
"""Baut app/steuer-monitor.html: eine einzige Datei ohne externe Abhängigkeiten."""
import json
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER.parent / "src"))
from estmon.appdaten import als_app_daten  # noqa: E402
from estmon.daten import Daten  # noqa: E402
from estmon.params import einstellungen  # noqa: E402

src = HIER / "src"
beispiel = als_app_daten(Daten(HIER.parent / "beispiel"), einstellungen(None))
html = (src / "index.html").read_text(encoding="utf-8")
for marke, inhalt in (("/*STIL*/", (src / "stil.css").read_text(encoding="utf-8")),
                      ("/*KERN*/", (src / "kern.js").read_text(encoding="utf-8")),
                      ("/*BEISPIEL*/", json.dumps(beispiel, ensure_ascii=False)),
                      ("/*PDFJS*/", (HIER / "vendor" / "pdf.min.js").read_text(encoding="utf-8")),
                      ("/*PDFWORKER*/", (HIER / "vendor" / "pdf.worker.min.js").read_text(encoding="utf-8")),
                      ("/*UI*/", (src / "ui.js").read_text(encoding="utf-8"))):
    assert marke in html, marke
    html = html.replace(marke, inhalt.replace("</script", "<\\/script"), 1)
ziel = HIER / "steuer-monitor.html"
ziel.write_text(html, encoding="utf-8")
print(f"{ziel} ({len(html) // 1024} kB)")
