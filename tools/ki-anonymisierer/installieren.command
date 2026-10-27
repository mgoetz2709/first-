#!/bin/sh
# Einmalige Installation (benötigt Internet). Danach läuft alles offline.
cd "$(dirname "$0")" || exit 1
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m spacy download de_core_news_md
echo
echo 'Installation abgeschlossen. Start mit "starten.command".'
