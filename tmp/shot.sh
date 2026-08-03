#!/usr/bin/env bash
# Zrzut ekranu dowolnego pliku HTML przez headless Chrome.
# użycie: tmp/shot.sh tmp/sheet.html tmp/sheet.png [szerokość] [wysokość]
set -euo pipefail
cd "$(dirname "$0")/.."
IN="${1:-tmp/sheet.html}"
OUT="${2:-tmp/sheet.png}"
W="${3:-1400}"
H="${4:-2200}"
google-chrome --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --virtual-time-budget=3000 --window-size="$W,$H" \
  --screenshot="$OUT" "file://$PWD/$IN" >/dev/null 2>&1
echo "$OUT"
