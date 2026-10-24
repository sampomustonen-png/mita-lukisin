import json, sys, time, urllib.request, urllib.parse, concurrent.futures as cf, os
B = "https://api.finna.fi/v1/search"
FIELDS = ["id","title","shortTitle","nonPresenterAuthors","year","subjects","genres","publishers","series","languages"]
def url(fmt, page, genre):
    q = [("filter[]", f'format:"{fmt}"'), ("filter[]", 'language:"fin"'), ("filter[]", f'genre_facet:"{genre}"'),
         ("limit","100"), ("page",str(page)), ("sort","title")] + [("field[]",f) for f in FIELDS]
    return B + "?" + urllib.parse.urlencode(q)
def get(u):
    for a in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent":"mita-lukisin/1.0 (+https://github.com)"}), timeout=60) as r:
                return json.load(r)
        except Exception as e:
            time.sleep(2 + a*3)
    return {"records":[]}
def harvest(fmt, genre, out):
    first = get(url(fmt,1,genre)); n = first.get("resultCount",0); pages = (n+99)//100
    print(fmt, genre, n, pages, flush=True)
    recs = {r["id"]: r for r in first.get("records",[])}
    def job(p):
        time.sleep(0.15); return get(url(fmt,p,genre)).get("records",[])
    with cf.ThreadPoolExecutor(4) as ex:
        for i, rs in enumerate(ex.map(job, range(2, pages+1))):
            for r in rs: recs[r["id"]] = r
            if i % 100 == 0: print(fmt, i, len(recs), flush=True)
    json.dump(list(recs.values()), open(out,"w",encoding="utf-8"), ensure_ascii=False)
    print("done", out, len(recs), flush=True)
harvest("0/Book/", "Romaanit", "raw_books.json")
harvest("0/Sound/", "Romaanit", "raw_audio.json")
