"""Kokoaa sovelluksen lähdetiedostoista.
dist/index.html   – julkinen versio (GitHub Pages), täydellinen HTML-dokumentti
dist/artifact.html – Claude-versio (Claude lisää dokumentin kehyksen itse)
dist/books.ndjson – kaunokirjallisuus (data/books.json)
dist/nonfiction.ndjson – tietokirjat (data/nonfiction.json)"""
import pathlib, shutil
R = pathlib.Path(__file__).parent
src = lambda n: (R / 'src' / n).read_text(encoding='utf-8')
css = src('style.css')
body = src('body.html')
js = "(function(){\n'use strict';\n" + "\n".join(src(n) for n in ['i18n.js', 'questions.js', 'app1.js', 'app2.js', 'app3.js', 'app4.js']) + "\n})();"
title = '<title>Mitä lukisin</title>\n<meta name="description" content="Löydä seuraava luettava kirjasi kymmenien tuhansien suomenkielisten romaanien, novellien, runojen, näytelmien ja tietokirjojen joukosta.">\n'
icon = '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%277%27 fill=%27%230066CC%27/%3E%3Cpath d=%27M7 9c3-1.5 6-1.5 8.5 0v15c-2.5-1.5-5.5-1.5-8.5 0zM16.5 9c2.5-1.5 5.5-1.5 8.5 0v15c-3-1.5-6-1.5-8.5 0z%27 fill=%27white%27/%3E%3C/svg%3E">\n'
inner = '<style>\n' + css + '</style>\n' + body + '\n<script>\n' + js + '\n</script>\n'
(R / 'dist').mkdir(exist_ok=True)
public = ('<!doctype html>\n<html lang="fi">\n<head>\n<meta charset="utf-8">\n'
          '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
          '<meta name="color-scheme" content="light dark">\n' + title + icon +
          '<style>[hidden]{display:none!important}img{max-width:100%}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>\n'
          '</head>\n<body>\n' + inner + '</body>\n</html>\n')
(R / 'dist' / 'index.html').write_text(public, encoding='utf-8')
(R / 'dist' / 'artifact.html').write_text(title + '<meta name="claude:viewport-fit-sides" content="cover">\n' + inner, encoding='utf-8')
# Rivimuotoinen aineisto (ensimmäinen rivi: sanasto ja kustantajat, sitten yksi kirja riviä kohden),
# jotta selain voi lukea sen osissa jumittumatta
import json
d = json.loads((R / 'data' / 'books.json').read_text(encoding='utf-8'))
with open(R / 'dist' / 'books.ndjson', 'w', encoding='utf-8') as f:
    f.write(json.dumps({'v': d['v'], 'p': d['p'], 'src': d.get('src', '')}, ensure_ascii=False, separators=(',', ':')) + '\n')
    for b in d['b']:
        f.write(json.dumps(b, ensure_ascii=False, separators=(',', ':')) + '\n')
# Tietokirjat omaan tiedostoonsa: sovellus lataa ne vasta, kun käyttäjä valitsee tietokirjat
nf = R / 'data' / 'nonfiction.json'
if nf.exists():
    d = json.loads(nf.read_text(encoding='utf-8'))
    with open(R / 'dist' / 'nonfiction.ndjson', 'w', encoding='utf-8') as f:
        f.write(json.dumps({'v': d['v'], 'p': d['p'], 'src': d.get('src', '')}, ensure_ascii=False, separators=(',', ':')) + '\n')
        for b in d['b']:
            f.write(json.dumps(b, ensure_ascii=False, separators=(',', ':')) + '\n')
msl = R / 'data' / 'msl.json'
if msl.exists(): shutil.copy(msl, R / 'dist' / 'msl.json')
old = R / 'dist' / 'books.json'
if old.exists(): old.unlink()
(R / 'dist' / 'app.js').write_text(js, encoding='utf-8')
print('dist ok', len(public))
