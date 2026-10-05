/* Oiseaux d'Ouessant — tri des propositions (page admin.html).
   Lit le fichier .csv des réponses du formulaire Google, regroupe les propositions par espèce / lieu-dit,
   compare chacune à la liste en ligne, puis produit les lignes JSON validées (à coller dans l'éditeur, « Coller des lignes »).
   Rien n'est envoyé : le fichier est lu sur l'appareil, les décisions sont gardées dans le navigateur. */
(function(){
  'use strict';
  // l'éditeur et cette page refusent de s'afficher dans le cadre d'un autre site
  if (window.top !== window.self){ document.documentElement.style.display = 'none'; return; }

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const store = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };

  // même thème que l'appli et l'éditeur
  (function(){
    const t = store.get('ouessant-theme'), r = document.documentElement;
    if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t);
    if (store.get('ouessant-cvd') === '1') r.setAttribute('data-cvd', '1');
  })();

  const LISTS = {
    'ouessant_birds.json': { label: 'Oiseau', key: 'Nom Scientifique', name: 'Nom Français' },
    'lieux_ouessant.json': { label: 'Lieu', key: 'nom', name: 'nom' }
  };
  const DECISIONS = 'ouessant-admin-decisions', DONE = 'ouessant-admin-traite';
  const META = ['_action', '_cle_avant'];
  let current = {};            // fichier → { entries: [...], byKey: Map }
  let proposals = [];          // toutes les propositions lues dans le fichier
  let answers = [];            // une entrée par réponse (ligne de la feuille) : { row, when, day, ids }
  let lastRows = null, lastSource = null;   // dernières lignes lues et leur origine ('csv' ou 'script')
  let decisions = {};          // clé de groupe → signature de la variante retenue, ou 'reject'
  try { decisions = JSON.parse(store.get(DECISIONS) || '{}') || {}; } catch (_) { decisions = {}; }
  const saveDecisions = () => store.set(DECISIONS, JSON.stringify(decisions));

  // ---------- Verrou : la page ne s'ouvre qu'avec la Clé Admin, vérifiée auprès de GitHub ----------
  // (le code de la page est public comme tout le dépôt, mais il ne contient aucune donnée : les réponses restent dans le fichier sur l'appareil)
  const TOKEN_KEY = 'gh-token-ouessant';   // même clé que l'éditeur : si elle y est déjà entrée, la page s'ouvre directement
  const savedToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } };
  async function isOwner(t){
    const r = await fetch('https://api.github.com/repos/AureLPhotog/ouessant-birds', { cache: 'no-store', headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + t } });
    if (!r.ok) return false;
    const j = await r.json(); return !!(j.permissions && (j.permissions.admin || j.permissions.push));
  }
  async function unlock(t, typed){
    const msg = $('lockMsg'); msg.className = 'msg'; msg.textContent = 'Vérification de la clé auprès de GitHub…';
    let ok = false; try { ok = !!t && await isOwner(t); } catch (_) {}
    if (!ok){ msg.className = 'msg bad'; msg.textContent = typed ? 'Clé refusée : elle ne donne pas accès au dépôt (ou GitHub est injoignable).' : ''; return; }
    if (typed) try { sessionStorage.setItem(TOKEN_KEY, t); } catch (_) {}   // gardée dans l'onglet seulement
    $('lockPanel').classList.add('hidden'); $('loadPanel').classList.remove('hidden');
  }
  $('lockForm').addEventListener('submit', e => { e.preventDefault(); const t = $('lockKey').value.trim(); $('lockKey').value = ''; unlock(t, true); });
  unlock(savedToken(), false);

  function toast(text){
    const t = $('toast'); t.textContent = text; t.classList.remove('hidden');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.add('hidden'), 3500);
  }
  const show = v => v === undefined || v === null || v === '' ? '' : Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'oui' : 'non') : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

  // ---------- Lecture du CSV (guillemets, retours à la ligne dans les cellules, "" échappés) ----------
  function parseCSV(text){
    text = text.replace(/^﻿/, '');
    const sep = (() => { const first = text.split(/\r?\n/, 1)[0]; return (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ','; })();
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++){
      const c = text[i];
      if (q){
        if (c === '"'){ if (text[i + 1] === '"'){ cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === sep){ row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r'){ if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length){ row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
  }

  // Date d'une réponse : « 05/10/2026 21:03:12 » (Sheets en français), « 10/5/2026 21:03:12 » (en anglais) ou ISO
  function parseDate(s, dayFirst){
    s = String(s || '').trim();
    const iso = Date.parse(s); if (/^\d{4}-\d{2}-\d{2}/.test(s) && !isNaN(iso)) return new Date(iso);
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/); if (!m) return null;
    let [a, b] = [+m[1], +m[2]]; if (a > 12) dayFirst = true; else if (b > 12) dayFirst = false;
    const d = dayFirst ? a : b, mo = dayFirst ? b : a, y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return new Date(y, mo - 1, d, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  const dayOf = d => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : 'sans-date';
  const dayLabel = k => k === 'sans-date' ? 'sans date' : new Date(k + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  // Quelle colonne contient quoi (les titres des questions du formulaire peuvent changer)
  function columns(head, rows){
    const h = head.map(norm), score = i => rows.filter(r => /\{\s*"/.test(r[i] || '')).length;
    let json = h.findIndex(t => /json|lignes/.test(t)); if (json < 0 || !score(json)){ let best = -1, bs = 0; head.forEach((_, i) => { const s = score(i); if (s > bs){ bs = s; best = i; } }); json = best; }
    const date = Math.max(0, h.findIndex(t => /horodat|timestamp|date/.test(t)));
    const comment = h.findIndex((t, i) => i !== json && /comment/.test(t));
    const modifs = h.findIndex((t, i) => i !== json && i !== comment && i !== date && /modif|resume|chang/.test(t));
    const done = h.findIndex(t => /^traite/.test(t));   // colonne « Traitée » écrite par le script Google
    return { json, date, comment, modifs, done, dayFirst: !/timestamp/.test(h[date] || '') };
  }

  // Les lignes JSON d'une réponse (celles produites par « Envoyer ma proposition » dans l'éditeur)
  function linesOf(text){
    const out = []; let file = null, hint = null;
    String(text || '').split(/\r?\n/).forEach(raw => {
      const l = raw.trim(); if (!l) return;
      if (l.startsWith('//')){
        const f = l.match(/Modifications de\s+(\S+\.json)/i); if (f) file = f[1];
        hint = /supprim/i.test(l) ? 'del' : /ajout/i.test(l) ? 'add' : /modifi/i.test(l) ? 'mod' : hint;
        return;
      }
      try { const o = JSON.parse(l.replace(/,\s*$/, '')); if (o && typeof o === 'object' && !Array.isArray(o)) out.push({ o, file, hint }); } catch (_) {}
      hint = null;
    });
    return out;
  }
  const fileOf = (o, declared) => LISTS[declared] ? declared : ('Nom Scientifique' in o || 'Nom Français' in o) ? 'ouessant_birds.json' : ('carres' in o || 'lat' in o) ? 'lieux_ouessant.json' : null;

  // ---------- Listes en ligne (pour comparer) ----------
  async function loadLists(){
    for (const f of Object.keys(LISTS)){
      const r = await fetch(f, { cache: 'no-cache' }); if (!r.ok) throw new Error(f);
      const entries = await r.json(), byKey = new Map();
      entries.forEach(e => byKey.set(norm(e[LISTS[f].key]), e));
      current[f] = { entries, byKey };
    }
  }

  // ---------- Fichier choisi ----------
  async function readFile(file){
    if ($('loadPanel').classList.contains('hidden')) return;
    const msg = $('loadMsg'); msg.className = 'msg'; msg.textContent = 'Lecture…';
    try { lastSource = 'csv'; await processRows(parseCSV(await file.text())); }
    catch (e) { msg.className = 'msg bad'; msg.textContent = 'Lecture impossible : ' + (e.message || e); }
  }
  // Tableau de lignes (la première = titres des colonnes), venant du fichier .csv ou de la feuille Google
  async function processRows(rows){
    const msg = $('loadMsg');
      rows = rows.map(r => r.map(c => String(c ?? '')));
      lastRows = rows;
      if (rows.filter(r => r.some(c => c.trim() !== '')).length < 2) throw new Error('Aucune réponse pour l’instant.');
      const col = columns(rows[0], rows.slice(1));
      const withDone = $('inclDone').checked; let skipped = 0;
      if (col.json < 0) throw new Error('Aucune colonne ne contient de lignes JSON : est-ce bien le fichier des réponses du formulaire ?');
      await loadLists();
      proposals = []; answers = [];
      rows.slice(1).forEach((r, ri) => {
        if (!r.some(c => c.trim() !== '')) return;
        if (col.done >= 0 && (r[col.done] || '').trim() && !withDone){ skipped++; return; }   // déjà traitée (colonne « Traitée » de la feuille)
        const when = parseDate(r[col.date], col.dayFirst), comment = col.comment >= 0 ? (r[col.comment] || '').trim() : '';
        const ans = { row: ri + 2, when, day: dayOf(when), ids: [] }; answers.push(ans);   // row : numéro de la ligne dans la feuille (1 = titres)
        linesOf(r[col.json]).forEach(({ o, file, hint }, li) => {
          const f = fileOf(o, file); if (!f) return;
          const L = LISTS[f], data = Object.fromEntries(Object.entries(o).filter(([k]) => !META.includes(k)));
          const origKey = o._cle_avant !== undefined ? o._cle_avant : o[L.key];
          const cur = current[f].byKey.get(norm(origKey));
          const del = o._action === 'supprimer' || hint === 'del';
          let type, diffs = [];
          if (del){ if (!cur) return; type = 'del'; }
          else if (!cur){ type = 'add'; diffs = Object.keys(data).filter(k => show(data[k]) !== '').map(k => ({ k, before: undefined, after: data[k] })); }
          else {
            type = 'mod';
            diffs = Object.keys(data).filter(k => !same(data[k], cur[k])).map(k => ({ k, before: cur[k], after: data[k] }));
            if (!diffs.length) type = 'same';   // déjà comme ça dans la liste
          }
          const id = ri + '-' + li; ans.ids.push(id);
          proposals.push({ id, row: ans.row, when, day: dayOf(when), comment, file: f, origKey, type, diffs, data, cur });
        });
      });
      if (!answers.length) throw new Error(skipped ? `Rien de nouveau : les ${skipped} réponse(s) sont déjà marquées « traitées ».` : 'Aucune réponse pour l’instant.');
      msg.className = 'msg good'; msg.textContent = `${answers.length} réponse(s) à trier, ${proposals.length} proposition(s)` + (skipped ? ` (${skipped} déjà traitée(s), masquée(s))` : '') + '. Les listes en ligne ont été chargées pour comparer.';
      buildPeriods(); $('sortView').classList.remove('hidden'); render();
  }
  // ---------- Récupération automatique : script Google (Apps Script) attaché à la feuille des réponses ----------
  // Le script ne répond qu'avec le code secret ; l'adresse et le code sont gardés dans ce navigateur, jamais dans le dépôt.
  const SRC = 'ouessant-admin-source';
  const SCRIPT_URL = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;
  let src = {}; try { src = JSON.parse(store.get(SRC) || '{}') || {}; } catch (_) { src = {}; }
  $('srcUrl').value = src.url || ''; $('srcCode').value = src.code || '';
  $('fetchBtn').disabled = !(src.url && src.code);
  $('srcSave').addEventListener('click', () => {
    const url = $('srcUrl').value.trim(), code = $('srcCode').value.trim(), m = $('srcMsg');
    if (!SCRIPT_URL.test(url)){ m.className = 'msg bad'; m.textContent = 'L’adresse doit être celle de l’application web du script : https://script.google.com/macros/s/…/exec'; return; }
    if (code.length < 16){ m.className = 'msg bad'; m.textContent = 'Le code secret doit faire au moins 16 caractères (bouton « Créer un code »).'; return; }
    src = { url, code }; store.set(SRC, JSON.stringify(src)); $('fetchBtn').disabled = false;
    m.className = 'msg good'; m.textContent = 'Réglages enregistrés sur cet appareil.';
  });
  $('srcGen').addEventListener('click', () => {
    const a = new Uint8Array(18); crypto.getRandomValues(a);
    $('srcCode').value = btoa(String.fromCharCode(...a)).replace(/[+/=]/g, c => ({ '+': 'k', '/': 'z', '=': '' }[c]));
    $('srcCode').type = 'text'; $('srcCode').select();
    $('srcMsg').className = 'msg'; $('srcMsg').textContent = 'Code créé : copie-le dans les propriétés du script Google (CODE), puis « Enregistrer les réglages ».';
  });
  $('fetchBtn').addEventListener('click', async () => {
    const msg = $('loadMsg'); if (!(src.url && src.code)) return;
    msg.className = 'msg'; msg.textContent = 'Récupération des réponses auprès de Google…';
    try {
      const r = await fetch(src.url + '?code=' + encodeURIComponent(src.code), { cache: 'no-store', credentials: 'omit' });
      if (!r.ok) throw new Error('Google a répondu ' + r.status);
      const j = await r.json();
      if (!j || !j.ok) throw new Error(j && j.erreur === 'code' ? 'code secret refusé par le script (vérifie la propriété CODE).' : 'réponse inattendue du script.');
      if (!Array.isArray(j.lignes)) throw new Error('réponse inattendue du script.');
      lastSource = 'script'; await processRows(j.lignes);
    } catch (e) { msg.className = 'msg bad'; msg.textContent = 'Récupération impossible : ' + (e.message || e) + ' Tu peux toujours utiliser le fichier .csv.'; }
  });

  $('inclDone').addEventListener('change', () => { if (lastRows) processRows(lastRows).catch(e => { $('loadMsg').className = 'msg bad'; $('loadMsg').textContent = e.message || e; }); });
  $('csvFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) readFile(f); e.target.value = ''; });
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) readFile(f); });

  // ---------- Période ----------
  function buildPeriods(){
    const done = +store.get(DONE) || 0, days = {};
    proposals.forEach(p => { days[p.day] = (days[p.day] || 0) + 1; });
    const fresh = proposals.filter(p => !p.when || +p.when > done).length;
    const opts = [];
    if (done) opts.push(['new', `non traitées (${fresh})`]);
    Object.keys(days).sort().reverse().forEach(d => opts.push(['d:' + d, `${dayLabel(d)} (${days[d]})`]));
    opts.push(['all', `toutes (${proposals.length})`]);
    $('period').innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
  }
  function inPeriod(p){
    const v = $('period').value;
    if (v === 'all') return true;
    if (v === 'new') return !p.when || +p.when > (+store.get(DONE) || 0);
    return 'd:' + p.day === v;
  }

  // ---------- Regroupement : une carte par espèce / lieu-dit, une variante par proposition différente ----------
  function groups(){
    const map = new Map();
    proposals.filter(inPeriod).forEach(p => {
      const gk = p.file + '|' + norm(p.origKey);
      if (!map.has(gk)) map.set(gk, { gk, file: p.file, origKey: p.origKey, cur: p.cur, variants: new Map(), same: 0, total: 0 });
      const g = map.get(gk); g.total++;
      if (p.type === 'same'){ g.same++; return; }
      const sig = p.type + ':' + JSON.stringify(p.diffs.map(d => [d.k, d.after]).sort());
      if (!g.variants.has(sig)) g.variants.set(sig, { sig, type: p.type, diffs: p.diffs, data: p.data, props: [] });
      g.variants.get(sig).props.push(p);
    });
    const all = [...map.values()];
    groups.alreadyOk = all.filter(g => !g.variants.size).reduce((n, g) => n + g.same, 0);   // demandes déjà conformes à la liste : rien à faire
    return all.filter(g => g.variants.size);
  }
  const stateOf = g => { const d = decisions[g.gk]; return d === 'reject' ? 'no' : d && [...g.variants.keys()].includes(d) ? 'ok' : 'todo'; };
  const nameOf = g => {
    const L = LISTS[g.file], src = g.cur || [...g.variants.values()][0].data;
    return g.file === 'ouessant_birds.json' ? { main: show(src[L.name]) || show(g.origKey), sub: show(src[L.key]) } : { main: show(src[L.name]) || show(g.origKey), sub: '' };
  };
  const TYPE = { mod: ['mod', 'Modification'], add: ['new', 'Ajout'], del: ['del', 'Suppression'] };

  function render(){
    const all = groups(), sortBy = $('sortBy').value, showV = $('show').value;
    const counts = { todo: 0, ok: 0, no: 0 }; all.forEach(g => counts[stateOf(g)]++);
    const conflicts = all.filter(g => g.variants.size > 1).length;
    $('summary').textContent = `${all.length} espèce(s) ou lieu(x) concerné(s) : ${counts.todo} à décider, ${counts.ok} validé(s), ${counts.no} rejeté(s)` + (conflicts ? ` · ${conflicts} avec des propositions différentes` : '') + (groups.alreadyOk ? ` · ${groups.alreadyOk} demande(s) déjà conforme(s) à la liste, ignorée(s)` : '');
    const rank = { del: 0, add: 1, mod: 2 };
    const list = all.filter(g => showV === 'all' || stateOf(g) === showV).sort((a, b) => {
      if (sortBy === 'name') return nameOf(a).main.localeCompare(nameOf(b).main, 'fr');
      if (sortBy === 'type') return (rank[[...a.variants.values()][0].type] - rank[[...b.variants.values()][0].type]) || nameOf(a).main.localeCompare(nameOf(b).main, 'fr');
      return (b.total - a.total) || nameOf(a).main.localeCompare(nameOf(b).main, 'fr');
    });
    $('groups').innerHTML = list.length ? list.map(cardHtml).join('') : '<p class="help empty">Rien à afficher pour cette période et ce filtre.</p>';
    $('doneBtn').disabled = !doneRows().length;
  }
  function cardHtml(g){
    const n = nameOf(g), st = stateOf(g), chosen = decisions[g.gk];
    const many = g.variants.size > 1;
    return `<article class="grp is-${st}" data-gk="${esc(g.gk)}">
      <header class="grp-h">
        <h3>${esc(n.main)}${n.sub ? ` <i>${esc(n.sub)}</i>` : ''}</h3>
        <span class="tag">${esc(LISTS[g.file].label)}</span>
        <span class="tag n">${g.total} demande${g.total > 1 ? 's' : ''}</span>
        ${many ? '<span class="tag warn">propositions différentes</span>' : ''}
        <span class="state">${st === 'ok' ? '✔ validée' : st === 'no' ? '✖ rejetée' : 'à décider'}</span>
      </header>
      ${g.same ? `<p class="help">${g.same} demande(s) déjà conforme(s) à la liste (rien à faire).</p>` : ''}
      ${[...g.variants.values()].sort((a, b) => b.props.length - a.props.length).map(v => variantHtml(g, v, chosen === v.sig, many)).join('')}
      <div class="actions"><button type="button" class="btn danger" data-reject>${st === 'no' ? 'Rejetée' : 'Tout rejeter'}</button>${st !== 'todo' ? '<button type="button" class="btn ghost" data-undo>Annuler la décision</button>' : ''}</div>
    </article>`;
  }
  function variantHtml(g, v, isChosen, many){
    const [cls, label] = TYPE[v.type];
    const rows = v.type === 'del' ? `<li>retirer de la liste</li>`
      : v.diffs.map(d => `<li>${esc(d.k)} : ${v.type === 'add' ? '' : `<del>${esc(show(d.before) || 'vide')}</del> → `}<ins>${esc(show(d.after) || 'vide')}</ins></li>`).join('');
    const notes = v.props.filter(p => p.comment || p.when).map(p => `<li>${p.when ? `<time>${esc(p.when.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))}</time>` : ''}${p.comment ? ' — ' + esc(p.comment) : ''}</li>`).join('');
    return `<div class="var${isChosen ? ' chosen' : ''}" data-sig="${esc(v.sig)}">
      <p class="var-h"><span class="badge ${cls}">${label}</span> <b>${v.props.length} personne${v.props.length > 1 ? 's' : ''}</b></p>
      <ul class="diff">${rows}</ul>
      ${notes ? `<details><summary>Dates et commentaires</summary><ul class="notes">${notes}</ul></details>` : ''}
      <button type="button" class="btn${isChosen ? ' primary' : ''}" data-pick>${isChosen ? 'Validée' : many ? 'Valider celle-ci' : 'Valider'}</button>
    </div>`;
  }
  $('groups').addEventListener('click', e => {
    const card = e.target.closest('.grp'); if (!card) return;
    const gk = card.dataset.gk;
    if (e.target.closest('[data-pick]')) decisions[gk] = e.target.closest('.var').dataset.sig;
    else if (e.target.closest('[data-reject]')) decisions[gk] = 'reject';
    else if (e.target.closest('[data-undo]')) delete decisions[gk];
    else return;
    saveDecisions(); render();
  });
  ['period', 'sortBy', 'show'].forEach(id => $(id).addEventListener('change', render));

  // ---------- Lignes JSON validées (même format que « Envoyer ma proposition » de l'éditeur) ----------
  $('genBtn').addEventListener('click', () => {
    const ok = groups().filter(g => stateOf(g) === 'ok');
    const out = $('outBlocks'); $('outMsg').textContent = '';
    if (!ok.length){ out.innerHTML = '<p class="help">Aucune proposition validée pour l’instant.</p>'; return; }
    const today = new Date().toLocaleDateString('fr-FR');
    out.innerHTML = Object.keys(LISTS).map(f => {
      const L = LISTS[f], mine = ok.filter(g => g.file === f); if (!mine.length) return '';
      const c = { mod: 0, add: 0, del: 0 }, lines = [];
      mine.forEach(g => {
        const v = g.variants.get(decisions[g.gk]); c[v.type]++;
        if (v.type === 'del'){ lines.push('// supprimée', JSON.stringify(Object.assign({ _action: 'supprimer' }, g.cur))); return; }
        if (v.type === 'add'){ lines.push('// ajoutée', JSON.stringify(v.data)); return; }
        const o = JSON.parse(JSON.stringify(g.cur)); v.diffs.forEach(d => { o[d.k] = d.after; });
        if (!same(o[L.key], g.cur[L.key])) o._cle_avant = g.cur[L.key];
        lines.push(`// modifiée : ${show(g.cur[L.key])}`, JSON.stringify(o));
      });
      const text = [`// Modifications de ${f}, validées le ${today}`, `// ${c.mod} modifiée(s), ${c.add} ajoutée(s), ${c.del} supprimée(s). À coller dans l’éditeur : « Coller des lignes ».`, ...lines].join('\n') + '\n';
      return `<div class="out"><h3>${f === 'ouessant_birds.json' ? 'Oiseaux' : 'Lieux'} — ${mine.length} entrée(s)</h3>
        <textarea readonly rows="${Math.min(14, lines.length + 3)}" spellcheck="false">${esc(text)}</textarea>
        <div class="actions"><button type="button" class="btn" data-copy>Copier</button></div></div>`;
    }).join('');
  });
  $('outBlocks').addEventListener('click', e => {
    if (!e.target.closest('[data-copy]')) return;
    const ta = e.target.closest('.out').querySelector('textarea');
    const done = () => toast('Lignes copiées : colle-les dans l’éditeur, « Coller des lignes ».');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); document.execCommand('copy'); done(); });
    else { ta.select(); document.execCommand('copy'); done(); }
  });
  // Réponses « traitées » : celles de la période dont toutes les propositions ont une décision (validée, rejetée ou déjà conforme)
  const decided = p => p.type === 'same' || decisions[p.file + '|' + norm(p.origKey)] !== undefined;
  const byId = () => new Map(proposals.map(p => [p.id, p]));
  function doneRows(){
    const m = byId();
    return answers.filter(a => (!a.when || inPeriod(a)) && a.ids.every(id => decided(m.get(id))));
  }
  $('doneBtn').addEventListener('click', async () => {
    const rows = doneRows(), out = $('outMsg'); if (!rows.length) return;
    const left = answers.filter(a => (!a.when || inPeriod(a))).length - rows.length;
    if (!confirm(`Marquer ${rows.length} réponse(s) comme traitée(s) ?` + (left ? ` (${left} autre(s) gardée(s) : elles ont encore des propositions « à décider ».)` : '') + ' Pense à enregistrer les lignes JSON dans l’éditeur avant.')) return;
    out.className = 'msg'; out.textContent = 'Marquage…';
    try {
      if (lastSource === 'script' && src.url && src.code){
        let n = 0; const nums = rows.map(a => a.row);
        for (let k = 0; k < nums.length; k += 300){   // par paquets, pour garder des adresses courtes
          const r = await fetch(src.url + '?code=' + encodeURIComponent(src.code) + '&action=marquer&lignes=' + nums.slice(k, k + 300).join(','), { cache: 'no-store', credentials: 'omit' });
          const j = await r.json(); if (!j || !j.ok) throw new Error(j && j.erreur === 'code' ? 'code secret refusé' : 'réponse inattendue du script'); n += j.marquees || 0;
        }
        out.className = 'msg good'; out.textContent = `${n} réponse(s) marquée(s) « traitée(s) » dans la feuille Google : elles ne seront plus proposées.`;
      } else {
        const withDate = rows.filter(a => a.when);
        const max = Math.max(+store.get(DONE) || 0, ...withDate.map(a => +a.when));
        store.set(DONE, String(max));
        out.className = 'msg good'; out.textContent = `C’est noté dans ce navigateur : réponses jusqu’au ${new Date(max).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} traitées (période « non traitées »). Avec le script Google, le marquage se fait directement dans la feuille.`;
      }
      const marked = new Set(rows.map(a => a.row));
      answers = answers.filter(a => !marked.has(a.row)); proposals = proposals.filter(p => !marked.has(p.row));
      buildPeriods(); render();
    } catch (e) { out.className = 'msg bad'; out.textContent = 'Marquage impossible : ' + (e.message || e); }
  });
})();
