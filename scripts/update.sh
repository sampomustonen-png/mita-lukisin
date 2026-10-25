#!/usr/bin/env bash
# Hakee koko aineiston uudelleen Finnasta ja rakentaa data/books.json (romaanit) ja data/nonfiction.json (tietokirjat).
# Ajo: bash scripts/update.sh   (kestää noin 2–3 tuntia; Finnaa kuormitetaan maltillisesti)
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
# Tietokirjat: jos haku epäonnistuu, edellinen aineisto jää voimaan eikä romaanien päivitys keskeydy
# (set -e ei toimi ||-rakenteen sisällä, joten vaiheet ketjutetaan &&-merkeillä)
python3 "$ROOT/scripts/nf_harvest.py" &&
  python3 "$ROOT/scripts/nf_process.py" &&
  { python3 "$ROOT/scripts/loans.py" nonfiction.json || true; } &&
  python3 -c "import json,sys; n=len(json.load(open('nonfiction.json',encoding='utf-8'))['b']); print('tietokirjoja', n); sys.exit(0 if n >= 40000 else 'Liian vähän tietokirjoja, vanhaa aineistoa ei korvata')" &&
  cp nonfiction.json "$ROOT/data/nonfiction.json" || echo "Tietokirjoja ei päivitetty, käytetään edellistä aineistoa"
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
