import json, time, urllib.request, urllib.parse, concurrent.futures as cf, re, sys
sys.path.insert(0, '.')
B="https://api.finna.fi/v1/search"
GENRES = ["Romaanit", "Runot", "Novellit", "Näytelmät", "Proosarunot", "Lyhytproosa", "Aforismit"]
GF = [("filter[]", '~genre_facet:"%s"' % g) for g in GENRES]   # TAI-suodatin
def get(q):
    u=B+"?"+urllib.parse.urlencode(q)
    for a in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"mita-lukisin/1.0"}),timeout=60) as r: return json.load(r)
        except Exception: time.sleep(2+3*a)
    return {}
# (a) sivumäärät
def page(p):
    time.sleep(.15)
    q=[("filter[]",'format:"0/Book/"'),("filter[]",'language:"fin"')]+GF+[("limit","100"),("page",str(p)),("sort","title")]
    q+=[("field[]",f) for f in ("shortTitle","title","nonPresenterAuthors","physicalDescriptions")]
    return get(q).get("records",[])
first=page(1); n=(get([("filter[]",'format:"0/Book/"'),("filter[]",'language:"fin"')]+GF+[("limit","0")]).get("resultCount",0)+99)//100
recs=list(first)
with cf.ThreadPoolExecutor(3) as ex:
    for i,rs in enumerate(ex.map(page,range(2,n+1))):
        recs+=rs
        if i%100==0: print("pages",i,len(recs),flush=True)
json.dump(recs,open("raw_pages.json","w",encoding="utf-8"),ensure_ascii=False); print("PAGES DONE",len(recs),flush=True)
# (b) niukat kirjat
d=json.load(open("books.json",encoding="utf-8"))
sparse=[(b[0],b[1]) for b in d["b"] if len(b[4])<3]
print("sparse",len(sparse),flush=True)
def enrich(tb):
    t,a=tb; time.sleep(.15)
    q=[("lookfor",(t+" "+a).strip()),("type","AllFields"),("filter[]",'language:"fin"'),("limit","20")]
    q+=[("field[]",f) for f in ("shortTitle","title","nonPresenterAuthors","subjects","genres")]
    return [t,a,get(q).get("records",[])]
out=[]
with cf.ThreadPoolExecutor(3) as ex:
    for i,r in enumerate(ex.map(enrich,sparse)):
        out.append(r)
        if i%500==0: print("enrich",i,flush=True)
json.dump(out,open("raw_enrich.json","w",encoding="utf-8"),ensure_ascii=False); print("ENRICH DONE",len(out),flush=True)
