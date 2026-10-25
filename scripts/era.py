import json, time, urllib.request, urllib.parse, concurrent.futures as cf
B="https://api.finna.fi/v1/search"
ERAS=[f"{c}00-luku" for c in range(10,21)]+[f"{d}-luku" for d in range(1800,2030,10)]+["keskiaika","antiikki","esihistoria"]
def get(q):
    u=B+"?"+urllib.parse.urlencode(q)
    for a in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"mita-lukisin/1.0 (+https://github.com)"}),timeout=60) as r: return json.load(r)
        except Exception: time.sleep(2+3*a)
    return {}
import sys
GENRES = sys.argv[1].split(",") if len(sys.argv) > 1 else ["Romaanit", "Runot", "Novellit", "Näytelmät", "Proosarunot", "Lyhytproosa", "Aforismit"]
SFX = sys.argv[2] if len(sys.argv) > 2 else ""
# Useampi laji samalla haulla: Finnan TAI-suodatin (~)
GF = [("filter[]", '~genre_facet:"%s"' % g) for g in GENRES]
def base(era,page):
    return [("filter[]",'format:"0/Book/"'),("filter[]",'language:"fin"')]+GF+[("filter[]",f'era_facet:"{era}"'),
            ("limit","100"),("page",str(page)),("sort","title"),("field[]","shortTitle"),("field[]","title"),("field[]","nonPresenterAuthors")]
out={}
for era in ERAS:
    first=get(base(era,1)); n=first.get("resultCount",0); pages=(n+99)//100
    recs=first.get("records",[])
    with cf.ThreadPoolExecutor(4) as ex:
        for rs in ex.map(lambda p:(time.sleep(.15),get(base(era,p)).get("records",[]))[1], range(2,pages+1)): recs+=rs
    out[era]=recs; print(era,n,len(recs),flush=True)
json.dump(out,open("raw_era%s.json" % SFX,"w",encoding="utf-8"),ensure_ascii=False); print("ERA DONE",flush=True)
