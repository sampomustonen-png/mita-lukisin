import json, re, collections, unicodedata, sys

books = json.load(open('raw_books.json', encoding='utf-8'))
try:
    audio = json.load(open('raw_audio.json', encoding='utf-8'))
except Exception:
    audio = []

SWEDISH_HINT = re.compile(r'(ska|iska|ningar|ning|het|else|tal|arna|erna|orna|litteratur|romaner|ungdomar|barn|kvinnor|män|kärlek|vänskap)$')
STOP = {
 'suomenkielinen kirjallisuus','romaanit','kaunokirjallisuus','käännökset','suomen kieli','finska','finsk litteratur',
 'romaner','översättningar','skönlitteratur','äänikirjat','lukemisesteisten äänikirjat','e-kirjat','englanninkielinen kirjallisuus',
 'kotimainen kaunokirjallisuus','fiktio','romaani','kertomukset','ruotsinkielinen kirjallisuus','ljudböcker','e-böcker',
 'saksankielinen kirjallisuus','ranskankielinen kirjallisuus','ruotsin kieli','englannin kieli','svenska','engelska',
}
def norm(s):
    s = unicodedata.normalize('NFKC', s or '').lower()
    s = re.sub(r'[\[\]()"“”«»]', '', s)
    s = re.sub(r'\s*[:/;].*$', '', s)
    s = re.sub(r'[^0-9a-zåäöüéè ]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def author_of(r):
    for a in r.get('nonPresenterAuthors') or []:
        n = (a.get('name') or '').strip().rstrip(',.')
        if not n: continue
        if ',' in n:
            last, first = [x.strip() for x in n.split(',', 1)]
            return (first + ' ' + last).strip(), last
        return n, n.split()[-1]
    return '', ''

def title_of(r):
    t = (r.get('shortTitle') or r.get('title') or '').strip()
    t = re.sub(r'\s*[/:;=]\s*$', '', t).strip()
    return t

def year_of(r):
    m = re.search(r'(1[5-9]\d\d|20\d\d)', str(r.get('year') or ''))
    return int(m.group(1)) if m else 0

def terms_of(r):
    out = []
    for subj in r.get('subjects') or []:
        parts = subj if isinstance(subj, list) else [subj]
        for p in parts:
            p = re.sub(r'\s+', ' ', str(p)).strip().rstrip('.').lower()
            if p and p not in STOP and len(p) < 60 and not re.match(r'^\d', p):
                out.append(p)
    for g in r.get('genres') or []:
        g = str(g).strip().rstrip('.').lower()
        if g and g not in STOP: out.append(g)
    return out

def flags_raw(r):
    blob = ' '.join([str(x).lower() for x in (r.get('genres') or [])] +
                    [str(p).lower() for s in (r.get('subjects') or []) for p in (s if isinstance(s, list) else [s])])
    f = 0
    if 'suomenkielinen kirjallisuus' in blob or 'kotimainen kaunokirjallisuus' in blob: f |= 1
    if 'käännökset' in blob: f |= 2
    if 'nuortenkirjallisuus' in blob or 'nuoret aikuiset' in blob: f |= 8
    if 'äänikirjat' in blob or 'audiobook' in blob: f |= 4
    if 'lastenkirjallisuus' in blob or 'lapset (ikäryhmät)' in blob: f |= 16
    return f

def is_celia(r):
    blob = ' '.join([str(x).lower() for x in (r.get('genres') or [])] +
                    [str(p).lower() for x in (r.get('subjects') or []) for p in (x if isinstance(x, list) else [x])])
    pub = ' '.join(str(x).lower() for x in (r.get('publishers') or []))
    return ('lukemisest' in blob or 'celia' in blob or 'daisy' in blob or r['id'].startswith('celia')
            or 'celia' in pub or 'näkövammaisten' in pub or 'näkövammais' in pub)
before = len(books)
books = [r for r in books if not is_celia(r) and 'fin' in (r.get('languages') or ['fin'])]
print('celia removed', before - len(books))

works = {}
for r in books:
    t = title_of(r); a, last = author_of(r)
    if not t: continue
    key = norm(t) + '|' + norm(last)
    y = year_of(r)
    w = works.get(key)
    if not w:
        w = works[key] = {'t': t, 'a': a, 'y': y or 9999, 'p': '', 'py': 0, 'terms': collections.Counter(), 'f': 0, 'n': 0, 's': '', 'id': ''}
    w['n'] += 1
    if y and y < w['y']: w['y'] = y; w['t'] = t
    pubs = r.get('publishers') or []
    if y >= w['py'] or not w['id']: w['id'] = r['id']
    if pubs and y >= w['py']: w['p'] = re.sub(r'[\[\]]', '', str(pubs[0])).strip(' ,:;'); w['py'] = y
    for term in terms_of(r): w['terms'][term] += 1
    w['f'] |= flags_raw(r)
    for s0 in (r.get('series') or []):
        if not isinstance(s0, dict): continue
        nm = re.sub(r'\s+', ' ', str(s0.get('name') or '')).strip(' .;:,')
        nm = re.sub(r'^[A-ZÅÄÖ][\w-]+, [\w .-]+?(, \d{4}-(\d{4})?)?[.]?\s+(?=[A-ZÅÄÖ])', '', nm)
        nm = re.sub(r'\s*\.\.\.\s*osa$', '', nm, flags=re.I).strip()
        if re.search(r'kirjastopalvelu|äänikirja|pokkari|kirjasto\b|lasten- ja|nuorten|kirjat$|sarja \d|^\W', nm, re.I): continue
        num = re.search(r'\d+', str(s0.get('additional') or ''))
        if nm: w.setdefault('ser', collections.Counter())[(nm, int(num.group()) if num else 0)] += 1

# Aikakausitiedot erillisestä hausta
try:
    eras = json.load(open('raw_era.json', encoding='utf-8'))
except Exception:
    eras = {}
for era, recs in eras.items():
    for r in recs:
        t = title_of(r); a, last = author_of(r)
        w = works.get(norm(t) + '|' + norm(last))
        if w: w['terms'][era] += 3
# Kirjasarjat: kustantajien julkaisusarjoissa on monta kirjailijaa, kirjasarjassa yleensä yksi
ser_auth = collections.defaultdict(set)
for w in works.values():
    for (nm, num) in w.get('ser', {}):
        ser_auth[norm(nm)].add(norm(w['a']))
for w in works.values():
    best = None
    for (nm, num), c in w.get('ser', {}).items():
        if len(ser_auth[norm(nm)]) > 2 or norm(nm) == norm(w['t']) or not re.search(r'[a-zåäö]', nm): continue
        if num > 60: continue
        rank_ = (num > 0, '-sarja' in nm.lower() or 'sarja' in nm.lower(), c)
        if best is None or rank_ > best[0]: best = (rank_, nm, num)
    w['s'] = (best[1] + ('|' + str(best[2]) if best[2] else '')) if best else ''
def ak(a):
    p = norm(a).split()
    return (p[-1] + ' ' + p[0][:1]) if p else ''
dom_auth = collections.Counter(); tr_auth = collections.Counter()
for w in works.values():
    if w['a']:
        if w['f'] & 1: dom_auth[ak(w['a'])] += 1
        if w['f'] & 2: tr_auth[ak(w['a'])] += 1
for w in works.values():
    if w['f'] & 3 or not w['a']: continue
    d, t = dom_auth[ak(w['a'])], tr_auth[ak(w['a'])]
    if d > t: w['f'] |= 1
    elif t > d: w['f'] |= 2
for w in works.values():
    if (w['f'] & 3) == 3 and w['a']:
        # Ristiriitaiset merkinnät: kirjailijan valtaenemmistö ratkaisee
        if tr_auth[ak(w['a'])] > 1.5 * dom_auth[ak(w['a'])]: w['f'] &= ~1
        elif dom_auth[ak(w['a'])] > 1.5 * tr_auth[ak(w['a'])]: w['f'] &= ~2

audio_keys = set()
for r in audio:
    t = title_of(r); a, last = author_of(r)
    if t: audio_keys.add(norm(t) + '|' + norm(last))
for k, w in works.items():
    if k in audio_keys: w['f'] |= 4

# Sanasto: termit, joita esiintyy vähintään kolmessa teoksessa
df = collections.Counter()
for w in works.values():
    for term in w['terms']: df[term] += 1
vocab = [t for t, c in df.most_common() if c >= 3]
vidx = {t: i for i, t in enumerate(vocab)}
pubc = collections.Counter(w['p'] for w in works.values() if w['p'])
pubs = [p for p, _ in pubc.most_common()]
pidx = {p: i for i, p in enumerate(pubs)}

rows = []
for w in works.values():
    ids = [vidx[t] for t, _ in w['terms'].most_common() if t in vidx][:24]
    if not ids and w['n'] < 2: continue
    y = 0 if w['y'] == 9999 else w['y']
    rows.append([w['t'], w['a'], y, pidx.get(w['p'], -1), ids, w['f'], w['n'], w['s'][:80], w['id']])
rows.sort(key=lambda r: -r[6])
out = {'v': vocab, 'p': pubs, 'b': rows, 'src': 'Finna.fi (Kansalliskirjasto), metatiedot CC0'}
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open('books.json', 'w', encoding='utf-8').write(s)
fl = collections.Counter()
for r in rows:
    for b, n in [(1, 'kotimainen'), (2, 'käännös'), (4, 'äänikirja'), (8, 'nuoret'), (16, 'lapset')]:
        if r[5] & b: fl[n] += 1
print('raw', len(books), 'audio raw', len(audio), 'works', len(rows), 'vocab', len(vocab), 'pubs', len(pubs), 'MB', round(len(s.encode()) / 1e6, 2))
print(dict(fl))
pass

# Viimeistely: kokoomateokset pois ja rikkinäiset merkit korjaten
COLL = re.compile(r'(kootut|valitut)\s+(teokset|romaanit|kertomukset|novellit)|^\d+\s+\w+(a|ä|ia|iä)$|^yhteisnide', re.I)
d = json.load(open('books.json', encoding='utf-8'))
before = len(d['b'])
comic = {i for i, t in enumerate(d['v']) if t in ('sarjakuvat', 'sarjakuvaromaanit', 'graafiset romaanit', 'mangat', 'manga', 'serier', 'tecknade serier')}
d['b'] = [b for b in d['b'] if not COLL.search(b[0]) and not any(i in comic for i in b[4])]
for b in d['b']:
    for k in (0, 1, 7):
        if isinstance(b[k], str) and '�' in b[k]:
            b[k] = b[k].replace('yhdist�am�at', 'yhdistämät').replace('�', '')
open('books.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
print('collections removed', before - len(d['b']), 'final', len(d['b']))

# Suomenruotsalaiset kirjailijat lasketaan kotimaisiksi (lippu 32)
FS_TERMS = {'suomenruotsalainen kirjallisuus', 'finlandssvensk litteratur', 'kaunokirjallisuus suomenruotsalainen kirjallisuus käännökset'}
FS_AUTHORS = {'Tove Jansson', 'Kjell Westö', 'Monika Fagerholm', 'Ulla-Lena Lundberg', 'Bo Carpelan', 'Christer Kihlman',
  'Henrik Tikkanen', 'Märta Tikkanen', 'Jörn Donner', 'Lars Sund', 'Johanna Holmström', 'Philip Teir', 'Malin Kivelä',
  'Sally Salminen', 'Hagar Olsson', 'Tito Colliander', 'Solveig von Schoultz', 'Peter Sandström', 'Kaj Korkea-aho',
  'Zacharias Topelius', 'Sakari Topelius', 'Johan Ludvig Runeberg', 'Anna Bondestam', 'Walentin Chorell', 'Henrika Ringbom',
  'Hannele Mikaela Taivassalo', 'Runar Schildt', 'Jarl Hemmer', 'Mikael Lybeck', 'Arvid Mörne', 'Karl August Tavaststjerna'}
d = json.load(open('books.json', encoding='utf-8'))
fsid = {i for i, t in enumerate(d['v']) if t in FS_TERMS}
NOT_FS = {'astrid lindgren', 'lindgren astrid'}
fs_auth = {a for a in (set(FS_AUTHORS) | {b[1] for b in d['b'] if b[1] and any(i in fsid for i in b[4])}) if ' '.join(a.lower().split()) not in NOT_FS}
n = 0
for b in d['b']:
    if b[1] in fs_auth:
        b[5] = (b[5] | 32 | 1) & ~2; n += 1
open('books.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
print('suomenruotsalaisia teoksia', n, 'kirjailijoita', len(fs_auth))
