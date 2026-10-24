"""Hakee Kirjakauppaliiton Mitä Suomi lukee -listat (tuorein ja kaksi edellistä kuukautta) tiedostoon msl.json.

Lähde: Kirjakauppaliitto, https://kirjakauppaliitto.fi/mita-suomi-lukee/
Listat perustuvat kirjakauppojen, verkkokauppojen, lukuaikapalvelujen ja Lehtipisteen myyntiin.
Ajo: python3 scripts/msl.py [kohdekansio]   (oletus: nykyinen kansio)"""
import html, json, re, sys, time, urllib.request, pathlib

BASE = 'https://kirjakauppaliitto.fi'
FORMATS = ['kaikki-formaatit', 'painetut-kirjat', 'aanikirjat', 'sahkokirjat', 'pokkarit']
MONTHS = ['tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesakuu', 'heinakuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu']


def get(url):
    for a in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'mita-lukisin/1.0 (kirjasuosittelija)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:
            if getattr(e, 'code', 0) == 404: return None
            time.sleep(2 + 3 * a)
    return None


def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def parse(page):
    """Palauttaa [{category, items:[{r, trend, a, t, p}]}] listasivulta."""
    out, cur = [], None
    box = page[page.find('class="booklist"'):] if 'class="booklist"' in page else page
    for row in re.findall(r'<tr[^>]*>(.*?)</tr>', box, flags=re.S):
        h = re.search(r'<h2[^>]*>(.*?)</h2>', row, flags=re.S)
        if h:
            cur = {'category': clean(h.group(1)), 'items': []}; out.append(cur); continue
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, flags=re.S)
        if len(cells) < 5 or cur is None: continue
        m = re.match(r'(\d+)', clean(cells[0]))
        if not m: continue
        tr = re.search(r'table-icon\s+(new|up|still|down)', cells[1])
        cur['items'].append({'r': int(m.group(1)), 'trend': tr.group(1) if tr else '', 'a': clean(cells[2]), 't': clean(cells[3]), 'p': clean(cells[4])})
    return [c for c in out if c['items']]


def main():
    dest = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    front = get(BASE + '/mita-suomi-lukee/') or ''
    m = re.search(r'/mita-suomi-lukee-tilasto/([a-z]+)-(\d{4})-kaikki-formaatit/', front)
    if not m:
        sys.exit('Tuoreinta listaa ei löytynyt')
    mi, year = MONTHS.index(m.group(1)), int(m.group(2))
    months = []
    for back in range(3):
        k = mi - back; y = year
        while k < 0: k += 12; y -= 1
        lists = []
        for f in FORMATS:
            url = f'{BASE}/mita-suomi-lukee-tilasto/{MONTHS[k]}-{y}-{f}/'
            page = get(url)
            time.sleep(0.5)
            if not page: continue
            for c in parse(page):
                lists.append({'format': f, 'category': c['category'], 'url': url, 'items': c['items']})
        if lists:
            months.append({'year': y, 'month': k + 1, 'lists': lists})
    data = {'src': 'Kirjakauppaliitto, Mitä Suomi lukee', 'srcUrl': BASE + '/mita-suomi-lukee/', 'months': months}
    (dest / 'msl.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('Mitä Suomi lukee:', [(x['year'], x['month'], len(x['lists']), sum(len(l['items']) for l in x['lists'])) for x in months])


if __name__ == '__main__':
    main()
