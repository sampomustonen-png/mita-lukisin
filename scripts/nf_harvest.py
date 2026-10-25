"""Hakee suomenkieliset tietokirjat Finnasta (Helmet-kirjastojen kokoelma).

Helmet-kirjastot ovat Suomen suurin yleisten kirjastojen verkosto, joten niiden kokoelma kattaa
yleistajuisen tietokirjallisuuden hyvin ja jättää pois useimmat tieteelliset julkaisut.
Kaunokirjallisuus, lasten- ja nuortenkirjat, oppikirjat ja hakuteokset rajataan pois jo haussa.
Tulos: raw_nf.json työkansioon. Ajetaan kansiossa data/raw (scripts/update.sh)."""
import json, time, urllib.request, urllib.parse, concurrent.futures as cf

B = "https://api.finna.fi/v1/search"
FIELDS = ["id", "title", "shortTitle", "nonPresenterAuthors", "year", "subjects", "genres", "publishers", "series",
          "classifications", "buildings", "physicalDescriptions", "formats"]
NOT_GENRES = ["Kaunokirjallisuus", "Lastenkirjallisuus", "Nuortenkirjallisuus", "Oppikirjat", "Romaanit", "Runot",
              "Sarjakuvat", "Kuvakirjat", "Näytelmät", "Novellit", "Hakuteokset", "Sanakirjat", "Väitöskirjat",
              "Vuosikirjat", "Toimintakertomukset", "Opinnäytteet", "Lukemisesteisten äänikirjat", "Selkokirjat",
              "Tietosanakirjat", "Harjoituskirjat", "Läroböcker", "Barnlitteratur", "Ungdomslitteratur", "Skönlitteratur"]
YEARS = [(0, 1899), (1900, 1949), (1950, 1969), (1970, 1979), (1980, 1989), (1990, 1994), (1995, 1999), (2000, 2003),
         (2004, 2007), (2008, 2011), (2012, 2015), (2016, 2019), (2020, 2022), (2023, 2100)]


def url(fmt, y0, y1, page, extra=()):
    q = [("filter[]", f'format:"{fmt}"'), ("filter[]", 'language:"fin"'), ("filter[]", 'building:"0/Helmet/"'),
         ("filter[]", f'search_daterange_mv:"[{y0} TO {y1}]"')]
    q += [("filter[]", f'-genre_facet:"{g}"') for g in NOT_GENRES] + list(extra)
    q += [("limit", "100"), ("page", str(page)), ("sort", "id asc")] + [("field[]", f) for f in FIELDS]
    return B + "?" + urllib.parse.urlencode(q)


def get(u):
    for a in range(6):
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "mita-lukisin/1.0 (+https://github.com)"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)
        except Exception:
            time.sleep(2 + a * 4)
    return {"records": []}


def slim(r):
    """Kirjastojen toimipisteiden määrä kertoo, kuinka laajasti kirja on hankittu; itse luetteloa ei tallenneta."""
    b = r.pop("buildings", None) or []
    r["nb"] = sum(1 for x in b if str(x.get("value", "")).startswith("2/"))
    r["fm"] = [str(x.get("value", "")) for x in (r.pop("formats", None) or [])]
    return r


def harvest(fmt, out, extra=()):
    recs = {}
    for y0, y1 in YEARS:
        first = get(url(fmt, y0, y1, 1, extra))
        n = first.get("resultCount", 0)
        pages = (n + 99) // 100
        print(fmt, y0, y1, n, flush=True)
        for r in first.get("records", []): recs[r["id"]] = slim(r)

        def job(p):
            time.sleep(0.15)
            return get(url(fmt, y0, y1, p, extra)).get("records", [])
        with cf.ThreadPoolExecutor(4) as ex:
            for rs in ex.map(job, range(2, pages + 1)):
                for r in rs: recs[r["id"]] = slim(r)
        print("  yhteensä", len(recs), flush=True)
    json.dump(list(recs.values()), open(out, "w", encoding="utf-8"), ensure_ascii=False)
    print("valmis", out, len(recs), flush=True)


if __name__ == "__main__":
    harvest("0/Book/", "raw_nf.json")   # sisältää myös äänikirjat ja e-kirjat (formaatti 1/Book/AudioBook/, 1/Book/eBook/)
