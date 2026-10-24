"""Lisää Helmet-kirjastojen lainausmäärät kirja-aineistoon (sarake 10).

Lähde: Helsingin kaupunginkirjasto, HelMet-kirjastojen lainatuimmat aikuistenkirjat (CC BY 4.0),
https://hri.fi/data/dataset/helmet-kirjastojen-lainatuimmat-aikuistenkirjat
Tiedostossa on 100 lainatuinta kirjaa kuukausittain lokakuusta 2019 alkaen.
Ajetaan kansiossa, jossa books.json on (scripts/update.sh tekee tämän)."""
import json, re, sys, unicodedata, urllib.request, collections, datetime, io

URL = 'https://hkikuvadatalake.blob.core.windows.net/kirjasto-hri/hkk_100eniten_lainattua_kirjaa.xlsx'


def norm(s):
    s = unicodedata.normalize('NFKC', str(s or '')).lower()
    s = re.sub(r'[\[\]()"“”«»]', '', s)
    s = re.sub(r'\s*[:/;].*$', '', s)
    s = re.sub(r'[^0-9a-zåäöüéè ]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def main():
    import openpyxl
    path = sys.argv[1] if len(sys.argv) > 1 else None
    data = open(path, 'rb').read() if path else urllib.request.urlopen(urllib.request.Request(URL, headers={'User-Agent': 'mita-lukisin/1.0'}), timeout=120).read()
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True)
    ws = wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    head = [str(h or '').strip().lower() for h in next(rows)]
    col = {name: head.index(name) for name in ('period', 'activity', 'adult/juvenile', 'author', 'title', 'transactions')}
    today = datetime.date.today()
    loans = collections.Counter()
    for r in rows:
        if not r or str(r[col['activity']] or '').lower() != 'checkouts': continue
        if str(r[col['adult/juvenile']] or '').lower() != 'adult': continue
        per = str(r[col['period']] or '')
        m = re.match(r'^(\d{1,2})(\d{4})$', per)
        if not m: continue
        months_ago = (today.year - int(m.group(2))) * 12 + today.month - int(m.group(1))
        w = 1.0 if months_ago <= 36 else 0.5          # viimeiset kolme vuotta painavat enemmän
        author = str(r[col['author']] or '')
        last = author.split(',')[0].strip() if ',' in author else (author.split() or [''])[-1]
        try: n = float(r[col['transactions']] or 0)
        except ValueError: continue
        loans[norm(r[col['title']]) + '|' + norm(last)] += n * w
    d = json.load(open('books.json', encoding='utf-8'))
    hit = 0
    for b in d['b']:
        while len(b) < 11: b.append(0)
        k = norm(b[0]) + '|' + norm((b[1].split() or [''])[-1])
        v = int(round(loans.get(k, 0)))
        b[10] = v
        if v: hit += 1
    d['loansSrc'] = 'Helsingin kaupunginkirjasto, HelMet-kirjastojen lainatuimmat aikuistenkirjat (CC BY 4.0)'
    open('books.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
    print('lainausdata:', len(loans), 'nimekettä,', hit, 'yhdistettiin romaaneihin')


if __name__ == '__main__':
    main()
