/* ---------- Asetukset: kieli, ulkoasu, tekstin koko ---------- */
(function(){
  var root = document.documentElement, hostTheme = root.getAttribute('data-theme');
  function mark(seg, attr, val){
    $(seg).querySelectorAll('button').forEach(function(b){ var on = String(b.dataset[attr]) === String(val); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  }
  function setTheme(v){
    if(v === 'light' || v === 'dark') root.setAttribute('data-theme', v);
    else if(hostTheme) root.setAttribute('data-theme', hostTheme); else root.removeAttribute('data-theme');
    mark('themeSeg', 'themeVal', v);
  }
  function setSize(s){ document.body.style.zoom = s === 1 ? '' : String(s); mark('sizeSeg', 'size', s); }
  function setLang(l){
    if(!STR[l]) return;
    LANG = l; store.set('mk.lang', l); mark('langSeg', 'lang', l);
    applyStatic(); buildForm(); buildPresets(); rerenderAll();
  }
  setTheme(store.get('mk.theme', 'auto')); setSize(store.get('mk.size', 1)); mark('langSeg', 'lang', LANG);
  function radioKeys(seg, pick){
    $(seg).addEventListener('keydown', function(e){
      if(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
      var bs = Array.prototype.slice.call($(seg).querySelectorAll('button')), i = bs.indexOf(document.activeElement);
      var n = bs[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length];
      e.preventDefault(); n.focus(); pick(n);
    });
    $(seg).addEventListener('click', function(e){ var b = e.target.closest('button'); if(b) pick(b); });
  }
  radioKeys('themeSeg', function(b){ store.set('mk.theme', b.dataset.themeVal); setTheme(b.dataset.themeVal); });
  radioKeys('sizeSeg', function(b){ var v = parseFloat(b.dataset.size); store.set('mk.size', v); setSize(v); });
  radioKeys('langSeg', function(b){ if(b.dataset.lang !== LANG) setLang(b.dataset.lang); });
})();
function rerenderAll(){
  rerenderRecs();
  if(D){
    if(sState.sim){ $('sCount').textContent = T('similarTo', {t:sState.sim[0], a:sState.sim[1]}); var n = sState.shown; sState.shown = 0; $('sList').innerHTML = ''; sState.res.slice(0, n); sMore(); }
    else if(sState.base) renderSearch();
  }
  renderMyList(); renderShared(); updateSync();
  if(!$('viewNow').hidden) renderNow();
  if(LIVE_N) $('loadNote').textContent = T('liveNew', {n:fmt(LIVE_N)});
}

/* ---------- Vienti ja tuonti ---------- */
var dlCapP = useCap('downloads');
function listNote(t, err){ var n = $('listNote'); n.textContent = t; n.className = err ? 'note err' : 'note'; }
$('exportBtn').addEventListener('click', async function(){
  var data = JSON.stringify({app:'mita-lukisin', v:1, exported:new Date().toISOString(), marks:marks, saved:saved}, null, 1);
  var name = 'mita-lukisin-lista-' + new Date().toISOString().slice(0, 10) + '.json';
  var dl = await dlCapP;
  if(dl){
    try{ await dl.save({filename:name, data:data}); listNote(T('exportDone')); }
    catch(e){ if(!(e && e.code === 'declined')) listNote(T('exportFail'), true); }
    return;
  }
  try{
    var url = URL.createObjectURL(new Blob([data], {type:'application/json'}));
    var a = el('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
    listNote(T('exportDone'));
  }catch(e){ listNote(T('exportFail'), true); }
});
$('importBtn').addEventListener('click', function(){ $('importFile').click(); });
$('importFile').addEventListener('change', function(){
  var f = this.files && this.files[0]; this.value = ''; if(!f) return;
  var r = new FileReader();
  r.onload = function(){
    try{
      var d = JSON.parse(String(r.result));
      if(!d || typeof d.marks !== 'object' || !Array.isArray(d.saved)) throw 0;
      var n = 0;
      Object.keys(d.marks).forEach(function(k){ var m = d.marks[k]; if(m === 'save' || m === 'read' || m === 'no'){ if(marks[k] !== m) n++; marks[k] = m; } });
      d.saved.forEach(function(b){
        if(!Array.isArray(b) || typeof b[0] !== 'string') return;
        ensureMaps(); var k = keyOf(b), i = KEYIDX[k], row = i != null ? portable(B[i]) : b;
        if(!saved.some(function(x){ return keyOf(x) === k; })) saved.push(row);
      });
      saved = saved.filter(function(b){ return marks[keyOf(b)] === 'save'; });
      persistMarks(); renderMyList();
      document.querySelectorAll('.book').forEach(function(c){ if(c._b) syncMarks(c, keyOf(c._b)); });
      listNote(T('imported', {n:n}));
    }catch(e){ listNote(T('importError'), true); }
  };
  r.onerror = function(){ listNote(T('importError'), true); };
  r.readAsText(f);
});

/* ---------- Jakolinkit ----------
   Linkin lopussa on #jaa=l.<data> (oma lista) tai #jaa=r.<data> (suositukset). Data on base64url-muotoinen
   luettelo Finna-tunnisteista. Linkit toimivat julkisessa versiossa; Claude-näkymä ei välitä tällaisia osoitteita. */
function b64e(s){ return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64d(s){ s = s.replace(/-/g, '+').replace(/_/g, '/'); while(s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
function rowId(b){ return b[8] || ('k:' + keyOf(b)); }
function shareUrl(type, rows){
  var ids = rows.slice(0, 100).map(rowId);
  return location.href.split('#')[0] + '#jaa=' + type + '.' + b64e(ids.join('~'));
}
async function share(type, rows){
  if(!rows.length){ listNote(T('shareEmpty'), true); return; }
  if(IN_CLAUDE){ listNote(T('shareNotHere')); if(type === 'r') $('recNote').textContent = T('shareNotHere'); return; }
  var url = shareUrl(type, rows);
  if(navigator.share){ try{ await navigator.share({title:'Mitä lukisin', url:url}); return; }catch(e){ if(e && e.name === 'AbortError') return; } }
  $('shareBox').hidden = false; $('shareUrl').value = url;
  try{ await navigator.clipboard.writeText(url); listNote(T('copied')); if(type === 'r') $('recNote').textContent = T('copied'); }
  catch(e){ listNote(T('copyManual')); $('shareUrl').focus(); $('shareUrl').select(); }
  if(type === 'r'){ showView('list'); $('shareUrl').focus(); }
}
$('shareList').addEventListener('click', function(){ share('l', saved); });
$('shareRecs').addEventListener('click', function(){
  var rows = Array.prototype.map.call($('recList').querySelectorAll('.book'), function(c){ return c._b; }).filter(Boolean);
  share('r', rows);
});
var SHARED = null;
function openSharedFromHash(h){
  h = h || location.hash || '';
  var m = /^#jaa=([lr])\.([A-Za-z0-9_-]+)$/.exec(h); if(!m || !D) return;
  var ids; try{ ids = b64d(m[2]).split('~'); }catch(e){ return; }
  ensureMaps();
  var rows = ids.map(function(id){
    var i = id.indexOf('k:') === 0 ? KEYIDX[id.slice(2)] : IDMAP[id];
    return i != null ? B[i] : null;
  }).filter(Boolean);
  /* Osa kirjoista puuttuu: ne voivat olla tietokirjoja, jotka ladataan erikseen */
  if(rows.length < ids.length && NF_STATE === 0){ loadNF().then(function(){ openSharedFromHash(h); }); return; }
  if(!rows.length) return;
  SHARED = {type:m[1], rows:rows};
  renderShared(); showView('list');
  try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
}
function renderShared(){
  var box = $('sharedBox');
  if(!SHARED){ box.hidden = true; return; }
  box.hidden = false;
  $('sharedTitle').textContent = SHARED.type === 'r' ? T('sharedTitleRecs') : T('sharedTitleList');
  $('sharedHint').textContent = T('sharedHint', {n:fmt(SHARED.rows.length)});
  var w = $('sharedList'); w.innerHTML = '';
  SHARED.rows.forEach(function(b){ w.appendChild(bookCard(b)); });
}
$('sharedSave').addEventListener('click', function(){
  if(!SHARED) return; var n = 0;
  SHARED.rows.forEach(function(b){ if(marks[keyOf(b)] !== 'save'){ setMark(b, 'save', true); n++; } });
  listNote(T('sharedSaved', {n:n}));
});
$('sharedClose').addEventListener('click', function(){ SHARED = null; renderShared(); });

/* ---------- Uutuudet suoraan Finnasta ----------
   Julkisessa versiossa sivu hakee avautuessaan viimeksi kirjastoihin luetteloidut kaunokirjat Finnan avoimesta rajapinnasta.
   Claude-näkymä ei salli yhteyksiä muihin palveluihin, joten siellä haku ohitetaan. */
var LIVE_N = 0;
var LIVE_STOP = /^(suomenkielinen kirjallisuus|romaanit|kaunokirjallisuus|käännökset|suomen kieli|finska|finsk litteratur|romaner|översättningar|skönlitteratur|äänikirjat|e-kirjat|e-äänikirjat|kotimainen kaunokirjallisuus|fiktio|romaani|ljudböcker|e-böcker)$/;
function liveRow(r){
  var t = String(r.shortTitle || r.title || '').replace(/\s*[\/:;=]\s*$/, '').trim(); if(!t) return null;
  if((r.languages || ['fin']).indexOf('fin') < 0) return null;
  var a = '', au = (r.nonPresenterAuthors || [])[0];
  if(au && au.name){ var nm = String(au.name).replace(/[,.]+$/, '').trim(); a = nm.indexOf(',') > 0 ? (nm.split(',').slice(1).join(',').trim() + ' ' + nm.split(',')[0].trim()).trim() : nm; }
  var parts = [];
  (r.subjects || []).forEach(function(s){ (Array.isArray(s) ? s : [s]).forEach(function(p){ parts.push(String(p).trim().replace(/\.$/, '').toLowerCase()); }); });
  (r.genres || []).forEach(function(g){ parts.push(String(g).trim().replace(/\.$/, '').toLowerCase()); });
  var blob = parts.join(' ') + ' ' + (r.publishers || []).join(' ').toLowerCase();
  if(/lukemisest|celia|daisy|näkövammais/.test(blob)) return null;
  if(/sarjakuv|manga/.test(blob)) return null;
  var f = F_LIVE;
  if(/suomenkielinen kirjallisuus|kotimainen kaunokirjallisuus/.test(blob)) f |= F_DOM;
  if(/käännökset/.test(blob)) f |= F_TR;
  if(/äänikirjat/.test(blob)) f |= F_AUDIO;
  if(/nuortenkirjallisuus|nuoret aikuiset/.test(blob)) f |= F_YOUNG;
  if(/lastenkirjallisuus/.test(blob)) f |= F_CHILD;
  var vi = {}, terms = [];
  parts.forEach(function(p){
    if(!p || LIVE_STOP.test(p) || p.length > 60 || /^\d/.test(p)) return;
    var i = VIDX[p]; if(i == null){ i = V.length; V.push(p); VIDX[p] = i; }
    if(!vi[i]){ vi[i] = 1; terms.push(i); }
  });
  var pub = (r.publishers || [])[0], pi = -1;
  if(pub){ pub = String(pub).replace(/[\[\]]/g, '').replace(/[ ,:;]+$/, '').trim(); pi = P.indexOf(pub); if(pi < 0){ pi = P.length; P.push(pub); } }
  var y = parseInt(String(r.year || '').match(/\d{4}/) || 0, 10) || 0;
  var pg = 0; (r.physicalDescriptions || []).forEach(function(d){ var m = /(\d{2,4})\s*(sivua|s\.)/.exec(String(d)); if(m && !pg) pg = +m[1]; });
  var ser = '';
  (r.series || []).forEach(function(s){ if(ser || !s || !s.name) return; var n = /\d+/.exec(String(s.additional || '')); if(n && +n[0] <= 60) ser = String(s.name).trim() + '|' + n[0]; });
  return [t, a, y, pi, terms.slice(0, 24), f, 1, ser, r.id || '', pg];
}
var VIDX = null;
async function fetchLive(){
  if(IN_CLAUDE || !window.fetch) return;
  try{
    await ensureMapsAsync(); VIDX = {}; V.forEach(function(t, i){ VIDX[t] = i; });
    var base = 'https://api.finna.fi/v1/search?' + [
      'filter[]=' + encodeURIComponent('format:"0/Book/"'), 'filter[]=' + encodeURIComponent('language:"fin"'),
      'sort=' + encodeURIComponent('first_indexed desc'), 'limit=100'
    ].concat(['Romaanit', 'Runot', 'Novellit', 'Näytelmät'].map(function(g){ return 'filter[]=' + encodeURIComponent('~genre_facet:"' + g + '"'); })).concat(['id', 'shortTitle', 'title', 'nonPresenterAuthors', 'year', 'subjects', 'genres', 'publishers', 'series', 'physicalDescriptions', 'languages'].map(function(f){ return 'field[]=' + f; })).join('&');
    var added = 0;
    for(var page = 1; page <= 3; page++){
      var res = await fetch(base + '&page=' + page); if(!res.ok) break;
      var d = await res.json();
      (d.records || []).forEach(function(r){
        var row = liveRow(r); if(!row || !(row[2] >= THIS_YEAR - 2)) return;
        var k = keyOf(row); if(KEYIDX[k] != null) return;
        KEYIDX[k] = B.length; if(row[8]) IDMAP[row[8]] = B.length;
        B.push(row); added++;
      });
    }
    if(added){
      LIVE_N = added;
      $('loadNote').textContent = T('liveNew', {n:fmt(added)});
      if(!$('viewSearch').hidden && MODE === 'nov' && !$('q').value && !sState.sim) renderSearch(); else if(sState.base && !sState.sim) sState.base = null;
      if(MSL){ TTL = null; loadMsl(); }
    }
  }catch(e){ /* Uutuuksien haku on lisä: sovellus toimii ilman sitä. */ }
}

/* ---------- Tietokirjauutuudet suoraan Finnasta ----------
   Kun tietokirjat on ladattu, haetaan Helmet-kirjastoihin viimeksi luetteloidut tietokirjat. Aiheluokka päätellään
   kirjaston luokituksesta (YKL) samoin kuin kuukausittaisessa aineistopäivityksessä (scripts/nf_process.py). */
var NF_YKL = [[/^99/, 'elamakerrat'], [/^39/, 'sota'], [/^9/, 'historia'], [/^07/, 'yhteiskunta'], [/^0[0346]/, 'kulttuuri'],
  [/^(1[0-3]|15|16|2)/, 'filosofia'], [/^(14|17)/, 'psykologia'], [/^(3[0-5]|37|38)/, 'yhteiskunta'], [/^36/, 'talous'],
  [/^4[0-8]/, 'matkat'], [/^49/, 'kulttuuri'], [/^(50|56|57|58)/, 'luonto'], [/^5[1-5]/, 'tiede'], [/^59/, 'terveys'],
  [/^6[0-2]/, 'tiede'], [/^(63|64|69)/, 'talous'], [/^6[5-8]/, 'koti'], [/^79/, 'urheilu'], [/^7/, 'kulttuuri'], [/^(80|81|86|87|88)/, 'kirjallisuus']];
var NF_LIVE_EXCL = /oppikirjat|hakuteokset|sanakirjat|vuosikirjat|väitöskirjat|opinnäytteet|raportit|käsikirjat|harjoituskirjat|lastenkirjallisuus|nuortenkirjallisuus|kaunokirjallisuus|romaanit|runot|novellit|näytelmät|sarjakuvat|kuvakirjat|ylioppilastehtävät/;
var NF_LIVE_PUB = /yliopisto|university|korkeakoulu|ministeriö|tilastokeskus|valtioneuvosto|eduskunta|tutkimuslaitos|tutkimuskeskus|terveyden ja hyvinvoinnin laitos|opetushallitus|sanoma pro|edita|talentum|alma talent|celia/i;
async function fetchLiveNF(){
  if(IN_CLAUDE || !window.fetch || NF_STATE !== 2) return;
  try{
    ensureMaps();
    var vi = {}; V.forEach(function(t, i){ vi[t] = i; });
    VIDX = vi; /* liveRow lisää uudet asiasanat tähän hakemistoon */
    var base = 'https://api.finna.fi/v1/search?' + [
      'filter[]=' + encodeURIComponent('format:"0/Book/"'), 'filter[]=' + encodeURIComponent('language:"fin"'),
      'filter[]=' + encodeURIComponent('building:"0/Helmet/"'), 'sort=' + encodeURIComponent('first_indexed desc'), 'limit=100'
    ].concat(['Kaunokirjallisuus', 'Lastenkirjallisuus', 'Nuortenkirjallisuus', 'Romaanit', 'Oppikirjat', 'Runot', 'Sarjakuvat'].map(function(g){ return 'filter[]=' + encodeURIComponent('-genre_facet:"' + g + '"'); }))
     .concat(['id', 'shortTitle', 'title', 'nonPresenterAuthors', 'year', 'subjects', 'genres', 'publishers', 'physicalDescriptions', 'languages', 'classifications', 'formats'].map(function(f){ return 'field[]=' + f; })).join('&');
    var added = 0;
    for(var page = 1; page <= 3; page++){
      var res = await fetch(base + '&page=' + page); if(!res.ok) break;
      var d = await res.json();
      (d.records || []).forEach(function(r){
        var row = liveRow(r); if(!row || !(row[2] >= THIS_YEAR - 2)) return;
        var blob = (r.genres || []).concat(r.subjects ? [].concat.apply([], r.subjects) : []).join(' ').toLowerCase();
        if(/(käsikirja|sanakirja|oppikirja|vuosikirja|tietosanakirja|harjoituskirja|tehtäväkirja|matrikkeli)(\b|t\b|n\b)/i.test(String(r.title || ''))) return;
        if(NF_LIVE_EXCL.test(blob) || (r.publishers || []).some(function(x){ return NF_LIVE_PUB.test(String(x)); })) return;
        if((r.formats || []).some(function(f){ return /Daisy/.test(f.value || ''); })) return;
        var ykl = ((r.classifications || {}).ykl || [])[0] || '', cat = '';
        for(var k = 0; k < NF_YKL.length; k++) if(NF_YKL[k][0].test(ykl)){ cat = NF_YKL[k][1]; break; }
        if(!cat && /muistelmat|elämäkerrat/.test(blob)) cat = 'elamakerrat';
        if(!cat || /^8[2-5]|^0[12]|^89/.test(ykl)) return;
        var full = String(r.title || '').replace(/\s*[\/:;=]\s*$/, ''), parts = full.split(/\s+:\s+/);
        row[0] = parts[0].replace(/[ .;\/=]+$/, '') || row[0];
        row[11] = parts[1] ? parts[1].replace(/[ .;\/=]+$/, '') : '';
        var ci = vi['@' + cat]; if(ci == null) return;
        row[4] = [ci].concat(row[4]).slice(0, 22);
        if(/muistelmat|omaelämäkerrat/.test(blob) && vi['@muistelmat'] != null) row[4].splice(1, 0, vi['@muistelmat']);
        row[5] = (row[5] & ~(F_DOM | F_TR)) | F_NF | F_LIVE | ((r.nonPresenterAuthors || []).some(function(x){ return /kääntäjä/.test(x.role || ''); }) ? F_TR : F_DOM);
        while(row.length < 12) row.push(row.length === 11 ? '' : 0);
        var key = keyOf(row); if(KEYIDX[key] != null) return;
        KEYIDX[key] = B.length; if(row[8]) IDMAP[row[8]] = B.length;
        B.push(row); added++;
      });
    }
    if(added && MODE === 'nf'){ LIVE_NF = added; $('loadNote').textContent = T('liveNew', {n:fmt(added)}); if(!$('viewSearch').hidden && !$('q').value && !sState.sim) renderSearch(); else if(sState.base && !sState.sim) sState.base = null; }
  }catch(e){ /* lisäominaisuus: sovellus toimii ilman sitä */ }
}
var LIVE_NF = 0;

/* ---------- Oma lista Claude-tilille ----------
   Kun sivu on avattu Claudessa, lista tallentuu katsojan omaan, yksityiseen tallennustilaan (data/users/<tunnus>/omalista).
   Julkisessa versiossa lista tallentuu selaimeen, ja sen voi viedä tiedostoon tai jakaa linkkinä. */
var cloud = {ref:null, timer:0, writing:false, again:false, last:'', state:'syncLocal', err:false};
function setSync(key, err){ cloud.state = key; cloud.err = !!err; updateSync(); }
function updateSync(){ var n = $('syncNote'); n.textContent = T(cloud.state); n.className = cloud.err ? 'note err' : 'note'; }
function listBody(){ return {v:1, marks:marks, saved:saved.slice(0, 500)}; }
function applyCloud(data){
  if(!data || typeof data.marks !== 'object') return;
  marks = Object.assign({}, data.marks);
  if(Array.isArray(data.saved)) saved = data.saved.filter(function(b){ return Array.isArray(b) && marks[keyOf(b)] === 'save'; });
  store.set('mk.marks', marks); store.set('mk.saved', saved);
  document.querySelectorAll('.book').forEach(function(card){ if(card._b) syncMarks(card, keyOf(card._b)); });
  renderMyList();
}
function cloudSave(){
  if(!cloud.ref) return;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(async function flush(){
    if(cloud.writing){ cloud.again = true; return; }
    var body = listBody(), s = JSON.stringify(body);
    if(s === cloud.last) return;
    cloud.writing = true;
    try{ await cloud.ref.set(body); cloud.last = s; setSync('syncAccount'); }
    catch(e){ setSync(e && e.code === 'quota_exceeded' ? 'syncFull' : 'syncFail', true); }
    finally{ cloud.writing = false; if(cloud.again){ cloud.again = false; flush(); } }
  }, 600);
}
async function initCloud(){
  if(!IN_CLAUDE){ setSync('syncLocal'); return; }
  var db = await useCap('db'), user = await useCap('user');
  if(!db || !user){ setSync('syncLocal'); return; }
  var uid = await user.id();
  if(!uid){ setSync('syncSignIn'); return; }
  try{
    var ref = db.doc('data/users/' + uid + '/omalista');
    var snap = await ref.get();
    if(snap.exists){
      var d = snap.data() || {};
      var merged = Object.assign({}, d.marks || {}, marks);
      var sv = (Array.isArray(d.saved) ? d.saved : []).slice();
      saved.forEach(function(b){ if(!sv.some(function(x){ return keyOf(x) === keyOf(b); })) sv.unshift(b); });
      applyCloud({marks:merged, saved:sv});
      cloud.last = JSON.stringify(d);
    }
    cloud.ref = ref; setSync('syncAccount'); cloudSave();
    ref.onSnapshot(function(s){
      if(!s.exists || s.metadata.hasPendingWrites) return;
      var d = s.data(), str = JSON.stringify(d);
      if(str === cloud.last) return;
      cloud.last = str; applyCloud(d);
    }, function(){});
  }catch(e){ setSync('syncUnavailable', true); }
}

/* ---------- Käynnistys ---------- */
useModeSets();
applyStatic();
buildForm();
buildPresets();
restoreAnswers();
updateSync();
initCloud();
load();
