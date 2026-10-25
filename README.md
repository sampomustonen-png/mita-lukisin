# Mitä lukisin

Mitä lukisin suosittelee suomenkielistä kaunokirjallisuutta (romaaneja, novelleja, runoja ja näytelmiä) ja tietokirjoja kysymällä, millaisesta kirjallisuudesta pidät. Aineisto perustuu Suomen kirjastojen tietoihin. Sovellus toimii kokonaan selaimessa: se ei tarvitse palvelinta, tiliä eikä evästeitä.

Käyttöliittymä on suomeksi, ruotsiksi ja englanniksi.

## Ominaisuudet

- Kaunokirjallisuus ja tietokirjat omina kokonaisuuksinaan: valinta avaussivun yläosassa
- Pikavalinnat ja kysely: kaunokirjallisuudelle lajityyppi (myös runous, novellit ja näytelmät), kerronta, tunnelma, aikakausi, paikka, teemat ja pituus; tietokirjoille aihe, ote, alue, aikakausi ja pituus
- Tunnelmasäätimet
- Haku kaikista kirjoista, samankaltaisten kirjojen haku ja järjestys eri perusteilla
- Oma lista, joka tallentuu selaimeen ja jonka voi viedä tiedostoon, tuoda tiedostosta tai jakaa linkkinä
- Linkit Storyteliin, BookBeatiin, Helmetiin, Goodreadsiin, Finnaan ja kirjakauppoihin
- Nyt luetaan: Kirjakauppaliiton Mitä Suomi lukee -listat muodoittain ja lajeittain sekä pikavalinta *Juuri nyt suosittua*
- Uusimmat kirjastoihin luetteloidut kaunokirjat ja tietokirjat haetaan suoraan Finnasta aina, kun sivu avataan
- Vaalea ja tumma ulkoasu, tekstin koon suurennus, näppäimistö- ja ruudunlukijatuki

## Käyttöönotto GitHub Pagesissa

1. Luo GitHubiin uusi **julkinen** repositorio, esimerkiksi `mita-lukisin`.
2. Lisää repositorioon kaikki tämän paketin tiedostot ja kansiot (myös piilokansio `.github`).
   Helpoin tapa ilman komentoriviä: repositorion sivulla **Add file → Upload files** ja vedä kansion sisältö selaimeen.
3. Ota GitHub Pages käyttöön: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Salli aineistopäivityksen tallentaa muutokset: **Settings → Actions → General → Workflow permissions → Read and write permissions**.
5. Käynnistä ensimmäinen julkaisu: **Actions → Julkaise sivu → Run workflow**.
   Muutaman minuutin päästä sivu on osoitteessa `https://<käyttäjänimi>.github.io/mita-lukisin/`.

## Miten aineisto pysyy ajan tasalla

- **Joka avauskerta:** sivu hakee Finnan avoimesta rajapinnasta viimeksi luetteloidut kaunokirjat ja tietokirjat ja lisää ne mukaan (merkintä *Uutuus*).
- **Kerran viikossa:** työnkulku *Päivitä myyntilistat* hakee Kirjakauppaliiton tuoreimmat Mitä Suomi lukee -listat Nyt luetaan -näkymää varten.
- **Kerran kuukaudessa:** työnkulku *Päivitä aineisto* hakee kaunokirjallisuuden ja tietokirjat uudelleen Finnasta (kestää noin 2–3 tuntia), tallentaa sen ja julkaisee sivun uudelleen. Sen voi käynnistää myös käsin kohdasta **Actions → Päivitä aineisto → Run workflow**.

## Kehittäminen

```
python build.py          # kokoaa src/-kansion tiedostot dist/-kansioon
pip install pytest playwright && python -m playwright install chromium
pytest -q tests          # selaintestit
python -m http.server -d dist 8000   # sivu osoitteessa http://localhost:8000
```

Rakenne:

| Kansio | Sisältö |
|---|---|
| `src/` | sivun lähdetiedostot: rakenne, tyylit, käännökset, kysymykset ja sovelluslogiikka |
| `data/books.json` | kaunokirjallisuus |
| `data/nonfiction.json` | tietokirjat |
| `scripts/` | aineiston haku ja käsittely Finnasta (`update.sh` ajaa kaiken) |
| `tests/` | automaattiset selaintestit |
| `.github/workflows/` | testit, julkaisu ja kuukausittainen aineistopäivitys |

## Lähteet ja lisenssit

- Kirjatiedot: [Finna.fi](https://www.finna.fi), Kansalliskirjasto. Metatiedot on julkaistu CC0-lisenssillä. Celian äänikirjat on jätetty pois.
  Tietokirjat ovat Helmet-kirjastojen kokoelmasta; oppikirjat, hakuteokset, käsikirjat, tutkimusraportit ja väitöskirjat on rajattu pois. Kirjojen esittelytekstejä ei käytetä, koska ne ovat usein kustantajien tekijänoikeuden alaisia.
- Myyntilistat: Kirjakauppaliitto, [Mitä Suomi lukee](https://kirjakauppaliitto.fi/mita-suomi-lukee/). Listat näytetään lähde mainiten ja alkuperäiseen listaan linkittäen.
- Lainausmäärät: Helsingin kaupunginkirjasto, [HelMet-kirjastojen lainatuimmat aikuistenkirjat](https://hri.fi/data/dataset/helmet-kirjastojen-lainatuimmat-aikuistenkirjat), CC BY 4.0. Päivittyy kuukausittaisen aineistopäivityksen mukana.
- Sovelluksen koodi: MIT-lisenssi (katso `LICENSE`).

Mitä lukisin on itsenäinen palvelu. Se ei ole Storytelin, BookBeatin, Helmetin, Goodreadsin, kirjakauppojen tai Kansalliskirjaston palvelu.
