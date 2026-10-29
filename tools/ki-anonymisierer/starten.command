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
  if ! python3 -c 'import sys; sys.exit(sys.version_info < (3, 10))' >/dev/null 2>&1; then
    command -v open >/dev/null && open "https://www.python.org/downloads/"
    fehler "Python 3.10 oder neuer fehlt. Bitte von python.org installieren und danach erneut starten."
  fi
  rm -rf .venv
  python3 -m venv .venv || fehler "Einrichtung fehlgeschlagen (venv)."
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
