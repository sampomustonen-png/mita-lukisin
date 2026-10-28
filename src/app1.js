/* ---------- Apu ---------- */
function $(id){ return document.getElementById(id); }
function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
var store = {
  get:function(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set:function(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
/* Claude-ympäristö: lisäominaisuudet vain, kun sivu on avattu Claudessa */
var IN_CLAUDE = !!(window.claude && typeof window.claude.use === 'function');
function useCap(n){ try{ return IN_CLAUDE ? Promise.resolve(window.claude.use(n)).catch(function(){ return null; }) : Promise.resolve(null); }catch(e){ return Promise.resolve(null); } }
var sampleP = useCap('sample');
function hash(s){ var h = 0; for(var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function fold(s){ return String(s).toLowerCase().normalize('NFD').replace(/[̀-̇̉-ͯ]/g, '').normalize('NFC'); }
var REDUCED_M = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Kieli ---------- */
var LANG = (function(){
  var s = store.get('mk.lang', null); if(s && STR[s]) return s;
  var n = String((navigator.languages && navigator.languages[0]) || navigator.language || 'fi').slice(0, 2).toLowerCase();
  return STR[n] ? n : 'fi';
})();
var LOCALE = {fi:'fi-FI', sv:'sv-FI', en:'en-GB'};
/* Kirjalaji: romaanit ('nov') tai tietokirjat ('nf'). Tietokirjatilassa käytetään avaimen Nf-versiota, jos sellainen on. */
var MODE = store.get('mk.mode', 'nov') === 'nf' ? 'nf' : 'nov';
function T(k, vars){
  if(MODE === 'nf' && STR.fi[k + 'Nf'] != null) k = k + 'Nf';
  var s = (STR[LANG] && STR[LANG][k] != null) ? STR[LANG][k] : STR.fi[k];
  if(s == null) return k;
  if(vars) Object.keys(vars).forEach(function(v){ s = s.split('{' + v + '}').join(vars[v]); });
  return s;
}
function tx(o){ return o ? (o[LANG] || o.fi) : ''; }
function fmt(n){ return n.toLocaleString(LOCALE[LANG] || 'fi-FI'); }
function applyStatic(){
  document.documentElement.lang = LANG; $('app').lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach(function(e){ e.textContent = T(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-attr]').forEach(function(e){
    e.dataset.i18nAttr.split(';').forEach(function(p){ var kv = p.split(':'); if(kv[1]) e.setAttribute(kv[0], T(kv[1])); });
  });
  ['recSort', 'sSort'].forEach(function(id){
    var s = $(id), v = s.value || 'rel'; s.innerHTML = '';
    [['rel', 'sortRel'], ['pop', 'sortPop'], ['new', 'sortNew'], ['old', 'sortOld'], ['short', 'sortShort'], ['long', 'sortLong'], ['title', 'sortTitle'], ['author', 'sortAuthor']].forEach(function(o){
      var op = el('option', null, T(o[1])); op.value = o[0]; s.appendChild(op);
    });
    s.value = v;
  });
  $('sourceNote').textContent = T('sourceNote');
  $('askSub').textContent = T('askSub');
  markMode();
  $('moreQ').textContent = $('moreQuestions').hidden ? T('moreQ') : T('lessQ');
  renderInfo();
}
function renderInfo(){
  var w = $('infoBody'); w.innerHTML = '';
  (INFO[LANG] || INFO.fi).forEach(function(sec){
    var g = el('section', 'group glass'); g.appendChild(el('h2', null, sec[0]));
    sec[1].forEach(function(p){ g.appendChild(el('p', null, p)); });
    w.appendChild(g);
  });
}

/* ---------- Suosio ----------
   Tietueiden määrä kertoo, kuinka moni kirjasto on hankkinut kirjan. Vanhat kirjat ehtivät kerätä tietueita
   vuosikymmeniä, joten määrä suhteutetaan kirjan ikään. */
var THIS_YEAR = new Date().getFullYear();
function pop(b){
  var age = b[2] ? Math.max(0, THIS_YEAR - b[2]) : 60;
  /* Helmet-kirjastojen lainausmäärät (sarake 10) kertovat lukijoiden kiinnostuksesta; paino on maltillinen */
  return Math.log2(1 + b[6] * 4 / Math.sqrt(age + 4)) + (b[10] ? Math.log2(1 + b[10] / 300) * 0.35 : 0);
}

/* ---------- Data ----------
   Rivi: [0 nimi, 1 tekijä, 2 vuosi, 3 kustantaja, 4 asiasanat, 5 liput, 6 tietueita, 7 sarja|osa, 8 Finna-id, 9 sivut, 10 Helmet-lainat,
   11 alaotsikko (vain tietokirjat)]. Tietokirjat ladataan omasta tiedostostaan samaan taulukkoon vasta, kun niitä tarvitaan. */
var D = null, V = [], P = [], B = [], IDX = [];
var F_DOM = 1, F_TR = 2, F_AUDIO = 4, F_YOUNG = 8, F_CHILD = 16, F_FS = 32, F_LIVE = 64, F_NF = 128;
var BIGP = {}; /* suurten kustantajien indeksit (Löytöjä-painotus) */
function isNF(b){ return !!(b[5] & F_NF); }
function inMode(b){ return isNF(b) === (MODE === 'nf'); }
/* Tallennetuissa kirjoissa asiasanat ja kustantaja ovat tekstinä, jotta ne säilyvät aineiston päivittyessä */
function termText(x){ return typeof x === 'string' ? x : (V[x] || ''); }
function pubText(b){ return typeof b[3] === 'string' ? b[3] : (P[b[3]] || ''); }
function portable(b){ var c = b.slice(); c[3] = pubText(b); c[4] = b[4].map(termText); return c; }
function currentRow(b){ if(!D) return b; ensureMaps(); var i = KEYIDX[keyOf(b)]; return i != null ? B[i] : b; }
function keyOf(b){ return fold(b[0]) + '|' + fold(b[1]); }
function indexRow(b){ return fold(b[0] + ' ' + (b[11] || '') + ' ' + b[1] + ' ' + (b[7] || '') + ' ' + pubText(b) + ' ' + b[4].map(function(i){ return V[i]; }).join(' ')); }
var KEYIDX = null, IDMAP = null;
/* Hakemistot rakennetaan vasta tarvittaessa, jotta sovellus käynnistyy nopeasti */
function ensureMaps(){
  if(KEYIDX) return;
  KEYIDX = {}; IDMAP = {};
  B.forEach(function(b, i){ KEYIDX[keyOf(b)] = i; if(b[8]) IDMAP[b[8]] = i; });
}
async function ensureMapsAsync(){
  if(KEYIDX) return;
  var K = {}, M = {}, t0 = performance.now();
  for(var i = 0; i < B.length; i++){
    K[keyOf(B[i])] = i; if(B[i][8]) M[B[i][8]] = i;
    if(performance.now() - t0 > 30){ await new Promise(function(ok){ setTimeout(ok, 0); }); t0 = performance.now(); if(KEYIDX) return; }
  }
  if(!KEYIDX){ KEYIDX = K; IDMAP = M; }
}
function ensureIdx(){ for(var i = IDX.length; i < B.length; i++) IDX.push(indexRow(B[i])); }
/* Luetaan rivimuotoinen tiedosto virtana ja annetaan selaimen hengähtää välillä, jottei sivu jumitu */
async function readNdjson(url){
  var res = await fetch(url);
  if(!res.ok) throw new Error(res.status);
  var rows = [], head = null, rest = '';
  function eat(chunk, last){
    var lines = (rest + chunk).split('\n'); rest = last ? '' : lines.pop();
    for(var j = 0; j < lines.length; j++){ var ln = lines[j]; if(!ln) continue; if(!head) head = JSON.parse(ln); else rows.push(JSON.parse(ln)); }
  }
  if(res.body && window.TextDecoder){
    var reader = res.body.getReader(), dec = new TextDecoder(), t0 = performance.now();
    for(;;){
      var r = await reader.read();
      if(r.done){ eat(dec.decode(), true); break; }
      eat(dec.decode(r.value, {stream:true}), false);
      if(performance.now() - t0 > 40){ await new Promise(function(ok){ setTimeout(ok, 0); }); t0 = performance.now(); }
    }
  } else { eat(await res.text(), true); }
  return {head:head, rows:rows};
}
function loadFailed(){
  $('loadCard').hidden = false;
  $('loadText').textContent = T('loadError'); $('loadText').className = 'note err';
  $('loadCard').querySelector('.spinner').hidden = true;
}
function ready(){ return !!D && (MODE !== 'nf' || NF_STATE === 2); }
function updateRecBtn(){ $('recBtn').disabled = !ready(); }
async function load(){
  try{
    var r = await readNdjson('books.ndjson');
    D = r.head; D.b = r.rows;
  }catch(e){ loadFailed(); return; }
  V = D.v; P = D.p; B = D.b;
  IDX = [];
  for(var i = 0; i < 25 && i < P.length; i++) BIGP[i] = 1;
  if(MODE === 'nf') loadNF(); else $('loadCard').hidden = true;
  updateRecBtn();
  renderMyList();
  if(/^#jaa=/.test(location.hash)) openSharedFromHash();
  if(!$('viewSearch').hidden) renderSearch();
  setTimeout(fetchLive, 1500);
  loadMsl();
}
/* Tietokirjat: sanasto ja kustantajat yhdistetään romaanien vastaaviin, rivit lisätään samaan taulukkoon */
var NF_STATE = 0, NF_P = null;
function loadNF(){
  if(NF_P) return NF_P;
  NF_STATE = 1;
  $('loadCard').hidden = false; $('loadCard').querySelector('.spinner').hidden = false;
  $('loadText').className = 'note'; $('loadText').textContent = T('loadingNf');
  NF_P = (async function(){
    while(!D) await new Promise(function(ok){ setTimeout(ok, 100); });
    var r;
    try{ r = await readNdjson('nonfiction.ndjson'); }
    catch(e){ NF_STATE = -1; NF_P = null; if(MODE === 'nf') loadFailed(); return false; }
    var vi = {}, pi = {};
    V.forEach(function(t, i){ vi[t] = i; }); P.forEach(function(p, i){ pi[p] = i; });
    var vmap = r.head.v.map(function(t){ if(vi[t] == null){ vi[t] = V.length; V.push(t); } return vi[t]; });
    var pmap = r.head.p.map(function(p, k){ if(pi[p] == null){ pi[p] = P.length; P.push(p); } if(k < 25) BIGP[pi[p]] = 1; return pi[p]; });
    var t0 = performance.now();
    for(var k = 0; k < r.rows.length; k++){
      var b = r.rows[k];
      b[4] = b[4].map(function(i){ return vmap[i]; }); b[3] = b[3] >= 0 ? pmap[b[3]] : -1; b[5] |= F_NF;
      if(KEYIDX && KEYIDX[keyOf(b)] == null){ KEYIDX[keyOf(b)] = B.length; if(b[8]) IDMAP[b[8]] = B.length; }
      B.push(b);
      if(performance.now() - t0 > 40){ await new Promise(function(ok){ setTimeout(ok, 0); }); t0 = performance.now(); }
    }
    NF_STATE = 2; NF_N = r.rows.length;
    $('loadCard').hidden = true;
    updateRecBtn();
    renderMyList();
    if(MODE === 'nf' && !$('viewSearch').hidden && !sState.sim) renderSearch();
    if(MSL){ TTL = null; loadMsl(); }
    setTimeout(fetchLiveNF, 800);
    return true;
  })();
  return NF_P;
}
var NF_N = 0;

/* ---------- Lomake ---------- */
var FORM_BUILT = false;
function hintFor(q){
  if(q.hint) return tx(q.hint);
  if(q.exclude) return T('pickAny');
  return q.max > 1 ? T('pickMax', {n:(T('nums')[q.max] || q.max)}) : T('pickOne');
}
function buildForm(){
  var keep = FORM_BUILT ? getAnswers() : null;
  $('questions').innerHTML = '';
  document.querySelectorAll('#moreQuestions fieldset.q').forEach(function(f){ f.remove(); });
  QUESTIONS.forEach(function(q){
    var g = el('fieldset', 'group glass q'), lg = el('legend');
    lg.appendChild(el('h2', null, tx(q.text))); g.appendChild(lg);
    var hid = 'hint-' + q.id, hp = el('p', 'hint', hintFor(q)); hp.id = hid; g.appendChild(hp);
    g.setAttribute('aria-describedby', hid);
    var chips = el('div', 'chips');
    q.options.forEach(function(o, k){
      var lab = el('label', 'chip'), inp = el('input');
      inp.type = q.max === 1 ? 'radio' : 'checkbox'; inp.name = q.id; inp.id = 'q-' + q.id + '-' + k; inp.value = String(k);
      if(q.filter && k === (q.def != null ? q.def : q.options.length - 1)) inp.checked = true;
      lab.appendChild(inp); lab.appendChild(el('span', null, tx(o.t))); chips.appendChild(lab);
    });
    g.appendChild(chips);
    if(q.quick) $('questions').appendChild(g); else $('moreQuestions').insertBefore(g, $('sliderGroup'));
  });
  buildRange(); buildSliders();
  $('sliderGroup').hidden = !SLIDERS.length;
  FORM_BUILT = true;
  if(keep) applyAnswers(keep);
}
function buildRange(){
  var fs = document.querySelector('input[name="age"]').closest('fieldset');
  var rs = yearRangeStored();
  var box = el('div', 'range'); box.id = 'rangeBox'; box.hidden = true;
  function num(id, label, val){
    var l = el('label', null); l.htmlFor = id; l.appendChild(el('span', null, label));
    var i = el('input', 'field'); i.type = 'number'; i.id = id; i.inputMode = 'numeric'; i.min = '1500'; i.max = String(THIS_YEAR); i.value = String(val);
    i.addEventListener('input', function(){ store.set('mk.range', yearRange()); });
    l.appendChild(i); return l;
  }
  box.appendChild(num('yFrom', T('rangeFrom'), rs[0])); box.appendChild(el('span', 'range-dash', '–')); box.appendChild(num('yTo', T('rangeTo'), rs[1]));
  fs.appendChild(box);
  fs.addEventListener('change', syncRange);
  syncRange();
}
function syncRange(){ var b = $('rangeBox'), r = $('q-age-5'); if(b && r) b.hidden = !r.checked; }
function yearRangeStored(){ return store.get('mk.range', null) || [1990, THIS_YEAR]; }
function yearRange(){
  if(!$('yFrom')) return yearRangeStored();
  var a = parseInt($('yFrom').value, 10), b = parseInt($('yTo').value, 10);
  if(!(a > 0)) a = 1500; if(!(b > 0)) b = THIS_YEAR;
  return a <= b ? [a, b] : [b, a];
}
function sliderText(s, v){
  if(!v) return T('sliderNeutral');
  var side = tx(v < 0 ? s.left : s.right).toLowerCase();
  return T(Math.abs(v) === 2 ? 'sliderStrong' : 'sliderMild', {s:side});
}
function buildSliders(){
  var w = $('sliders'); w.innerHTML = '';
  SLIDERS.forEach(function(s){
    var row = el('div', 'slider'), id = 'sl-' + s.id;
    var ends = el('div', 'slider-ends');
    ends.appendChild(el('span', null, tx(s.left))); ends.appendChild(el('span', null, tx(s.right)));
    var inp = el('input'); inp.type = 'range'; inp.id = id; inp.min = '-2'; inp.max = '2'; inp.step = '1'; inp.value = '0';
    inp.setAttribute('aria-label', tx(s.left) + ' – ' + tx(s.right));
    var out = el('output', 'slider-val'); out.htmlFor = id; out.id = id + '-v';
    function upd(){ var v = +inp.value; var t = sliderText(s, v); out.textContent = t; inp.setAttribute('aria-valuetext', t); row.classList.toggle('on', v !== 0); }
    inp.addEventListener('input', function(){ upd(); saveAnswers(); });
    row.appendChild(ends); row.appendChild(inp); row.appendChild(out); w.appendChild(row);
    upd(); inp._upd = upd;
  });
}
function getAnswers(){
  var a = {}, root = $('viewAsk');
  QUESTIONS.forEach(function(q){ a[q.id] = Array.prototype.map.call(root.querySelectorAll('input[name="' + q.id + '"]:checked'), function(x){ return +x.value; }); });
  a.sl = {}; SLIDERS.forEach(function(s){ var i = $('sl-' + s.id); a.sl[s.id] = i ? +i.value : 0; });
  return a;
}
function applyAnswers(a){
  QUESTIONS.forEach(function(q){
    var sel = (a[q.id] && a[q.id].length) ? a[q.id] : (q.filter ? [q.def != null ? q.def : q.options.length - 1] : []);
    document.querySelectorAll('#viewAsk input[name="' + q.id + '"]').forEach(function(x){
      x.checked = sel.indexOf(+x.value) >= 0; x.disabled = q.max > 1 && !x.checked && sel.length >= q.max;
    });
  });
  SLIDERS.forEach(function(s){ var i = $('sl-' + s.id); if(i){ i.value = String((a.sl && a.sl[s.id]) || 0); i._upd(); } });
  syncRange();
}
function ansKey(){ return MODE === 'nf' ? 'mk.answers.nf' : 'mk.answers'; }
function saveAnswers(){ store.set(ansKey(), {a:getAnswers(), liked:$('liked').value}); }
function restoreAnswers(){ var s = store.get(ansKey(), null); applyAnswers((s && s.a) || {}); $('liked').value = (s && s.liked) || ''; }
/* Kirjalajin vaihto: omat kysymykset, pikavalinnat ja vastaukset kummallekin */
function useModeSets(){
  QUESTIONS = MODE === 'nf' ? NF_QUESTIONS : NOV_QUESTIONS;
  SLIDERS = MODE === 'nf' ? NF_SLIDERS : NOV_SLIDERS;
  PRESETS = MODE === 'nf' ? NF_PRESETS : NOV_PRESETS;
}
function markMode(){
  document.querySelectorAll('.modeseg button').forEach(function(b){ var on = b.dataset.mode === MODE; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  var fy = $('fYoung'); if(fy) fy.closest('label').hidden = MODE === 'nf';
}
function setMode(m){
  if(m === MODE) return;
  saveAnswers();
  MODE = m; store.set('mk.mode', m);
  useModeSets();
  FORM_BUILT = false; buildForm(); buildPresets(); restoreAnswers();
  applyStatic();
  if(recState.ctl) recState.ctl.abort();
  recState = {ranked:[], base:[], shown:0, ctl:null, a:null};
  $('recList').innerHTML = ''; $('results').hidden = true; $('aiCard').hidden = true; $('recNote').textContent = '';
  if(m === 'nf' && NF_STATE !== 2) loadNF(); else if(D) $('loadCard').hidden = true;
  updateRecBtn();
  sState = {res:[], shown:0};
  if(!$('viewSearch').hidden){ if(ready()) renderSearch(); else { $('sList').innerHTML = ''; $('sCount').textContent = ''; } }
}
document.querySelectorAll('.modeseg').forEach(function(seg){
  seg.addEventListener('click', function(e){ var b = e.target.closest('button'); if(b) setMode(b.dataset.mode); });
  seg.addEventListener('keydown', function(e){
    if(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
    e.preventDefault();
    setMode(MODE === 'nf' ? 'nov' : 'nf');
    var on = seg.querySelector('[aria-checked="true"]'); if(on) on.focus();
  });
});
$('viewAsk').addEventListener('change', function(e){
  var inp = e.target; if(!inp.name) return;
  var q = QUESTIONS.filter(function(x){ return x.id === inp.name; })[0]; if(!q) return;
  var all = $('viewAsk').querySelectorAll('input[name="' + q.id + '"]');
  if(q.filter && !$('viewAsk').querySelector('input[name="' + q.id + '"]:checked')) inp.checked = true;
  if(q.max > 1){ var n = $('viewAsk').querySelectorAll('input[name="' + q.id + '"]:checked').length; all.forEach(function(x){ x.disabled = !x.checked && n >= q.max; }); }
  saveAnswers();
});
$('liked').addEventListener('input', saveAnswers);
$('moreQ').addEventListener('click', function(){
  var open = $('moreQuestions').hidden;
  $('moreQuestions').hidden = !open;
  this.setAttribute('aria-expanded', String(open));
  this.textContent = open ? T('lessQ') : T('moreQ');
});
function buildPresets(){
  var w = $('presets'); w.innerHTML = '';
  PRESETS.forEach(function(pr){
    var bt = el('button', null, tx(pr[0])); bt.type = 'button';
    bt.addEventListener('click', function(){ if(pr[1].now){ recommendNow(); return; } applyAnswers(pr[1]); saveAnswers(); recommend(); });
    w.appendChild(bt);
  });
}
