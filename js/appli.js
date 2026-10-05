/* Oiseaux d'Ouessant — logique de l'appli (index.html). Textes : js/textes.js ; carte : js/carte.js ; recherche : js/recherche.js */
(function(){
  // Outils partagés : carte de l'île (js/carte.js) et recherche tolérante aux fautes (js/recherche.js)
  const { GRID_X, GRID_Y, MAP_W, toPixel, fromPixel, cellIdx, cellName, cellAt, cellsCenter, distM } = window.OuessantCarte;
  const fuzzy = window.OuessantRecherche.fuzzy;
  // Silhouette de l'île (tracée depuis la carte), affichée en fond de la boussole du vent
  const ILE = '<svg class="ile" viewBox="0 0 100 67.6" aria-hidden="true"><path d="M62.5 0.0L64.0 0.2L62.7 2.0L64.5 3.4L67.4 2.7L68.1 3.4L68.9 3.2L69.9 4.7L71.1 4.7L71.3 5.4L70.3 6.6L73.3 8.1L73.5 10.3L74.8 11.8L79.9 9.1L81.6 9.1L83.3 10.8L83.3 12.7L77.0 17.9L77.7 19.1L78.7 19.4L81.1 18.6L81.1 19.9L81.9 20.3L81.1 20.8L80.4 19.9L80.1 21.6L79.2 20.8L78.2 21.1L76.2 23.0L76.7 24.0L78.9 24.3L79.7 27.0L82.4 25.5L82.8 24.5L83.8 24.5L85.0 26.2L83.6 28.2L85.0 28.7L85.5 30.4L89.0 26.5L92.2 27.0L92.9 26.2L93.9 27.7L95.8 27.7L97.3 28.7L98.3 27.7L100.0 28.2L99.5 28.7L100.0 29.4L98.0 30.1L97.3 32.8L96.1 33.6L96.1 35.0L95.3 35.8L93.1 35.5L92.2 37.0L89.7 37.0L88.2 35.5L84.3 35.0L81.9 39.0L80.1 39.2L78.9 40.4L79.2 42.2L78.4 43.4L76.5 43.4L75.7 44.1L75.5 45.1L76.2 46.1L75.7 47.3L76.7 48.0L76.2 49.3L75.2 47.5L73.3 48.0L72.5 49.0L71.8 48.8L71.3 46.6L69.9 46.8L68.9 48.5L68.1 48.5L66.2 44.6L65.0 45.8L63.2 45.6L62.3 46.6L62.5 47.8L60.8 48.0L59.3 49.8L57.8 49.0L57.6 47.1L56.1 46.1L55.1 48.3L53.2 49.8L53.2 51.7L52.2 52.2L52.2 52.9L51.5 53.4L50.7 52.2L49.8 52.9L49.0 55.4L49.8 56.9L48.5 57.8L48.8 59.1L47.8 60.5L49.0 61.5L48.0 64.2L47.3 64.0L47.5 62.7L46.3 60.8L42.9 61.5L43.1 60.3L42.2 59.6L41.9 60.8L39.5 62.7L38.2 62.0L37.7 63.2L36.8 63.5L35.5 66.4L34.6 66.7L33.3 65.4L31.9 66.7L31.1 65.9L28.9 65.9L27.2 67.6L26.0 66.2L24.5 65.9L23.3 67.4L24.0 66.2L23.3 65.4L23.5 64.0L21.3 63.7L21.3 63.2L22.5 62.3L23.8 62.5L24.5 61.3L26.0 63.2L28.7 62.7L29.7 61.8L29.9 59.8L29.2 58.8L27.5 59.1L27.2 57.6L27.9 58.1L32.1 54.9L35.3 55.1L37.3 53.7L38.0 54.4L38.7 54.2L40.0 50.5L42.9 50.0L45.1 47.5L43.6 44.1L41.7 43.1L41.4 41.7L39.7 42.6L39.0 41.2L39.2 39.2L38.5 38.5L32.6 40.2L31.1 41.4L26.0 42.4L25.0 43.9L24.0 43.4L21.8 45.6L19.4 43.9L18.6 45.3L17.2 46.1L16.4 44.6L15.7 45.8L15.9 47.1L14.7 47.5L13.7 47.1L13.2 48.0L11.5 47.8L11.0 48.5L9.8 48.3L9.1 49.3L9.3 50.5L7.8 49.3L6.1 49.5L4.7 47.3L3.4 48.0L2.5 50.0L1.0 50.0L0.2 49.3L0.0 48.0L1.2 47.1L0.7 44.6L3.2 44.9L4.2 43.6L3.4 40.7L4.9 41.4L7.4 39.2L7.1 38.0L7.8 37.3L6.9 36.8L7.4 35.8L6.1 35.5L6.6 33.8L8.6 34.3L9.6 33.1L10.8 32.8L13.0 33.3L14.0 31.9L13.5 30.6L15.0 31.6L16.2 30.1L17.6 29.9L18.6 30.6L19.4 29.9L18.9 28.9L20.6 29.2L21.3 27.2L23.8 27.0L24.3 26.2L26.7 27.0L27.7 25.7L28.9 26.2L31.9 25.0L30.1 22.8L29.2 22.5L29.2 21.6L30.4 21.1L31.4 19.4L30.4 18.4L29.4 19.1L28.2 18.9L28.9 17.4L30.1 17.2L30.1 16.4L37.0 16.2L39.7 15.2L42.2 15.7L42.6 15.2L42.2 13.0L43.6 13.0L45.8 11.0L46.6 11.0L46.6 11.8L45.3 13.2L46.1 14.0L46.8 13.7L46.3 14.7L48.3 15.7L50.5 14.5L52.5 16.2L53.9 16.4L54.9 15.0L59.8 14.0L61.0 12.3L61.3 10.0L62.5 10.3L64.2 7.4L63.2 5.9L60.5 6.9L59.6 6.4L58.8 4.7L57.8 4.4L58.8 4.2L59.1 3.2L60.0 3.2L61.0 1.5L62.3 1.7ZM36.0 1.7L37.3 2.2L36.5 3.2L37.3 4.4L38.2 3.7L41.7 3.9L42.9 2.9L44.6 3.4L44.4 5.1L45.6 6.1L47.3 5.9L47.1 7.4L45.1 8.6L43.4 8.3L41.7 9.1L40.2 8.3L38.7 8.6L38.2 7.4L36.0 6.9L35.3 4.7L34.1 4.7L34.1 3.2Z"/></svg>';
  // Oriole de Baltimore (photo détourée et légèrement stylisée) posé sur l'angle du cadre du QR code, et petite fougère (émoji) au pied
  const ORIOLE = '<img class="oriole" src="oriole_baltimore.webp" alt="" width="42" height="71">';
  const FERN = '<span class="fern" aria-hidden="true">🌿</span>';
  const APP_VERSION = window.OUESSANT_APP_VERSION || '?';
  let listsRev = null;   // { app, rev } lu dans version_listes.json
  const listsDate = { birds: null, places: null };   // en-têtes « Last-Modified » des deux listes
  function versionText(){
    const fmt = h => { const d = h ? new Date(h) : null; return d && !isNaN(d) ? d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB') : null; };
    const b = fmt(listsDate.birds), p = fmt(listsDate.places);
    const dates = b && p && b !== p ? T('listsOfBoth')(b, p) : (b || p) ? T('listsOf')(b || p) : '';
    const rev = listsRev && listsRev.app === APP_VERSION && listsRev.rev > 0 ? '.' + listsRev.rev : '';   // autre version d'appli : on repart de zéro
    return 'v' + APP_VERSION + rev + (dates ? ' · ' + dates : '');
  }
  const showVersion = () => { if (!$('pharePanel').hidden) renderPhare(); };
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
    if (lastFix) $('locate').querySelector('span').textContent = T('relocateBtn');
    $('phareBtn').setAttribute('aria-label', T('phareLabel')); $('phareBtn').title = navigator.onLine === false ? T('phareOff') : T('phareLabel');
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
        + `<p style="margin-top:.5rem"><a class="link" href="${editorLink('oiseaux', { nouveau: raw })}">${esc(T('newBirdQ'))}</a></p></div>`;
    }

    status.textContent = mode === 'exact' ? T('found')
      : mode === 'fuzzy' ? (list.length ? T('near')(list.length) : (submitted ? '' : T('noMatch')))
      : T('count')(list.length, !!activeChannel);

    shownBirds = list;
    if(!list.length){ results.innerHTML = ''; return; }
    results.innerHTML = '<ul class="list">' + list.map((b, i) => {
      const c = canalOf(b), alt = altName(b), kind = canalKind(c);
      const canal = `<span class="dot" style="background:${colorOf[c]||'#5E676B'}"></span>${esc(canalLabel(c))}`;
      const canalHtml = (kind === 'telegram' || kind === 'whatsapp')
        ? `<button type="button" class="canal canal-btn" data-alert="${kind}" aria-expanded="false" title="${esc(T('alertHint'))}">${canal}<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>`
        : `<span class="canal">${canal}</span>`;
      return `<li class="row" data-bi="${i}">
        <span class="fr" lang="${lang === 'en' && b[K_EN] ? 'en' : 'fr'}">${highlight(mainName(b), raw)}${isSsp(b) ? `<span class="tag">${esc(T('ssp'))}</span>` : ''}</span>
        <span class="sci" lang="la">${highlight(b[K_SCI], raw)}</span>
        ${alt ? `<span class="en" lang="${lang === 'en' ? 'fr' : 'en'}">${highlight(alt, raw)}</span>` : ''}
        ${canalHtml}
        <a class="bedit-btn" href="${editorLink('oiseaux', { cherche: b[K_SCI] })}">${esc(T('proposeEdit'))}</a>
        <div class="alertbox" hidden></div>
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
  // ---------- Propositions : elles passent par l'éditeur (editeur.html), qui ouvre la bonne liste sur la bonne entrée ----------
  function editorLink(fichier, opts){
    const q = new URLSearchParams({ fichier });
    if (opts.cherche) q.set('cherche', opts.cherche);
    if (opts.nouveau !== undefined) q.set('nouveau', opts.nouveau);
    return 'editeur.html?' + q.toString();
  }
  $('newBirdBtn').href = editorLink('oiseaux', { nouveau: '' });
  $('newBtn').href = editorLink('lieux', { nouveau: '' });
  function placesFromJson(arr){
    if (!Array.isArray(arr)) return [];
    return arr.filter(e => e && e.nom && Array.isArray(e.carres) && e.carres.length && isFinite(e.lat) && isFinite(e.lon))
      .map(e => [String(e.nom), e.carres.map(String), +e.lat, +e.lon, +(e.precision_m || 550), !!e.verifie]);
  }
  fetch(PLACES_URL).then(r => { if (!r.ok) return Promise.reject(); listsDate.places = r.headers.get('last-modified'); return r.json(); }).then(d => {
    const l = placesFromJson(d); if (!l.length) return;
    PLACES = l.map(fixPlace); buildPfuse(); renderPlaces(); renderWhere(); showVersion();
  }).catch(() => {});
  let tab = 'birds';

  function dms(v, pos, neg){
    const h = v >= 0 ? pos : neg; v = Math.abs(v);
    let t = Math.round(v * 3600);   // tout en secondes entières : pas de « 60″ »
    const d = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), sec = t % 60;
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
    pstatus.innerHTML = list.length ? esc(T('pCount')(list.length)) : (raw ? esc(T('pNone')(raw)) + ` <a class="link" href="${editorLink('lieux', { nouveau: raw })}">${esc(T('newPlaceQ'))}</a>` : '');
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

  // ---------- Proposer une meilleure position : dans l'éditeur, sur ce lieu-dit ----------
  function suggestHtml(p){
    return `<a class="sbtn" href="${editorLink('lieux', { cherche: p[0] })}">${esc(T('suggest'))}</a>`;
  }
  function placeMarks(p){
    if (p[5] || p[4] <= 50) return [{ lat: p[2], lon: p[3], kind: 'verified' }];      // point plein : vérifié ou exact
    if (isPlaced(p)) return [{ lat: p[2], lon: p[3], kind: 'verified', ring: true }];   // anneau : placé sur la carte
    return [];
  }   // point rouge : position vérifiée ou exacte (phares)

  function togglePlace(li){
    const box = li.querySelector('.pmap'), btn = li.querySelector('.ptitle');
    const open = box.hidden;
    box.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (!open) return;
    const p = shownPlaces[+li.dataset.i]; if (!p) return;
    const canSuggest = !(p[4] <= 50 && !p[5]);        // pas pour les phares, dont la position est déjà exacte
    box.innerHTML = `<div class="pview"><p>${esc(T('mapLoading'))}</p></div>` + (canSuggest ? `<div class="suggest">${suggestHtml(p)}</div>` : '');
    const view = box.querySelector('.pview');
    loadMap().then(img => drawPreview(view, p[1], img, placeMarks(p)), () => { view.innerHTML = `<p class="err">${esc(T('mapMissing'))}</p>`; });
  }

  presults.addEventListener('click', e => {
    const b = e.target.closest('button[data-copy]');
    if (!b) {
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
  const NEAR_MIN = 3, NEAR_MAX = 10, NEAR_KEY = 'ouessant-near-n';
  let NEAR_N = 5;   // nombre de lieux-dits affichés autour de soi (réglable de 3 à 10)
  try { const n = parseInt(localStorage.getItem(NEAR_KEY), 10); if (n >= NEAR_MIN && n <= NEAR_MAX) NEAR_N = n; } catch (_) {}
  $('nearN').value = NEAR_N; $('nearOut').textContent = NEAR_N;
  $('nearN').addEventListener('input', e => {
    NEAR_N = Math.min(NEAR_MAX, Math.max(NEAR_MIN, parseInt(e.target.value, 10) || 5));
    $('nearOut').textContent = NEAR_N;
    try { localStorage.setItem(NEAR_KEY, String(NEAR_N)); } catch (_) {}
    renderWhere();   // sans nouvelle localisation : on réutilise la dernière position
  });
  let lastFix = null;
  function bearing(a, b, c, d){
    const r = Math.PI / 180, y = Math.sin((d - b) * r) * Math.cos(c * r);
    const x = Math.cos(a * r) * Math.sin(c * r) - Math.sin(a * r) * Math.cos(c * r) * Math.cos((d - b) * r);
    return (Math.atan2(y, x) / r + 360) % 360;
  }
  function renderWhere(){
    const st = $('wstatus'), out = $('wresults'), mapBox = $('wmap');
    $('shareLoc').hidden = true;
    if (!lastFix){ st.textContent = ''; out.innerHTML = ''; mapBox.hidden = true; return; }
    const { lat, lon, acc } = lastFix;
    if (acc > COARSE_M){ st.textContent = ''; out.innerHTML = coarseHtml(acc); mapBox.hidden = true; return; }
    const ranked = PLACES.map(p => ({ p, d: distM(lat, lon, p[2], p[3]) })).sort((a, b) => a.d - b.d || a.p[0].localeCompare(b.p[0], 'fr'));
    const [x, y] = toPixel(lat, lon), cell = cellAt(x, y);
    if (!cell || ranked[0].d > 3000){
      st.textContent = T('notHere')(fmtDist(ranked[0].d)); out.innerHTML = ''; mapBox.hidden = true; return;
    }
    const near = ranked.slice(0, NEAR_N);
    $('shareLoc').hidden = false;
    st.textContent = T('youAre')(cellName(cell), Math.round(acc), near.length) + (acc > 100 ? ' ' + T('gpsLow') : '');
    const dirs = T('dirs');
    out.innerHTML = '<ul class="list">' + near.map((n, i) => `<li class="near"><a class="nlink" href="https://www.google.com/maps/search/?api=1&query=${n.p[2]},${n.p[3]}" target="_blank" rel="noopener" title="${esc(T('openMap'))}">
        <span class="num">${i + 1}</span>
        <span class="nm">${esc(n.p[0])}</span>
        <span class="sq">${esc(T('square')(n.p[1].length))} ${esc(n.p[1].join(', '))}${n.p[5] ? ', ' + esc(T('checkedShort')) : ''}</span>
        <span class="dist">≈ ${fmtDist(n.d)}<small>${dirs[Math.round(bearing(lat, lon, n.p[2], n.p[3]) / 45) % 8]}</small></span>
      </a></li>`).join('') + '</ul>';
    mapBox.hidden = false;
    mapBox.innerHTML = `<div class="pview"><p>${esc(T('mapLoading'))}</p></div>`;
    const view = mapBox.querySelector('.pview');
    const marks = near.map((n, i) => ({ lat: n.p[2], lon: n.p[3], kind: 'num', label: String(i + 1) })).reverse()
      .concat([{ lat, lon, kind: 'user' }]);
    loadMap().then(img => drawPreview(view, [cellName(cell)], img, marks, T('whereCaption')(cellName(cell))),
      () => { view.innerHTML = `<p class="err">${esc(T('mapMissing'))}</p>`; });
  }
  // Position GPS : le premier relevé d'un téléphone est souvent grossier (antennes, Wi-Fi : parfois ± 2 km).
  // On écoute le GPS, on garde le relevé le plus précis et on s'arrête dès qu'il est suffisant :
  // tout de suite si ≤ 50 m, après 3 s si ≤ 150 m, sinon au bout de 8 s avec le meilleur relevé obtenu.
  const COARSE_M = 1900;   // au-delà, le téléphone n'a donné qu'une position approximative
  const coarseHtml = acc => `<div class="notice" role="alert">${T('coarseHtml')(Math.round(acc))}</div>`;
  function locate(onProgress, onDone, onError){
    let best = null, wid = null, timer = null, soon = null, over = false;
    const stop = () => { over = true; clearTimeout(timer); clearTimeout(soon); try { navigator.geolocation.clearWatch(wid); } catch (_) {} };
    const finish = () => { if (over) return; stop(); best ? onDone(best) : onError(); };
    wid = navigator.geolocation.watchPosition(pos => {
      if (over) return;
      const f = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy };
      if (!best || f.acc <= best.acc) best = f;
      if (best.acc <= 50) return finish();
      onProgress(best);
    }, () => finish(), { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    soon = setTimeout(() => { if (best && best.acc <= 150) finish(); }, 3000);   // assez précis après 3 s : inutile d'attendre
    timer = setTimeout(finish, 8000);
  }

  // ---------- Alerte : message prêt à coller dans le groupe Telegram / WhatsApp ----------
  // Aucun lien de groupe n'est publié : l'appli copie le message et ouvre l'appli de messagerie, l'utilisateur choisit le groupe.
  function alertParts(b, fix){
    let place = null, pos = null, url = null;
    if (fix){
      const { lat, lon } = fix;
      pos = `${lat.toFixed(5)}, ${lon.toFixed(5)}`; url = `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
      if (cellAt(...toPixel(lat, lon)) && PLACES.length){
        const n = PLACES.map(p => ({ p, d: distM(lat, lon, p[2], p[3]) })).sort((a, c) => a.d - c.d)[0];
        if (n.d <= 3000) place = n.p[0];
      }
    }
    const head = T('alertMsg')(b[K_FR], b[K_SCI], pos, place);
    return { head, url, text: url ? head + '\n' + url : head };
  }
  // Sur l'île ? (dans la carte, et à moins de 3 km d'un lieu-dit, comme dans « Où suis-je ? »)
  const onIsland = fix => cellAt(...toPixel(fix.lat, fix.lon)) && (!PLACES.length || Math.min(...PLACES.map(p => distM(fix.lat, fix.lon, p[2], p[3]))) <= 3000);
  function fillAlert(box, b, kind, fix, failed){
    if (fix && fix.acc > COARSE_M){ box.innerHTML = coarseHtml(fix.acc) + `<div class="actions"><button type="button" data-aretry>${esc(T('retry'))}</button></div>`; return; }
    if (fix && fix.acc > 500){ box.innerHTML = `<p class="astat bad" role="alert">${esc(T('alertImprecise')(Math.round(fix.acc)))}</p><div class="actions"><button type="button" data-aretry>${esc(T('retry'))}</button></div>`; return; }
    if (fix && !onIsland(fix)){ box.innerHTML = `<p class="astat bad" role="alert">${esc(T('alertOff'))}</p>`; return; }
    const { head, url, text } = alertParts(b, fix);
    const open = kind === 'whatsapp' ? 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text)
      : url ? 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(head) : 'https://t.me/';
    box.innerHTML = `<p class="astat" aria-live="polite"></p>
      <textarea class="atext" readonly rows="${text.split('\n').length + 1}" aria-label="${esc(T('alertHint'))}">${esc(text)}</textarea>
      <div class="actions"><a href="${esc(open)}" target="_blank" rel="noopener">${esc(T(kind === 'whatsapp' ? 'openWhatsapp' : 'openTelegram'))}</a><button type="button" data-acopy>${esc(T('copy'))}</button></div>`;
    const st = box.querySelector('.astat');
    const done = () => { st.textContent = T('alertCopied'); };
    const bad = () => { st.textContent = T('alertCopyFail'); };
    if (failed) st.textContent = T('alertNoGps');
    else if (fix && fix.acc > 100) st.textContent = T('alertApprox')(Math.round(fix.acc));
    else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, bad); else bad();
  }
  results.addEventListener('click', e => {
    const rt = e.target.closest('[data-aretry]');
    if (rt){ const li = rt.closest('.row'); runAlert(li.querySelector('.alertbox'), shownBirds[+li.dataset.bi], li.querySelector('.canal-btn').dataset.alert); return; }
    const cp = e.target.closest('[data-acopy]');
    if (cp){
      const box = cp.closest('.alertbox'), text = box.querySelector('.atext').value;
      const ok = () => { box.querySelector('.astat').textContent = T('alertCopied'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, () => fallbackCopy(text, ok)); else fallbackCopy(text, ok);
      return;
    }
    const btn = e.target.closest('.canal-btn'); if (!btn) return;
    const li = btn.closest('.row'), box = li.querySelector('.alertbox'), b = shownBirds[+li.dataset.bi]; if (!b) return;
    const show = box.hidden;
    box.hidden = !show; btn.setAttribute('aria-expanded', String(show));
    if (!show) return;
    runAlert(box, b, btn.dataset.alert);
  });
  function runAlert(box, b, kind){
    const token = box.dataset.t = String(Date.now()), live = () => box.dataset.t === token && !box.hidden;
    box.innerHTML = `<p class="astat" aria-live="polite">${esc(T('gpsWait'))}</p>`;
    if (!navigator.geolocation){ fillAlert(box, b, kind, null, true); return; }
    locate(f => { if (live()) box.querySelector('.astat').textContent = T('gpsWait') + ' (± ' + Math.round(f.acc) + ' m)'; },
      fix => { if (live()) fillAlert(box, b, kind, fix, false); },
      () => { if (live()) fillAlert(box, b, kind, null, true); });
  }

  // Partager ma position : message prêt à envoyer (lieu-dit le plus proche, coordonnées, lien Google Maps)
  $('shareLoc').addEventListener('click', () => {
    if (!lastFix) return;
    const { lat, lon } = lastFix, n = PLACES.map(p => ({ p, d: distM(lat, lon, p[2], p[3]) })).sort((a, b) => a.d - b.d)[0];
    const text = T('shareLocMsg')(n.p[0], lat.toFixed(5), lon.toFixed(5), `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`);
    const btn = $('shareLoc').querySelector('span'), back = () => setTimeout(() => { btn.textContent = T('shareLocBtn'); }, 1800);
    const copied = () => { btn.textContent = T('shareLocCopied'); back(); };
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(copied, () => fallbackCopy(text, copied));
    else fallbackCopy(text, copied);
  });
  $('locate').addEventListener('click', () => {
    const st = $('wstatus');
    if (!navigator.geolocation){ st.textContent = T('gpsErr'); return; }
    st.textContent = T('gpsWait');
    locate(f => { st.textContent = T('gpsWait') + ' (± ' + Math.round(f.acc) + ' m)'; },
      fix => {
        lastFix = fix;
        $('locate').querySelector('span').textContent = T('relocateBtn');
        renderWhere();
      }, () => { st.textContent = T('gpsErr'); });
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
    if (navigator.onLine === false && !wx) return `<p class="wind-sub">${esc(T('wOffline'))}</p>`;
    if (!wx) return `<p class="wind-sub">${esc(wxState === 'err' ? T('wErr') : T('wLoading'))}</p>`;
    const c = wx.current, d = wx.daily, kmh = Math.round(c.wind_speed_10m), i = dir16(c.wind_direction_10m);
    const days = d.time.map((t, j) => {
      const label = j === 0 ? T('today') : j === 1 ? T('tomorrow') : (s => s.charAt(0).toUpperCase() + s.slice(1))(new Date(t + 'T12:00').toLocaleDateString(lang, { weekday: 'long' }));
      return `<div class="day"><b>${esc(label)}</b><span class="dw">${arrow(d.wind_direction_10m_dominant[j], 14)} ${esc(T('dirsShort')[dir16(d.wind_direction_10m_dominant[j])])} ${Math.round(d.wind_speed_10m_max[j])} km/h</span>${esc(T('wx')[d.weather_code[j]] || '')}<br>${Math.round(d.temperature_2m_max[j])} °C</div>`;
    }).join('');
    return `<div class="wind"><div class="wind-ar">${ILE}<span class="n">N</span>${arrow(c.wind_direction_10m, 30)}</div>
      <div><div class="wind-main">${esc(T('wNow')(T('dirs16')[i], kmh, beaufort(c.wind_speed_10m)))}</div>
      <div class="wind-sub">${esc(T('wGust')(Math.round(c.wind_gusts_10m)))}, ${esc(T('wx')[c.weather_code] || '')}, ${Math.round(c.temperature_2m)} °C</div></div></div>
      <div class="days">${days}</div><p class="pp-src">${esc(T('wSrc'))}</p>`;
  }
  function qrSvg(){ return `<img src="qr_ouessant.svg" alt="QR code : ${esc(APP_URL)}" width="116" height="116" style="display:block;width:100%;height:100%">`; }
  function loadQr(){}
  function renderPhare(){
    const box = qrSvg();
    $('pharePanel').innerHTML = `<div class="pp-sec"><h2 class="pp-h">${esc(T('wTitle'))}</h2>${wxHtml()}</div>
      <div class="pp-sec"><div class="qr">
        <div class="qr-box">${ORIOLE}${FERN}${box}</div>
        <div class="qr-txt"><h2 class="pp-h">${esc(T('shTitle'))}</h2>${esc(T('shText'))}<div class="btns">${navigator.share ? `<button type="button" class="main" data-ph="share">${esc(T('shBtn'))}</button>` : ''}<button type="button" data-ph="copy">${esc(T('shCopy'))}</button></div></div>
      </div></div>
      <div class="pp-sec pp-foot"><p class="pp-ver">${esc(versionText())}</p>
        <button type="button" class="link" data-ph="legal" aria-expanded="${legalOpen}">${esc(T('legalBtn'))}</button>
        ${legalOpen ? `<div class="legal">${T('legalHtml')}</div>` : ''}</div>`;
  }
  let legalOpen = false;
  function openPhare(open){
    $('pharePanel').hidden = !open; $('phareBtn').setAttribute('aria-expanded', String(open));
    if (open){ loadWx(); loadQr(); renderPhare(); }
  }
  // hors connexion, le phare s'éteint (pas de faisceau ni de lanterne allumée)
  function updatePhare(){
    const off = navigator.onLine === false, img = $('phareBtn').querySelector('img');
    img.src = off ? 'phare_creach_eteint.svg' : 'phare_creach.svg';
    $('phareBtn').classList.toggle('off', off);
    $('phareBtn').title = off ? T('phareOff') : T('phareLabel');
    if (!$('pharePanel').hidden) renderPhare();
  }
  window.addEventListener('online', updatePhare); window.addEventListener('offline', updatePhare);
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
    if (b.dataset.ph === 'legal'){ legalOpen = !legalOpen; renderPhare(); return; }
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
  updatePhare();

  // 1) GitHub  2) copie enregistrée dans le navigateur  3) import manuel
  fetch('version_listes.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject()).then(v => { if (v && typeof v.rev === 'number') { listsRev = v; showVersion(); } }).catch(() => {});
  fetch(URL_DATA)
    .then(r => { if(!r.ok) throw new Error(r.status); listsDate.birds = r.headers.get('last-modified'); return r.json(); })
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
