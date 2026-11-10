#!/usr/bin/env bash
# Testlauf mit fiktiven Beispieldaten: 1 Bescheid, 2 Verträge, 3 Monate Eingänge (01-03/2026).
# Erwartung: Konservativ = Gelb, Basis = Rot.
set -euo pipefail
cd "$(dirname "$0")/.."
E=./estmon
rm -f beispiel/data/eingaenge.csv
tmp="$(mktemp)"
$E --wurzel beispiel import-vorschlag beispiel/archiv/2026/umsaetze_2026-01_bis_2026-03.csv --aus "$tmp"
$E --wurzel beispiel import-speichern "$tmp"
rm -f "$tmp"
$E --wurzel beispiel planist --stichtag 2026-03
echo
$E --wurzel beispiel status --jahr 2026 --stichtag 2026-03
echo
$E --wurzel beispiel report --jahr 2026 --stichtag 2026-03
