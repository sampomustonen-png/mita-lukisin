import json, re, unicodedata, statistics, collections

def norm(s):
    s = unicodedata.normalize('NFKC', s or '').lower()
    s = re.sub(r'[\[\]()"“”«»]', '', s)
    s = re.sub(r'\s*[:/;].*$', '', s)
    s = re.sub(r'[^0-9a-zåäöüéè ]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def last_of(r):
    for a in r.get('nonPresenterAuthors') or []:
        n = (a.get('name') or '').strip().rstrip(',.')
        if n: return n.split(',')[0].strip() if ',' in n else n.split()[-1]
    return ''

def title_of(r):
    return re.sub(r'\s*[/:;=]\s*$', '', (r.get('shortTitle') or r.get('title') or '').strip()).strip()

def key(t, last): return norm(t) + '|' + norm(last)

STOP = {'suomenkielinen kirjallisuus', 'romaanit', 'kaunokirjallisuus', 'käännökset', 'suomen kieli', 'finska', 'finsk litteratur',
        'romaner', 'översättningar', 'skönlitteratur', 'äänikirjat', 'lukemisesteisten äänikirjat', 'e-kirjat', 'e-äänikirjat',
        'kotimainen kaunokirjallisuus', 'fiktio', 'romaani', 'ljudböcker', 'e-böcker', 'daisy-kirjat'}

d = json.load(open('books.json', encoding='utf-8'))
V, B = d['v'], d['b']
vidx = {t: i for i, t in enumerate(V)}
bykey = {key(b[0], (b[1].split() or [''])[-1]): b for b in B}

# Sivumäärät: mediaani painoksista
pages = collections.defaultdict(list)
try:
    for r in json.load(open('raw_pages.json', encoding='utf-8')):
        for pd in r.get('physicalDescriptions') or []:
            m = re.search(r'(\d{2,4})\s*(sivua|s\.|sivu)', str(pd))
            if m and 30 <= int(m.group(1)) <= 2500:
                pages[key(title_of(r), last_of(r))].append(int(m.group(1)))
except FileNotFoundError:
    pass
np_ = 0
for k, b in bykey.items():
    while len(b) < 10: b.append(0)
    if pages.get(k): b[9] = int(statistics.median(pages[k])); np_ += 1

# Lisäasiasanat niukasti luetteloiduille
ne = 0; added = 0
try:
    for t, a, recs in json.load(open('raw_enrich.json', encoding='utf-8')):
        b = bykey.get(key(t, (a.split() or [''])[-1]))
        if not b: continue
        have = set(b[4]); new = collections.Counter()
        for r in recs:
            if norm(title_of(r)) != norm(t) or norm(last_of(r)) != norm((a.split() or [''])[-1]): continue
            for subj in (r.get('subjects') or []):
                for p in (subj if isinstance(subj, list) else [subj]):
                    p = re.sub(r'\s+', ' ', str(p)).strip().rstrip('.').lower()
                    if p and p not in STOP and len(p) < 60 and not re.match(r'^\d', p): new[p] += 1
            for g in (r.get('genres') or []):
                g = str(g).strip().rstrip('.').lower()
                if g and g not in STOP and 'äänikir' not in g: new[g] += 1
        ids = []
        for term, _ in new.most_common():
            if term not in vidx: vidx[term] = len(V); V.append(term)
            if vidx[term] not in have: ids.append(vidx[term])
        if ids:
            b[4] = (b[4] + ids)[:24]; ne += 1; added += len(ids)
except FileNotFoundError:
    pass
for b in B:
    while len(b) < 10: b.append(0)
open('books.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
nt = [len(b[4]) for b in B]
print('sivumäärä', np_, '/', len(B), '; täydennetty', ne, 'kirjaa', added, 'asiasanaa; alle 3 asiasanaa nyt', sum(n < 3 for n in nt))
