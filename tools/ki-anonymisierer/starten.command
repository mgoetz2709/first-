#!/bin/sh
# KI-Anonymisierer starten. Beim ersten Start wird alles Nötige eingerichtet.
cd "$(dirname "$0")" || exit 1

fehler() {
  echo
  echo "$1"
  echo "Fenster mit Enter schließen."
  read -r _
  exit 1
}

if [ ! -f .venv/installiert.ok ]; then
  echo "============================================================"
  echo " Erster Start: Einrichtung (einmalig, ca. 5 Minuten)."
  echo " Dafür wird einmal Internet benötigt, danach nicht mehr."
  echo "============================================================"
  # Presidio unterstützt Python 3.11 bis 3.14 – passende Version suchen
  PY=""
  for v in 3.13 3.12 3.11 3.14; do
    for c in "python$v" "/Library/Frameworks/Python.framework/Versions/$v/bin/python3" \
             "/opt/homebrew/bin/python$v" "/usr/local/bin/python$v"; do
      if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys' >/dev/null 2>&1; then
        PY="$c"
        break 2
      fi
    done
  done
  if [ -z "$PY" ]; then
    command -v open >/dev/null && open "https://www.python.org/downloads/macos/"
    fehler "Python 3.13 fehlt (3.11 bis 3.14 geht auch, 3.15 noch nicht). Bitte von python.org installieren und danach erneut starten."
  fi
  echo "Verwende $("$PY" --version)"
  rm -rf .venv
  "$PY" -m venv .venv || fehler "Einrichtung fehlgeschlagen (venv)."
  echo "Pakete werden installiert …"
  .venv/bin/python -m pip install --disable-pip-version-check -q -r requirements.txt \
    || fehler "Einrichtung fehlgeschlagen (Pakete). Internetverbindung prüfen und erneut starten."
  echo "Deutsches Sprachmodell wird geladen …"
  .venv/bin/python -m spacy download de_core_news_md \
    || fehler "Einrichtung fehlgeschlagen (Sprachmodell). Internetverbindung prüfen und erneut starten."
  touch .venv/installiert.ok
  echo "Einrichtung abgeschlossen."
fi

echo
echo "Das Tool öffnet sich gleich im Browser."
echo "Dieses Fenster offen lassen – Schließen beendet das Tool."
echo
exec .venv/bin/python oberflaeche.py
