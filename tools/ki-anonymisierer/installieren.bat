@echo off
rem Einmalige Installation (benoetigt Internet). Danach laeuft alles offline.
cd /d "%~dp0"
py -3 -m venv .venv || python -m venv .venv
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
".venv\Scripts\python.exe" -m spacy download de_core_news_md
echo.
echo Installation abgeschlossen. Start mit "starten.bat".
pause
