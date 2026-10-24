#!/usr/bin/env bash
# Hakee koko aineiston uudelleen Finnasta ja rakentaa data/books.json.
# Ajo: bash scripts/update.sh   (kestää noin 1,5–2 tuntia; Finnaa kuormitetaan maltillisesti)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/data/raw"
mkdir -p "$WORK"
cd "$WORK"
python3 "$ROOT/scripts/harvest.py"        # romaanit ja äänikirjat
python3 "$ROOT/scripts/era.py"            # aikakausiasiasanat
python3 "$ROOT/scripts/process.py"        # painosten yhdistäminen -> books.json
python3 "$ROOT/scripts/harvest2.py"       # sivumäärät ja lisäasiasanat niukasti luetteloiduille
python3 "$ROOT/scripts/process.py"
python3 "$ROOT/scripts/enrich.py"
if [ -f "$ROOT/scripts/loans.py" ]; then python3 "$ROOT/scripts/loans.py" || echo "Lainausdataa ei saatu, jatketaan ilman"; fi
python3 - <<'PY'
import json, sys
d = json.load(open('books.json', encoding='utf-8'))
n = len(d['b'])
if n < 30000:
    sys.exit(f'Liian vähän kirjoja ({n}), vanhaa aineistoa ei korvata')
print('kirjoja', n)
PY
cp books.json "$ROOT/data/books.json"
python3 "$ROOT/scripts/msl.py" "$ROOT/data" || echo "Mitä Suomi lukee -listoja ei saatu, jatketaan ilman"
