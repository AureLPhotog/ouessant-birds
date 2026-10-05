/* Oiseaux d'Ouessant — logique de l'éditeur (editeur.html). Carte partagée : js/carte.js */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const DRAFT = 'json-editor-draft';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- Champs propres à l'appli Ouessant : menus déroulants et grille des carrés ----------
  const FIELD_CONFIG = {
    'Proposition de Canal de Diffusion Ouessant': { type: 'select', options: [['Télégram', 'Alerte Telegram'], ['Whatsapp', 'Alerte WhatsApp'], ["Pas d'annonce", "Pas d'alerte"]] },
    'Type de taxon': { type: 'select', options: [['espèce', 'espèce'], ['sous-espèce', 'sous-espèce']] },
    'carres': { type: 'cells' }
  };
  const labelOf = (k, v) => { const c = FIELD_CONFIG[k]; if (!c || c.type !== 'select') return null; const o = c.options.find(x => x[0] === v); return o ? o[1] : null; };
  // Grille des carrés et recalage GPS : partagés avec l'appli (js/carte.js)
  const { GRID_X, GRID_Y, MAP_W, MAP_H, toPixel, fromPixel, cellNameAt: cellAt } = window.OuessantCarte;
  let mapOk = false;
  // Carte en fond de grille : à côté de l'éditeur si elle y est, sinon celle du site en ligne
  const MAP_SOURCES = ['carte_ouessant.webp', 'carte_ouessant.jpg', 'https://aurelphotog.github.io/ouessant-birds/carte_ouessant.webp', 'https://aurelphotog.github.io/ouessant-birds/carte_ouessant.jpg'];
  (function tryMap(k){
    if (k >= MAP_SOURCES.length) return;
    const im = new Image();
    im.onload = () => { document.documentElement.style.setProperty('--map-url', `url("${new URL(MAP_SOURCES[k], location.href).href}")`); mapOk = true; document.querySelectorAll('.cells').forEach(g => g.classList.add('with-map')); };
    im.onerror = () => tryMap(k + 1);
    im.src = MAP_SOURCES[k];
  })(0);
  const num = v => { const n = Number(String(v).trim().replace(',', '.')); return String(v).trim() !== '' && isFinite(n) ? n : null; };
  // Nom affiché pour une liste : « Oiseaux » ou « Lieux » (jamais le nom du fichier)
  const kindOf = name => /lieu/i.test(name || '') ? 'places' : /bird|oiseau/i.test(name || '') ? 'birds' : '';
  const KIND_LABEL = { birds: 'Oiseaux', places: 'Lieux' }, KIND_UNIT = { birds: ['oiseau', 'oiseaux'], places: ['lieu', 'lieux'] };
  const listLabel = name => KIND_LABEL[kindOf(name)] || name;
  const countText = n => { const u = KIND_UNIT[kindOf(gh ? gh.path : fileName)]; return u ? `${n} ${u[n > 1 ? 1 : 0]}` : `${n} entrées`; };
  const hasGeo = () => ['lat', 'lon', 'carres'].every(k => fields.includes(k));

  function cellsHtml(selected){
    const sel = new Set(selected), cols = GRID_X.length - 1, rows = GRID_Y.length - 1;
    const fx = GRID_X.slice(1).map((x, i) => (x - GRID_X[i]) + 'fr').join(' '), fy = GRID_Y.slice(1).map((y, i) => (y - GRID_Y[i]) + 'fr').join(' ');
    // fond : la carte, recadrée sur la zone quadrillée
    const bw = (MAP_W / (GRID_X[cols] - GRID_X[0]) * 100).toFixed(3), bx = (GRID_X[0] / (MAP_W - (GRID_X[cols] - GRID_X[0])) * 100).toFixed(3);
    const by = (GRID_Y[0] / (MAP_H - (GRID_Y[rows] - GRID_Y[0])) * 100).toFixed(3);
    let h = `<div class="cells-tools" role="group" aria-label="Zoom de la carte">
        <button type="button" class="zb" data-zoom="-" aria-label="Dézoomer">−</button>
        <span class="zl" data-zoom-label>${Math.round(zoom * 100)} %</span>
        <button type="button" class="zb" data-zoom="+" aria-label="Zoomer">+</button>
        <button type="button" class="btn ghost" data-zoom="sel">Centrer sur la sélection</button>
        <button type="button" class="btn ghost" data-zoom="fit">Toute la carte</button>
        ${hasGeo() ? '<span style="flex:1"></span><button type="button" class="btn" data-gps>Je suis sur place : envoyer ma position GPS</button><button type="button" class="btn" data-pick aria-pressed="false">Placer le point GPS sur la carte</button>' : ''}
      </div>
      ${hasGeo() ? '<p class="geo-hint" data-geo-hint></p>' : ''}
      <div class="cells-scroll"><div class="cells-wrap" style="--z:${zoom}"><div class="cells-head" style="grid-template-columns:${fx}">${Array.from({ length: cols }, (_, c) => `<span>${String.fromCharCode(65 + c)}</span>`).join('')}</div>
      <div class="cells-body"><div class="cells-side" style="grid-template-rows:${fy}">${Array.from({ length: rows }, (_, r) => `<span>${r + 1}</span>`).join('')}</div>
      <div class="cells${mapOk ? ' with-map' : ''}" role="group" aria-label="Carrés de la carte" style="grid-template-columns:${fx};grid-template-rows:${fy};aspect-ratio:${GRID_X[cols] - GRID_X[0]} / ${GRID_Y[rows] - GRID_Y[0]};background-size:${bw}% auto;background-position:${bx}% ${by}%">`;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
      const n = String.fromCharCode(65 + c) + (r + 1);
      h += `<button type="button" data-cell="${n}" aria-pressed="${sel.has(n)}" title="${n}" aria-label="${n}"></button>`;
    }
    return h + '<span class="pin" data-pin hidden></span></div></div></div></div>';
  }
  // Point GPS sur la grille + contrôle « le point est-il dans un carré sélectionné ? »
  function updateGeo(field){
    if (!hasGeo()) return;
    const form = field.closest('.form-wrap'), pin = field.querySelector('[data-pin]'), hint = field.querySelector('[data-geo-hint]');
    const lat = num(form.querySelector('[data-k="lat"]').value), lon = num(form.querySelector('[data-k="lon"]').value);
    if (lat === null || lon === null){ pin.hidden = true; hint.textContent = ''; hint.className = 'geo-hint'; return; }
    const [x, y] = toPixel(lat, lon), cell = cellAt(x, y), sel = selectedCells(field);
    const W = GRID_X[GRID_X.length - 1] - GRID_X[0], H = GRID_Y[GRID_Y.length - 1] - GRID_Y[0];
    pin.hidden = !cell; pin.style.left = ((x - GRID_X[0]) / W * 100) + '%'; pin.style.top = ((y - GRID_Y[0]) / H * 100) + '%';
    if (!cell){ hint.className = 'geo-hint bad'; hint.textContent = 'Le point GPS est en dehors de la carte d’Ouessant.'; return; }
    if (sel.includes(cell)){ hint.className = 'geo-hint good'; hint.textContent = `Le point GPS est bien dans le carré ${cell}.`; }
    else { hint.className = 'geo-hint bad'; hint.innerHTML = `Le point GPS est dans le carré <b>${cell}</b>, qui n’est pas sélectionné. <button type="button" class="btn ghost" data-addcell="${cell}">Ajouter ${cell}</button>`; }
  }
  // Position GPS du téléphone (sur place) : remplit lat / lon, la précision, coche « verifie » et le carré
  function useGps(form){
    const field = form.querySelector('.cells-field'), hint = field && field.querySelector('[data-geo-hint]');
    if (!field) return;
    if (!navigator.geolocation){ hint.className = 'geo-hint bad'; hint.textContent = 'Ce navigateur ne donne pas accès à la position GPS.'; return; }
    hint.className = 'geo-hint'; hint.textContent = 'Recherche de ta position…';
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude, accuracy } = pos.coords, [x, y] = toPixel(latitude, longitude), c = cellAt(x, y);
      if (!c){ hint.className = 'geo-hint bad'; hint.textContent = 'Ta position est en dehors de la carte d\u2019Ouessant : rien n\u2019a été modifié.'; return; }
      form.querySelector('[data-k="lat"]').value = latitude.toFixed(5); form.querySelector('[data-k="lon"]').value = longitude.toFixed(5);
      const pr = form.querySelector('[data-k="precision_m"]'); if (pr){ pr.value = Math.max(10, Math.round(accuracy)); pr.closest('label').classList.add('changed'); }
      const vf = form.querySelector('[data-k="verifie"]'); if (vf) vf.checked = true;     // relevé sur place
      const b = field.querySelector(`[data-cell="${c}"]`);
      if (b && b.getAttribute('aria-pressed') !== 'true'){ b.setAttribute('aria-pressed', 'true'); field.querySelector('[data-cells]').value = selectedCells(field).join(', '); }
      updateGeo(field); centerOn(field.querySelector('.cells-scroll'), [c]);
      hint.insertAdjacentText('beforeend', ` (position GPS ± ${Math.round(accuracy)} m${accuracy > 100 ? ' : précision faible, réessaie à découvert' : ''})`);
    }, () => { hint.className = 'geo-hint bad'; hint.textContent = 'Position GPS indisponible : autorise la localisation, ou place le point sur la carte.'; },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  }
  function geoProblem(form){
    if (!hasGeo()) return null;
    const lat = num(form.querySelector('[data-k="lat"]').value), lon = num(form.querySelector('[data-k="lon"]').value);
    const sel = form.querySelector('[data-cells]').value.toUpperCase().split(/[\s,;]+/).filter(Boolean);
    if (lat === null || lon === null || !sel.length) return null;
    const cell = cellAt(...toPixel(lat, lon));
    if (!cell) return { text: 'Le point GPS est en dehors de la carte d’Ouessant.' };
    return sel.includes(cell) ? null : { text: `Le point GPS tombe dans le carré ${cell}, qui ne fait pas partie des carrés sélectionnés (${sel.join(', ')}).`, cell };
  }
  // Zoom : la grille est agrandie dans une zone qui défile ; on garde le niveau choisi d'une entrée à l'autre
  const ZOOMS = [1, 1.6, 2.3, 3.2, 4.5];
  let zoom = 2.3, zoomChosen = false;
  function centerOn(scroll, cells){
    const grid = scroll.querySelector('.cells'); if (!grid) return;
    const btns = cells.length ? cells.map(c => grid.querySelector(`[data-cell="${c}"]`)).filter(Boolean) : [];
    let cx, cy;
    if (btns.length){
      // positions mesurées par rapport à la zone défilante (et non au tableau)
      const R = scroll.getBoundingClientRect();
      const xs = btns.map(b => { const q = b.getBoundingClientRect(); return q.left + q.width / 2 - R.left + scroll.scrollLeft; });
      const ys = btns.map(b => { const q = b.getBoundingClientRect(); return q.top + q.height / 2 - R.top + scroll.scrollTop; });
      cx = (Math.min(...xs) + Math.max(...xs)) / 2; cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    } else { cx = scroll.scrollWidth / 2; cy = scroll.scrollHeight / 2; }
    scroll.scrollLeft = cx - scroll.clientWidth / 2; scroll.scrollTop = cy - scroll.clientHeight / 2;
  }
  function selectedCells(field){ return [...field.querySelectorAll('[data-cell][aria-pressed="true"]')].map(b => b.dataset.cell); }
  function setZoom(field, z, keepCenter){
    const scroll = field.querySelector('.cells-scroll'), wrap = field.querySelector('.cells-wrap');
    const rx = (scroll.scrollLeft + scroll.clientWidth / 2) / scroll.scrollWidth, ry = (scroll.scrollTop + scroll.clientHeight / 2) / scroll.scrollHeight;
    zoom = z; zoomChosen = true; wrap.style.setProperty('--z', z);
    field.querySelector('[data-zoom-label]').textContent = Math.round(z * 100) + ' %';
    if (keepCenter){ scroll.scrollLeft = rx * scroll.scrollWidth - scroll.clientWidth / 2; scroll.scrollTop = ry * scroll.scrollHeight - scroll.clientHeight / 2; }
    else centerOn(scroll, selectedCells(field));
  }
  function initCells(){
    document.querySelectorAll('.cells-field').forEach(f => {
      const sel = selectedCells(f);
      // sans carré choisi et sans zoom réglé, on montre toute la carte
      if (!sel.length && !zoomChosen){ f.querySelector('.cells-wrap').style.setProperty('--z', 1); f.querySelector('[data-zoom-label]').textContent = '100 %'; }
      centerOn(f.querySelector('.cells-scroll'), sel);
      updateGeo(f);
    });
  }

  // État : chaque entrée garde sa version d'origine pour repérer les modifications
  let fileName = '', items = [], deleted = [], fields = [], types = {}, uid = 0;
  let openId = null, sortField = null, sortDir = 1, filters = {}, shown = 200;

  // ---------- Types de champs, déduits des valeurs ----------
  function detectTypes(){
    const keys = []; items.forEach(it => Object.keys(it.data).forEach(k => { if (!keys.includes(k)) keys.push(k); }));
    fields = keys; types = {};
    keys.forEach(k => {
      const vals = items.map(it => it.data[k]).filter(v => v !== undefined && v !== null && v !== '');
      let t = 'text';
      if (vals.length && vals.every(v => typeof v === 'boolean')) t = 'bool';
      else if (vals.length && vals.every(v => typeof v === 'number')) t = 'number';
      else if (vals.length && vals.every(v => Array.isArray(v))) t = vals.every(v => v.every(x => typeof x === 'number')) ? 'numlist' : 'list';
      else if (vals.some(v => typeof v === 'object')) t = 'json';
      const distinct = t === 'text' ? [...new Set(vals.map(String))] : [];
      types[k] = { t, choices: distinct.length && distinct.length <= 12 && vals.length >= 10 ? distinct.sort((a, b) => a.localeCompare(b, 'fr')) : null };
      const cfg = FIELD_CONFIG[k];
      if (cfg && cfg.type === 'select') types[k].choices = cfg.options.map(o => o[0]).concat(distinct.filter(v => !cfg.options.some(o => o[0] === v)));
      if (cfg && cfg.type === 'cells') types[k].t = 'list';
    });
  }
  const showK = (k, v) => labelOf(k, v) || show(v, types[k] ? types[k].t : 'text');
  const show = (v, t) => v === undefined || v === null || v === '' ? '' :
    (t === 'list' || t === 'numlist') ? v.join(', ') : t === 'bool' ? (v ? 'oui' : 'non') : typeof v === 'object' ? JSON.stringify(v) : String(v);

  // ---------- Chargement ----------
  // g : fichier GitHub d'origine (ou null) ; fixé avant l'affichage et la sauvegarde du brouillon, pour ne jamais garder la cible de la liste précédente
  function load(name, data, origs, g){
    if (!Array.isArray(data)) throw new Error('Le fichier doit contenir une liste [ … ] d\u2019entrées.');
    if (!data.every(x => x && typeof x === 'object' && !Array.isArray(x))) throw new Error('Chaque entrée de la liste doit être un objet { … }.');
    if (g !== undefined) gh = g;
    fileName = name || 'liste.json';
    items = data.map((d, i) => ({ id: ++uid, data: clone(d), orig: origs ? origs[i] : clone(d) }));
    deleted = []; openId = null; filters = {}; sortField = null; shown = 200; $('search').value = '';
    detectTypes(); buildFilters(); buildKeyField();
    $('importView').classList.add('hidden'); $('editView').classList.remove('hidden');
    render(); save();
  }
  // ---------- GitHub : ouvrir et enregistrer directement dans le dépôt ----------
  const GH = { owner: 'AureLPhotog', repo: 'ouessant-birds', files: ['ouessant_birds.json', 'lieux_ouessant.json'] };
  const branch = 'main';   // l'éditeur lit et enregistre toujours sur main
  const TOKEN_KEY = 'gh-token-ouessant', OK_KEY = TOKEN_KEY + '-ok';   // OK_KEY : la clé a été vérifiée auprès de GitHub
  let gh = null;            // { path, sha } du fichier ouvert depuis GitHub
  let fmtHint = null;       // mise en forme d'origine du fichier, pour l'export
  // La clé est gardée dans l'onglet (sessionStorage) par défaut, ou sur l'appareil (localStorage) si on le demande
  const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } };
  const tokenRemembered = () => { try { return !!localStorage.getItem(TOKEN_KEY); } catch (_) { return false; } };
  const tokenValid = () => { try { return !!getToken() && (sessionStorage.getItem(OK_KEY) || localStorage.getItem(OK_KEY)) === getToken().slice(-8); } catch (_) { return false; } };
  function setTokenValid(ok){
    try {
      const st = tokenRemembered() ? localStorage : sessionStorage; localStorage.removeItem(OK_KEY); sessionStorage.removeItem(OK_KEY);
      if (ok) st.setItem(OK_KEY, getToken().slice(-8));
    } catch (_) {}
  }
  function storeToken(t, remember){
    try {
      if (remember){ localStorage.setItem(TOKEN_KEY, t); sessionStorage.removeItem(TOKEN_KEY); }
      else { sessionStorage.setItem(TOKEN_KEY, t); localStorage.removeItem(TOKEN_KEY); }
    } catch (_) {}
    setTokenValid(false);   // nouvelle clé : pas encore vérifiée
  }
  function forgetToken(){ try { [localStorage, sessionStorage].forEach(s => { s.removeItem(TOKEN_KEY); s.removeItem(OK_KEY); }); } catch (_) {} }
  const api = (path, opts = {}) => {
    const h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    const t = getToken(); if (t) h['Authorization'] = 'Bearer ' + t;
    if (opts.body) h['Content-Type'] = 'application/json';
    return fetch(`https://api.github.com/repos/${GH.owner}/${GH.repo}${path}`, Object.assign({ cache: 'no-store' }, opts, { headers: h }));
  };
  const b64enc = str => { const by = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < by.length; i += 8192) bin += String.fromCharCode.apply(null, by.subarray(i, i + 8192)); return btoa(bin); };
  const b64dec = b64 => new TextDecoder('utf-8').decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
  // détecte la mise en forme du fichier (une entrée par ligne, ou indenté) pour la conserver
  function detectFormat(text){
    const lines = text.trim().split('\n');
    if (lines.length > 2 && lines.slice(1, -1).every(l => /^\s*\{.*\},?\s*$/.test(l))) return { fmt: 'lines' };
    const m = text.match(/^\[\s*\n( +)\{/); return { fmt: 'indent', n: m ? m[1].length : 2 };
  }
  function applyFormat(h){ fmtHint = h; }
  function keyInfo(){
    const t = getToken();
    $('ghKeyInfo').innerHTML = t ? (tokenRemembered() ? 'Clé GitHub mémorisée sur cet appareil.' : 'Clé GitHub active dans cet onglet (oubliée à sa fermeture).') + ' <button type="button" class="btn ghost" data-key>Gérer la clé</button>'
      : 'Lecture possible sans clé. Pour enregistrer sur GitHub, il faudra une clé d’accès. <button type="button" class="btn ghost" data-key>Ajouter une clé</button>';
    updateSaveBtn();
  }
  keyInfo();
  document.addEventListener('click', e => { if (e.target.closest('[data-key]')) openKey(); });
  async function ghOpen(path){
    const out = $('importMsg'); out.className = 'msg'; out.textContent = 'Chargement depuis GitHub…';
    try {
      const r = await api(`/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`);
      if (r.status === 401){ setTokenValid(false); throw new Error('clé refusée par GitHub (expirée ou invalide ?)'); }
      if (r.status === 404) throw new Error(`${path} introuvable sur la branche ${branch}`);
      if (r.status === 403) throw new Error('accès refusé ou limite de requêtes atteinte, réessaie dans quelques minutes');
      if (!r.ok) throw new Error('erreur ' + r.status);
      const j = await r.json(), text = b64dec(j.content);
      load(path, JSON.parse(text), undefined, { path, sha: j.sha, branch });
      gh = { path, sha: j.sha, branch }; applyFormat(detectFormat(text)); save(); render();
      out.textContent = '';
      toast(`${listLabel(path)} : ${countText(items.length)} chargés depuis GitHub.`);
      return true;
    } catch (e) { out.className = 'msg bad'; out.textContent = 'Impossible d’ouvrir depuis GitHub : ' + e.message + '.'; return false; }
  }

  // clé d'accès
  function openKey(){ ['ghPanel','pastePanel'].forEach(id => $(id).classList.add('hidden')); $('keyPanel').classList.remove('hidden');
    if ($('editView').classList.contains('hidden')){ $('importView').classList.add('hidden'); $('editView').classList.remove('hidden'); $('editView').dataset.keyOnly = '1'; }
    $('ghToken').value = getToken(); $('ghRemember').checked = tokenRemembered(); $('keyMsg').textContent = ''; $('ghToken').focus(); }
  function closeKey(){ $('keyPanel').classList.add('hidden');
    if ($('editView').dataset.keyOnly){ delete $('editView').dataset.keyOnly; $('editView').classList.add('hidden'); $('importView').classList.remove('hidden'); } keyInfo(); }
  $('keyClose').addEventListener('click', closeKey);
  $('keyForget').addEventListener('click', () => { forgetToken(); $('ghToken').value = ''; $('ghRemember').checked = false; $('keyMsg').className = 'msg good'; $('keyMsg').textContent = 'Clé effacée de ce navigateur.'; keyInfo(); });
  $('keySave').addEventListener('click', async () => {
    const t = $('ghToken').value.trim(), m = $('keyMsg');
    if (!t){ m.className = 'msg bad'; m.textContent = 'Colle d’abord ton jeton.'; return; }
    storeToken(t, $('ghRemember').checked);
    m.className = 'msg'; m.textContent = 'Vérification…';
    try {
      const r = await api('');
      if (r.status === 401){ forgetToken(); throw new Error('GitHub refuse ce jeton (mal copié ou expiré).'); }
      if (!r.ok) throw new Error('le dépôt est inaccessible avec ce jeton (erreur ' + r.status + ').');
      const j = await r.json();
      if (j.permissions && j.permissions.push === false) throw new Error('ce jeton peut lire le dépôt mais pas y écrire : ajoute la permission « Contents : Read and write ».');
      setTokenValid(true); m.className = 'msg good'; m.textContent = 'Clé valide : l’éditeur peut enregistrer dans AureLPhotog/ouessant-birds.' + ($('ghRemember').checked ? ' Elle est mémorisée sur cet appareil.' : ' Elle sera oubliée à la fermeture de l’onglet.'); keyInfo();
    } catch (e) { m.className = 'msg bad'; m.textContent = e.message; keyInfo(); }
  });

  // enregistrement
  function commitMessage(){
    const key = ['Nom Français', 'nom'].find(k => fields.includes(k)) || $('keyField').value || fields[0], name = d => d && d[key] !== undefined ? show(d[key], types[key] ? types[key].t : 'text') : '?';
    const mod = items.filter(it => it.orig && !same(it.data, it.orig)), add = items.filter(it => !it.orig), del = deleted.filter(it => it.orig);
    const part = (n, list, w) => list.length ? `${list.length} ${w}${list.length > 1 ? 's' : ''} (${list.slice(0, 3).map(it => name(it.data)).join(', ')}${list.length > 3 ? '…' : ''})` : '';
    const label = /bird|oiseau/i.test(gh ? gh.path : fileName) ? 'Oiseaux' : /lieu/i.test(gh ? gh.path : fileName) ? 'Lieux' : fileName;
    const title = `${label} : ` + [part(0, mod, 'modifiée'), part(0, add, 'ajoutée'), part(0, del, 'supprimée')].filter(Boolean).join(', ');
    // détail, champ par champ (noms de champs raccourcis quand ils sont longs)
    const SHORT = { 'Proposition de Canal de Diffusion Ouessant': 'Canal', 'Nom Scientifique': 'Nom sci.', 'precision_m': 'précision' };
    const fl = k => SHORT[k] || k, val = (k, v) => { const t = show(v, types[k] ? types[k].t : 'text'); return t === '' ? '(vide)' : t; };
    const MAX = 60, body = [];
    if (mod.length){
      body.push('Modifiées :');
      mod.slice(0, MAX).forEach(it => {
        const keys = [...new Set([...Object.keys(it.orig), ...Object.keys(it.data)])].filter(k => !same(it.orig[k], it.data[k]));
        body.push(`- ${name(it.orig)} : ` + keys.map(k => `${fl(k)} : ${val(k, it.orig[k])} → ${val(k, it.data[k])}`).join(' ; '));
      });
      if (mod.length > MAX) body.push(`- … et ${mod.length - MAX} autres`);
    }
    if (add.length){
      body.push('Ajoutées :');
      add.slice(0, MAX).forEach(it => body.push(`- ${name(it.data)} (` + Object.keys(it.data).filter(k => k !== key).map(k => `${fl(k)} : ${val(k, it.data[k])}`).join(' ; ') + ')'));
      if (add.length > MAX) body.push(`- … et ${add.length - MAX} autres`);
    }
    if (del.length){
      body.push('Supprimées :');
      del.slice(0, MAX).forEach(it => body.push(`- ${name(it.orig)}`));
      if (del.length > MAX) body.push(`- … et ${del.length - MAX} autres`);
    }
    return body.length ? title + '\n\n' + body.join('\n') : title;
  }
  // Numéro de version des listes : version de l'appli + nombre d'enregistrements depuis cette version (3.21.1, 3.21.2…).
  // Stocké dans version_listes.json ; repart à 1 quand la version de l'appli (js/version.js) a changé.
  async function bumpListsVersion(br){
    try {
      const app = window.OUESSANT_APP_VERSION; if (!app) return null;
      const p = '/contents/version_listes.json', r0 = await api(`${p}?ref=${encodeURIComponent(br)}`);
      let cur = {}, sha;
      if (r0.ok){ const j0 = await r0.json(); sha = j0.sha; try { cur = JSON.parse(b64dec(j0.content)); } catch (_) {} }
      else if (r0.status !== 404) return null;
      const rev = (cur.app === app && Number.isInteger(cur.rev) ? cur.rev : 0) + 1;
      const r = await api(p, { method: 'PUT', body: JSON.stringify({ message: `Version des listes : ${app}.${rev}`, content: b64enc(JSON.stringify({ app, rev }) + '\n'), sha, branch: br }) });
      return r.ok ? `${app}.${rev}` : null;
    } catch (_) { return null; }
  }
  $('ghSaveBtn').addEventListener('click', () => {
    if (!getToken()){ openKey(); return; }
    ['pastePanel','keyPanel'].forEach(id => $(id).classList.add('hidden'));
    const c = changes(), path = gh ? gh.path : (GH.files.includes(fileName) ? fileName : null);
    $('ghPanel').classList.toggle('hidden');
    if (!path){ $('ghTarget').innerHTML = `Ce fichier ne correspond à aucun fichier du dépôt (${GH.files.join(', ')}). Ouvre-le depuis GitHub, ou renomme-le.`; $('ghCommit').disabled = true; return; }
    $('ghCommit').disabled = !c.total;
    $('ghTarget').innerHTML = `Fichier : <b>${esc(path)}</b> sur la branche <b>${esc(gh ? gh.branch || branch : branch)}</b>. ` + (c.total ? `${c.mod} modifiée(s), ${c.add} ajoutée(s), ${c.del} supprimée(s).` : 'Aucune modification à enregistrer.')
      + (gh ? '' : ' <b>Attention :</b> ce fichier vient de ton ordinateur, la version en ligne sera entièrement remplacée.');
    $('ghMsg').value = c.total ? commitMessage() : ''; $('ghMsgOut').textContent = '';
  });
  $('ghClose').addEventListener('click', () => $('ghPanel').classList.add('hidden'));
  $('ghCommit').addEventListener('click', async () => {
    const out = $('ghMsgOut'), path = gh ? gh.path : fileName, msg = $('ghMsg').value.trim() || commitMessage();
    if (!gh && !confirm(`Remplacer ${path} sur GitHub par cette version ?`)) return;
    $('ghCommit').disabled = true; out.className = 'msg'; out.textContent = 'Enregistrement sur GitHub…';
    try {
      let sha = gh && gh.sha;
      const br = gh ? gh.branch || branch : branch;
      if (!sha){ const r0 = await api(`/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(br)}`); if (r0.ok) sha = (await r0.json()).sha; }
      const text = exportText(); JSON.parse(text);
      const r = await api(`/contents/${encodeURIComponent(path)}`, { method: 'PUT', body: JSON.stringify({ message: msg, content: b64enc(text), sha, branch: br }) });
      if (!r.ok){ const em = ((await r.clone().json().catch(() => ({}))).message || '').toLowerCase();
        if (/rule|protected/.test(em)) throw new Error(`la branche ${br} est protégée par une règle du dépôt, et cette clé n’a pas le droit d’y écrire directement. Choisis une autre branche (ou « + Nouvelle branche… ») et ouvre ensuite une pull request.`); }
      if (r.status === 409 || r.status === 422) { copyText(changesText()); throw new Error('la liste a été modifiée sur GitHub depuis que tu l’as ouverte. Pour ne rien écraser, tes modifications viennent d’être copiées : rouvre la liste depuis GitHub, puis colle-les avec « Coller des lignes ».'); }
      if (r.status === 401){ setTokenValid(false); throw new Error('clé refusée (expirée ?). Mets-la à jour avec « Gérer la clé ».'); }
      if (r.status === 403 || r.status === 404) throw new Error('la clé n’a pas le droit d’écrire dans ce dépôt (permission « Contents : Read and write » manquante ?).');
      if (!r.ok) throw new Error('erreur ' + r.status);
      const j = await r.json();
      const ver = await bumpListsVersion(br);
      gh = { path, sha: j.content.sha, branch: br };
      items.forEach(it => { it.orig = clone(it.data); }); deleted = [];   // l'état enregistré devient la nouvelle référence
      save(); render();
      out.className = 'msg good';
      out.innerHTML = `Enregistré sur <b>${esc(br)}</b> ! <a href="${esc(j.commit.html_url)}" target="_blank" rel="noopener">Voir le commit</a>. <span>${esc(ver ? 'Version des listes : ' + ver + '.' : 'Le numéro de version des listes n’a pas pu être mis à jour.')}</span> ` + (br === 'main'
        ? 'L’appli en ligne sera à jour d’ici quelques minutes.'
        : `L’appli en ligne ne change pas tant que cette branche n’est pas fusionnée : <a href="https://github.com/${GH.owner}/${GH.repo}/compare/main...${encodeURIComponent(br)}?expand=1" target="_blank" rel="noopener">ouvrir une pull request vers main</a>.`);
    } catch (e) { out.className = 'msg bad'; out.textContent = 'Échec : ' + e.message; $('ghCommit').disabled = false; }
  });

  // ---------- Arrivée depuis l'appli : ouvre la bonne liste sur la bonne entrée ----------
  const FICHIERS = { oiseaux: 'ouessant_birds.json', lieux: 'lieux_ouessant.json' };
  const NOM = { 'ouessant_birds.json': 'Nom Français', 'lieux_ouessant.json': 'nom' };
  const CLE = { 'ouessant_birds.json': 'Nom Scientifique', 'lieux_ouessant.json': 'nom' };
  const params = new URLSearchParams(location.search);
  const visitMode = !!FICHIERS[params.get('fichier')];
  // Ouvre une liste : depuis GitHub avec la clé (pour pouvoir enregistrer), sinon le fichier du site, sinon GitHub en lecture
  async function openList(path){
    $('importMsg').className = 'msg'; $('importMsg').textContent = 'Chargement de la liste…';
    let ok = false;
    if (getToken()) ok = await ghOpen(path);
    if (!ok){
      try {
        const r = await fetch(path, { cache: 'no-cache' }); if (!r.ok) throw 0;
        const text = await r.text(); load(path, JSON.parse(text), undefined, null); applyFormat(detectFormat(text)); ok = true;
      } catch (_) { ok = await ghOpen(path); }
    }
    if (ok) $('importMsg').textContent = ''; else if (!$('editView').classList.contains('hidden')) toast($('importMsg').textContent);
    return ok;
  }
  async function openFromApp(){
    const path = FICHIERS[params.get('fichier')];
    if (!(await openList(path))) return;
    $('visitBanner').classList.remove('hidden');
    const k = CLE[path], wanted = params.get('cherche');
    if (wanted){
      const it = items.find(x => norm(show(x.data[k], 'text')) === norm(wanted));
      if (it){ $('search').value = show(it.data[NOM[path]], 'text'); render(); toggle(it.id); }
      else { $('search').value = wanted; render(); }
    } else if (params.has('nouveau')){
      $('addBtn').click();
      const f = document.querySelector(`.form-wrap [data-k="${NOM[path]}"]`); if (f){ f.value = params.get('nouveau'); f.focus(); f.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  }
  // Choix de la liste (onglets Oiseaux / Lieux, comme sur l'index)
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    const path = FICHIERS[b.dataset.list];
    if (b.getAttribute('aria-selected') === 'true' && items.length) return;
    if (items.length && changes().total && !confirm('Tes modifications non envoyées de cette liste seront perdues. Changer de liste ?')) return;
    $('visitBanner').classList.add('hidden'); $('proposePanel').classList.add('hidden'); $('pastePanel').classList.add('hidden'); $('ghPanel').classList.add('hidden');
    openList(path);
  }));

  // ---------- Envoyer ma proposition (formulaire Google unique) ----------
  // Lien prérempli du formulaire : tape MODIFS, COMMENTAIRE et JSON dans ses trois champs, puis colle le lien ici.
  const PROPOSAL_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSfO5eaqQZ_NS10ChZhazXZLLach0Bm0aQYUt9yZQsi-Qdh3LA/viewform?usp=pp_url&entry.1342929352=MODIFS&entry.253715776=COMMENTAIRE&entry.1219654439=JSON';
  const PFORM = (() => {
    try {
      if (!PROPOSAL_FORM) return null;
      const u = new URL(PROPOSAL_FORM), map = {};
      u.searchParams.forEach((v, k) => { if (k.startsWith('entry.')) map[v.trim().toUpperCase()] = k; });
      return map.MODIFS && map.JSON ? { base: u.origin + u.pathname, map } : null;
    } catch (_) { return null; }
  })();
  function proposalParts(){
    return { MODIFS: commitMessage(), COMMENTAIRE: $('propComment').value.trim(), JSON: changesText() };
  }
  $('proposeBtn').addEventListener('click', () => {
    ['pastePanel','ghPanel','keyPanel'].forEach(id => $(id).classList.add('hidden'));
    $('proposePanel').classList.toggle('hidden');
    const c = changes(), out = $('propOut');
    out.className = 'msg'; out.textContent = '';
    $('propSummary').textContent = c.total ? commitMessage() : 'Aucune modification pour l\u2019instant : modifie, ajoute ou supprime une entrée, puis reviens ici.';
    $('propSend').disabled = !c.total;
  });
  $('propClose').addEventListener('click', () => $('proposePanel').classList.add('hidden'));
  $('propSend').addEventListener('click', () => {
    const out = $('propOut'), parts = proposalParts();
    if (!PFORM){
      out.className = 'msg bad'; out.textContent = 'L\u2019envoi n\u2019est pas encore configuré. Utilise « Copier ma proposition ».';
      return;
    }
    const url = f => { const q = new URLSearchParams({ usp: 'pp_url' }); Object.entries(f).forEach(([k, v]) => { if (PFORM.map[k] && v) q.set(PFORM.map[k], v); }); return PFORM.base + '?' + q.toString(); };
    let href = url(parts);
    if (href.length > 7500){
      // trop long pour une adresse : on copie les lignes JSON, à coller dans le formulaire
      href = url({ MODIFS: parts.MODIFS.split('\n')[0], COMMENTAIRE: parts.COMMENTAIRE });
      copyText(parts.JSON);
      out.className = 'msg good'; out.textContent = 'Ta proposition est longue : les lignes JSON ont été copiées. Colle-les dans le champ « Lignes JSON » du formulaire qui vient de s\u2019ouvrir, puis clique sur « Envoyer ».';
    } else {
      out.className = 'msg good'; out.textContent = 'Le formulaire s\u2019est ouvert, déjà rempli : il ne reste qu\u2019à cliquer sur « Envoyer ». Ta proposition sera vérifiée, puis prise en compte dans les prochains jours.';
    }
    window.open(href, '_blank', 'noopener');
  });
  $('propCopy').addEventListener('click', () => {
    const p = proposalParts(); copyText(`${p.MODIFS}\n\n${p.COMMENTAIRE}\n\n${p.JSON}`);
    $('propOut').className = 'msg good'; $('propOut').textContent = 'Proposition copiée.';
  });
  function copyText(t){
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(() => {});
    else { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) {} ta.remove(); }
  }
  // Un seul bouton d'envoi selon la clé : avec la clé, « Enregistrer sur GitHub » (direct) ;
  // sans clé, « Envoyer ma proposition » (formulaire Google).
  function updateSaveBtn(){
    const t = !!getToken();
    $('ghSaveBtn').classList.toggle('hidden', !t);
    // « Coller des lignes » : seulement avec une clé GitHub entrée ET reconnue par GitHub
    const ok = tokenValid();
    $('pasteLinesBtn').classList.toggle('hidden', !ok);
    if (!ok) $('pastePanel').classList.add('hidden');
    $('keyBtn').classList.toggle('hidden', t);
    $('proposeBtn').classList.toggle('hidden', t);
    if (t) $('proposePanel').classList.add('hidden');
    $('visitText').innerHTML = t
      ? '<b>Clé GitHub active.</b> Corrige l\u2019entrée ouverte ci-dessous, clique sur « Enregistrer », puis sur <b>« Enregistrer sur GitHub »</b> : la modification sera en ligne directement.'
      : '<b>Tu proposes une modification.</b> Corrige l\u2019entrée ouverte ci-dessous (ou complète la nouvelle), clique sur « Enregistrer », puis sur <b>« Envoyer ma proposition »</b>. Elle sera vérifiée avant d\u2019être intégrée.';
  }
  updateSaveBtn();
  document.addEventListener('click', () => setTimeout(updateSaveBtn, 0));

  // ---------- Brouillon (sauvegarde automatique dans le navigateur) ----------
  function save(){
    try { localStorage.setItem(DRAFT, JSON.stringify({ fileName, gh, fmtHint, at: Date.now(), items: items.map(it => [it.data, it.orig]), deleted: deleted.map(it => it.orig).filter(Boolean) })); } catch (_) {}
  }
  (function offerDraft(){
    if (visitMode) return;
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); if (!d || !d.items) return;
      $('resumeBtn').hidden = false;
      $('resumeInfo').textContent = `${listLabel(d.gh ? d.gh.path : d.fileName)}, modifié le ${new Date(d.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`;
      $('resumeBtn').onclick = () => {
        load(d.fileName, d.items.map(x => x[0]), d.items.map(x => x[1]), d.gh || null); if (d.fmtHint) applyFormat(d.fmtHint);
        deleted = (d.deleted || []).map(o => ({ id: ++uid, data: o, orig: o })); render();
      };
    } catch (_) {}
  })();
  // ---------- Filtres et tri ----------
  function buildFilters(){
    $('filters').innerHTML = fields.filter(k => types[k].choices || types[k].t === 'bool').map(k => {
      const opts = types[k].t === 'bool' ? [['true','oui'],['false','non']] : types[k].choices.map(c => [c, labelOf(k, c) || c]);
      return `<label>${esc(k)} <select data-filter="${esc(k)}"><option value="">Tous</option>${opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}<option value="__empty">(vide)</option></select></label>`;
    }).join('') + `<label>État <select data-filter="__state"><option value="">Tous</option><option value="mod">Modifiés</option><option value="new">Ajoutés</option><option value="any">Modifiés ou ajoutés</option></select></label>`;
  }
  $('filters').addEventListener('change', e => {
    const s = e.target.closest('select'); if (!s) return;
    filters[s.dataset.filter] = s.value; shown = 200; render();
  });
  function stateOf(it){ return !it.orig ? 'new' : same(it.data, it.orig) ? '' : 'mod'; }
  function visible(){
    const q = norm($('search').value);
    let list = items.filter(it => {
      for (const [k, v] of Object.entries(filters)){
        if (!v) continue;
        if (k === '__state'){ const s = stateOf(it); if (v === 'any' ? !s : s !== v) return false; continue; }
        const val = it.data[k];
        if (v === '__empty'){ if (!(val === undefined || val === null || val === '')) return false; }
        else if (String(val) !== v) return false;
      }
      return !q || fields.some(k => norm(showK(k, it.data[k])).includes(q) || norm(show(it.data[k], types[k].t)).includes(q));
    });
    if (sortField){
      const t = types[sortField].t;
      list = list.slice().sort((a, b) => {
        const x = a.data[sortField], y = b.data[sortField];
        if (t === 'number') return ((x ?? -Infinity) - (y ?? -Infinity)) * sortDir;
        return show(x, t).localeCompare(show(y, t), 'fr') * sortDir;
      });
    }
    return list;
  }

  // ---------- Affichage ----------
  function hl(text){
    const q = $('search').value.trim(); const t = String(text);
    if (!q) return esc(t);
    const i = norm(t).indexOf(norm(q)); if (i < 0) return esc(t);
    return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
  }
  function changes(){
    const mod = items.filter(it => it.orig && !same(it.data, it.orig)).length, add = items.filter(it => !it.orig).length, del = deleted.filter(it => it.orig).length;
    return { mod, add, del, total: mod + add + del };
  }
  function render(){
    const list = visible(), c = changes();
    const kind = kindOf(gh ? gh.path : fileName);
    $('addBtn').textContent = kind === 'birds' ? '+ Ajouter un oiseau' : kind === 'places' ? '+ Ajouter un lieu' : '+ Ajouter une entrée';
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.list === (kind === 'birds' ? 'oiseaux' : kind === 'places' ? 'lieux' : ''))));
    $('countInfo').textContent = countText(items.length) + (list.length !== items.length ? `, ${list.length} affichés` : '');
    $('changeInfo').innerHTML = (c.mod ? `<span class="badge mod">${c.mod} modifiée${c.mod > 1 ? 's' : ''}</span> ` : '') +
      (c.add ? `<span class="badge new">${c.add} ajoutée${c.add > 1 ? 's' : ''}</span> ` : '') +
      (c.del ? `<span class="badge del">${c.del} supprimée${c.del > 1 ? 's' : ''}</span>` : '');
    const thead = $('table').tHead, tbody = $('table').tBodies[0];
    thead.innerHTML = '<tr>' + fields.map(k => `<th scope="col"><button type="button" data-sort="${esc(k)}">${esc(k)}${sortField === k ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('') + '</tr>';
    const rows = list.slice(0, shown).map(it => {
      const st = stateOf(it);
      let html = `<tr class="item${st ? ' is-' + st : ''}" data-id="${it.id}" tabindex="0" aria-expanded="${openId === it.id}">` + fields.map(k => {
        const v = showK(k, it.data[k]);
        return `<td class="${['number','numlist'].includes(types[k].t) ? 'num' : ''}">${v === '' ? '<span class="empty">vide</span>' : hl(v)}</td>`;
      }).join('') + '</tr>';
      if (openId === it.id) html += `<tr class="editor"><td colspan="${fields.length}">${editorHtml(it)}</td></tr>`;
      return html;
    }).join('');
    tbody.innerHTML = rows || `<tr><td colspan="${fields.length}" class="more">Aucune entrée ne correspond.</td></tr>`;
    if (list.length > shown) tbody.insertAdjacentHTML('beforeend', `<tr><td colspan="${fields.length}" class="more"><button type="button" class="btn" id="moreBtn">Afficher ${Math.min(200, list.length - shown)} de plus (${list.length - shown} restantes)</button></td></tr>`);
  }
  $('search').addEventListener('input', () => { shown = 200; render(); });
  $('table').addEventListener('click', e => {
    const sb = e.target.closest('[data-sort]');
    if (sb){ const k = sb.dataset.sort; if (sortField === k) sortDir = -sortDir; else { sortField = k; sortDir = 1; } render(); return; }
    if (e.target.id === 'moreBtn'){ shown += 200; render(); return; }
    const tr = e.target.closest('tr.item'); if (tr){ toggle(+tr.dataset.id); return; }
    const zb = e.target.closest('[data-zoom]');
    if (zb){
      const f = zb.closest('.cells-field'), i = ZOOMS.indexOf(zoom), cur = i < 0 ? ZOOMS.findIndex(z => z >= zoom) : i;
      const v = zb.dataset.zoom;
      if (v === '+') setZoom(f, ZOOMS[Math.min(ZOOMS.length - 1, cur + 1)], true);
      else if (v === '-') setZoom(f, ZOOMS[Math.max(0, cur - 1)], true);
      else if (v === 'fit') setZoom(f, 1, true);
      else centerOn(f.querySelector('.cells-scroll'), selectedCells(f));
      return;
    }
    const gb = e.target.closest('[data-gps]');
    if (gb){ useGps(gb.closest('.form-wrap')); return; }
    const pk = e.target.closest('[data-pick]');
    if (pk){ const on = pk.getAttribute('aria-pressed') !== 'true'; pk.setAttribute('aria-pressed', String(on)); pk.closest('.cells-field').classList.toggle('picking', on);
      pk.textContent = on ? 'Clique sur la carte à l’endroit exact…' : 'Placer le point GPS sur la carte'; return; }
    const ac = e.target.closest('[data-addcell]');
    if (ac){ const f = ac.closest('.form-wrap'), b = f.querySelector(`[data-cell="${ac.dataset.addcell}"]`); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); else { const inp = f.querySelector('[data-cells]'); inp.value = [inp.value, ac.dataset.addcell].filter(Boolean).join(', '); } f.querySelector('[data-msg]').innerHTML = ''; return; }
    const pickField = e.target.closest('.cells-field.picking');
    if (pickField && e.target.closest('.cells')){
      const grid = pickField.querySelector('.cells'), R = grid.getBoundingClientRect();
      const x = GRID_X[0] + (e.clientX - R.left) / R.width * (GRID_X[GRID_X.length - 1] - GRID_X[0]);
      const y = GRID_Y[0] + (e.clientY - R.top) / R.height * (GRID_Y[GRID_Y.length - 1] - GRID_Y[0]);
      const [lat, lon] = fromPixel(x, y), form = pickField.closest('.form-wrap');
      form.querySelector('[data-k="lat"]').value = lat.toFixed(5); form.querySelector('[data-k="lon"]').value = lon.toFixed(5);
      // point placé sur la carte : précision ± 100 m (sans toucher à « verifie »), sauf si une meilleure précision est déjà indiquée
      const pr = form.querySelector('[data-k="precision_m"]');
      if (pr && !(num(pr.value) !== null && num(pr.value) <= 100)){ pr.value = 100; pr.closest('label').classList.add('changed'); }
      const c = cellAt(x, y), b = c && pickField.querySelector(`[data-cell="${c}"]`);
      if (b && b.getAttribute('aria-pressed') !== 'true'){ b.setAttribute('aria-pressed', 'true'); pickField.querySelector('[data-cells]').value = selectedCells(pickField).join(', '); }
      updateGeo(pickField); return;
    }
    const cell = e.target.closest('[data-cell]');
    if (cell){
      const wrap = cell.closest('.cells-field'), inp = wrap.querySelector('[data-cells]');
      const on = cell.getAttribute('aria-pressed') !== 'true'; cell.setAttribute('aria-pressed', String(on));
      inp.value = [...wrap.querySelectorAll('[data-cell][aria-pressed="true"]')].map(b => b.dataset.cell).join(', ');
      updateGeo(wrap); return;
    }
    const act = e.target.closest('[data-act]'); if (act) editorAction(act.dataset.act, +act.closest('.form-wrap').dataset.id);
  });
  $('table').addEventListener('input', e => {
    if (!e.target.matches('[data-cells]')) return;
    const set = new Set(e.target.value.toUpperCase().split(/[\s,;]+/).filter(Boolean));
    e.target.closest('.cells-field').querySelectorAll('[data-cell]').forEach(b => b.setAttribute('aria-pressed', String(set.has(b.dataset.cell))));
    updateGeo(e.target.closest('.cells-field'));
  });
  // saisie de lat / lon : le point suit
  $('table').addEventListener('input', e => {
    if (!e.target.matches('[data-k="lat"], [data-k="lon"]')) return;
    const f = e.target.closest('.form-wrap').querySelector('.cells-field'); if (f) updateGeo(f);
  });
  $('table').addEventListener('keydown', e => {
    const tr = e.target.closest('tr.item');
    if (tr && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); toggle(+tr.dataset.id); }
  });
  function toggle(id){ openId = openId === id ? null : id; render(); initCells(); if (openId){ const f = document.querySelector('.form-wrap [data-k]'); if (f) f.focus({ preventScroll: true }); } }

  // ---------- Formulaire d'édition ----------
  function inputHtml(k, v, orig){
    const t = types[k] ? types[k].t : 'text', ch = types[k] && types[k].choices;
    const was = orig === undefined ? '' : (same(v, orig) ? '' : `<span class="was">avant : ${esc(show(orig, t)) || 'vide'}</span>`);
    const cls = was ? ' class="changed"' : '';
    const cfg = FIELD_CONFIG[k];
    if (cfg && cfg.type === 'select'){
      const known = cfg.options.some(o => o[0] === v);
      const opts = (v && !known ? [[v, v + ' (valeur non reconnue)']] : []).concat(cfg.options);
      return `<label${cls}>${esc(k)}<select data-k="${esc(k)}">${v === undefined || v === '' ? '<option value="">— choisir —</option>' : ''}${opts.map(([val, lab]) => `<option value="${esc(val)}"${val === v ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>${was}</label>`;
    }
    if (cfg && cfg.type === 'cells'){
      const list = Array.isArray(v) ? v : [];
      return `<div class="cells-field${was ? ' changed' : ''}"><label>${esc(k)}<input type="text" data-k="${esc(k)}" data-cells value="${esc(list.join(', '))}" autocomplete="off" placeholder="clique sur la grille ou tape B8, B9"></label>${was}${cellsHtml(list)}</div>`;
    }
    if (t === 'bool') return `<label${cls}><span>${esc(k)}</span><span class="chk"><input type="checkbox" data-k="${esc(k)}"${v ? ' checked' : ''}> ${v ? 'oui' : 'non'}</span>${was}</label>`;
    if (t === 'number') return `<label${cls}>${esc(k)}<input type="text" inputmode="decimal" data-k="${esc(k)}" value="${esc(v ?? '')}" autocomplete="off">${was}</label>`;
    if (t === 'json') return `<label${cls}>${esc(k)}<textarea rows="2" data-k="${esc(k)}">${esc(v === undefined ? '' : JSON.stringify(v))}</textarea>${was}</label>`;
    const val = show(v, t), list = ch ? ` list="dl-${esc(k)}"` : '';
    const dl = ch ? `<datalist id="dl-${esc(k)}">${ch.map(c => `<option value="${esc(c)}">`).join('')}</datalist>` : '';
    const ph = t === 'list' || t === 'numlist' ? ' placeholder="valeurs séparées par des virgules"' : '';
    return `<label${cls}>${esc(k)}<input type="text" data-k="${esc(k)}" value="${esc(val)}"${list}${ph} autocomplete="off">${dl}${was}</label>`;
  }
  function editorHtml(it){
    return `<div class="form-wrap" data-id="${it.id}"><div class="form">${fields.map(k => inputHtml(k, it.data[k], it.orig ? it.orig[k] : undefined)).join('')}</div>
      <div class="actions">
        <button type="button" class="btn primary" data-act="save">Enregistrer</button>
        <button type="button" class="btn" data-act="cancel">Fermer</button>
        ${it.orig && !same(it.data, it.orig) ? '<button type="button" class="btn" data-act="revert">Revenir à l\u2019original</button>' : ''}
        <span class="sep"></span>
        <button type="button" class="btn" data-act="dup">Dupliquer</button>
        <button type="button" class="btn danger" data-act="del">Supprimer</button>
      </div><p class="msg bad" data-msg></p>${fields.includes('Nom Scientifique') && !it.orig ? '<p class="msg" data-lookup aria-live="polite"></p>' : ''}</div>`;
  }
  function readForm(wrap){
    const out = {};
    for (const el of wrap.querySelectorAll('[data-k]')){
      const k = el.dataset.k, t = types[k] ? types[k].t : 'text';
      if (t === 'bool'){ out[k] = el.checked; continue; }
      const raw = el.value.trim();
      if (t === 'number'){ if (raw === '') continue; const n = Number(raw.replace(',', '.')); if (!isFinite(n)) throw new Error(`« ${k} » doit être un nombre.`); out[k] = n; continue; }
      if (el.hasAttribute('data-cells')){
        const list = raw ? raw.toUpperCase().split(/[\s,;]+/).filter(Boolean) : [];
        const bad = list.filter(c => !/^[A-S](?:[1-9]|1[0-3])$/.test(c));
        if (bad.length) throw new Error(`Carré${bad.length > 1 ? 's' : ''} inconnu${bad.length > 1 ? 's' : ''} : ${bad.join(', ')} (de A1 à S13).`);
        out[k] = [...new Set(list)]; continue;
      }
      if (t === 'list'){ out[k] = raw ? raw.split(',').map(x => x.trim()).filter(Boolean) : []; continue; }
      if (t === 'numlist'){ out[k] = raw ? raw.split(',').map(x => Number(x.trim())) : []; if (out[k].some(n => !isFinite(n))) throw new Error(`« ${k} » ne doit contenir que des nombres.`); continue; }
      if (t === 'json'){ if (raw === '') continue; try { out[k] = JSON.parse(raw); } catch (_) { throw new Error(`« ${k} » n\u2019est pas un JSON valide.`); } continue; }
      out[k] = raw;
    }
    return out;
  }
  // Noms d'oiseaux : mise en forme homogène à l'enregistrement (règles dans js/noms.js)
  function formatNames(o){
    const N = window.OuessantNoms; let changed = false; if (!N) return false;
    [['Nom Français', N.fmtFr], ['Nom Anglais', N.fmtEn], ['Nom Scientifique', N.fmtSci]].forEach(([k, f]) => {
      if (typeof o[k] === 'string'){ const v = f(o[k]); if (v !== o[k]){ o[k] = v; changed = true; } } });
    return changed;
  }
  function editorAction(act, id){
    const i = items.findIndex(x => x.id === id); if (i < 0) return;
    const it = items[i], wrap = document.querySelector(`.form-wrap[data-id="${id}"]`);
    if (act === 'save' || act === 'forcesave'){
      try {
        const pb = act === 'save' && geoProblem(wrap);
        if (pb){
          wrap.querySelector('[data-msg]').innerHTML = esc(pb.text) +
            (pb.cell ? ` <button type="button" class="btn ghost" data-addcell="${pb.cell}">Ajouter ${pb.cell}</button>` : '') +
            ` <button type="button" class="btn ghost" data-act="forcesave">Enregistrer quand même</button>`;
          return;
        }
        const d = readForm(wrap);
        // on garde l'ordre des champs, et les champs absents du formulaire
        const isEmpty = v => v === '' || v === false || (Array.isArray(v) && !v.length);
        const merged = {}; fields.forEach(k => {
          if (k in d && !(isEmpty(d[k]) && !(k in it.data))) merged[k] = d[k];   // un champ laissé vide n'est pas créé s'il n'existait pas
          else if (k in it.data && !(k in d)) merged[k] = it.data[k];
        });
        const fmt = formatNames(merged);
        it.data = merged; openId = null; render(); save(); toast(fmt ? 'Entrée enregistrée. Noms mis en forme.' : 'Entrée enregistrée.');
      } catch (e) { wrap.querySelector('[data-msg]').textContent = e.message; }
    } else if (act === 'cancel'){ openId = null; render(); }
    else if (act === 'revert'){ it.data = clone(it.orig); render(); initCells(); save(); toast('Entrée remise comme à l\u2019origine.'); }
    else if (act === 'dup'){ const n = { id: ++uid, data: clone(it.data), orig: null }; items.splice(i + 1, 0, n); openId = n.id; render(); initCells(); save(); toast('Copie ajoutée juste en dessous : modifie-la.'); }
    else if (act === 'del'){
      items.splice(i, 1); if (it.orig) deleted.push(it); openId = null; render(); save();
      toast('Entrée supprimée.', 'Annuler', () => { items.splice(i, 0, it); deleted = deleted.filter(x => x !== it); render(); save(); });
    }
  }
  $('addBtn').addEventListener('click', () => {
    const d = {}; fields.forEach(k => { const t = types[k].t; d[k] = t === 'bool' ? false : (t === 'list' || t === 'numlist') ? [] : t === 'number' ? undefined : ''; });
    Object.keys(d).forEach(k => d[k] === undefined && delete d[k]);
    const n = { id: ++uid, data: d, orig: null }; items.unshift(n); openId = n.id;
    $('search').value = ''; filters = {}; buildFilters(); sortField = null; render(); initCells(); save();
    const f = document.querySelector('.form-wrap [data-k]'); if (f) f.focus();
  });

  // ---------- Nouvel oiseau : recherche automatique des noms (iNaturalist) ----------
  // Dès qu'on saisit un nom français ou anglais, on retrouve le nom scientifique et le nom dans l'autre langue.
  // Prudence : on ne remplit que si le nom saisi correspond exactement à une seule espèce d'oiseau, et jamais un champ déjà rempli.
  const INAT = 'https://api.inaturalist.org/v1/taxa', AVES = 3;
  async function inatGet(url){
    const c = new AbortController(), t = setTimeout(() => c.abort(), 8000);
    try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error('inat ' + r.status); return await r.json(); } finally { clearTimeout(t); }
  }
  const lev = (a, b) => { const d = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++){ let prev = d[0]; d[0] = i;
      for (let j = 1; j <= b.length; j++){ const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } }
    return d[b.length]; };
  // Faute de frappe : iNaturalist cherche par début de nom ; on récupère les espèces dont le nom commence comme la saisie,
  // puis on garde le nom le plus proche, seulement s'il est proche ET sans ambiguïté avec une autre espèce.
  async function fixTypo(name){
    const n = norm(name); if (n.length < 6) return null;
    let results = [];
    for (const [len, per] of [[6, 50], [3, 200]]){
      const j = await inatGet(`${INAT}?q=${encodeURIComponent(name.trim().slice(0, len))}&taxon_id=${AVES}&rank=species&per_page=${per}&locale=fr`);
      results = j.results || []; if (results.length) break;
    }
    const scored = [];
    results.forEach(r => [r.matched_term, r.preferred_common_name].forEach(s => { if (!s) return; const c = norm(s);
      scored.push({ s, id: r.id, d: Math.min(lev(n, c), lev(n, c.slice(0, n.length)) + 1) }); }));   // saisie tronquée : comparée au début du nom (avec une pénalité)
    scored.sort((a, b) => a.d - b.d); const best = scored[0]; if (!best) return null;
    const limit = Math.max(1, Math.floor(n.length * 0.16)), rival = scored.find(x => x.id !== best.id);
    if (best.d > limit || (rival && rival.d - best.d < 2)) return null;   // une autre espèce serait presque aussi proche : on ne devine pas
    return best.s;
  }
  async function lookupNames(name){
    const exact = await lookupExact(name); if (exact) return exact;
    const fixed = await fixTypo(name); if (!fixed || norm(fixed) === norm(name)) return null;
    const r = await lookupExact(fixed); return r && Object.assign(r, { corrected: true });
  }
  async function lookupExact(name){
    const n = norm(name);
    const j = await inatGet(`${INAT}?q=${encodeURIComponent(name)}&taxon_id=${AVES}&rank=species&per_page=8&locale=fr`);
    const hits = (j.results || []).filter(r => [r.matched_term, r.preferred_common_name, r.name].some(x => x && norm(x) === n));
    if (!hits.length || new Set(hits.map(r => r.id)).size > 1) return null;   // rien, ou ambigu : on ne devine pas
    const r = hits[0], en = await inatGet(`${INAT}/${r.id}?locale=en`);
    const fr = r.preferred_common_name || '', eng = (en.results && en.results[0] && en.results[0].preferred_common_name) || '';
    const distinct = norm(fr) !== norm(eng);                                   // sans nom français, iNaturalist renvoie le nom anglais : on l'ignore
    const typedIs = distinct && norm(fr) === n ? 'fr' : norm(eng) === n ? 'en' : norm(r.name) === n ? 'sci' : null;   // sans nom français distinct, un « nom français » identique à l'anglais est l'anglais
    if (!typedIs) return null;                                                 // le nom saisi n'est ni le nom français, ni l'anglais, ni le scientifique
    // noms à placer : le nom saisi reste dans sa langue ; l'autre vient d'iNaturalist (vide s'il n'existe pas vraiment)
    return { sci: r.name, fr: typedIs === 'fr' ? (r.preferred_common_name || name) : (distinct ? fr : ''), en: typedIs === 'en' ? (eng || name) : eng };
  }
  const lookupTimers = new WeakMap();
  $('table').addEventListener('input', e => {
    const k = e.target.dataset && e.target.dataset.k; if (k !== 'Nom Français' && k !== 'Nom Anglais') return;
    const wrap = e.target.closest('.form-wrap'), msg = wrap && wrap.querySelector('[data-lookup]'); if (!msg) return;   // seulement pour un nouvel oiseau
    clearTimeout(lookupTimers.get(wrap));
    const name = e.target.value.trim(); if (name.length < 4){ msg.textContent = ''; return; }
    lookupTimers.set(wrap, setTimeout(async () => {
      msg.className = 'msg'; msg.textContent = 'Recherche des noms sur iNaturalist…';
      try {
        const found = await lookupNames(name);
        if (!wrap.isConnected || e.target.value.trim() !== name) return;      // l'utilisateur a continué à écrire ou fermé le formulaire
        // on ne remplit qu'un champ vide ; le nom saisi lui-même peut être déplacé s'il était dans le mauvais champ (ex. un nom anglais dans « Nom Français »)
        const put = (key, v, typed) => { const el = wrap.querySelector(`[data-k="${key}"]`); if (!el) return false; const cur = el.value.trim();
          if (cur && !(typed && cur === name)) return false;
          if (v === cur) return false;
          el.value = v; el.closest('label') && el.closest('label').classList.add('changed'); return true; };
        let filled = false;
        if (found){ filled = [put('Nom Scientifique', found.sci), put('Nom Français', found.fr, true), put('Nom Anglais', found.en, true), put('Type de taxon', 'espèce')].some(Boolean); }
        msg.className = 'msg' + (filled ? ' good' : '');
        msg.textContent = filled ? (found.corrected ? 'Faute de frappe corrigée, noms retrouvés sur iNaturalist : à vérifier avant d’enregistrer.' : 'Noms retrouvés sur iNaturalist : à vérifier avant d’enregistrer.') : 'Aucun nom retrouvé automatiquement : complète les champs à la main.';
      } catch (_) { if (wrap.isConnected){ msg.className = 'msg'; msg.textContent = 'Recherche automatique indisponible : complète les champs à la main.'; } }
    }, 700));
  });

  // ---------- Coller des lignes (ex. depuis le Google Sheet) ----------
  function buildKeyField(){
    const guess = ['Nom Scientifique', 'nom', 'Nom Français', 'id', 'name'].find(k => fields.includes(k)) || fields[0];
    $('keyField').innerHTML = fields.map(k => `<option value="${esc(k)}"${k === guess ? ' selected' : ''}>${esc(k)}</option>`).join('');
  }
  let pending = [];
  function parseLines(text){
    const t = text.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').trim(); if (!t) return [];   // les lignes « // … » sont des commentaires
    try { const v = JSON.parse(t); return Array.isArray(v) ? v : [v]; } catch (_) {}
    try { return JSON.parse('[' + t.replace(/,\s*$/, '') + ']'); } catch (_) {}
    // une ligne par objet, sans virgules entre elles
    return t.split(/\n+/).map(l => l.trim().replace(/,\s*$/, '')).filter(Boolean).map(l => JSON.parse(l));
  }
  $('pasteLinesBtn').addEventListener('click', () => { ['ghPanel','proposePanel','keyPanel'].forEach(id => $(id).classList.add('hidden')); $('pastePanel').classList.toggle('hidden'); $('pasteLines').focus(); });   // un seul panneau ouvert à la fois
  $('pasteClose').addEventListener('click', () => $('pastePanel').classList.add('hidden'));
  $('pasteCheck').addEventListener('click', () => {
    const msg = $('pasteMsg'), pv = $('pastePreview'); pending = []; pv.innerHTML = ''; $('pasteApply').disabled = true;
    let objs;
    try { objs = parseLines($('pasteLines').value); } catch (e) { msg.className = 'msg bad'; msg.textContent = 'Lignes illisibles : vérifie qu\u2019il s\u2019agit bien de JSON ({ … }).'; return; }
    if (!objs.length){ msg.className = 'msg bad'; msg.textContent = 'Rien à coller.'; return; }
    const key = $('keyField').value;
    objs.forEach(o => {
      if (!o || typeof o !== 'object' || Array.isArray(o)) return;
      const lookFor = o._cle_avant !== undefined ? o._cle_avant : o[key];
      const match = items.find(it => lookFor !== undefined && norm(show(it.data[key], types[key].t)) === norm(show(lookFor, types[key].t)));
      pending.push({ o, match, del: o._action === 'supprimer' });
    });
    const unknown = [...new Set(pending.flatMap(p => Object.keys(p.o)).filter(k => !fields.includes(k) && !META.includes(k)))];
    pv.innerHTML = pending.map(({ o, match, del }) => {
      const title = esc(o[key] ?? '(sans ' + key + ')');
      if (del) return match ? `<div class="pv"><h3><span class="badge del">Suppression</span> ${title}</h3></div>`
                            : `<div class="pv"><h3><span class="badge del">Suppression</span> ${title}</h3><p class="help" style="margin:0">Introuvable dans la liste (déjà supprimée ?) : ignorée.</p></div>`;
      o = Object.fromEntries(Object.entries(o).filter(([k]) => !META.includes(k)));
      if (!match) return `<div class="pv"><h3><span class="badge new">Ajout</span> ${title}</h3><ul>${Object.entries(o).map(([k, v]) => `<li>${esc(k)} : <ins>${esc(show(v, types[k] ? types[k].t : 'json') || 'vide')}</ins></li>`).join('')}</ul></div>`;
      const diffs = Object.keys(o).filter(k => !same(o[k], match.data[k]));
      return `<div class="pv"><h3><span class="badge mod">Remplacement</span> ${title}</h3>${diffs.length ? `<ul>${diffs.map(k => { const t = types[k] ? types[k].t : 'json'; return `<li>${esc(k)} : <del>${esc(show(match.data[k], t) || 'vide')}</del> → <ins>${esc(show(o[k], t) || 'vide')}</ins></li>`; }).join('')}</ul>` : '<p class="help" style="margin:0">Aucune différence.</p>'}</div>`;
    }).join('');
    const add = pending.filter(p => !p.match && !p.del).length, nd = pending.filter(p => p.del && p.match).length, rep = pending.filter(p => p.match && !p.del).length;
    msg.className = 'msg good';
    msg.textContent = `${pending.length} ligne${pending.length > 1 ? 's' : ''} lue${pending.length > 1 ? 's' : ''} : ${rep} remplacement${rep > 1 ? 's' : ''}, ${add} ajout${add > 1 ? 's' : ''}, ${nd} suppression${nd > 1 ? 's' : ''}.` + (unknown.length ? ` Attention, champ${unknown.length > 1 ? 's' : ''} inconnu${unknown.length > 1 ? 's' : ''} : ${unknown.join(', ')}.` : '');
    $('pasteApply').disabled = !pending.length;
  });
  $('pasteApply').addEventListener('click', () => {
    pending.forEach(({ o, match, del }) => {
      if (del){ if (match){ items = items.filter(x => x !== match); if (match.orig) deleted.push(match); } return; }
      o = Object.fromEntries(Object.entries(o).filter(([k]) => !META.includes(k))); formatNames(o);
      if (match){ const merged = {}; fields.forEach(k => { if (k in o) merged[k] = o[k]; else if (k in match.data) merged[k] = match.data[k]; }); Object.keys(o).forEach(k => { if (!(k in merged)) merged[k] = o[k]; }); match.data = merged; }
      else items.push({ id: ++uid, data: clone(o), orig: null });
    });
    const n = pending.length; pending = [];
    detectTypes(); buildFilters(); render(); save();
    $('pasteLines').value = ''; $('pastePreview').innerHTML = ''; $('pasteMsg').textContent = ''; $('pasteApply').disabled = true; $('pastePanel').classList.add('hidden');
    filters = { __state: 'any' }; buildFilters(); document.querySelector('[data-filter="__state"]').value = 'any'; render();
    toast(`${n} ligne${n > 1 ? 's' : ''} appliquée${n > 1 ? 's' : ''}. Affichage des entrées modifiées ou ajoutées.`);
  });

  // ---------- Modifications sous forme de lignes ----------
  // Format : lignes de commentaire (« // … »), puis une ligne JSON par entrée modifiée ou ajoutée,
  // et une ligne {"_action":"supprimer", …} par entrée supprimée. Sert à la proposition et se colle dans « Coller des lignes ».
  const META = ['_action', '_cle_avant'];
  function changesText(){
    const key = $('keyField').value || fields[0];
    const mod = items.filter(it => it.orig && !same(it.data, it.orig)), add = items.filter(it => !it.orig), del = deleted.filter(it => it.orig);
    const lines = [
      `// Modifications de ${fileName}, le ${new Date().toLocaleDateString('fr-FR')}`,
      `// ${mod.length} modifiée(s), ${add.length} ajoutée(s), ${del.length} supprimée(s). À coller dans l’éditeur : « Coller des lignes ».`
    ];
    mod.forEach(it => {
      const o = clone(it.data);
      if (!same(it.orig[key], it.data[key])) o._cle_avant = it.orig[key];   // la clé elle-même a changé : on garde l'ancienne pour retrouver l'entrée
      lines.push(`// modifiée : ${show(it.orig[key], types[key] ? types[key].t : 'text')}`, JSON.stringify(o));
    });
    add.forEach(it => lines.push('// ajoutée', JSON.stringify(it.data)));
    del.forEach(it => lines.push('// supprimée', JSON.stringify(Object.assign({ _action: 'supprimer' }, it.orig))));
    return lines.join('\n') + '\n';
  }
  // Texte du fichier à enregistrer sur GitHub, dans la mise en forme d'origine (une entrée par ligne, ou indenté)
  function exportText(){
    const list = items.map(it => it.data);
    return fmtHint && fmtHint.fmt === 'indent' ? JSON.stringify(list, null, fmtHint.n || 2) + '\n' : '[\n' + list.map(o => JSON.stringify(o)).join(',\n') + '\n]\n';
  }

  // ---------- Notification ----------
  let tt;
  function toast(text, actLabel, act){
    const t = $('toast'); clearTimeout(tt);
    t.innerHTML = `<span>${esc(text)}</span>` + (actLabel ? `<button type="button">${esc(actLabel)}</button>` : '');
    t.classList.remove('hidden');
    if (act) t.querySelector('button').onclick = () => { act(); t.classList.add('hidden'); };
    tt = setTimeout(() => t.classList.add('hidden'), actLabel ? 7000 : 3000);
  }
  window.addEventListener('beforeunload', e => { if (items.length && changes().total){ save(); } });
  if (visitMode) openFromApp();
  else if ($('resumeBtn').hidden) openList(FICHIERS.oiseaux);   // sans brouillon à reprendre : la liste des oiseaux s'ouvre d'elle-même
})();
