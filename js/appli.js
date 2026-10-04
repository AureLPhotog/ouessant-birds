/* Oiseaux d'Ouessant — logique de l'appli (index.html). Textes : js/textes.js ; carte : js/carte.js ; recherche : js/recherche.js */
(function(){
  // Outils partagés : carte de l'île (js/carte.js) et recherche tolérante aux fautes (js/recherche.js)
  const { GRID_X, GRID_Y, MAP_W, toPixel, fromPixel, cellIdx, cellName, cellAt, cellsCenter, distM, parseCoords } = window.OuessantCarte;
  const fuzzy = window.OuessantRecherche.fuzzy;
  const APP_VERSION = '3.0';
  let listsDate = null;
  function showVersion(){
    const el = document.getElementById('version'); if (!el) return;
    const d = listsDate ? new Date(listsDate) : null;
    el.textContent = 'v' + APP_VERSION + (d && !isNaN(d) ? ' · ' + T('listsOf')(d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')) : '');
  }
  const URL_DATA = 'ouessant_birds.json';

  const K_FR = 'Nom Français', K_SCI = 'Nom Scientifique', K_EN = 'Nom Anglais', K_TYPE = 'Type de taxon', K_CANAL = 'Proposition de Canal de Diffusion Ouessant';
  const STORE = 'ouessant-birds-data', LANG_KEY = 'ouessant-birds-lang';
  const COLORS = ['#B4532A','#2C7A6B','#8C5E83','#3E6FA8','#A3802A','#5E676B','#B03A5B','#4F7A2C'];
  // WhatsApp en vert, Telegram en bleu, pas d'annonce en gris
  // Palettes : standard, et adaptée au daltonisme (couleurs d'Okabe & Ito, distinguables par la plupart des daltoniens)
  const PALETTES = {
    std: { telegram: '#2A9FD8', whatsapp: '#25A244', none: '#8A949A', sq: '214,40,40', verified: '#D62828', proposed: '#1F7A5A', user: '#2B7BE4', num: '#1F3A4D' },
    cvd: { telegram: '#0072B2', whatsapp: '#E69F00', none: '#8A949A', sq: '0,114,178', verified: '#D55E00', proposed: '#009E73', user: '#CC79A7', num: '#000000' }
  };
  const THEME_KEY = 'ouessant-theme', CVD_KEY = 'ouessant-cvd';
  let cvd = false;
  try { cvd = localStorage.getItem(CVD_KEY) === '1'; } catch(_) {}
  const isDark = () => { const t = document.documentElement.getAttribute('data-theme'); return t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches); };
  // en sombre, le bleu foncé d'Okabe & Ito ressort mal : on prend son bleu ciel
  const PAL = () => (cvd && isDark()) ? Object.assign({}, PALETTES.cvd, { telegram: '#56B4E9' }) : PALETTES[cvd ? 'cvd' : 'std'];
  const CHANNEL_COLORS = new Proxy({}, { get: (_, k) => PAL()[k] });
  function canalKind(c){
    const n = String(c || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    return n.startsWith('tele') ? 'telegram' : n.startsWith('whats') ? 'whatsapp' : (n.startsWith('pas') || n === 'xx_non') ? 'none' : '';
  }

  const I18N = window.OUESSANT_TEXTES;

  let lang = 'fr';
  try { lang = localStorage.getItem(LANG_KEY) || ''; } catch(_) {}
  if (!I18N[lang]) lang = (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const T = k => I18N[lang][k];

  let submitted = false;
  let birds = [], fuse = null, channels = [], counts = {}, activeChannel = null, colorOf = {}, sourceKey = null, showingImport = false;

  const $ = id => document.getElementById(id);
  const q = $('q'), results = $('results'), notice = $('notice'), status = $('status'), chips = $('chips'), clearBtn = $('clear'), sspBox = $('ssp');

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const isSsp = b => norm(b[K_TYPE]).startsWith('sous');

  // Le canal reste stocké tel quel dans les données ; seul son libellé est traduit.
  function canalOf(b){ return (b[K_CANAL] || '').trim() || '—'; }
  function canalLabel(c){
    const n = norm(c);
    const ch = I18N[lang].channels;
    if (n.startsWith('tele')) return ch.telegram;
    if (n.startsWith('whats')) return ch.whatsapp;
    if (n.startsWith('pas') || n === 'xx_non') return ch.none;
    if (c === '—') return ch.unknown;
    return c;
  }
  // Nom principal selon la langue (repli sur le français si l'anglais manque)
  const mainName = b => (lang === 'en' && b[K_EN]) ? b[K_EN] : b[K_FR];
  const altName  = b => lang === 'en' ? b[K_FR] : b[K_EN];

  function highlight(text, query){
    const t = String(text ?? '');
    if(!query) return esc(t);
    const i = norm(t).indexOf(norm(query));
    if(i < 0) return esc(t);
    return esc(t.slice(0,i)) + '<mark>' + esc(t.slice(i, i+query.length)) + '</mark>' + esc(t.slice(i+query.length));
  }

  // Le texte d'intro change selon l'onglet : on lui réserve la hauteur du plus long des trois,
  // pour que l'en-tête (et le phare) garde la même hauteur quel que soit l'onglet, l'écran ou la langue.
  function fixLedeHeight(){
    const lede = document.querySelector('.lede'); if (!lede || !lede.offsetWidth) return;
    const m = lede.cloneNode(false);
    m.removeAttribute('id'); m.setAttribute('aria-hidden', 'true');
    Object.assign(m.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', minHeight: '0', width: lede.offsetWidth + 'px' });
    lede.parentNode.appendChild(m);
    let h = 0;
    ['lede', 'ledePlaces', 'ledeWhere'].forEach(k => { m.innerHTML = T(k); h = Math.max(h, m.offsetHeight); });
    m.remove();
    lede.style.minHeight = h + 'px';
  }
  let lt;
  window.addEventListener('resize', () => { clearTimeout(lt); lt = setTimeout(fixLedeHeight, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fixLedeHeight);

  function applyLang(){
    document.documentElement.lang = lang;
    document.title = T('docTitle');
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = T(el.dataset.t); });
    fixLedeHeight();
    document.querySelector('.lede').innerHTML = T({ places: 'ledePlaces', where: 'ledeWhere' }[tab] || 'lede');
    pq.placeholder = T('pPlaceholder'); pq.setAttribute('aria-label', T('pLabel'));
    renderPlaces();
    renderWhere();
    if (!$('newBirdPanel').hidden) $('newBirdPanel').innerHTML = birdFormHtml(null);
    if (lastFix) $('locate').querySelector('span').textContent = T('relocateBtn');
    $('phareBtn').setAttribute('aria-label', T('phareLabel')); $('phareBtn').title = T('phareLabel');
    if (!$('pharePanel').hidden) renderPhare();
    q.placeholder = T('placeholder');
    q.setAttribute('aria-label', T('searchLabel'));
    chips.setAttribute('aria-label', T('channelsLabel'));
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    if (showingImport) showImport();
    else if (!birds.length) status.textContent = T('loading');
    else { buildChips(); updateSource(); render(); }
  }

  function buildChips(){
    chips.innerHTML = '';
    const mk = (label, value, n) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip';
      b.setAttribute('aria-pressed', String(activeChannel === value));
      b.innerHTML = (value ? `<span class="dot" style="background:${colorOf[value]}"></span>` : '') + esc(label) + ` <span class="n">${n}</span>`;
      b.onclick = () => { activeChannel = value; [...chips.children].forEach(x => x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); render(); };
      chips.appendChild(b);
    };
    mk(T('all'), null, birds.length);
    channels.forEach(c => mk(canalLabel(c), c, counts[c]));
  }

  function updateSource(){
    showVersion();
    const nSsp = birds.filter(isSsp).length;
    $('source').textContent = (sourceKey ? T(sourceKey) + ' · ' : '') + T('sourceCount')(birds.length - nSsp, nSsp);
    sspBox.closest('.opts').hidden = !nSsp;
  }

  function setData(data, key){
    if(!Array.isArray(data)) throw new Error('format');
    const list = data.filter(b => b && b[K_FR]);
    if(!list.length) throw new Error('vide');
    birds = list; sourceKey = key; showingImport = false;
    counts = {};
    birds.forEach(b => { const c = canalOf(b); counts[c] = (counts[c]||0)+1; });
    const RANK = { telegram: 0, whatsapp: 1, none: 2 };   // ordre : du plus rare au plus courant
    channels = Object.keys(counts).sort((a,b) => ((RANK[canalKind(a)] ?? 3) - (RANK[canalKind(b)] ?? 3)) || a.localeCompare(b,'fr'));
    colorOf = {}; channels.forEach((c,i) => colorOf[c] = CHANNEL_COLORS[canalKind(c)] || COLORS[i % COLORS.length]);
    if (activeChannel && !counts[activeChannel]) activeChannel = null;
    q.disabled = false;
    buildChips(); updateSource(); render();
  }

  let shownBirds = [];
  function render(){
    const raw = q.value.trim();
    const query = norm(raw);
    clearBtn.hidden = !raw;
    notice.innerHTML = '';

    let list, mode = 'all';
    if(!query){
      list = birds.slice();
    } else {
      const exact = birds.filter(b => [K_FR, K_SCI, K_EN].some(k => b[k] && norm(b[k]) === query));
      if(exact.length){ list = exact; mode = 'exact'; }
      else { list = fuzzy(birds, b => [b[K_FR], b[K_SCI], b[K_EN]], raw); mode = 'fuzzy'; }
    }
    if(activeChannel) list = list.filter(b => canalOf(b) === activeChannel);
    if(!sspBox.checked && mode !== 'exact') list = list.filter(b => !isSsp(b));
    if(mode !== 'fuzzy') list.sort((a,b) => mainName(a).localeCompare(mainName(b), lang));

    // Le message « première pour l'île » n'apparaît qu'une fois la recherche validée (Entrée)
    if(mode === 'fuzzy' && submitted){
      notice.innerHTML = `<div class="notice"><p>${(list.length ? T('fuzzyNear') : T('fuzzyNone'))(esc(raw))}</p>`
        + `<p style="margin-top:.5rem"><button type="button" class="link" id="newBirdFromSearch">${esc(T('newBirdQ'))}</button></p></div>`;
    }

    status.textContent = mode === 'exact' ? T('found')
      : mode === 'fuzzy' ? (list.length ? T('near')(list.length) : (submitted ? '' : T('noMatch')))
      : T('count')(list.length, !!activeChannel);

    shownBirds = list;
    if(!list.length){ results.innerHTML = ''; return; }
    results.innerHTML = '<ul class="list">' + list.map((b, i) => {
      const c = canalOf(b), alt = altName(b);
      return `<li class="row" data-bi="${i}">
        <span class="fr" lang="${lang === 'en' && b[K_EN] ? 'en' : 'fr'}">${highlight(mainName(b), raw)}${isSsp(b) ? `<span class="tag">${esc(T('ssp'))}</span>` : ''}</span>
        <span class="sci" lang="la">${highlight(b[K_SCI], raw)}</span>
        ${alt ? `<span class="en" lang="${lang === 'en' ? 'fr' : 'en'}">${highlight(alt, raw)}</span>` : ''}
        <span class="canal"><span class="dot" style="background:${colorOf[c]||'#5E676B'}"></span>${esc(canalLabel(c))}</span>
        <button type="button" class="bedit-btn" aria-expanded="false">${esc(T('proposeEdit'))}</button>
      </li>`;
    }).join('') + '</ul>';
  }

  function showImport(){
    showingImport = true;
    status.textContent = '';
    results.innerHTML = `<div class="empty">
      <h2>${esc(T('importTitle'))}</h2>
      <p>${T('importText')}</p>
      <label class="btn">${esc(T('importBtn'))}<input type="file" accept=".json,application/json" class="fileInput"></label>
    </div>`;
    bindFiles();
  }

  function bindFiles(){
    document.querySelectorAll('.fileInput').forEach(inp => inp.onchange = e => {
      const f = e.target.files && e.target.files[0]; if(!f) return;
      const r = new FileReader();
      r.onload = () => {
        try{
          const data = JSON.parse(r.result);
          setData(data, 'sourceFile');
          try{ localStorage.setItem(STORE, JSON.stringify(data)); }catch(_){}
        }catch(err){
          notice.innerHTML = `<div class="notice"><p>${esc(T('badFile'))}</p></div>`;
        }
      };
      r.readAsText(f);
      e.target.value = '';
    });
  }

  // ---------- Lieux d'Ouessant ----------
  // [nom, carrés de la carte, latitude, longitude, précision en mètres (20 = position exacte)]
  const PLACES_EMBEDDED = [];   // la liste vient de lieux_ouessant.json, à côté de l'appli
  const pq = $('pq'), pclear = $('pclear'), pstatus = $('pstatus'), presults = $('presults');
  // Entrée interne : [nom, carrés, lat, lon, précision (m), vérifiée sur le terrain]
  let PLACES = PLACES_EMBEDDED.map(p => [p[0], p[1], p[2], p[3], p[4], false]);
  function buildPfuse(){}   // (la recherche des lieux n'a plus besoin d'index)
  buildPfuse();
  const PLACES_URL = 'lieux_ouessant.json';
  // Formulaire Google : colle ici le « lien prérempli » obtenu en tapant LIEU, CARRES, ACTUELLE, PROPOSEE,
  // METHODE, COMMENTAIRE et JSON dans les champs.
  const FORM_PREFILL = 'https://docs.google.com/forms/d/e/1FAIpQLScOxBBEcdsk4Z2v-LVrY8xLXXabd04wU5Y1RU30lyCRPXbvsA/viewform?usp=pp_url&entry.1650810107=LIEU&entry.1922090503=CARRES&entry.1319372064=ACTUELLE&entry.1632270140=PROPOSEE&entry.1990808669=METHODE&entry.1661757736=COMMENTAIRE&entry.1256600801=JSON';
  const FORM = (() => {
    try {
      if (!FORM_PREFILL) return null;
      const u = new URL(FORM_PREFILL), map = {};
      u.searchParams.forEach((v, k) => { if (k.startsWith('entry.')) map[v.trim().toUpperCase()] = k; });
      if (!map.LIEU || !map.PROPOSEE || !map.JSON) return null;
      return { base: u.origin + u.pathname, map };
    } catch (_) { return null; }
  })();
  // Formulaire Google « oiseaux » : lien prérempli obtenu en tapant TYPE, FR, SCI, EN, TAXON, CANAL, ACTUEL,
  // COMMENTAIRE et JSON dans les champs.
  const FORM_BIRDS_PREFILL = 'https://docs.google.com/forms/d/e/1FAIpQLSd2f4fi6E3XW0KR2Cqq1wZNqfj4cLG9cWueWjDffeZK4BfYog/viewform?usp=pp_url&entry.598969188=TYPE&entry.840488517=FR&entry.441655997=SCI&entry.1638519433=EN&entry.1127568963=TAXON&entry.810151131=CANAL&entry.1939945856=ACTUEL&entry.1244273965=COMMENTAIRE&entry.1010965311=JSON';
  const FORM_BIRDS = (() => {
    try {
      if (!FORM_BIRDS_PREFILL) return null;
      const u = new URL(FORM_BIRDS_PREFILL), map = {};
      u.searchParams.forEach((v, k) => { if (k.startsWith('entry.')) map[v.trim().toUpperCase()] = k; });
      if (!map.FR || !map.JSON) return null;
      return { base: u.origin + u.pathname, map };
    } catch (_) { return null; }
  })();
  function formUrlFor(F, f){
    const q = new URLSearchParams({ usp: 'pp_url' });
    Object.entries(f).forEach(([k, v]) => { if (F.map[k] && v) q.set(F.map[k], v); });
    return F.base + '?' + q.toString();
  }

  // ---------- Oiseaux : proposer une modification ou un nouvel oiseau ----------
  const TAXON_VALUES = ['espèce', 'sous-espèce'];
  function canalValues(){
    const v = channels.length ? channels.slice() : ['Télégram', 'Whatsapp', "Pas d'annonce"];
    return v.filter(c => c !== '—');
  }
  function birdFormHtml(b){
    const v = (k) => esc(b ? (b[k] || '') : '');
    const type = b ? (isSsp(b) ? 'sous-espèce' : 'espèce') : 'espèce';
    const canal = b ? canalOf(b) : '';
    return `<div class="sform bform">
      <p class="shelp">${esc(T(b ? 'bHelpEdit' : 'bHelpNew'))}</p>
      <label>${esc(T('fFR'))}<input type="text" data-f="fr" value="${v(K_FR)}" autocomplete="off"></label>
      <label>${esc(T('fSCI'))}<input type="text" data-f="sci" value="${v(K_SCI)}" autocomplete="off" lang="la"></label>
      <label>${esc(T('fEN'))}<input type="text" data-f="en" value="${v(K_EN)}" autocomplete="off" lang="en"></label>
      <label>${esc(T('fType'))}<select data-f="type">${TAXON_VALUES.map(t => `<option value="${t}"${t === type ? ' selected' : ''}>${esc(t === 'espèce' ? T('typeSp') : T('typeSsp'))}</option>`).join('')}</select></label>
      <label>${esc(T('fCanal'))}<select data-f="canal">${b ? '' : `<option value="">${esc(T('choose'))}</option>`}${canalValues().map(c => `<option value="${esc(c)}"${c === canal ? ' selected' : ''}>${esc(canalLabel(c))}</option>`).join('')}</select></label>
      <label>${esc(T('commentLabel'))}<textarea data-f="com" rows="2"></textarea></label>
      <button type="button" class="scheck" data-bact="prep">${esc(T('prep'))}</button>
      <div class="sresult" aria-live="polite"></div>
    </div>`;
  }
  function birdLine(o){
    return JSON.stringify({ [K_FR]: o.fr, [K_SCI]: o.sci, [K_EN]: o.en, [K_TYPE]: o.type, [K_CANAL]: o.canal });
  }
  function prepBird(form, orig){
    const res = form.querySelector('.sresult');
    const get = k => form.querySelector(`[data-f="${k}"]`).value.trim().replace(/\s+/g, ' ');
    const o = { fr: get('fr'), sci: get('sci'), en: get('en'), type: get('type'), canal: get('canal') }, com = get('com');
    if (!o.fr || !o.sci){ res.innerHTML = `<p class="bad">${esc(T('needFrSci'))}</p>`; return; }
    if (!o.canal){ res.innerHTML = `<p class="bad">${esc(T('needCanal'))}</p>`; return; }
    // doublons : un autre oiseau porte déjà ce nom français ou scientifique
    const clash = birds.find(b => b !== orig && (norm(b[K_FR]) === norm(o.fr) || norm(b[K_SCI]) === norm(o.sci)));
    if (clash){ res.innerHTML = `<p class="bad">${esc(orig ? T('bClash')(clash[K_FR]) : T('bDup')(clash[K_FR]))}</p>`; return; }
    let summary, actuel = '';
    if (orig){
      const before = { fr: orig[K_FR] || '', sci: orig[K_SCI] || '', en: orig[K_EN] || '', type: isSsp(orig) ? 'sous-espèce' : 'espèce', canal: canalOf(orig) };
      const labels = { fr: T('fFR'), sci: T('fSCI'), en: T('fEN'), type: T('fType'), canal: T('fCanal') };
      const show = (k, x) => k === 'canal' ? canalLabel(x) : (x || '—');
      const diffs = Object.keys(o).filter(k => o[k] !== before[k]);
      if (!diffs.length && !com){ res.innerHTML = `<p class="bad">${esc(T('noChange'))}</p>`; return; }
      summary = diffs.length
        ? `<p class="good">${esc(T('changes'))}</p><ul>${diffs.map(k => `<li>${esc(labels[k])} : ${esc(show(k, before[k]))} → <strong>${esc(show(k, o[k]))}</strong></li>`).join('')}</ul>`
        : `<p class="good">${esc(T('commentOnly'))}</p>`;
      actuel = birdLine(before);
    } else {
      summary = `<p class="good">${esc(T('bNewOk')(o.fr))}</p>`;
    }
    let link;
    if (FORM_BIRDS){
      const href = formUrlFor(FORM_BIRDS, {
        TYPE: orig ? 'Modification' : 'Nouvel oiseau', FR: o.fr, SCI: o.sci, EN: o.en, TAXON: o.type,
        CANAL: o.canal, ACTUEL: actuel, COMMENTAIRE: com, JSON: birdLine(o)
      });
      link = `<a class="smail" href="${esc(href)}" target="_blank" rel="noopener">${esc(T('sendForm'))}</a><p class="snote">${esc(T('formNote'))}</p>`;
    } else link = `<p class="bad">${esc(T('sendOff'))}</p>`;
    res.innerHTML = summary + link;
  }
  results.addEventListener('click', e => {
    const btn = e.target.closest('.bedit-btn');
    if (btn){
      const li = btn.closest('.row'), b = shownBirds[+li.dataset.bi]; if (!b) return;
      let f = li.querySelector('.bform');
      if (f){ f.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
      li.insertAdjacentHTML('beforeend', birdFormHtml(b)); btn.setAttribute('aria-expanded', 'true');
      li.querySelector('.bform input').focus();
      return;
    }
    const act = e.target.closest('[data-bact="prep"]');
    if (act){ const li = act.closest('.row'); prepBird(act.closest('.bform'), shownBirds[+li.dataset.bi]); }
  });
  function openNewBird(prefill){
    const panel = $('newBirdPanel');
    if (panel.hidden || !panel.innerHTML){ panel.innerHTML = birdFormHtml(null); }
    panel.hidden = false; $('newBirdBtn').setAttribute('aria-expanded', 'true');
    if (prefill) panel.querySelector('[data-f="fr"]').value = prefill;
    panel.querySelector('[data-f="fr"]').focus(); panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  $('newBirdBtn').addEventListener('click', () => {
    const panel = $('newBirdPanel');
    if (panel.hidden) openNewBird(''); else { panel.hidden = true; $('newBirdBtn').setAttribute('aria-expanded', 'false'); }
  });
  $('newBirdPanel').addEventListener('click', e => { if (e.target.closest('[data-bact="prep"]')) prepBird($('newBirdPanel').querySelector('.bform'), null); });
  notice.addEventListener('click', e => { if (e.target.id === 'newBirdFromSearch') openNewBird(q.value.trim()); });

  function formUrl(f){
    const q = new URLSearchParams({ usp: 'pp_url' });
    Object.entries(f).forEach(([k, v]) => { if (FORM.map[k] && v) q.set(FORM.map[k], v); });
    return FORM.base + '?' + q.toString();
  }
  function placesFromJson(arr){
    if (!Array.isArray(arr)) return [];
    return arr.filter(e => e && e.nom && Array.isArray(e.carres) && e.carres.length && isFinite(e.lat) && isFinite(e.lon))
      .map(e => [String(e.nom), e.carres.map(String), +e.lat, +e.lon, +(e.precision_m || 550), !!e.verifie]);
  }
  fetch(PLACES_URL).then(r => r.ok ? r.json() : Promise.reject()).then(d => {
    const l = placesFromJson(d); if (!l.length) return;
    PLACES = l.map(fixPlace); buildPfuse(); renderPlaces(); renderWhere();
  }).catch(() => {});
  let tab = 'birds';

  function dms(v, pos, neg){
    const h = v >= 0 ? pos : neg; v = Math.abs(v);
    const d = Math.floor(v), mF = (v - d) * 60, m = Math.floor(mF), sec = Math.round((mF - m) * 60);
    return `${d}°${String(m).padStart(2,'0')}′${String(sec).padStart(2,'0')}″${h}`;
  }

  function renderPlaces(){
    const raw = pq.value.trim(), query = norm(raw);
    pclear.hidden = !raw;
    let list;
    if (!query) list = PLACES.slice();
    else {
      list = PLACES.filter(p => norm(p[0]).includes(query));
      if (!list.length) list = fuzzy(PLACES, p => [p[0]], raw, 0.34);
    }
    list.sort((a,b) => {
      if (query){ const sa = norm(a[0]).startsWith(query), sb = norm(b[0]).startsWith(query); if (sa !== sb) return sa ? -1 : 1; }
      return a[0].localeCompare(b[0], 'fr');
    });
    pstatus.innerHTML = list.length ? esc(T('pCount')(list.length)) : (raw ? esc(T('pNone')(raw)) + ` <button type="button" class="link" id="newFromSearch">${esc(T('newPlaceQ'))}</button>` : '');
    presults.innerHTML = list.length ? '<ul class="list">' + list.map((p, i) => {
      const [n, cells, lat, lon, prec, checked] = p;
      const dec = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      const exact = prec <= 50 || checked;
      return `<li class="place" data-i="${i}">
        <h3><button type="button" class="ptitle" aria-expanded="false"><span>${highlight(n, raw)}</span></button></h3>
        <div class="grid">${esc(T('square')(cells.length))} ${esc(cells.join(', '))}</div>
        <div class="coords">${dec}<small>${dms(lat,'N','S')} ${dms(lon,'E','W')}</small></div>
        <div class="prec${exact ? ' exact' : ''}">${esc(checked ? T('verified') : exact ? T('exact') : isPlaced(p) ? T('approxPlaced')(prec) : T('approx')(prec))}</div>
        <div class="actions">
          <button type="button" data-copy="${dec}">${esc(T('copy'))}</button>
          <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}" target="_blank" rel="noopener">${esc(T('openMap'))}</a>
        </div>
        <div class="pmap" hidden></div>
      </li>`;
    }).join('') + '</ul>' : '';
    shownPlaces = list;
  }

  // ---------- Aperçu de la carte (3 × 3 carrés autour du lieu) ----------
  // Bords des colonnes A→S et des lignes 1→13, en pixels de la carte d'origine (7015 × 4944)
  const MAP_SRCS = ['carte_ouessant.webp', 'carte_ouessant.jpg'];   // WebP plus léger, JPEG en secours
  let shownPlaces = [], mapPromise = null;
  // Précision enregistrée (precision_m) :
  //   ≤ 50 m ou verifie = true : position exacte ou vérifiée sur le terrain, on la garde ;
  //   < 500 m (ex. 100 m)      : point placé sur la carte, non vérifié, on le garde aussi ;
  //   sinon                    : centre du carré, recalculé avec le recalage actuel.
  const PLACED_MAX = 500;
  const isPlaced = p => !p[5] && p[4] > 50 && p[4] < PLACED_MAX;
  function fixPlace(p){
    if (p[5] || p[4] < PLACED_MAX) return p;
    const [la, lo] = cellsCenter(p[1]); return [p[0], p[1], +la.toFixed(5), +lo.toFixed(5), p[4], p[5]];
  }
  PLACES = PLACES.map(fixPlace); buildPfuse();
  // Zone affichée dans l'aperçu : carrés du lieu + un carré tout autour
  function zoneOf(cells){
    const idx = cells.map(cellIdx);
    return { c0: Math.max(0, Math.min(...idx.map(x => x[0])) - 1), c1: Math.min(GRID_X.length - 2, Math.max(...idx.map(x => x[0])) + 1),
             r0: Math.max(0, Math.min(...idx.map(x => x[1])) - 1), r1: Math.min(GRID_Y.length - 2, Math.max(...idx.map(x => x[1])) + 1) };
  }
  const fmtDist = d => d < 1000 ? (Math.round(d / 10) * 10) + ' m' : (d / 1000).toFixed(1).replace('.', lang === 'fr' ? ',' : '.') + ' km';
  function loadMap(){
    if (!mapPromise) mapPromise = new Promise((ok, ko) => {
      const tryLoad = k => { if (k >= MAP_SRCS.length){ mapPromise = null; ko(); return; }
        const im = new Image(); im.onload = () => ok(im); im.onerror = () => tryLoad(k + 1); im.src = MAP_SRCS[k]; };
      tryLoad(0);
    });
    return mapPromise;
  }

  function drawPreview(box, cells, img, marks, caption){
    marks = marks || [];
    const idx = cells.map(cellIdx);
    const c0 = Math.max(0, Math.min(...idx.map(x => x[0])) - 1), c1 = Math.min(GRID_X.length - 2, Math.max(...idx.map(x => x[0])) + 1);
    const r0 = Math.max(0, Math.min(...idx.map(x => x[1])) - 1), r1 = Math.min(GRID_Y.length - 2, Math.max(...idx.map(x => x[1])) + 1);
    const sx = GRID_X[c0], ex = GRID_X[c1 + 1], sy = GRID_Y[r0], ey = GRID_Y[r1 + 1];
    const f = img.naturalWidth / MAP_W;              // échelle de l'image allégée
    const W = Math.max(260, Math.round(box.clientWidth || 320)), M = 20;   // marge pour les lettres et chiffres
    const k = (W - M) / (ex - sx), H = Math.round(M + (ey - sy) * k);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cv = document.createElement('canvas');
    cv.width = W * dpr; cv.height = H * dpr;
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', caption || T('mapCaption')(cells));
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--ink').trim() || '#16232C', paper = css.getPropertyValue('--paper').trim() || '#fff';
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx * f, sy * f, (ex - sx) * f, (ey - sy) * f, M, M, (ex - sx) * k, (ey - sy) * k);
    // repères de colonnes et de lignes
    ctx.fillStyle = ink; ctx.font = '600 12px "Public Sans", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let c = c0; c <= c1; c++) ctx.fillText(String.fromCharCode(65 + c), M + ((GRID_X[c] + GRID_X[c + 1]) / 2 - sx) * k, M / 2);
    for (let r = r0; r <= r1; r++) ctx.fillText(String(r + 1), M / 2, M + ((GRID_Y[r] + GRID_Y[r + 1]) / 2 - sy) * k);
    // carré(s) du lieu
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${PAL().sq},.55)`; ctx.fillStyle = `rgba(${PAL().sq},.06)`;
    idx.forEach(([c, r]) => {
      const x = M + (GRID_X[c] - sx) * k, y = M + (GRID_Y[r] - sy) * k, w = (GRID_X[c + 1] - GRID_X[c]) * k, h = (GRID_Y[r + 1] - GRID_Y[r]) * k;
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    });
    // points : position vérifiée (rouge) et position proposée (vert)
    const seen = {};
    marks.forEach(m => {
      const [px, py] = toPixel(m.lat, m.lon);
      if (px < sx || px > ex || py < sy || py > ey) return;
      let X = M + (px - sx) * k, Y = M + (py - sy) * k;
      const key = Math.round(X / 6) + ',' + Math.round(Y / 6), n = seen[key] = (seen[key] || 0) + 1;
      if (n > 1){ const a = (n - 2) * Math.PI / 3; X += 16 * Math.cos(a); Y += 16 * Math.sin(a); }   // points superposés
      const r = m.label ? 10 : 7, col = PAL()[m.kind] || m.color || '#000';
      ctx.beginPath();
      if (m.kind === 'proposed'){ ctx.moveTo(X, Y - 9); ctx.lineTo(X + 9, Y); ctx.lineTo(X, Y + 9); ctx.lineTo(X - 9, Y); ctx.closePath(); }
      else ctx.arc(X, Y, r, 0, Math.PI * 2);
      if (m.ring){ ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke(); return; }
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      if (m.label){ ctx.fillStyle = '#fff'; ctx.font = '700 12px "Public Sans", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(m.label, X, Y + .5); }
    });
    box.innerHTML = ''; box.appendChild(cv);
    const cap = document.createElement('p'); cap.textContent = caption || T('mapCaption')(cells); box.appendChild(cap);
  }

  // ---------- Proposer une meilleure position ----------
  function suggestHtml(){
    return `<button type="button" class="sbtn" data-act="open">${esc(T('suggest'))}</button>
      <div class="sform" hidden>
        <p class="shelp">${esc(T('sHelp'))}</p>
        <button type="button" class="sgps" data-act="gps">${esc(T('useGps'))}</button>
        <label>${esc(T('pasteLabel'))}<input type="text" class="scoords" inputmode="decimal" autocomplete="off" placeholder="48.45606, -5.08603"></label>
        <label>${esc(T('commentLabel'))}<textarea class="scomment" rows="2"></textarea></label>
        <button type="button" class="scheck" data-act="check">${esc(T('check'))}</button>
        <div class="sresult" aria-live="polite"></div>
      </div>`;
  }
  function placeMarks(p){
    if (p[5] || p[4] <= 50) return [{ lat: p[2], lon: p[3], kind: 'verified' }];      // point plein : vérifié ou exact
    if (isPlaced(p)) return [{ lat: p[2], lon: p[3], kind: 'verified', ring: true }];   // anneau : placé sur la carte
    return [];
  }   // point rouge : position vérifiée ou exacte (phares)
  function redraw(li, p, extra){
    const view = li.querySelector('.pview');
    loadMap().then(img => drawPreview(view, p[1], img, placeMarks(p).concat(extra || [])), () => {});
  }
  // ---------- Proposer un nouveau lieu-dit ----------
  let nHow = null;
  function openNew(prefill){
    const panel = $('newPanel'); panel.hidden = false; $('newBtn').setAttribute('aria-expanded', 'true');
    if (prefill && !$('nName').value) $('nName').value = prefill;
    $('nName').focus(); panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  $('newBtn').addEventListener('click', () => {
    const panel = $('newPanel'); if (panel.hidden) openNew(pq.value.trim()); else { panel.hidden = true; $('newBtn').setAttribute('aria-expanded', 'false'); }
  });
  pstatus.addEventListener('click', e => { if (e.target.id === 'newFromSearch') openNew(pq.value.trim()); });
  function checkNew(coords){
    const res = $('nResult'), name = $('nName').value.trim().replace(/\s+/g, ' ');
    if (!name){ res.innerHTML = `<p class="bad">${esc(T('newNoName'))}</p>`; $('nName').focus(); return; }
    const dup = PLACES.find(p => norm(p[0]) === norm(name));
    if (dup){ res.innerHTML = `<p class="bad">${esc(T('newDup')(dup[0]))}</p>`; return; }
    if (!coords){ res.innerHTML = `<p class="bad">${esc(T('badFormat'))}</p>`; return; }
    const [lat, lon] = coords, [x, y] = toPixel(lat, lon), cell = cellAt(x, y);
    const nearest = PLACES.reduce((m, p) => Math.min(m, distM(lat, lon, p[2], p[3])), Infinity);
    if (!cell || nearest > 3000){ res.innerHTML = `<p class="bad">${esc(T('newOut'))}</p>`; return; }
    const c = cellName(cell), comment = $('nComment').value.trim();
    const prec = nHow && nHow.acc ? Math.max(10, Math.round(nHow.acc)) : 25;
    const line = JSON.stringify({ nom: name, carres: [c], lat: +lat.toFixed(5), lon: +lon.toFixed(5), precision_m: prec, verifie: true });
    let link;
    if (FORM){
      const href = formUrl({
        LIEU: name, CARRES: c, ACTUELLE: 'Nouveau lieu-dit',
        PROPOSEE: `${lat.toFixed(5)}, ${lon.toFixed(5)} (carré ${c})`,
        METHODE: nHow && nHow.acc ? 'GPS du téléphone, précision ± ' + Math.round(nHow.acc) + ' m' : 'coordonnées saisies',
        COMMENTAIRE: comment, JSON: line
      });
      link = `<a class="smail" href="${esc(href)}" target="_blank" rel="noopener">${esc(T('sendForm'))}</a><p class="snote">${esc(T('formNote'))}</p>`;
    } else link = `<p class="bad">${esc(T('sendOff'))}</p>`;
    // ordre : message, aperçu de la carte, puis bouton d'envoi
    res.innerHTML = `<p class="good">${esc(T('newOk')(name, c))}</p><div class="pmap"><div class="pview"><p>${esc(T('mapLoading'))}</p></div></div>` + link;
    const view = res.querySelector('.pview');
    loadMap().then(img => drawPreview(view, [c], img, [{ lat, lon, kind: 'proposed' }], T('newCaption')(name, c)),
      () => { view.innerHTML = `<p class="err">${esc(T('mapMissing'))}</p>`; });
  }
  $('nCheck').addEventListener('click', () => { nHow = null; checkNew(parseCoords($('nCoords').value)); });
  $('nCoords').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); nHow = null; checkNew(parseCoords($('nCoords').value)); } });
  $('nCoords').addEventListener('input', () => { nHow = null; });
  $('nGps').addEventListener('click', () => {
    const res = $('nResult');
    if (!navigator.geolocation){ res.innerHTML = `<p class="bad">${esc(T('gpsErr'))}</p>`; return; }
    res.innerHTML = `<p>${esc(T('gpsWait'))}</p>`;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      $('nCoords').value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`; nHow = { acc: accuracy };
      checkNew([latitude, longitude]);
      res.insertAdjacentHTML('afterbegin', `<p>${esc(T('gpsAcc')(Math.round(accuracy)))}</p>`);
    }, () => { res.innerHTML = `<p class="bad">${esc(T('gpsErr'))}</p>`; }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });

  function checkSuggestion(li, p, coords, how){
    const res = li.querySelector('.sresult');
    if (!coords){ res.innerHTML = `<p class="bad">${esc(T('badFormat'))}</p>`; return; }
    const [lat, lon] = coords, [x, y] = toPixel(lat, lon), cell = cellAt(x, y), z = zoneOf(p[1]);
    const inZone = cell && cell[0] >= z.c0 && cell[0] <= z.c1 && cell[1] >= z.r0 && cell[1] <= z.r1;
    if (!inZone){
      res.innerHTML = `<p class="bad">${esc(T('outZone')(cell ? cellName(cell) : null, p[0]))}</p>`;
      redraw(li, p); return;
    }
    const d = distM(p[2], p[3], lat, lon);
    const comment = li.querySelector('.scomment').value.trim();
    const prec = how && how.acc ? Math.max(10, Math.round(how.acc)) : 25;
    const newCell = cellName(cell), oldCells = p[1].join(', ');
    const cellsTxt = oldCells === newCell ? newCell : `${oldCells} → ${newCell}`;
    const line = JSON.stringify({ nom: p[0], carres: [newCell], lat: +lat.toFixed(5), lon: +lon.toFixed(5), precision_m: prec, verifie: true });
    let link;
    if (FORM){
      const href = formUrl({
        LIEU: p[0], CARRES: cellsTxt,
        ACTUELLE: `${p[2].toFixed(5)}, ${p[3].toFixed(5)}`,
        PROPOSEE: `${lat.toFixed(5)}, ${lon.toFixed(5)} (carré ${cellName(cell)}, à ${fmtDist(d)})`,
        METHODE: how && how.acc ? 'GPS du téléphone, précision ± ' + Math.round(how.acc) + ' m' : 'coordonnées saisies',
        COMMENTAIRE: comment, JSON: line
      });
      link = `<a class="smail" href="${esc(href)}" target="_blank" rel="noopener">${esc(T('sendForm'))}</a><p class="snote">${esc(T('formNote'))}</p>`;
    } else {
      link = `<p class="bad">${esc(T('sendOff'))}</p>`;
    }
    res.innerHTML = `<p class="good">${esc(T('okIn')(cellName(cell), fmtDist(d)))}</p>` + link;
    redraw(li, p, [{ lat, lon, kind: 'proposed' }]);
  }

  function togglePlace(li){
    const box = li.querySelector('.pmap'), btn = li.querySelector('.ptitle');
    const open = box.hidden;
    box.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (!open) return;
    const p = shownPlaces[+li.dataset.i]; if (!p) return;
    const canSuggest = !(p[4] <= 50 && !p[5]);        // pas pour les phares, dont la position est déjà exacte
    box.innerHTML = `<div class="pview"><p>${esc(T('mapLoading'))}</p></div>` + (canSuggest ? `<div class="suggest">${suggestHtml()}</div>` : '');
    const view = box.querySelector('.pview');
    loadMap().then(img => drawPreview(view, p[1], img, placeMarks(p)), () => { view.innerHTML = `<p class="err">${esc(T('mapMissing'))}</p>`; });
  }

  presults.addEventListener('click', e => {
    const b = e.target.closest('button[data-copy]');
    if (!b) {
      const act = e.target.closest('[data-act]');
      if (act){
        const li = act.closest('.place'), p = shownPlaces[+li.dataset.i]; if (!p) return;
        const res = li.querySelector('.sresult');
        if (act.dataset.act === 'open'){
          const f = li.querySelector('.sform'); f.hidden = !f.hidden; act.setAttribute('aria-expanded', String(!f.hidden));
        } else if (act.dataset.act === 'check'){
          checkSuggestion(li, p, parseCoords(li.querySelector('.scoords').value));
        } else if (act.dataset.act === 'gps'){
          if (!navigator.geolocation){ res.innerHTML = `<p class="bad">${esc(T('gpsErr'))}</p>`; return; }
          res.innerHTML = `<p>${esc(T('gpsWait'))}</p>`;
          navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude, accuracy } = pos.coords;
            li.querySelector('.scoords').value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            checkSuggestion(li, p, [latitude, longitude], { acc: accuracy });
            res.insertAdjacentHTML('afterbegin', `<p>${esc(T('gpsAcc')(Math.round(accuracy)))}</p>`);
          }, () => { res.innerHTML = `<p class="bad">${esc(T('gpsErr'))}</p>`; }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
        }
        return;
      }
      if (e.target.closest('.actions a, .pmap')) return;
      const li = e.target.closest('.place'); if (li) togglePlace(li);
      return;
    }
    const txt = b.dataset.copy;
    const done = () => { b.textContent = T('copied'); setTimeout(() => { b.textContent = T('copy'); }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => fallbackCopy(txt, done));
    else fallbackCopy(txt, done);
  });
  function fallbackCopy(txt, done){
    const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly',''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch(_) {} ta.remove();
  }
  let pt;
  pq.addEventListener('input', () => { clearTimeout(pt); pt = setTimeout(renderPlaces, 100); });
  presults.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList.contains('scoords')){
      e.preventDefault(); const li = e.target.closest('.place'); const p = shownPlaces[+li.dataset.i];
      if (p) checkSuggestion(li, p, parseCoords(e.target.value));
    }
  });
  pq.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); renderPlaces(); pq.blur(); } });
  pclear.addEventListener('click', () => { pq.value = ''; renderPlaces(); pq.focus(); });

  function showTab(name){
    tab = ['places', 'where'].includes(name) ? name : 'birds';
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $('tab-birds').hidden = tab !== 'birds';
    $('tab-places').hidden = tab !== 'places';
    $('tab-where').hidden = tab !== 'where';
    document.querySelector('.lede').innerHTML = T({ places: 'ledePlaces', where: 'ledeWhere' }[tab] || 'lede');
    const h = '#' + ({ places: 'lieux', where: 'ou-suis-je' }[tab] || 'oiseaux');
    if (location.hash !== h) history.replaceState(null, '', h);
  }
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // ---------- Où suis-je ? ----------
  const NEAR_N = 5;
  let lastFix = null;
  function bearing(a, b, c, d){
    const r = Math.PI / 180, y = Math.sin((d - b) * r) * Math.cos(c * r);
    const x = Math.cos(a * r) * Math.sin(c * r) - Math.sin(a * r) * Math.cos(c * r) * Math.cos((d - b) * r);
    return (Math.atan2(y, x) / r + 360) % 360;
  }
  function renderWhere(){
    const st = $('wstatus'), out = $('wresults'), mapBox = $('wmap');
    if (!lastFix){ st.textContent = ''; out.innerHTML = ''; mapBox.hidden = true; return; }
    const { lat, lon, acc } = lastFix;
    const ranked = PLACES.map(p => ({ p, d: distM(lat, lon, p[2], p[3]) })).sort((a, b) => a.d - b.d || a.p[0].localeCompare(b.p[0], 'fr'));
    const [x, y] = toPixel(lat, lon), cell = cellAt(x, y);
    if (!cell || ranked[0].d > 3000){
      st.textContent = T('notHere')(fmtDist(ranked[0].d)); out.innerHTML = ''; mapBox.hidden = true; return;
    }
    const near = ranked.slice(0, NEAR_N);
    st.textContent = T('youAre')(cellName(cell), Math.round(acc));
    const dirs = T('dirs');
    out.innerHTML = '<ul class="list">' + near.map((n, i) => `<li class="near">
        <span class="num">${i + 1}</span>
        <span class="nm">${esc(n.p[0])}</span>
        <span class="sq">${esc(T('square')(n.p[1].length))} ${esc(n.p[1].join(', '))}${n.p[5] ? ', ' + esc(T('checkedShort')) : ''}</span>
        <span class="dist">≈ ${fmtDist(n.d)}<small>${dirs[Math.round(bearing(lat, lon, n.p[2], n.p[3]) / 45) % 8]}</small></span>
      </li>`).join('') + '</ul>';
    mapBox.hidden = false;
    mapBox.innerHTML = `<div class="pview"><p>${esc(T('mapLoading'))}</p></div>`;
    const view = mapBox.querySelector('.pview');
    const marks = near.map((n, i) => ({ lat: n.p[2], lon: n.p[3], kind: 'num', label: String(i + 1) })).reverse()
      .concat([{ lat, lon, kind: 'user' }]);
    loadMap().then(img => drawPreview(view, [cellName(cell)], img, marks, T('whereCaption')(cellName(cell))),
      () => { view.innerHTML = `<p class="err">${esc(T('mapMissing'))}</p>`; });
  }
  $('locate').addEventListener('click', () => {
    const st = $('wstatus');
    if (!navigator.geolocation){ st.textContent = T('gpsErr'); return; }
    st.textContent = T('gpsWait');
    navigator.geolocation.getCurrentPosition(pos => {
      lastFix = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy };
      $('locate').querySelector('span').textContent = T('relocateBtn');
      renderWhere();
    }, () => { st.textContent = T('gpsErr'); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });

  let t;
  q.addEventListener('input', () => { submitted = false; clearTimeout(t); t = setTimeout(render, 120); });
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t); submitted = !!q.value.trim(); render(); q.blur(); }
  });
  clearBtn.addEventListener('click', () => { q.value = ''; submitted = false; render(); q.focus(); });
  sspBox.addEventListener('change', render);
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch(_) {}
    applyLang();
  }));
  // ---------- Affichage : thème clair / sombre / auto, couleurs pour daltonisme ----------
  let theme = 'auto';
  try { theme = localStorage.getItem(THEME_KEY) || 'auto'; } catch(_) {}
  function applyPrefs(){
    const root = document.documentElement;
    if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme); else root.removeAttribute('data-theme');
    if (cvd) root.setAttribute('data-cvd', '1'); else root.removeAttribute('data-cvd');
    window.OUESSANT_ETAT.cvd = cvd;
    document.querySelectorAll('.seg[data-pref="theme"] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === theme)));
    document.querySelectorAll('.seg[data-pref="cvd"] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === (cvd ? '1' : '0'))));
    const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = dark ? '#0F1B23' : '#1F3A4D';
  }
  function refreshColors(){
    if (birds.length){ channels.forEach((c, i) => colorOf[c] = CHANNEL_COLORS[canalKind(c)] || COLORS[i % COLORS.length]); buildChips(); render(); }
    // aperçus de carte ouverts : on les redessine
    document.querySelectorAll('.place').forEach(li => { const box = li.querySelector('.pmap'); if (box && !box.hidden){ box.hidden = true; togglePlace(li); } });
    renderWhere();
  }
  $('prefsBtn').addEventListener('click', e => {
    e.stopPropagation(); const p = $('prefsPanel'); p.hidden = !p.hidden; $('prefsBtn').setAttribute('aria-expanded', String(!p.hidden));
  });
  $('prefsPanel').addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('.seg button'); if (!b) return;
    if (b.parentElement.dataset.pref === 'theme'){ theme = b.dataset.v; try { localStorage.setItem(THEME_KEY, theme); } catch(_) {} applyPrefs(); refreshColors(); }
    else { cvd = b.dataset.v === '1'; try { localStorage.setItem(CVD_KEY, cvd ? '1' : '0'); } catch(_) {} applyPrefs(); refreshColors(); }
  });
  document.addEventListener('click', () => { if (!$('prefsPanel').hidden){ $('prefsPanel').hidden = true; $('prefsBtn').setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('prefsPanel').hidden){ $('prefsPanel').hidden = true; $('prefsBtn').setAttribute('aria-expanded', 'false'); $('prefsBtn').focus(); } });
  applyPrefs();

  // ---------- Le phare : météo, partage (QR code) et œuf de Pâques ----------
  const APP_URL = 'https://aurelphotog.github.io/ouessant-birds/';
  const WX_URL = 'https://api.open-meteo.com/v1/forecast?latitude=48.4568&longitude=-5.0975'
    + '&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m'
    + '&daily=weather_code,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,temperature_2m_max'
    + '&wind_speed_unit=kmh&timezone=Europe%2FParis&forecast_days=3';
  let wx = null, wxAt = 0, wxState = 'idle';
  const BF = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];   // seuils de l'échelle de Beaufort, en km/h
  const beaufort = k => { const i = BF.findIndex(v => k < v); return i < 0 ? 12 : i; };
  const dir16 = deg => Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  const arrow = (deg, size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform:rotate(${(deg + 180) % 360}deg)" aria-hidden="true"><path d="M12 2 L18 20 L12 16 L6 20 Z" fill="currentColor"/></svg>`;
  function loadWx(){
    if (wx && Date.now() - wxAt < 15 * 60000) return;
    wxState = 'loading';
    fetch(WX_URL).then(r => r.ok ? r.json() : Promise.reject()).then(d => { wx = d; wxAt = Date.now(); wxState = 'ok'; renderPhare(); })
      .catch(() => { wxState = wx ? 'ok' : 'err'; renderPhare(); });
  }
  function wxHtml(){
    if (!wx) return `<p class="wind-sub">${esc(wxState === 'err' ? T('wErr') : T('wLoading'))}</p>`;
    const c = wx.current, d = wx.daily, kmh = Math.round(c.wind_speed_10m), i = dir16(c.wind_direction_10m);
    const days = d.time.map((t, j) => {
      const label = j === 0 ? T('today') : j === 1 ? T('tomorrow') : (s => s.charAt(0).toUpperCase() + s.slice(1))(new Date(t + 'T12:00').toLocaleDateString(lang, { weekday: 'long' }));
      return `<div class="day"><b>${esc(label)}</b><span class="dw">${arrow(d.wind_direction_10m_dominant[j], 14)} ${esc(T('dirsShort')[dir16(d.wind_direction_10m_dominant[j])])} ${Math.round(d.wind_speed_10m_max[j])} km/h</span>${esc(T('wx')[d.weather_code[j]] || '')}<br>${Math.round(d.temperature_2m_max[j])} °C</div>`;
    }).join('');
    return `<div class="wind"><div class="wind-ar"><span class="n">N</span>${arrow(c.wind_direction_10m, 30)}</div>
      <div><div class="wind-main">${esc(T('wNow')(T('dirs16')[i], kmh, beaufort(c.wind_speed_10m)))}</div>
      <div class="wind-sub">${esc(T('wGust')(Math.round(c.wind_gusts_10m)))}, ${esc(T('wx')[c.weather_code] || '')}, ${Math.round(c.temperature_2m)} °C</div></div></div>
      <div class="days">${days}</div><p class="pp-src">${esc(T('wSrc'))}</p>`;
  }
  function qrSvg(){ return `<img src="qr_ouessant.svg" alt="QR code : ${esc(APP_URL)}" width="116" height="116" style="display:block;width:100%;height:100%">`; }
  function loadQr(){}
  function renderPhare(){
    const box = qrSvg();
    $('pharePanel').innerHTML = `<div class="pp-sec"><h2 class="pp-h">${esc(T('wTitle'))}</h2>${wxHtml()}</div>
      <div class="pp-sec"><h2 class="pp-h">${esc(T('shTitle'))}</h2><div class="qr">
        <div class="qr-box">${box}</div>
        <div class="qr-txt">${esc(T('shText'))}<div class="btns">${navigator.share ? `<button type="button" class="main" data-ph="share">${esc(T('shBtn'))}</button>` : ''}<button type="button" data-ph="copy">${esc(T('shCopy'))}</button></div></div>
      </div></div>`;
  }
  function openPhare(open){
    $('pharePanel').hidden = !open; $('phareBtn').setAttribute('aria-expanded', String(open));
    if (open){ loadWx(); loadQr(); renderPhare(); }
  }
  // un clic ouvre le panneau ; cinq clics rapides font passer un oiseau
  let clicks = [], eggLock = 0;
  $('phareBtn').addEventListener('click', e => {
    e.stopPropagation();
    const now = Date.now();
    if (now < eggLock) return;                                   // juste après l'oiseau, on ignore les clics en trop
    clicks = clicks.filter(t => now - t < 2000); clicks.push(now);
    if (clicks.length >= 5){ clicks = []; eggLock = now + 1500; openPhare(false); egg(); return; }
    openPhare($('pharePanel').hidden);
  });
  $('pharePanel').addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('[data-ph]'); if (!b) return;
    if (b.dataset.ph === 'share') navigator.share({ title: T('title'), text: T('lede').replace(/<[^>]+>/g, ''), url: APP_URL }).catch(() => {});
    else {
      const done = () => { b.textContent = T('shCopied'); setTimeout(() => { b.textContent = T('shCopy'); }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(APP_URL).then(done, () => fallbackCopy(APP_URL, done)); else fallbackCopy(APP_URL, done);
    }
  });
  document.addEventListener('click', () => { if (!$('pharePanel').hidden) openPhare(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('pharePanel').hidden){ openPhare(false); $('phareBtn').focus(); } });
  function egg(){
    const rares = birds.filter(b => canalKind(b[K_CANAL]) === 'telegram' && !isSsp(b));
    const b = rares.length ? rares[Math.floor(Math.random() * rares.length)] : null;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce){
      const header = document.querySelector('header');
      header.insertAdjacentHTML('beforeend', `<svg class="egg-bird" viewBox="0 0 48 28" aria-hidden="true"><path d="M2 14 C10 4, 18 6, 24 14 C30 6, 38 4, 46 14 C38 10, 30 12, 24 18 C18 12, 10 10, 2 14 Z" fill="currentColor"/></svg>`);
      const bird = header.querySelector('.egg-bird:last-child'); setTimeout(() => bird.remove(), 3600);
    }
    const t = document.createElement('div'); t.className = 'egg-toast'; t.setAttribute('role', 'status');
    t.textContent = b ? T('egg')(mainName(b)) : T('eggNone'); document.body.appendChild(t); setTimeout(() => t.remove(), 4500);
  }

  bindFiles();
  showTab({ '#lieux': 'places', '#ou-suis-je': 'where' }[location.hash] || 'birds');
  window.addEventListener('hashchange', () => showTab({ '#lieux': 'places', '#ou-suis-je': 'where' }[location.hash] || 'birds'));
  applyLang();

  // 1) GitHub  2) copie enregistrée dans le navigateur  3) import manuel
  fetch(URL_DATA)
    .then(r => { if(!r.ok) throw new Error(r.status); listsDate = r.headers.get('last-modified'); return r.json(); })
    .then(data => { setData(data, 'sourceGithub'); showVersion(); })
    .catch(() => {
      try{
        const saved = localStorage.getItem(STORE);
        if(saved){ setData(JSON.parse(saved), 'sourceSaved'); return; }
      }catch(_){}
      showImport();
    });

  // ---------- Mode hors ligne : le service worker garde l'appli, les listes et la carte en mémoire ----------
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
