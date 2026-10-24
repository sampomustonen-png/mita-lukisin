/* ---------- Merkinnät ---------- */
var marks = store.get('mk.marks', {}); /* avain -> 'save' | 'read' | 'no' */
var saved = store.get('mk.saved', []); /* tallennettujen kirjojen rivit */
function persistMarks(){ store.set('mk.marks', marks); store.set('mk.saved', saved); cloudSave(); }
function setMark(b, m, force){
  var k = keyOf(b);
  if(marks[k] === m && !force) delete marks[k]; else marks[k] = m;
  saved = saved.filter(function(x){ return keyOf(x) !== k; });
  if(marks[k] === 'save') saved.unshift(b.slice());
  persistMarks();
  document.querySelectorAll('.book').forEach(function(card){ if(card.dataset.k === k) syncMarks(card, k); });
  renderMyList();
}
function syncMarks(card, k){
  card.querySelectorAll('.mark').forEach(function(btn){ btn.setAttribute('aria-pressed', String(marks[k] === btn.dataset.m)); });
}

/* ---------- Kirjakortti ---------- */
var COVERS = ['--cov1', '--cov2', '--cov3', '--cov4', '--cov5', '--cov6'];
/* Vie hakukoneen kautta suoraan palvelun ensimmäiseen osumaan (palveluilla ei ole vakaata hakuosoitetta) */
function first(site, b){ return 'https://duckduckgo.com/?q=' + encodeURIComponent('\\ site:' + site + ' ' + b[0] + ' ' + (b[1] || '')); }
function q2(b){ return encodeURIComponent((b[0] + ' ' + (b[1] || '')).trim()); }
var LINKS = [
  [function(){ return 'Storytel'; }, function(b){ return first('storytel.com/fi', b); }],
  [function(){ return 'BookBeat'; }, function(b){ return 'https://www.bookbeat.com/fi/search?query=' + encodeURIComponent(b[0]); }],
  [function(){ return 'Helmet'; }, function(b){ return 'https://helmet.finna.fi/Search/Results?type=AllFields&lookfor=' + q2(b); }],
  [function(){ return 'Goodreads'; }, function(b){ return 'https://www.goodreads.com/search?q=' + q2(b); }],
  [function(){ return T('finnaLink'); }, function(b){ return b[8] ? 'https://www.finna.fi/Record/' + encodeURIComponent(b[8]) : 'https://www.finna.fi/Search/Results?lookfor=' + q2(b); }]
];
var SHOPS = [
  ['Adlibris', function(b){ return 'https://www.adlibris.com/fi/haku?q=' + q2(b); }],
  ['Suomalainen Kirjakauppa', function(b){ return first('suomalainen.com', b); }],
  ['Rosebud', function(b){ return first('rosebud.fi', b); }]
];
var CARDN = 0, MCTX = null;
/* Mittaa sukunimen pisimmän osan (rivitys vain välilyönnin tai yhdysmerkin kohdalla) ja sovittaa kirjainkoon kannen leveyteen */
function coverFont(name){
  if(!MCTX){ try{ MCTX = document.createElement('canvas').getContext('2d'); }catch(e){} }
  var parts = String(name).toUpperCase().split(/\s+|(?<=-)/).filter(Boolean), widest = 0;
  parts.forEach(function(w){
    var px = MCTX ? (MCTX.font = '600 10px Arial, Helvetica, sans-serif', MCTX.measureText(w).width) : w.length * 7;
    if(px > widest) widest = px;
  });
  var avail = (window.innerWidth <= 420 ? 62 : 76) - 10;
  return Math.max(5, Math.min(9, widest ? 10 * avail / (widest * 1.04) : 9)).toFixed(1);
}
function extLink(label, href, b){
  var a = el('a', null, label); a.href = href; a.target = '_blank'; a.rel = 'noopener';
  a.setAttribute('aria-label', T('opensNew', {s:label, t:b[0]})); return a;
}
function bookCard(b, why, hits){
  var k = keyOf(b), card = el('article', 'book glass'); card.dataset.k = k;
  var cov = el('div', 'cover'); cov.style.background = 'var(' + COVERS[hash(k) % COVERS.length] + ')';
  cov.setAttribute('aria-hidden', 'true');
  cov.appendChild(el('b', null, (String(b[0]).match(/[0-9A-Za-zÅÄÖåäöÀ-ÿ]/) || ['?'])[0].toUpperCase()));
  var sn = el('small', null, ''), snt = surname(b[1]);
  sn.style.fontSize = coverFont(snt) + 'px';
  snt.split(/(-)/).forEach(function(seg){ sn.appendChild(document.createTextNode(seg)); if(seg === '-') sn.appendChild(document.createElement('wbr')); });
  cov.appendChild(sn); card.appendChild(cov);
  var body = el('div', 'bk-body');
  var h = el('h3', 'bk-title', b[0]); h.id = 't' + hash(k) + '-' + (++CARDN); card.setAttribute('aria-labelledby', h.id);
  if(b[5] & F_LIVE) h.appendChild(el('span', 'badge new', T('newBadge')));
  if(b[5] & F_AUDIO) h.appendChild(el('span', 'badge', T('audiobook')));
  if(b[10] >= 1000) h.appendChild(el('span', 'badge loan', T('loanBadge')));
  var mr = mslRankOf(b); if(mr) h.appendChild(el('span', 'badge msl', T('mslBadge', {r:mr})));
  body.appendChild(h);
  var meta = [b[1] || T('unknownAuthor'), b[2] || '', P[b[3]] || '', b[9] ? b[9] + ' ' + T('pagesAbbr') : ''].filter(Boolean).join(' · ');
  body.appendChild(el('p', 'bk-meta', meta));
  if(b[7]){ var sp = String(b[7]).split('|'); body.appendChild(el('p', 'bk-series', sp[0] + (sp[1] ? ', ' + T('part') + ' ' + sp[1] : ''))); }
  if(why) body.appendChild(el('p', 'bk-why', why));
  var hitSet = hits || {}, tags = el('ul', 'tags');
  if(T('tagsLang')) tags.setAttribute('aria-label', T('tagsLang'));
  var shown = b[4].filter(function(i){ var t = V[i] || ''; return t && t.indexOf('fiktiivinen') < 0 && t.indexOf(',') < 0 && t.indexOf('(') !== 0; });
  shown.sort(function(x, y){ return (hitSet[y] ? 1 : 0) - (hitSet[x] ? 1 : 0); });
  shown.slice(0, 7).forEach(function(i){ var li = el('li', hitSet[i] ? 'hit' : null, V[i]); li.lang = 'fi'; tags.appendChild(li); });
  if(tags.children.length) body.appendChild(tags);
  var act = el('div', 'bk-actions');
  [['save', 'save'], ['read', 'read'], ['no', 'notInterested']].forEach(function(m){
    var bt = el('button', 'btn sm mark', T(m[1])); bt.type = 'button'; bt.dataset.m = m[0]; act.appendChild(bt);
  });
  var sim = el('button', 'btn sm', T('similar')); sim.type = 'button'; sim.dataset.sim = '1'; act.appendChild(sim);
  if(aiAvailable){ var ds = el('button', 'btn sm', T('describe')); ds.type = 'button'; ds.dataset.desc = '1'; act.appendChild(ds); }
  body.appendChild(act);
  var links = el('div', 'bk-links'); links.appendChild(el('span', null, T('searchIn')));
  LINKS.forEach(function(L){ links.appendChild(extLink(L[0](), L[1](b), b)); });
  var sb = el('button', 'shopbtn', T('shops')); sb.type = 'button'; sb.setAttribute('aria-expanded', 'false'); links.appendChild(sb);
  var shops = el('div', 'bk-links bk-shops'); shops.hidden = true; shops.appendChild(el('span', null, T('buy')));
  SHOPS.forEach(function(L){ shops.appendChild(extLink(L[0], L[1](b), b)); });
  sb.addEventListener('click', function(){ shops.hidden = !shops.hidden; sb.setAttribute('aria-expanded', String(!shops.hidden)); });
  body.appendChild(links); body.appendChild(shops);
  card.appendChild(body);
  card._b = b; syncMarks(card, k);
  return card;
}
document.addEventListener('click', function(e){
  var bt = e.target.closest('.mark'); if(!bt) return;
  var card = bt.closest('.book'); if(card && card._b) setMark(card._b, bt.dataset.m);
});

/* ---------- Näkymät ---------- */
var VIEWS = {ask:'viewAsk', now:'viewNow', search:'viewSearch', list:'viewList', info:'viewInfo'};
function showView(v){
  Object.keys(VIEWS).forEach(function(k){ $(VIEWS[k]).hidden = k !== v; });
  if(v === 'search' && D && !sState.base && !sState.sim) renderSearch();
  if(v === 'now') renderNow();
  document.querySelectorAll('.tab').forEach(function(x){ var on = x.dataset.view === v; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tab').forEach(function(t){ t.addEventListener('click', function(){ showView(t.dataset.view); }); });
(function(){
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  document.querySelector('.tabs').addEventListener('keydown', function(e){
    if(['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) < 0) return;
    var i = tabs.indexOf(document.activeElement); if(i < 0) return;
    var n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    e.preventDefault(); tabs[n].focus(); tabs[n].click();
  });
})();

/* ---------- Suosittelu ---------- */
var SETCACHE = {};
function termSet(pattern){
  if(SETCACHE[pattern] && SETCACHE[pattern].n === V.length) return SETCACHE[pattern].s;
  var re = new RegExp(pattern, 'i'), set = new Set();
  V.forEach(function(term, i){ if(re.test(term)) set.add(i); });
  SETCACHE[pattern] = {s:set, n:V.length}; return set;
}
function optionSets(a){
  var out = [];
  QUESTIONS.forEach(function(q){
    if(q.filter || q.exclude) return;
    (a[q.id] || []).forEach(function(k){ var o = q.options[k]; out.push({q:q.id, o:o, w:q.w, set:termSet(o.m)}); });
  });
  return out;
}
function avoidSets(a){
  var q = QUESTIONS.filter(function(x){ return x.id === 'avoid'; })[0];
  return (a.avoid || []).map(function(k){ return termSet(q.options[k].m); });
}
function sliderSets(a){
  var out = [];
  SLIDERS.forEach(function(s){ var v = (a.sl || {})[s.id] || 0; if(v) out.push({v:v, want:termSet(v < 0 ? s.lm : s.rm), not:termSet(v < 0 ? s.rm : s.lm)}); });
  return out;
}
/* Kotimainen: kotimaiseksi merkitty tai suomenruotsalainen. Alkuperältään tuntematon kelpaa kumpaankin. */
function isDom(b){ return !!(b[5] & F_FS) || ((b[5] & F_DOM) && !(b[5] & F_TR)); }
function isTr(b){ return !!(b[5] & F_TR) && !(b[5] & F_FS); }
function isUnknown(b){ return !(b[5] & (F_DOM | F_TR | F_FS)); }
function passFilters(b, a){
  var o = (a.origin || [2])[0], g = (a.age || [4])[0], r = (a.reader || [0])[0], au = (a.audio || [1])[0];
  if(o === 0 && !(isDom(b) || isUnknown(b))) return false;
  if(o === 1 && !(isTr(b) || isUnknown(b))) return false;
  var L = (a.length || [3])[0], pg = b[9] || 0;
  if(pg && L === 0 && pg >= 220) return false;
  if(pg && L === 1 && (pg < 200 || pg > 420)) return false;
  if(pg && L === 2 && pg <= 400) return false;
  var y = b[2];
  if(g === 0 && !(y >= 2015)) return false;
  if(g === 1 && !(y >= 2000 && y <= 2014)) return false;
  if(g === 2 && !(y >= 1960 && y <= 1999)) return false;
  if(g === 3 && !(y && y < 1960)) return false;
  if(g === 5){ var R = yearRange(); if(!(y && y >= R[0] && y <= R[1])) return false; }
  if(r === 0 && (b[5] & (F_YOUNG | F_CHILD))) return false;
  if(r === 1 && !(b[5] & F_YOUNG)) return false;
  if(r === 2 && (b[5] & F_CHILD) && !(b[5] & F_YOUNG)) return false;
  if(au === 0 && !(b[5] & F_AUDIO)) return false;
  return true;
}
function likedProfile(){
  /* Etsii aineistosta kirjat, jotka lukija mainitsi, ja kerää niiden asiasanat */
  var txt = fold($('liked').value), found = {}, terms = {}, n = 0;
  if(txt.length < 4) return {found:found, terms:terms, n:0};
  for(var i = 0; i < B.length && n < 12; i++){
    var t = fold(B[i][0]);
    if(t.length < 4 || txt.indexOf(t) < 0) continue;
    var re = new RegExp('(^|[^a-z0-9åäö])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9åäö])');
    if(!re.test(txt)) continue;
    var sur = fold(B[i][1]).split(' ').pop();
    if(t.length < 8 && sur && txt.indexOf(sur) < 0) continue;
    found[keyOf(B[i])] = 1; n++;
    B[i][4].forEach(function(id){ terms[id] = (terms[id] || 0) + 1; });
  }
  return {found:found, terms:terms, n:n};
}
function feedbackProfile(){
  /* Tallennetut (+1) ja luetut (+0,5) nostavat samankaltaisia, Ei kiinnosta (−1) laskee */
  var w = {}, n = 0;
  if(Object.keys(marks).length) ensureMaps();
  Object.keys(marks).forEach(function(k){
    var i = KEYIDX[k]; if(i == null) return;
    var v = marks[k] === 'save' ? 1 : marks[k] === 'read' ? 0.5 : -1; n++;
    B[i][4].forEach(function(t){ w[t] = (w[t] || 0) + v; });
  });
  return {w:w, n:n};
}
function hasAny(terms, set){ for(var j = 0; j < terms.length; j++) if(set.has(terms[j])) return true; return false; }
function rank(a){
  var sets = optionSets(a), genres = sets.filter(function(s){ return s.q === 'genre'; });
  var avoid = avoidSets(a), sl = sliderSets(a), liked = likedProfile(), fb = feedbackProfile();
  var disc = (a.known || [1])[0], popW = [1.1, 0.5, 0.15][disc], orig = (a.origin || [2])[0], lenSel = (a.length || [3])[0];
  var scored = [];
  for(var i = 0; i < B.length; i++){
    var b = B[i], k = keyOf(b);
    if(marks[k] === 'read' || marks[k] === 'no') continue;
    if(!passFilters(b, a)) continue;
    var terms = b[4], skip = false;
    for(var x = 0; x < avoid.length; x++) if(hasAny(terms, avoid[x])){ skip = true; break; }
    if(skip) continue;
    var score = 0, hits = {}, genreHit = !genres.length, matched = [];
    for(var s = 0; s < sets.length; s++){
      var S = sets[s], hit = false;
      for(var j = 0; j < terms.length; j++) if(S.set.has(terms[j])){ hits[terms[j]] = 1; hit = true; }
      if(hit){ score += S.w; matched.push(S.o); if(S.q === 'genre') genreHit = true; }
    }
    var slHit = 0;
    for(var z = 0; z < sl.length; z++){
      if(hasAny(terms, sl[z].want)){ score += Math.abs(sl[z].v) * 1.5; slHit++; }
      if(hasAny(terms, sl[z].not)) score -= Math.abs(sl[z].v) * 1.5;
    }
    if(liked.n){
      if(liked.found[k]) continue;
      var sim = 0; for(var j2 = 0; j2 < terms.length; j2++) if(liked.terms[terms[j2]]) sim++;
      if(sim){ score += Math.min(sim, 6) * 0.8; if(sim >= 2) matched.push('fav'); }
    }
    if(!genreHit || ((sets.length || sl.length) && score <= 0 && !slHit && !(liked.n && matched.length))) continue;
    if(fb.n){
      var fs = 0; for(var j3 = 0; j3 < terms.length; j3++){ var v = fb.w[terms[j3]]; if(v) fs += v; }
      fs = Math.max(-4, Math.min(4, fs));
      score += fs * 0.35; if(fs >= 2) matched.push('saved');
    }
    var pb = pop(b);
    score += pb * popW;
    if(disc === 2){ score -= Math.max(0, pb - 3) * 0.8; if(b[3] < 0 || b[3] >= 25) score += 0.8; } /* Löytöjä */
    if(orig !== 2 && isUnknown(b)) score -= 1.5; /* alkuperä epävarma: mukana, mutta alempana */
    if(lenSel !== 3 && !b[9]) score -= 2; /* pituus tuntematon */
    scored.push({i:i, score:score, hits:hits, matched:matched});
  }
  scored.sort(function(x, y){ return y.score - x.score; });
  var per = {}, top = [], rest = [];
  scored.forEach(function(s){ var au = B[s.i][1]; per[au] = (per[au] || 0) + 1; (per[au] <= 2 ? top : rest).push(s); });
  return top.concat(rest);
}
function reasonOf(s){
  if(!s.matched || !s.matched.length) return '';
  var m = s.matched.map(function(x, n){
    var t = x === 'fav' ? T('likeFav') : x === 'saved' ? T('likeSaved') : tx(x.t);
    if(n === 0) return t.charAt(0).toUpperCase() + t.slice(1);
    return /^(Helsinki|Helsingfors|Lappi|Lappland|Lapland|Euroopan|Finnish|Other Nordic)/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
  });
  return (m.length > 1 ? m.slice(0, -1).join(', ') + ' ' + T('and') + ' ' + m[m.length - 1] : m[0]) + '.';
}
function prefsText(a){
  var lines = QUESTIONS.map(function(q){
    var sel = (a[q.id] || []).map(function(k){ return q.id === 'age' && k === 5 ? T('yearsWord') + ' ' + yearRange().join('–') : tx(q.options[k].t); });
    return '- ' + tx(q.text) + ' ' + (sel.length ? sel.join(', ') : '–');
  });
  SLIDERS.forEach(function(s){ var v = (a.sl || {})[s.id] || 0; if(v) lines.push('- ' + tx(s.left) + ' – ' + tx(s.right) + ': ' + sliderText(s, v)); });
  if($('liked').value.trim()) lines.push('- ' + T('likedTitle') + ': ' + $('liked').value.trim());
  return lines.join('\n');
}
var recState = {ranked:[], base:[], shown:0, ctl:null, a:null};
function recommend(){
  if(!D) return;
  var a = getAnswers(); saveAnswers();
  if(recState.ctl) recState.ctl.abort();
  var ranked = rank(a);
  ranked = sortItems(ranked, $('recSort').value, function(s){ return s.i; });
  recState = {ranked:ranked, base:ranked.slice().sort(function(x, y){ return x._o - y._o; }), shown:0, ctl:null, a:a};
  $('results').hidden = false; $('recList').innerHTML = ''; $('aiCard').hidden = true; $('recNote').textContent = '';
  if(!ranked.length){
    $('resultsSub').textContent = T('noResults');
    $('moreBtn').hidden = true; $('aiBtn').hidden = true; $('shareRecs').hidden = true;
  } else {
    $('resultsSub').textContent = T('nResults', {n:fmt(ranked.length)});
    showMore(12);
    $('aiBtn').hidden = !aiAvailable; $('shareRecs').hidden = false;
  }
  $('results').scrollIntoView({behavior:REDUCED_M ? 'auto' : 'smooth'});
  setTimeout(function(){ try{ $('hResults').focus({preventScroll:true}); }catch(e){} }, 300);
}
function rerenderRecs(){
  if(!recState.ranked.length || $('results').hidden) return;
  var n = Math.max(12, recState.shown); recState.shown = 0; $('recList').innerHTML = ''; showMore(n);
  $('resultsSub').textContent = T('nResults', {n:fmt(recState.ranked.length)});
}
var aiAvailable = false;
sampleP.then(function(s){ aiAvailable = !!s; if(recState.ranked.length) $('aiBtn').hidden = !aiAvailable; });
async function askClaude(){
  var sample = await sampleP; if(!sample || !recState.ranked.length) return;
  var a = recState.a, cand = recState.base.slice(0, 70);
  var list = cand.map(function(s, n){
    var b = B[s.i];
    return n + ' | ' + b[0] + ' | ' + b[1] + ' | ' + (b[2] || '?') + ' | ' + b[4].slice(0, 10).map(function(i){ return V[i]; }).join(', ');
  }).join('\n');
  var prompt = 'Olet kokenut kirjastonhoitaja ja kirjallisuuskriitikko. Valitse lukijalle 10 parasta romaania alla olevasta ehdokaslistasta.\n\n'
    + 'LUKIJAN TOIVEET\n' + prefsText(a) + '\n\n'
    + 'EHDOKKAAT (numero | nimi | tekijä | vuosi | kirjaston asiasanat)\n' + list + '\n\n'
    + 'Ohjeet:\n- Valitse vain listalta. Valitse sen perusteella, miten hyvin kirja sopii toiveisiin. Älä suosi kirjaa vain siksi, että se on tunnettu tai suosittu: ota mukaan myös vähemmän tunnettuja ja pienten kustantamojen teoksia, kun ne sopivat. Jos lukija toivoo löytöjä, suosi niitä selvästi.\n'
    + '- Jos lukija mainitsi pitämiään kirjoja, suosi samankaltaisia mutta älä valitse niitä itseään.\n- Vältä saman kirjailijan useampaa teosta ja saman sarjan useampaa osaa; sarjasta valitse ensimmäinen osa, jos se on listalla.\n'
    + '- Kirjoita jokaiselle 1–2 lauseen perustelu ' + T('claudeLang') + ', hyvällä ja luontevalla kielellä: mistä kirjassa on kyse ja miksi se sopii juuri tälle lukijalle. Älä aloita perustelua kirjan nimellä. Älä keksi tietoja; jos et tunne kirjaa, perustele asiasanojen avulla.\n\n'
    + 'Vastaa vain JSON-oliolla: {"picks":[{"n":0,"why":"..."}]}';
  var ctl = new AbortController(); recState.ctl = ctl;
  $('aiCard').hidden = false; $('aiBtn').disabled = true; $('recNote').textContent = '';
  try{
    var res = await sample.json(prompt, {signal:ctl.signal});
    if(recState.ctl !== ctl) return;
    var picks = (res && Array.isArray(res.picks) ? res.picks : []).filter(function(p){ return cand[p.n]; });
    if(!picks.length) throw {code:'empty'};
    var used = {}; $('recList').innerHTML = '';
    picks.forEach(function(p){ if(used[p.n]) return; used[p.n] = 1; var s = cand[p.n]; $('recList').appendChild(bookCard(B[s.i], String(p.why || ''), s.hits)); });
    var usedI = {}; Object.keys(used).forEach(function(n){ usedI[cand[n].i] = 1; });
    recState.ranked = recState.ranked.filter(function(s){ return !usedI[s.i]; });
    recState.base = recState.base.filter(function(s){ return !usedI[s.i]; });
    recState.shown = 0;
    $('resultsSub').textContent = T('claudePicked');
    $('aiBtn').hidden = true;
  }catch(e){
    if(e && e.code === 'cancelled') return;
    $('recNote').textContent = e && e.code === 'not_granted' ? T('claudeDenied') : T('claudeFailed');
  }finally{
    if(recState.ctl === ctl){ $('aiCard').hidden = true; $('aiBtn').disabled = false; $('moreBtn').hidden = recState.shown >= recState.ranked.length; }
  }
}
function showMore(n){
  var end = Math.min(recState.ranked.length, recState.shown + n);
  for(var k = recState.shown; k < end; k++){ var s = recState.ranked[k]; $('recList').appendChild(bookCard(s.row || B[s.i], s.why ? s.why() : reasonOf(s), s.hits)); }
  recState.shown = end;
  $('moreBtn').hidden = end >= recState.ranked.length;
}
$('recBtn').addEventListener('click', recommend);
$('resetBtn').addEventListener('click', function(){
  if(recState.ctl) recState.ctl.abort();
  applyAnswers({}); $('liked').value = ''; saveAnswers();
  recState = {ranked:[], base:[], shown:0, ctl:null, a:null};
  $('recList').innerHTML = ''; $('results').hidden = true; $('aiCard').hidden = true; $('recNote').textContent = T('resetDone');
  window.scrollTo({top:0, behavior:REDUCED_M ? 'auto' : 'smooth'});
});
$('aiBtn').addEventListener('click', askClaude);
$('moreBtn').addEventListener('click', function(){ showMore(12); });

/* ---------- Kuvaus (vain Claudessa) ----------
   Finnan kuvaukset ovat usein kustantajien takakansitekstejä, joiden käyttö muualla ei ole sallittua.
   Siksi kuvauksen kirjoittaa pyydettäessä Claude, joka saa ohjeen olla keksimättä mitään. */
async function describe(card){
  var b = card._b, sample = await sampleP; if(!sample) return;
  var box = card.querySelector('.bk-desc');
  if(!box){ box = el('div', 'bk-desc'); box.setAttribute('role', 'status'); card.querySelector('.bk-actions').before(box); }
  box.innerHTML = ''; box.appendChild(el('span', null, T('describing')));
  var ser = b[7] ? String(b[7]).split('|') : null;
  var prompt = 'Kirjoita lyhyt esittely romaanista ' + T('claudeLang') + '.\n\n'
    + 'Nimi: ' + b[0] + '\nKirjailija: ' + (b[1] || 'tuntematon') + '\nEnsimmäinen suomenkielinen painos: ' + (b[2] || 'tuntematon')
    + (ser ? '\nSarja: ' + ser[0] + (ser[1] ? ', osa ' + ser[1] : '') : '')
    + '\nKirjaston asiasanat: ' + b[4].slice(0, 20).map(function(i){ return V[i]; }).join(', ') + '\n\n'
    + 'Tärkeää: älä keksi mitään. Aseta known arvoon true vain, jos tunnet juuri tämän kirjan (sama nimi ja kirjailija) varmasti. '
    + 'Silloin kirjoita 2–4 lauseen esittely: lähtötilanne, keskeiset teemat ja tyyli ilman juonipaljastuksia. Mainitse henkilöiden nimiä vain, jos olet niistä varma. '
    + 'Jos et tunne kirjaa varmasti, aseta known arvoon false ja kirjoita 1–2 lauseen kuvaus pelkästään asiasanojen perusteella, ilman yhtään asiasanoista puuttuvaa yksityiskohtaa. '
    + 'Älä aloita kirjan nimellä. Vastaa vain JSON-oliolla: {"known": true, "text": "..."}';
  try{
    var r = await sample.json(prompt, {cache:{gcTime:86400000}});
    if(!r || !r.text) throw {code:'empty'};
    box.innerHTML = '';
    box.appendChild(el('span', null, String(r.text)));
    box.appendChild(el('small', null, r.known ? T('descKnown') : T('descUnknown')));
  }catch(e){
    box.innerHTML = ''; box.appendChild(el('small', null, e && e.code === 'not_granted' ? T('descDenied') : T('descFailed')));
  }
}
document.addEventListener('click', function(e){
  var bt = e.target.closest('[data-desc]'); if(!bt) return;
  var card = bt.closest('.book'); if(card && card._b){ bt.disabled = true; describe(card).finally(function(){ bt.disabled = false; }); }
});

/* ---------- Järjestys ---------- */
var COLL = new Intl.Collator('fi', {sensitivity:'base', numeric:true});
function surname(a){
  var p = String(a || '').replace(/\([^)]*\)/g, ' ').trim().split(/\s+/); if(!p.length) return '';
  var i = p.length - 1;
  while(i > 0 && /^(von|van|der|den|de|la|le|du|di|da|del|af|zu)$/i.test(p[i - 1])) i--;
  return p.slice(i).join(' ');
}
function sortItems(items, mode, idxOf){
  items.forEach(function(it, k){ if(it._o == null) it._o = k; });
  function R(x){ return x.row || B[idxOf(x)]; }
  var cmp = {
    rel:function(x, y){ return x._o - y._o; },
    pop:function(x, y){ return pop(R(y)) - pop(R(x)) || x._o - y._o; },
    'new':function(x, y){ return (R(y)[2] || 0) - (R(x)[2] || 0) || x._o - y._o; },
    old:function(x, y){ return (R(x)[2] || 9999) - (R(y)[2] || 9999) || x._o - y._o; },
    title:function(x, y){ return COLL.compare(R(x)[0], R(y)[0]); },
    author:function(x, y){ var a = R(x), b = R(y); return COLL.compare(surname(a[1]), surname(b[1])) || COLL.compare(a[1], b[1]) || (a[2] || 0) - (b[2] || 0); }
  }[mode] || function(x, y){ return x._o - y._o; };
  return items.slice().sort(cmp);
}
$('recSort').addEventListener('change', function(){
  if(!recState.base.length) return;
  recState.ranked = sortItems(recState.base, $('recSort').value, function(s){ return s.i; });
  recState.shown = 0; $('recList').innerHTML = ''; showMore(12);
});
$('sSort').addEventListener('change', function(){
  if(!sState.base) return;
  sState.res = sortItems(sState.base, $('sSort').value, function(r){ return r[0]; });
  sState.shown = 0; $('sList').innerHTML = ''; sMore();
});

/* ---------- Samankaltaiset ---------- */
var IDF = null;
function similarTo(b){
  if(!IDF || IDF.length !== V.length){ var df = new Float32Array(V.length); B.forEach(function(x){ x[4].forEach(function(i){ df[i]++; }); }); IDF = Array.prototype.map.call(df, function(c){ return Math.log((B.length + 1) / (c + 1)); }); }
  var mine = {}; b[4].forEach(function(i){ mine[i] = 1; });
  var k0 = keyOf(b), res = [];
  for(var i = 0; i < B.length; i++){
    var x = B[i], s = 0, n = 0;
    for(var j = 0; j < x[4].length; j++) if(mine[x[4][j]]){ s += IDF[x[4][j]]; n++; }
    if(n < 2 || keyOf(x) === k0) continue;
    if(n >= 5 && n >= 0.8 * b[4].length && n >= 0.8 * x[4].length) continue; /* sama teos toisella nimellä tai kielellä */
    res.push([i, s + pop(x) * 0.6 + (x[1] === b[1] ? -8 : 0)]);
  }
  res.sort(function(p, q){ return q[1] - p[1]; });
  var per = {}, out = [];
  res.forEach(function(r){ var au = B[r[0]][1]; per[au] = (per[au] || 0) + 1; if(per[au] <= 2) out.push(r); });
  return out;
}
document.addEventListener('click', function(e){
  var bt = e.target.closest('[data-sim]'); if(!bt) return;
  var card = bt.closest('.book'); if(!card || !card._b || !D) return;
  var b = card._b;
  showView('search');
  $('q').value = '';
  var simRes = similarTo(b); simRes.forEach(function(r, k){ r._o = k; });
  sState = {base:simRes, res:sortItems(simRes, $('sSort').value, function(r){ return r[0]; }), shown:0, sim:b};
  $('sList').innerHTML = '';
  $('sCount').textContent = T('similarTo', {t:b[0], a:b[1]});
  sMore();
});

/* ---------- Haku ---------- */
var sState = {res:[], shown:0}, sTimer = 0;
function renderSearch(){
  if(!D) return;
  ensureIdx();
  var q = fold($('q').value.trim()), toks = q ? q.split(/\s+/) : [];
  var fD = $('fDom').checked, fT = $('fTr').checked, fA = $('fAudio').checked, fN = $('fNew').checked, fY = $('fYoung').checked;
  var res = [];
  for(var i = 0; i < B.length; i++){
    var b = B[i], f = b[5];
    if(fD && !isDom(b)) continue; if(fT && !isTr(b)) continue; if(fA && !(f & F_AUDIO)) continue;
    if(fN && !(b[2] >= 2015)) continue; if(fY && !(f & F_YOUNG)) continue;
    var s = IDX[i], ok = true;
    for(var t = 0; t < toks.length; t++) if(s.indexOf(toks[t]) < 0){ ok = false; break; }
    if(!ok) continue;
    var bonus = 0;
    if(toks.length){ var title = fold(b[0]), au = fold(b[1]); if(title === q) bonus += 100; else if(title.indexOf(q) === 0) bonus += 30; else if(title.indexOf(q) >= 0) bonus += 8; if(au.indexOf(q) >= 0) bonus += 35; }
    res.push([i, bonus + pop(b)]);
  }
  res.sort(function(x, y){ return y[1] - x[1]; });
  sState = {base:res, res:sortItems(res, $('sSort').value, function(r){ return r[0]; }), shown:0};
  $('sList').innerHTML = '';
  $('sCount').textContent = T('nNovels', {n:fmt(res.length)});
  sMore();
}
function sMore(){
  var end = Math.min(sState.res.length, sState.shown + 30);
  for(var k = sState.shown; k < end; k++) $('sList').appendChild(bookCard(B[sState.res[k][0]]));
  sState.shown = end; $('sMore').hidden = end >= sState.res.length;
}
$('q').addEventListener('input', function(){ clearTimeout(sTimer); sTimer = setTimeout(renderSearch, 180); });
$('sFilters').addEventListener('change', renderSearch);
$('sMore').addEventListener('click', sMore);

/* ---------- Oma lista ---------- */
function renderMyList(){
  var wrap = $('myList'); wrap.innerHTML = '';
  saved.forEach(function(b){ wrap.appendChild(bookCard(b)); });
  $('myEmpty').hidden = saved.length > 0;
}
