/* ---------- Nyt luetaan: Kirjakauppaliiton Mitä Suomi lukee -listat ----------
   Listat (msl.json) päivittyvät GitHubissa viikoittain. Kirjat yhdistetään aineistoon nimen ja sukunimen perusteella;
   aineistosta puuttuvat uutuudet näytetään silti linkkeineen. */
var MSL = null, MSLI = {}, NOW = {m:0, f:'kaikki-formaatit', c:null};
var FORMAT_NAMES = {
  'kaikki-formaatit':L('Kaikki', 'Alla', 'All'), 'painetut-kirjat':L('Painetut', 'Tryckta', 'Print'),
  'aanikirjat':L('Äänikirjat', 'Ljudböcker', 'Audio'), 'sahkokirjat':L('E-kirjat', 'E-böcker', 'E-books'), 'pokkarit':L('Pokkarit', 'Pocket', 'Paperbacks')
};
var CAT_NAMES = {
  'kaikki genret':L('Kaikki lajit', 'Alla genrer', 'All genres'), 'kotimainen kaunokirjallisuus':L('Kotimainen kaunokirjallisuus', 'Inhemsk skönlitteratur', 'Finnish fiction'),
  'käännetty kaunokirjallisuus':L('Käännetty kaunokirjallisuus', 'Översatt skönlitteratur', 'Translated fiction'), 'lasten ja nuorten kirjat':L('Lasten ja nuorten kirjat', 'Barn- och ungdomsböcker', 'Children and young adults'),
  'tietokirjat':L('Tietokirjat', 'Facklitteratur', 'Non-fiction'), 'pokkarit':L('Pokkarit', 'Pocketböcker', 'Paperbacks')
};
function catName(c){ var o = CAT_NAMES[String(c).toLowerCase()]; return o ? tx(o) : c; }
function monthName(m){ try{ return new Date(m.year, m.month - 1, 15).toLocaleDateString(LOCALE[LANG], {month:'long', year:'numeric'}); }catch(e){ return m.month + '/' + m.year; } }
function isFiction(cat){ return /kaunokirjallisuus|pokkarit/i.test(cat); }
function isNonfic(cat){ return /tietokirj/i.test(cat); }
/* Nimi ja sukunimi vertailukelpoisiksi */
function ttl(s){ return String(s || '').toLowerCase().replace(/\s+[–—-]\s+.*$/, '').replace(/\s*[:;\/(].*$/, '').replace(/[^0-9a-zåäöüéèæøß ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function listAuthor(a){ /* "Kinnunen Tommi, Toinen Tekijä" -> "Tommi Kinnunen, Tekijä Toinen" */
  return String(a || '').split(/\s*,\s*/).map(function(p){ var w = p.split(/\s+/); return w.length > 1 ? w.slice(1).join(' ') + ' ' + w[0] : p; }).join(', ');
}
var TTL = null;
function matchRow(it){
  if(!TTL){ TTL = {}; B.forEach(function(b, i){ var k = ttl(b[0]); (TTL[k] = TTL[k] || []).push(i); }); }
  var sur = String(it.a || '').split(/[\s,]+/)[0].toLowerCase();
  var c = (TTL[ttl(it.t)] || []).filter(function(i){ return !sur || String(B[i][1]).toLowerCase().indexOf(sur) >= 0; });
  return c.length ? c[0] : -1;
}
async function loadMsl(){
  try{
    var res = await fetch('msl.json'); if(!res.ok) return;
    MSL = await res.json(); if(!MSL || !MSL.months || !MSL.months.length){ MSL = null; return; }
    MSL.months.forEach(function(m){ m.lists.forEach(function(l){ l.items.forEach(function(it){ it.i = matchRow(it); }); }); });
    /* Paras sijoitus tuoreimmalla kuukaudella kaunokirjallisuuden listoilla, korttien merkintää varten */
    MSLI = {};
    MSL.months[0].lists.forEach(function(l){ if(!isFiction(l.category) && !isNonfic(l.category)) return; l.items.forEach(function(it){ if(it.i >= 0 && (!MSLI[it.i] || it.r < MSLI[it.i])) MSLI[it.i] = it.r; }); });
    if(!$('viewNow').hidden) renderNow();
  }catch(e){ MSL = null; }
}
function mslRankOf(b){ if(!MSL || !D) return 0; ensureMaps(); var i = KEYIDX[keyOf(b)]; return i != null && MSLI[i] ? MSLI[i] : 0; }
function trendText(t){ return {new:T('trendNew'), up:T('trendUp'), still:T('trendStill'), down:T('trendDown')}[t] || ''; }
function rowFor(it){ return it.i >= 0 ? B[it.i] : [it.t, listAuthor(it.a), 0, P.indexOf(it.p), [], 0, 0, '', '', 0, 0]; }
function renderNow(){
  $('nowSource').textContent = T('nowSource');
  if(!MSL){ $('nowSub').textContent = ''; $('nowNote').textContent = D ? T('nowError') : T('loading'); $('nowList').innerHTML = ''; return; }
  $('nowNote').textContent = '';
  var m = MSL.months[NOW.m] || MSL.months[0];
  $('nowSub').textContent = T('nowSub', {m:monthName(MSL.months[0])});
  /* Kuukausi */
  var ms = $('nowMonthSeg'); ms.innerHTML = '';
  MSL.months.forEach(function(mo, k){ var bt = el('button', null, monthName(mo)); bt.type = 'button'; bt.setAttribute('role', 'radio'); bt.dataset.k = String(k); bt.setAttribute('aria-checked', String(k === NOW.m)); bt.tabIndex = k === NOW.m ? 0 : -1; ms.appendChild(bt); });
  /* Muoto */
  var formats = []; m.lists.forEach(function(l){ if(formats.indexOf(l.format) < 0) formats.push(l.format); });
  if(formats.indexOf(NOW.f) < 0) NOW.f = formats[0];
  var fs = $('nowFormatSeg'); fs.innerHTML = '';
  formats.forEach(function(f){ var bt = el('button', null, tx(FORMAT_NAMES[f]) || f); bt.type = 'button'; bt.setAttribute('role', 'radio'); bt.dataset.f = f; bt.setAttribute('aria-checked', String(f === NOW.f)); bt.tabIndex = f === NOW.f ? 0 : -1; fs.appendChild(bt); });
  /* Laji */
  var lists = m.lists.filter(function(l){ return l.format === NOW.f; });
  if(!lists.some(function(l){ return l.category === NOW.c; })) NOW.c = (lists.filter(function(l){ return isFiction(l.category); })[0] || lists[0]).category;
  var cs = $('nowCats'); cs.innerHTML = '';
  lists.forEach(function(l, k){
    var lab = el('label', 'chip'), inp = el('input'); inp.type = 'radio'; inp.name = 'nowcat'; inp.id = 'nowcat-' + k; inp.value = l.category; inp.checked = l.category === NOW.c;
    lab.appendChild(inp); lab.appendChild(el('span', null, catName(l.category))); cs.appendChild(lab);
  });
  var list = lists.filter(function(l){ return l.category === NOW.c; })[0];
  if(list && isNonfic(list.category) && NF_STATE === 0) loadNF();
  var w = $('nowList'); w.innerHTML = '';
  if(!list) return;
  list.items.forEach(function(it){
    var card = bookCard(rowFor(it), T('nowRank', {r:it.r}) + (it.trend ? ' · ' + trendText(it.trend) : '') + (it.i < 0 ? ' · ' + T('nowNotInData') : ''));
    card.classList.add('ranked'); card.dataset.rank = String(it.r);
    w.appendChild(card);
  });
  var a = el('a', null, T('nowOpen')); a.href = list.url; a.target = '_blank'; a.rel = 'noopener';
  var p = el('p', 'note'); p.appendChild(a); w.appendChild(p);
}
$('nowMonthSeg').addEventListener('click', function(e){ var b = e.target.closest('button'); if(b){ NOW.m = +b.dataset.k; renderNow(); } });
$('nowFormatSeg').addEventListener('click', function(e){ var b = e.target.closest('button'); if(b){ NOW.f = b.dataset.f; renderNow(); } });
$('nowCats').addEventListener('change', function(e){ if(e.target.name === 'nowcat'){ NOW.c = e.target.value; renderNow(); } });
['nowMonthSeg', 'nowFormatSeg'].forEach(function(id){
  $(id).addEventListener('keydown', function(e){
    if(['ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0) return;
    var bs = Array.prototype.slice.call($(id).querySelectorAll('button')), i = bs.indexOf(document.activeElement); if(i < 0) return;
    var n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; e.preventDefault(); n.click(); setTimeout(function(){ var x = $(id).querySelector('[aria-checked="true"]'); if(x) x.focus(); }, 0);
  });
});
/* Pikavalinta "Juuri nyt suosittua": tuoreimpien listojen kaunokirjat parhaan sijoituksen mukaan */
function recommendNow(){
  if(!ready()) return;
  var want = MODE === 'nf' ? isNonfic : isFiction;
  if(!MSL){ $('results').hidden = false; $('recList').innerHTML = ''; $('resultsSub').textContent = T('nowError'); return; }
  var best = {}, seen = {};
  MSL.months[0].lists.forEach(function(l){
    if(!want(l.category)) return;
    l.items.forEach(function(it){
      var key = it.i >= 0 ? 'i' + it.i : ttl(it.t) + '|' + it.a;
      if(!best[key] || it.r < best[key].r) best[key] = {r:it.r, it:it, cat:l.category, f:l.format};
    });
  });
  var items = Object.keys(best).map(function(k){ return best[k]; }).sort(function(a, b){ return a.r - b.r; });
  if(recState.ctl) recState.ctl.abort();
  var ranked = items.map(function(x, n){
    if(seen[x.it.t]) return null; seen[x.it.t] = 1;
    return {i:x.it.i, row:rowFor(x.it), _o:n, matched:[], why:function(){ return T('nowWhy', {c:catName(x.cat), f:(tx(FORMAT_NAMES[x.f]) || '').toLowerCase(), r:x.r}); }};
  }).filter(Boolean);
  recState = {ranked:ranked, base:ranked.slice(), shown:0, ctl:null, a:getAnswers()};
  $('results').hidden = false; $('recList').innerHTML = ''; $('aiCard').hidden = true; $('aiBtn').hidden = true; $('recNote').textContent = '';
  $('resultsSub').textContent = T('nowRecs', {n:fmt(ranked.length), m:monthName(MSL.months[0])});
  $('shareRecs').hidden = false;
  showMore(20);
  $('results').scrollIntoView({behavior:REDUCED_M ? 'auto' : 'smooth'});
  setTimeout(function(){ try{ $('hResults').focus({preventScroll:true}); }catch(e){} }, 300);
}
