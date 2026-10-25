"""Käsittelee tietokirjat (raw_nf.json) sovelluksen muotoon: nonfiction.json.

Rajaukset: oppikirjat, hakuteokset, käsikirjat ja ammattioppaat, tutkimusraportit, väitöskirjat ja muut
akateemiset julkaisut jätetään pois. Painokset ja muodot yhdistetään teokseksi.
Rivi on samaa muotoa kuin romaaneilla (katso src/app1.js) ja sen lisäksi sarake 11 = alaotsikko.
Jokaiselle teokselle lisätään aiheluokka (@historia, @tiede …), johon sovelluksen aihekysymys vertaa."""
import json, re, collections, unicodedata

recs = json.load(open('raw_nf.json', encoding='utf-8'))


def norm(s):
    s = unicodedata.normalize('NFKC', s or '').lower()
    s = re.sub(r'[\[\]()"“”«»]', '', s)
    s = re.sub(r'\s*[:/;].*$', '', s)
    s = re.sub(r'[^0-9a-zåäöüéè ]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def low(x): return re.sub(r'\s+', ' ', str(x)).strip().rstrip('.').lower()


def subjects(r):
    out = []
    for s in r.get('subjects') or []:
        for p in (s if isinstance(s, list) else [s]):
            p = low(p)
            if p: out.append(p)
    return out


def genres(r): return [low(g) for g in (r.get('genres') or []) if low(g)]


def ykl(r):
    c = r.get('classifications') or {}
    return [str(x).strip() for x in (c.get('ykl') or [])] if isinstance(c, dict) else []


# ---------- Rajaukset ----------
EXCL_GENRE = re.compile(r'^(hakuteokset|sanakirjat|tietosanakirjat|vuosikirjat|toimintakertomukset|väitöskirjat|opinnäytteet|'
                        r'raportit|tutkimusraportit|kartastot|tilastot|bibliografiat|luettelot|näyttelyjulkaisut|standardit|säädökset|'
                        r'lait|käsikirjat|harjoituskirjat|tehtäväkirjat|oppikirjat|oppimateriaalit|ylioppilastutkinto|kalenterit|'
                        r'kokousjulkaisut|konferenssijulkaisut|seminaarijulkaisut|matrikkelit|nuotit|laulukirjat|kuvakirjat|sarjakuvat|'
                        r'runot|näytelmät|novellit|romaanit|kertomukset|sadut|lastenkirjallisuus|nuortenkirjallisuus|selkokirjat|'
                        r'kaunokirjallisuus|lukemisesteisten äänikirjat|aikataulut|hinnastot|ohjelmat|tutkimukset|pro gradu -tutkielmat|'
                        r'lisensiaatintutkimukset|artikkelikokoelmat \(tieteelliset\)|tieteelliset julkaisut|läroböcker|ordböcker|uppslagsverk)$')
EXCL_SUBJ = re.compile(r'^(käsikirjat|oppikirjat|oppimateriaali|opetusmateriaali|pääsykokeet|ylioppilastutkinto|tentit|standardit|'
                       r'tietokoneohjelmat|sovellusohjelmat|ohjelmistot|ohjelmointi|ohjelmointikielet|excel|microsoft excel|word|'
                       r'microsoft word|windows|microsoft windows|photoshop|adobe photoshop|mac os|linux|sql|python|java|javascript|'
                       r'html|autocad|powerpoint|microsoft powerpoint|office|microsoft office|tilastot|lainsäädäntö|lait|asetukset|'
                       r'tilinpäätös|kirjanpito|verotus|arvonlisävero|tuloverotus|työoikeus|sopimusoikeus|hankintalaki|kaavoitus|ylioppilastehtävät|lukio|'
                       r'taulukkolaskenta|valtiopäiväasiakirjat|kaupunginvaltuustot|kunnalliskalenterit|päätökset|pöytäkirjat|'
                       r'opetussuunnitelmat|didaktiikka|opetusmenetelmät|luettelointi|kirjastotyö|yleiskaavoitus|asemakaavat)$')
EXCL_PUB = re.compile(r'yliopisto|university|korkeakoulu|ministeriö|tilastokeskus|valtioneuvosto|eduskunta|tutkimuslaitos|'
                      r'tutkimuskeskus|\bvtt\b|terveyden ja hyvinvoinnin laitos|\bthl\b|stakes|kansaneläkelaitos|\bkela\b|'
                      r'opetushallitus|työterveyslaitos|luonnonvarakeskus|ilmatieteen laitos|ympäristökeskus|\bsitra\b|\betla\b|'
                      r'akatemia|academy|oppimateriaal|sanoma pro|edita prima|otava oppimisen|talentum|alma talent|'
                      r'kauppakamari|lakimiesliiton|tietosanoma|docendo|edita publishing|celia|näkövammais', re.I)
EXCL_SERIES = re.compile(r'tutkimuksia|tutkimus\b|raportteja|raportti|julkaisuja|julkaisu\b|julkaisusarja|selvityksiä|selvitys|'
                         r'working paper|report|acta |studia|monografi|tiedonantoja|keskustelualoit|tilastoja|katsauksia|'
                         r'oppimateriaal|opetusmonist|toimituksia|bibliotheca|annales|series|tutkielmia|väitöskir|'
                         r'oppikirja|kurssikirja|ylioppilas|käsikirja', re.I)
EXCL_TITLE = re.compile(r'^(vuosikirja|toimintakertomus|tilinpäätös|kalenteri|opas opettajalle|opettajan opas|harjoituskirja|'
                        r'tehtäväkirja|ratkaisut|pääsykoe)|\b(sanakirja|tietosanakirja|käsikirja|vuosikertomus|matrikkeli)\b', re.I)


def excluded(r):
    g = genres(r)
    if any(EXCL_GENRE.match(x) for x in g): return 'laji'
    if any(EXCL_SUBJ.match(x) for x in subjects(r)): return 'aihe'
    if any(EXCL_PUB.search(str(p)) for p in (r.get('publishers') or [])): return 'julkaisija'
    for s in r.get('series') or []:
        nm = s.get('name') if isinstance(s, dict) else s
        if nm and EXCL_SERIES.search(str(nm)): return 'sarja'
    t = r.get('title') or ''
    if EXCL_TITLE.search(t): return 'nimi'
    y = ykl(r)
    # YKL: bibliografiat (01), kirjastoala (02), runot (82), näytelmät (83), kaunokirjallisuus (84–85), kieltenopiskelu (89)
    if y and re.match(r'^(01|02|82|83|84|85|89)', y[0]): return 'luokka'
    if any('2/Book/AudioBook/Daisy/' in f for f in r.get('fm') or []): return 'celia'
    return ''


# ---------- Aiheluokat ----------
def any_re(words): return re.compile(r'^(' + '|'.join(words) + r')$')


TRAVEL = re.compile(r'^(matkailu|matkat|matkakertomukset.*|matkaoppaat|matkailijat|nähtävyydet|retkeily|retkeilyreitit|vaellus|purjehdus|'
                    r'maailmanympärimatkat|tutkimusmatkat|automatkailu|reissut)$')
SUBJ_CAT = [
    ('elamakerrat', any_re(['muistelmat', 'elämäkerrat', 'omaelämäkerrat', 'henkilöhistoria', 'elämäntarinat', 'henkilökuvat', 'päiväkirjat'])),
    ('sota', any_re(['sota', 'sodat', 'sotahistoria', 'talvisota', 'jatkosota', 'lapin sota', 'toinen maailmansota', 'ensimmäinen maailmansota',
                     'suomen sisällissota', 'sisällissodat', 'sotilaat', 'rintamamiehet', 'sotavanki.*', 'sotilashistoria', 'sotatapahtumat',
                     'sotilaslentäjät', 'puolustusvoimat', 'armeija', 'asevoimat', 'sotarikokset', 'holokausti'])),
    ('historia', any_re(['historia', 'kulttuurihistoria', 'maailmanhistoria', 'suomen historia', 'paikallishistoria', 'sosiaalihistoria',
                         'arkeologia', 'esihistoria', 'keskiaika', 'antiikki'])),
    ('rikos', re.compile(r'^(rikos(?!oikeus$|prosessi$)|rikoll|murha|murhaaj|sarjamurh|salamurh|poliittinen murha|lapsenmurh|henkirikok|'
                         r'keskusrikospoliisi|talousrikok|huumerikok|huumekauppa|järjestäytynyt rikollisuus|oikeudenkäynnit|vankilat|vangit|'
                         r'poliisit|poliisi|rikostutkinta|true crime|tosirikos|petokset|huijarit|jengit|mafia|oikeusmurha|katoamiset)')),
    ('urheilu', any_re(['urheilu', 'urheilijat', 'liikunta', 'jalkapallo', 'jääkiekko', 'hiihto', 'juoksu', 'kuntoilu', 'olympialaiset',
                        'yleisurheilu', 'formula 1', 'moottoriurheilu', 'golf', 'tennis', 'pyöräily', 'kuntosaliharjoittelu', 'jooga',
                        'valmennus', 'pesäpallo', 'koripallo', 'nyrkkeily', 'kamppailulajit', 'retkeily', 'vaellus', 'kalastus', 'metsästys'])),
    ('ruoka', any_re(['ruoanvalmistus', 'ruokaohjeet', 'keittokirjat', 'leivonta', 'ruokakulttuuri', 'ruoka', 'ruoat', 'viinit', 'olut',
                      'kahvi', 'juomat', 'cocktailit', 'kasvisruoka', 'vegaaninen ruoka', 'jälkiruoat', 'grillaus', 'säilöntä'])),
    ('koti', any_re(['puutarhanhoito', 'puutarhat', 'puutarhakasvit', 'käsityöt', 'neulonta', 'virkkaus', 'ompelu', 'sisustus',
                     'sisustaminen', 'remontointi', 'korjausrakentaminen', 'kodinhoito', 'siivous', 'askartelu', 'huonekalut',
                     'mökit', 'kesämökit', 'rakentaminen', 'pientalot', 'kotieläimet', 'koirat', 'kissat', 'hevoset', 'kotipuutarhat',
                     'viherkasvit', 'kukat', 'hyötykasvit'])),
    ('perhe', any_re(['lapset', 'kasvatus', 'vanhemmuus', 'raskaus', 'synnytys', 'vauvat', 'perheet', 'isyys', 'äitiys', 'isät', 'äidit',
                      'lastenkasvatus', 'murrosikä', 'nuoret', 'perhe-elämä', 'imetys', 'uusperheet', 'adoptio', 'vanhemmat'])),
    ('terveys', any_re(['terveys', 'hyvinvointi', 'ravitsemus', 'laihdutus', 'painonhallinta', 'uni', 'stressi', 'sairaudet', 'syöpätaudit',
                        'mielenterveys', 'masennus', 'ahdistus', 'terveydenhoito', 'lääketiede', 'lääkkeet', 'ruokavaliot', 'vanheneminen',
                        'aivot', 'muisti', 'muistisairaudet', 'liikunta', 'mindfulness', 'meditaatio', 'työuupumus', 'burnout'])),
    ('psykologia', any_re(['psykologia', 'ihmissuhteet', 'parisuhde', 'tunteet', 'itsetuntemus', 'itsetunto', 'onnellisuus', 'persoonallisuus',
                           'vuorovaikutus', 'sosiaalipsykologia', 'kehityspsykologia', 'rakkaus', 'seksuaalisuus', 'ystävyys',
                           'elämänhallinta', 'henkinen kasvu', 'motivaatio', 'tunneäly', 'empatia', 'yksinäisyys', 'kriisit', 'suru'])),
    ('filosofia', any_re(['filosofia', 'etiikka', 'moraali', 'uskonnot', 'uskonto', 'kristinusko', 'raamattu', 'teologia', 'hengellisyys',
                          'islam', 'buddhalaisuus', 'juutalaisuus', 'kirkko', 'kirkkohistoria', 'usko', 'jumala', 'mystiikka',
                          'esoteria', 'elämänkatsomus', 'ateismi', 'henkisyys'])),
    ('kulttuuri', any_re(['taide', 'kuvataide', 'taiteilijat', 'maalaustaide', 'arkkitehtuuri', 'muotoilu', 'valokuvaus', 'musiikki',
                          'muusikot', 'rock', 'rockmusiikki', 'populaarimusiikki', 'jazz', 'klassinen musiikki', 'säveltäjät', 'laulajat',
                          'elokuvat', 'elokuvataide', 'teatteri', 'tanssi', 'muoti', 'design', 'kulttuuri', 'populaarikulttuuri',
                          'televisio', 'ooppera', 'näyttelijät', 'sarjakuvataide', 'pelit', 'videopelit'])),
    ('kirjallisuus', any_re(['kirjallisuus', 'kirjailijat', 'kirjallisuushistoria', 'kirjallisuudentutkimus', 'kirjoittaminen', 'luova kirjoittaminen',
                             'kielet', 'suomen kieli', 'kielitiede', 'sanat', 'murteet', 'kääntäminen', 'lukeminen', 'kirjat', 'runous',
                             'kustannustoiminta', 'sanonnat', 'nimet'])),
    ('matkat', TRAVEL),
    ('talous', any_re(['talous', 'kansantalous', 'taloushistoria', 'yritykset', 'yrittäjyys', 'yrittäjät', 'johtaminen', 'esimiestyö', 'työelämä',
                       'työ', 'sijoittaminen', 'osakkeet', 'raha', 'henkilökohtainen talous', 'markkinointi', 'myynti', 'liiketoiminta',
                       'teknologiayritykset', 'pankit', 'globalisaatio', 'kapitalismi', 'urakehitys', 'työhyvinvointi', 'organisaatiot'])),
    ('yhteiskunta', any_re(['politiikka', 'poliitikot', 'yhteiskunta', 'demokratia', 'ihmisoikeudet', 'tasa-arvo', 'feminismi', 'rasismi',
                            'maahanmuutto', 'pakolaiset', 'köyhyys', 'eriarvoisuus', 'media', 'journalismi', 'sananvapaus', 'ulkopolitiikka',
                            'kansainvälinen politiikka', 'turvallisuuspolitiikka', 'ympäristöpolitiikka', 'ilmastopolitiikka',
                            'sosiaalipolitiikka', 'koulutus', 'kasvatustiede', 'kaupungistuminen', 'yhteiskunnalliset liikkeet',
                            'populismi', 'nationalismi', 'sukupuoli', 'seksuaalivähemmistöt', 'vähemmistöt', 'saamelaiset', 'romanit'])),
    ('luonto', any_re(['luonto', 'eläimet', 'linnut', 'kasvit', 'metsät', 'luonnonsuojelu', 'ympäristönsuojelu', 'luontokokemukset',
                       'luonnonhistoria', 'kalat', 'hyönteiset', 'nisäkkäät', 'petoeläimet', 'sienet', 'luontoretkeily', 'vesistöt',
                       'meret', 'itämeri', 'suot', 'ilmastonmuutokset', 'ilmastonmuutos', 'biodiversiteetti', 'luonnon monimuotoisuus',
                       'ekologia', 'puut', 'luonnonvarat', 'kansallispuistot'])),
    ('tiede', any_re(['luonnontieteet', 'fysiikka', 'kemia', 'matematiikka', 'tähtitiede', 'avaruus', 'maailmankaikkeus', 'kosmologia',
                      'biologia', 'evoluutio', 'genetiikka', 'perinnöllisyys', 'neurotieteet', 'tekniikka', 'teknologia', 'tekoäly',
                      'tietotekniikka', 'internet', 'digitalisaatio', 'robotit', 'keksinnöt', 'tieteenhistoria',
                      'avaruustutkimus', 'energia', 'ydinvoima', 'geologia', 'ilmasto', 'meteorologia', 'tieteelliset löydöt',
                      'mikrobit', 'bakteerit', 'virukset', 'antropologia', 'kvanttimekaniikka', 'suhteellisuusteoria', 'galaksit',
                      'tähdet', 'planeetat', 'aivotutkimus', 'lääketieteen historia', 'keksijät'])),
]
# YKL-pääluokat täydentävät, kun asiasanat eivät riitä
YKL_CAT = [
    (r'^99', 'elamakerrat'), (r'^39', 'sota'), (r'^9', 'historia'), (r'^07', 'yhteiskunta'), (r'^0[0346]', 'kulttuuri'),
    (r'^(1[0-3]|15|16|2)', 'filosofia'), (r'^(14|17)', 'psykologia'), (r'^(3[0-5]|37|38)', 'yhteiskunta'), (r'^36', 'talous'),
    (r'^4[0-8]', 'matkat'), (r'^49', 'kulttuuri'), (r'^(50|56|57|58)', 'luonto'), (r'^5[1-5]', 'tiede'), (r'^59', 'terveys'),
    (r'^6[0-2]', 'tiede'), (r'^(63|64|69)', 'talous'), (r'^6[5-8]', 'koti'), (r'^79', 'urheilu'),
    (r'^7', 'kulttuuri'), (r'^(80|81|86|87|88)', 'kirjallisuus'),
]
STYLE = [
    ('muistelmat', any_re(['muistelmat', 'omaelämäkerrat', 'päiväkirjat', 'kirjeet', 'kokemukset', 'kokemuskertomukset'])),
    ('esseet', any_re(['esseet', 'esseekokoelmat', 'pakinat', 'kolumnit', 'aforismit'])),
    ('reportaasi', any_re(['reportaasit', 'tutkiva journalismi', 'haastattelut', 'dokumentit'])),
    ('opas', any_re(['oppaat', 'oppaat \\(teokset\\)', 'ruokaohjeet', 'keittokirjat', 'käsityöohjeet', 'ohjeet', 'harjoitukset', 'vinkit'])),
    ('kuvateos', any_re(['kuvateokset', 'valokuvateokset', 'valokuvat'])),
]


def categories(subj, gen, codes):
    """Pisteet aiheluokille: kirjaston pääluokka (YKL) painaa eniten, asiasanat täydentävät."""
    terms = subj + gen
    sc = collections.Counter()
    for name, rx in SUBJ_CAT:
        n = sum(1 for t in terms if rx.match(t))
        if n: sc[name] += n
    travel = any(TRAVEL.match(t) for t in terms)
    for i, c in enumerate(codes[:2]):
        for rx, name in YKL_CAT:
            if re.match(rx, c):
                if name != 'matkat' or travel: sc[name] += 3 if i == 0 else 1
                break
    return sc


STOP = {'suomenkielinen kirjallisuus', 'käännökset', 'kirjat', 'tietokirjallisuus', 'e-kirjat', 'äänikirjat', 'finska', 'översättningar',
        'svenska', 'engelska', 'suomi', 'finland'}

# ---------- Teokset ----------
def author_of(r):
    roles_tr = False
    first = None
    for a in r.get('nonPresenterAuthors') or []:
        role = low(a.get('role') or '')
        if 'kääntäjä' in role: roles_tr = True
        n = (a.get('name') or '').strip().rstrip(',.')
        if not n or first: continue
        if role and not re.search(r'kirjoittaja|tekijä|^$|toimittaja|kuvaaja|haastateltava', role): continue
        if ',' in n:
            last, f = [x.strip() for x in n.split(',', 1)]
            first = ((f + ' ' + last).strip(), last)
        else:
            first = (n, n.split()[-1])
    a, last = first or ('', '')
    return a, last, roles_tr


reasons = collections.Counter()
works = {}
for r in recs:
    why = excluded(r)
    if why:
        reasons[why] += 1
        continue
    full = re.sub(r'\s*[/:;=]\s*$', '', (r.get('title') or r.get('shortTitle') or '')).strip()
    # Nimi on alaotsikkoa edeltävä osa (myös osanumero, esim. "Samasta padasta. 2, Puolessa tunnissa")
    parts = re.split(r'\s+:\s+', full, maxsplit=1)
    t = parts[0].strip(' .;/=')
    sub = parts[1].strip(' .;/=') if len(parts) > 1 else ''
    if not t: continue
    a, last, tr = author_of(r)
    key = norm(t) + '|' + norm(last)
    m = re.search(r'(1[5-9]\d\d|20\d\d)', str(r.get('year') or ''))
    y = int(m.group(1)) if m else 0
    w = works.get(key)
    if not w:
        w = works[key] = {'t': t, 'sub': sub, 'a': a, 'y': y or 9999, 'p': '', 'py': -1, 'terms': collections.Counter(),
                          'cats': collections.Counter(), 'f': 0, 'n': 0, 'id': '', 'pg': 0, 'pgy': -1, 'ser': ''}
    fm = r.get('fm') or []
    audio = any('AudioBook' in f for f in fm)
    w['n'] += r.get('nb') or 0
    if y and y < w['y']: w['y'] = y
    if sub and len(sub) > len(w['sub']) and len(sub) < 120: w['sub'] = sub
    if not audio and (y >= w['py'] or not w['id']): w['id'] = r['id']
    pubs = r.get('publishers') or []
    if pubs and y >= w['py']:
        w['p'] = re.sub(r'[\[\]]', '', str(pubs[0])).strip(' ,:;'); w['py'] = y
    if not audio:
        for d in r.get('physicalDescriptions') or []:
            mm = re.search(r'(\d{2,4})\s*(s\.|sivua)', str(d))
            if mm and y >= w['pgy'] and 30 <= int(mm.group(1)) <= 2500: w['pg'] = int(mm.group(1)); w['pgy'] = y
    subj, gen, codes = subjects(r), genres(r), ykl(r)
    for term in subj + gen:
        if term not in STOP and len(term) < 60 and not re.match(r'^\d', term): w['terms'][term] += 1
    w['cats'].update(categories(subj, gen, codes))
    for name, rx in STYLE:
        if any(rx.match(x) for x in subj + gen): w['terms']['@' + name] += 1
    w['f'] |= (2 if tr or 'käännökset' in gen else 0) | (4 if audio else 0)
    if not w['ser']:
        for s0 in r.get('series') or []:
            if not isinstance(s0, dict): continue
            nm = re.sub(r'\s+', ' ', str(s0.get('name') or '')).strip(' .;:,')
            num = re.search(r'\d+', str(s0.get('additional') or ''))
            if nm and num and int(num.group()) <= 40 and not re.search(r'sarja|kirjasto', nm, re.I):
                w['ser'] = nm[:70] + '|' + num.group()
                break

print('rajattiin pois', dict(reasons))
for w in works.values():
    if not w['f'] & 2: w['f'] |= 1
    mx = max(w['cats'].values()) if w['cats'] else 0
    for c, n in w['cats'].most_common(3):
        if n >= max(1, mx * 0.4): w['terms']['@' + c] += 5

df = collections.Counter()
for w in works.values():
    for term in w['terms']: df[term] += 1
vocab = [t for t, c in df.most_common() if c >= 3 or t.startswith('@')]
vidx = {t: i for i, t in enumerate(vocab)}
pubc = collections.Counter(w['p'] for w in works.values() if w['p'])
pubs = [p for p, _ in pubc.most_common()]
pidx = {p: i for i, p in enumerate(pubs)}
F_NF = 128
rows = []
for w in works.values():
    ids = [vidx[t] for t, _ in sorted(w['terms'].items(), key=lambda kv: (not kv[0].startswith('@'), -kv[1])) if t in vidx][:22]
    if not any(vocab[i].startswith('@') and vocab[i][1:] in dict(SUBJ_CAT) for i in ids):
        continue  # ei tunnistettavaa aihetta: yleensä hallinnollinen tai muu harvinainen julkaisu
    y = 0 if w['y'] == 9999 else w['y']
    rows.append([w['t'], w['a'], y, pidx.get(w['p'], -1), ids, w['f'] | F_NF, w['n'], w['ser'], w['id'], w['pg'], 0, w['sub']])
rows.sort(key=lambda r: -r[6])
out = {'v': vocab, 'p': pubs, 'b': rows, 'src': 'Finna.fi (Kansalliskirjasto), Helmet-kirjastojen kokoelma, metatiedot CC0'}
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open('nonfiction.json', 'w', encoding='utf-8').write(s)
cc = collections.Counter(vocab[i] for r in rows for i in r[4] if vocab[i].startswith('@'))
print('tietueita', len(recs), 'teoksia', len(rows), 'sanasto', len(vocab), 'MB', round(len(s.encode()) / 1e6, 2))
print(dict(cc.most_common()))
