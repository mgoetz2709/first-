@echo off
chcp 65001 >nul
title KI-Anonymisierer
cd /d "%~dp0"
if not exist ".venv\installiert.ok" (
  call :einrichten
  if errorlevel 1 goto :fehler
)
echo.
echo Das Tool oeffnet sich gleich im Browser.
echo Dieses Fenster offen lassen - Schliessen beendet das Tool.
echo.
".venv\Scripts\python.exe" oberflaeche.py
pause
exit /b 0

:einrichten
echo ============================================================
echo  Erster Start: Einrichtung (einmalig, ca. 5 Minuten).
echo  Dafuer wird einmal Internet benoetigt, danach nicht mehr.
echo ============================================================
set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY python --version >nul 2>&1 && set "PY=python"
if not defined PY (
  echo Python wird installiert ...
  winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
  if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY="%LOCALAPPDATA%\Programs\Python\Python312\python.exe""
)
if not defined PY (
  echo.
  echo Python konnte nicht automatisch installiert werden.
  echo Bitte Python von python.org installieren - dabei "Add Python to PATH" anhaken -
  echo und danach starten.bat erneut doppelklicken.
  start "" https://www.python.org/downloads/
  exit /b 1
)
if exist .venv rmdir /s /q .venv
%PY% -m venv .venv || exit /b 1
echo Pakete werden installiert ...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q -r requirements.txt || exit /b 1
echo Deutsches Sprachmodell wird geladen ...
".venv\Scripts\python.exe" -m spacy download de_core_news_md || exit /b 1
echo ok> ".venv\installiert.ok"
echo Einrichtung abgeschlossen.
exit /b 0

:fehler
echo.
echo Die Einrichtung ist fehlgeschlagen. Bitte die Meldungen oben pruefen
echo (z. B. Internetverbindung) und starten.bat erneut doppelklicken.
pause
exit /b 1
