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
function T(k, vars){
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
    [['rel', 'sortRel'], ['pop', 'sortPop'], ['new', 'sortNew'], ['old', 'sortOld'], ['title', 'sortTitle'], ['author', 'sortAuthor']].forEach(function(o){
      var op = el('option', null, T(o[1])); op.value = o[0]; s.appendChild(op);
    });
    s.value = v;
  });
  $('sourceNote').textContent = T('sourceNote');
  $('askSub').textContent = T('askSub', {n:B.length ? fmt(B.length) : '…'});
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
   Rivi: [0 nimi, 1 tekijä, 2 vuosi, 3 kustantaja, 4 asiasanat, 5 liput, 6 tietueita, 7 sarja|osa, 8 Finna-id, 9 sivut, 10 Helmet-lainat] */
var D = null, V = [], P = [], B = [], IDX = [];
var F_DOM = 1, F_TR = 2, F_AUDIO = 4, F_YOUNG = 8, F_CHILD = 16, F_FS = 32, F_LIVE = 64;
function keyOf(b){ return fold(b[0]) + '|' + fold(b[1]); }
function indexRow(b){ return fold(b[0] + ' ' + b[1] + ' ' + (b[7] || '') + ' ' + b[4].map(function(i){ return V[i]; }).join(' ')); }
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
async function load(){
  try{
    var res = await fetch('books.ndjson');
    if(!res.ok) throw new Error(res.status);
    /* Luetaan virtana rivi kerrallaan ja annetaan selaimen hengähtää välillä, jottei sivu jumitu */
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
    D = head; D.b = rows;
  }catch(e){
    $('loadText').textContent = T('loadError'); $('loadText').className = 'note err';
    $('loadCard').querySelector('.spinner').hidden = true; return;
  }
  V = D.v; P = D.p; B = D.b;
  IDX = [];
  $('askSub').textContent = T('askSub', {n:fmt(B.length)});
  if(!B.some(function(b){ return b[9]; })){ var lf = document.querySelector('input[name="length"]'); if(lf) lf.closest('fieldset').hidden = true; }
  $('loadCard').hidden = true;
  $('recBtn').disabled = false;
  renderMyList();
  if(/^#jaa=/.test(location.hash)) openSharedFromHash();
  if(!$('viewSearch').hidden) renderSearch();
  setTimeout(fetchLive, 1500);
  loadMsl();
}

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
function saveAnswers(){ store.set('mk.answers', {a:getAnswers(), liked:$('liked').value}); }
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
