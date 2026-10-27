#!/usr/bin/env python3
"""Lokale Oberfläche für den KI-Anonymisierer.

Startet einen kleinen Webserver, der ausschließlich auf diesem Rechner
(127.0.0.1) erreichbar ist, und öffnet ihn im Browser. Es werden keine
Daten ins Internet übertragen; die Seite lädt keine externen Ressourcen.

    python oberflaeche.py [--ordner ~/KI-Anonymisierer] [--port 8765]

Im Arbeitsordner liegen die Zuordnungen je Vorgang (vorgaenge/*.zuordnung.json)
und die Begriffsliste (begriffe.yaml).
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import threading
import webbrowser
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dokumente import markdown_to_docx  # noqa: E402
from ki_anonymisierer import (  # noqa: E402
    ENTITY_BY_LABEL,
    LABELS,
    Anonymizer,
    Mapping,
    anonymize_document,
    entities_without,
    load_terms,
    restore_document,
)

MAX_UPLOAD = 60 * 1024 * 1024
VORGANG_RE = re.compile(r"^[\wäöüÄÖÜß .\-]{1,80}$")
CSRF_HEADER = "X-KI-Anonymisierer"
HTML_PATH = Path(__file__).resolve().parent / "oberflaeche.html"


class ApiError(Exception):
    def __init__(self, message: str, status: HTTPStatus = HTTPStatus.BAD_REQUEST):
        super().__init__(message)
        self.status = status


class App:
    def __init__(self, folder: Path, anonymizer_factory):
        self.folder = folder
        self.cases = folder / "vorgaenge"
        self.terms_path = folder / "begriffe.yaml"
        self.cases.mkdir(parents=True, exist_ok=True)
        for path in (folder, self.cases):
            try:
                os.chmod(path, 0o700)
            except OSError:
                pass
        self._lock = threading.Lock()  # Sprachmodell und Zuordnungsdateien nacheinander nutzen
        self._ready = threading.Event()
        self._anonymizer = None
        self.load_error: str | None = None
        threading.Thread(target=self._load, args=(anonymizer_factory,), daemon=True).start()

    def _load(self, factory) -> None:
        try:
            self._anonymizer = factory()
        except Exception as error:  # Modell fehlt o. Ä. — in der Oberfläche anzeigen
            self.load_error = f"{type(error).__name__}: {error}"
        finally:
            self._ready.set()

    def anonymizer(self) -> Anonymizer:
        self._ready.wait()
        if self._anonymizer is None:
            raise ApiError(f"Sprachmodell konnte nicht geladen werden: {self.load_error}",
                           HTTPStatus.SERVICE_UNAVAILABLE)
        return self._anonymizer

    # -- Vorgänge ---------------------------------------------------------- #

    def _case_path(self, name: str) -> Path:
        name = (name or "").strip()
        if not VORGANG_RE.match(name) or name.startswith("."):
            raise ApiError("Bitte einen Vorgangsnamen angeben (Buchstaben, Ziffern, Leerzeichen, - _ .).")
        return self.cases / f"{name}.zuordnung.json"

    def list_cases(self) -> list[dict]:
        cases = []
        for path in sorted(self.cases.glob("*.zuordnung.json"), key=lambda p: -p.stat().st_mtime):
            mapping = Mapping.load(path)
            cases.append({
                "name": path.name[: -len(".zuordnung.json")],
                "platzhalter": len(mapping.tokens),
                "aktualisiert": datetime.fromtimestamp(path.stat().st_mtime).strftime("%d.%m.%Y %H:%M"),
            })
        return cases

    # -- Begriffsliste ------------------------------------------------------ #

    def terms_as_text(self) -> dict:
        deny, allow = load_terms(self.terms_path)
        lines = [f"{LABELS[entity]}: {value}" for entity, values in deny.items() for value in values]
        return {"immer": "\n".join(lines), "nie": "\n".join(allow)}

    def save_terms(self, always: str, never: str) -> None:
        import yaml

        deny: dict[str, list[str]] = {}
        for line in always.splitlines():
            line = line.strip()
            if not line:
                continue
            label, _, value = line.partition(":")
            if value.strip() and label.strip().upper() in ENTITY_BY_LABEL:
                deny.setdefault(label.strip().upper(), []).append(value.strip())
            else:
                deny.setdefault("BEGRIFF", []).append(line)
        data = {
            "immer_anonymisieren": deny,
            "nie_anonymisieren": [v.strip() for v in never.splitlines() if v.strip()],
        }
        self.terms_path.write_text(
            "# Gepflegt über die Oberfläche des KI-Anonymisierers\n"
            + yaml.safe_dump(data, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )

    # -- Aktionen ----------------------------------------------------------- #

    @staticmethod
    def _input(body: dict) -> tuple[str, bytes]:
        if body.get("daten_b64"):
            name = Path(body.get("dateiname") or "dokument.txt").name
            if not name.lower().endswith((".docx", ".pdf", ".txt", ".md", ".csv")):
                raise ApiError("Unterstützt werden .docx, .pdf, .txt und .md.")
            return name, base64.b64decode(body["daten_b64"])
        text = body.get("text") or ""
        if not text.strip():
            raise ApiError("Bitte eine Datei ablegen oder Text einfügen.")
        return "eingabe.md", text.encode("utf-8")

    @staticmethod
    def _file(name: str, data: bytes | None) -> dict | None:
        if data is None:
            return None
        return {"name": name, "b64": base64.b64encode(data).decode("ascii")}

    def anonymize(self, body: dict) -> dict:
        path = self._case_path(body.get("vorgang"))
        name, data = self._input(body)
        try:
            entities = entities_without(body.get("behalten") or [])
            deny, allow = load_terms(self.terms_path)
        except ValueError as error:
            raise ApiError(str(error))
        anonymizer = self.anonymizer()
        with self._lock:
            mapping = Mapping.load(path)
            result = anonymize_document(anonymizer, name, data, mapping, entities, deny, allow)
            mapping.save(path)
        stem = Path(name).stem
        return {
            "text": result.text,
            "funde": [{"platzhalter": t, "typ": l, "wert": v} for t, l, v in result.findings],
            "datei": self._file(f"{stem}.anonym.docx", result.docx),
        }

    def restore(self, body: dict) -> dict:
        path = self._case_path(body.get("vorgang"))
        if not path.exists():
            raise ApiError("Zu diesem Vorgang gibt es noch keine Zuordnung.")
        name, data = self._input(body)
        with self._lock:
            result = restore_document(name, data, Mapping.load(path))
        stem = "ki-antwort" if name == "eingabe.md" else Path(name).stem.replace(".anonym", "")
        docx = result.docx if result.docx is not None else markdown_to_docx(result.text)
        return {
            "text": result.text,
            "unbekannt": result.unknown,
            "datei": self._file(f"{stem}.wiederhergestellt.docx", docx),
        }

    def delete_case(self, body: dict) -> dict:
        path = self._case_path(body.get("vorgang"))
        with self._lock:
            path.unlink(missing_ok=True)
        return {"ok": True}

    def status(self) -> dict:
        return {
            "bereit": self._ready.is_set() and self._anonymizer is not None,
            "fehler": self.load_error,
            "vorgaenge": self.list_cases(),
            "begriffe": self.terms_as_text(),
            "typen": [label for label in LABELS.values() if label != "BEGRIFF"],
            "ordner": str(self.folder),
        }


def make_handler(app: App, port_holder: dict):
    class Handler(BaseHTTPRequestHandler):
        server_version = "KI-Anonymisierer"

        def log_message(self, format, *args):  # keine Inhalte ins Terminal schreiben
            pass

        def _host_ok(self) -> bool:
            # Schutz gegen DNS-Rebinding: nur Aufrufe an 127.0.0.1/localhost annehmen
            port = port_holder["port"]
            return self.headers.get("Host", "") in {f"127.0.0.1:{port}", f"localhost:{port}"}

        def _send(self, status: HTTPStatus, body: bytes, content_type: str) -> None:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header(
                "Content-Security-Policy",
                "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
            )
            self.end_headers()
            self.wfile.write(body)

        def _json(self, status: HTTPStatus, data: dict) -> None:
            self._send(status, json.dumps(data, ensure_ascii=False).encode("utf-8"),
                       "application/json; charset=utf-8")

        def do_GET(self):
            if not self._host_ok():
                return self._send(HTTPStatus.FORBIDDEN, b"Forbidden", "text/plain")
            if self.path in ("/", "/index.html"):
                return self._send(HTTPStatus.OK, HTML_PATH.read_bytes(), "text/html; charset=utf-8")
            if self.path == "/api/status":
                return self._json(HTTPStatus.OK, app.status())
            self._send(HTTPStatus.NOT_FOUND, b"Not found", "text/plain")

        def do_POST(self):
            # Eigener Header erzwingt bei fremden Webseiten einen CORS-Preflight, den
            # dieser Server nie erlaubt — so kann keine andere Seite die API nutzen.
            if not self._host_ok() or self.headers.get(CSRF_HEADER) != "1":
                return self._send(HTTPStatus.FORBIDDEN, b"Forbidden", "text/plain")
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_UPLOAD:
                return self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"fehler": "Datei ist zu groß (max. 40 MB)."})
            routes = {
                "/api/anonymisieren": app.anonymize,
                "/api/wiederherstellen": app.restore,
                "/api/vorgang/loeschen": app.delete_case,
                "/api/begriffe": lambda b: (app.save_terms(b.get("immer", ""), b.get("nie", "")), {"ok": True})[1],
            }
            route = routes.get(self.path)
            if route is None:
                return self._send(HTTPStatus.NOT_FOUND, b"Not found", "text/plain")
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
                self._json(HTTPStatus.OK, route(body))
            except ApiError as error:
                self._json(error.status, {"fehler": str(error)})
            except Exception as error:  # z. B. beschädigte Datei
                self._json(HTTPStatus.INTERNAL_SERVER_ERROR,
                           {"fehler": f"Verarbeitung fehlgeschlagen: {type(error).__name__}: {error}"})

    return Handler


def create_server(app: App, port: int) -> ThreadingHTTPServer:
    port_holder = {"port": port}
    server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(app, port_holder))
    port_holder["port"] = server.server_address[1]
    return server


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Lokale Oberfläche des KI-Anonymisierers")
    parser.add_argument("--ordner", default=str(Path.home() / "KI-Anonymisierer"),
                        help="Arbeitsordner für Zuordnungen und Begriffsliste (Standard: ~/KI-Anonymisierer)")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--modell", default="de_core_news_md")
    parser.add_argument("--schwelle", type=float, default=0.5)
    parser.add_argument("--kein-browser", action="store_true", help="Browser nicht automatisch öffnen")
    args = parser.parse_args(argv)

    app = App(Path(args.ordner).expanduser(),
              lambda: Anonymizer(model=args.modell, threshold=args.schwelle))
    try:
        server = create_server(app, args.port)
    except OSError:
        server = create_server(app, 0)  # Port belegt -> freien Port wählen
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    print(f"KI-Anonymisierer läuft unter {url}\nArbeitsordner: {app.folder}\nBeenden mit Strg+C.")
    if not args.kein_browser:
        threading.Timer(0.5, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBeendet.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
