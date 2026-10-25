"""Mitä lukisin – selaintestit.

Ajo:  python build.py && pytest tests/
Testit käynnistävät paikallisen palvelimen dist-kansioon ja käyttävät sovellusta oikeassa selaimessa (Playwright).
Uutuuksien haku Finnasta on estetty testeissä, jotta tulokset eivät riipu verkosta."""
import functools, http.server, json, pathlib, threading
import pytest
from playwright.sync_api import sync_playwright, expect

DIST = pathlib.Path(__file__).resolve().parent.parent / 'dist'


@pytest.fixture(scope='session')
def server():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DIST))
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f'http://127.0.0.1:{httpd.server_port}/index.html'
    httpd.shutdown()


@pytest.fixture(scope='session')
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


@pytest.fixture
def page(browser, server):
    ctx = browser.new_context(locale='fi-FI', viewport={'width': 390, 'height': 844}, accept_downloads=True)
    ctx.route('https://api.finna.fi/**', lambda route: route.abort())
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(server)
    pg.wait_for_selector('#loadCard[hidden]', state='attached', timeout=30000)
    yield pg
    ctx.close()
    assert not errors, errors


def titles(pg, sel='#recList'):
    return [t.split('\n')[0] for t in pg.locator(sel + ' .bk-title').all_inner_texts()]


def test_aineisto_on_kunnossa():
    lines = (DIST / 'books.ndjson').read_text(encoding='utf-8').splitlines()
    d = json.loads(lines[0]); d['b'] = [json.loads(l) for l in lines[1:] if l]
    assert len(d['b']) > 30000, 'aineistossa liian vähän kirjoja'
    for b in d['b'][:2000]:
        assert isinstance(b[0], str) and b[0]
        assert all(0 <= i < len(d['v']) for i in b[4])
    assert '�' not in json.dumps(d['b'][:5000], ensure_ascii=False)


def test_lainausdata_mukana():
    lines = (DIST / 'books.ndjson').read_text(encoding='utf-8').splitlines()[1:]
    assert sum(1 for l in lines if l and (json.loads(l) + [0] * 11)[10] > 0) > 300


def test_pikavalinta_antaa_suosituksia(page):
    page.click('#presets button:text-is("Kotimainen dekkari")')
    expect(page.locator('#recList .book').first).to_be_visible()
    assert len(titles(page)) >= 10
    assert 'dekkari' in page.locator('#recList .bk-why').first.inner_text()


def test_liukusaadin_muuttaa_jarjestysta(page):
    page.click('label:has(#q-genre-0)')
    page.click('#recBtn')
    a = titles(page)
    page.click('#moreQ')
    page.fill('#sl-tone', '-2')
    page.dispatch_event('#sl-tone', 'input')
    expect(page.locator('#sl-tone-v')).to_have_text('Selvästi iloinen')
    page.click('#recBtn')
    assert titles(page) != a


def test_haku_loytaa_kirjailijan(page):
    page.click('#tabSearch')
    page.fill('#q', 'waltari')
    expect(page.locator('#sList .bk-meta').first).to_contain_text('Waltari')


def test_kotimaiset_sisaltaa_suomenruotsalaiset(page):
    page.click('#tabSearch')
    page.check('#fDom')
    page.fill('#q', 'westö')
    expect(page.locator('#sList .bk-meta').first).to_contain_text('Westö')


def test_tallennus_vienti_ja_tuonti(page, tmp_path):
    page.click('#presets button:text-is("Palkittu")')
    page.locator('#recList .book').nth(0).locator('.mark[data-m="save"]').click()
    page.click('#tabList')
    expect(page.locator('#myList .book')).to_have_count(1)
    with page.expect_download() as d:
        page.click('#exportBtn')
    f = tmp_path / 'lista.json'
    d.value.save_as(f)
    data = json.loads(f.read_text(encoding='utf-8'))
    assert data['app'] == 'mita-lukisin' and len(data['saved']) == 1
    page.locator('#myList .mark[data-m="save"]').click()     # poista listalta
    expect(page.locator('#myList .book')).to_have_count(0)
    page.set_input_files('#importFile', str(f))
    expect(page.locator('#myList .book')).to_have_count(1)


def test_jakolinkki_avautuu(browser, page):
    page.click('#presets button:text-is("Klassikot")')
    page.click('#shareRecs')
    url = page.input_value('#shareUrl')
    assert '#jaa=r.' in url
    ctx = browser.new_context(locale='fi-FI')
    ctx.route('https://api.finna.fi/**', lambda route: route.abort())
    p2 = ctx.new_page()
    p2.goto(url)
    expect(p2.locator('#sharedBox')).to_be_visible(timeout=30000)
    assert p2.locator('#sharedList .book').count() >= 10
    ctx.close()


def test_kielen_vaihto(page):
    page.click('#langSeg [data-lang="sv"]')
    expect(page.locator('#askSub')).to_have_text('Berätta vad du tycker om.')
    page.click('#langSeg [data-lang="en"]')
    expect(page.locator('#tabSearch')).to_have_text('Search')
    page.click('#langSeg [data-lang="fi"]')
    expect(page.locator('#askSub')).to_have_text('Kerro mistä pidät.')


def test_ei_vaakavieritysta_suurella_tekstilla(page):
    page.click('#tabInfo')
    page.click('#sizeSeg [data-size="1.3"]')
    for tab in ['#tabAsk', '#tabNow', '#tabSearch', '#tabList', '#tabInfo']:
        page.click(tab)
        assert page.evaluate('document.documentElement.scrollWidth') <= 390


def test_nappaimisto_valilehdet(page):
    page.focus('#tabAsk')
    page.keyboard.press('ArrowRight')
    expect(page.locator('#viewNow')).to_be_visible()
    assert page.evaluate('document.activeElement.id') == 'tabNow'


def test_nyt_luetaan_nakyma(page):
    page.click('#tabNow')
    expect(page.locator('#nowList .book').first).to_be_visible(timeout=15000)
    assert page.locator('#nowList .book').count() >= 10
    assert 'Sija 1' in page.locator('#nowList .bk-why').first.inner_text()
    page.click('#nowFormatSeg button:text-is("Äänikirjat")')
    expect(page.locator('#nowFormatSeg [aria-checked="true"]')).to_have_text('Äänikirjat')
    page.click('#nowCats label:has-text("Käännetty")')
    expect(page.locator('#nowList .bk-why').first).to_contain_text('Sija 1')


def test_juuri_nyt_suosittua(page):
    page.wait_for_function('document.querySelector("#tabNow") && true')
    page.wait_for_timeout(500)
    page.click('#presets button:text-is("Juuri nyt suosittua")')
    expect(page.locator('#recList .book').first).to_be_visible()
    assert 'Mitä Suomi lukee' in page.locator('#recList .bk-why').first.inner_text()
    page.select_option('#recSort', 'title')                     # järjestys ei saa kaatua
    expect(page.locator('#recList .book').first).to_be_visible()
    assert page.locator('#recList .badge.msl').count() >= 1


def test_tietokirja_aineisto():
    lines = (DIST / 'nonfiction.ndjson').read_text(encoding='utf-8').splitlines()
    head = json.loads(lines[0]); rows = [json.loads(l) for l in lines[1:] if l]
    assert len(rows) > 40000, 'tietokirjoja liian vähän'
    assert all(r[5] & 128 for r in rows[:2000])
    assert all(0 <= i < len(head['v']) for r in rows[:2000] for i in r[4])
    cats = {t for t in head['v'] if t.startswith('@')}
    assert {'@historia', '@elamakerrat', '@tiede', '@luonto', '@ruoka'} <= cats


def nf_mode(page):
    page.click('#viewAsk .modeseg button[data-mode="nf"]')
    expect(page.locator('#recBtn')).to_be_enabled(timeout=60000)


def test_tietokirjat_suositukset(page):
    nf_mode(page)
    expect(page.locator('#presets button:text-is("Sotahistoria")')).to_be_visible()
    page.click('#presets button:text-is("Sotahistoria")')
    expect(page.locator('#recList .book').first).to_be_visible()
    assert 'tietokirjaa' in page.inner_text('#resultsSub')
    assert 'sotahistoria' in page.locator('#recList .bk-why').first.inner_text()
    page.click('#viewAsk .modeseg button[data-mode="nov"]')
    expect(page.locator('#presets button:text-is("Kotimainen dekkari")')).to_be_visible()
    expect(page.locator('#results')).to_be_hidden()


def test_tietokirjojen_haku_ja_lista(page):
    nf_mode(page)
    page.click('#tabSearch')
    page.fill('#q', 'harari sapiens')
    expect(page.locator('#sList .bk-meta').first).to_contain_text('Harari')
    page.locator('#sList .book').first.locator('.mark[data-m="save"]').click()
    page.click('#viewSearch .modeseg button[data-mode="nov"]')
    expect(page.locator('#hSearch')).to_have_text('Kaikki kaunokirjallisuus')
    page.click('#tabList')
    expect(page.locator('#myList .book')).to_have_count(1)
    expect(page.locator('#myList .bk-meta').first).to_contain_text('Harari')


def test_runot_novellit_ja_naytelmat(page):
    for name in ['Runoja', 'Novelleja', 'Näytelmiä']:
        page.click('#presets button:text-is("%s")' % name)
        expect(page.locator('#recList .book').first).to_be_visible()
        assert len(titles(page)) >= 10, name
