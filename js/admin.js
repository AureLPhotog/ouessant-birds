/* Oiseaux d'Ouessant — page Administration (admin.html) : tri des propositions, messages, réglages des visiteurs, listes par année.
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
  const DECISIONS = 'ouessant-admin-decisions', DONE_SET = 'ouessant-admin-traitees';
  // réponses traitées quand on travaille avec le fichier .csv (sans le script) : leur empreinte est gardée dans ce navigateur
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  let doneSet; try { doneSet = new Set(JSON.parse(store.get(DONE_SET) || '[]')); } catch (_) { doneSet = new Set(); }
  const saveDone = () => store.set(DONE_SET, JSON.stringify([...doneSet].slice(-20000)));
  const META = ['_action', '_cle_avant'];
  const LOCK = 'Verrouillée', CANAL = 'Proposition de Canal de Diffusion Ouessant';
  let regNow = { verrou: true, champs: 'canal' }, regReady = Promise.resolve();   // réglages de l'admin (reglages.json)
  let current = {};            // fichier → { entries: [...], byKey: Map }
  let proposals = [];          // toutes les propositions lues dans le fichier
  let answers = [];            // une entrée par réponse (ligne de la feuille) : { row, when, day, ids }
  let lastRows = null, lastSource = null;
  let LIST = 'ouessant_birds.json';   // onglet affiché : les oiseaux et les lieux sont triés et générés séparément   // dernières lignes lues et leur origine ('csv' ou 'script')
  let decisions = {};          // clé de groupe → signature de la variante retenue, ou 'reject'
  try { decisions = JSON.parse(store.get(DECISIONS) || '{}') || {}; } catch (_) { decisions = {}; }
  const saveDecisions = () => store.set(DECISIONS, JSON.stringify(decisions));

  // ---------- Verrou : la page ne s'ouvre qu'avec la Clé Admin, vérifiée auprès de GitHub ----------
  // (le code de la page est public comme tout le dépôt, mais il ne contient aucune donnée : les réponses restent dans le fichier sur l'appareil)
  const TOKEN_KEY = 'gh-token-ouessant';   // même clé que l'éditeur : si elle y est déjà entrée, la page s'ouvre directement
  let TOKEN = '';   // clé vérifiée, pour les listes annuelles (écriture dans le dépôt)
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
    TOKEN = t;
    $('lockPanel').classList.add('hidden'); $('loadPanel').classList.remove('hidden'); $('yearPanel').classList.remove('hidden'); $('adminBadge').hidden = false;
    initYears(); regReady = loadReg();
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
        const v = l.match(/^\/\/\s*réglages\s*:\s*verrou\s+(actif|levé),\s*champs\s+(canal|tous)/i); if (v){ out.reg = { verrou: v[1].toLowerCase() === 'actif', champs: v[2].toLowerCase() }; return; }   // réglages au moment de la proposition
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
    await regReady;
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
        const sig = (r[col.date] || '') + '|' + hash(r[col.json] || '');
        const isDone = (col.done >= 0 && (r[col.done] || '').trim()) || doneSet.has(sig);   // colonne « Traitée » de la feuille, ou noté dans ce navigateur
        if (isDone && !withDone){ skipped++; return; }
        const when = parseDate(r[col.date], col.dayFirst), comment = col.comment >= 0 ? (r[col.comment] || '').trim() : '';
        const ans = { row: ri + 2, sig, when, day: dayOf(when), ids: [], comment }; answers.push(ans);   // row : numéro de la ligne dans la feuille (1 = titres)
        const lines = linesOf(r[col.json]), areg = lines.reg || regNow;
        lines.forEach(({ o, file, hint }, li) => {
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
          const lockedSp = f === 'ouessant_birds.json' && !!cur && cur[LOCK] === true;
          // rejetée d'office selon les réglages du moment de la proposition (sinon les réglages actuels) :
          // espèce verrouillée ('lock'), ou changement d'autre chose que le canal d'une espèce existante en mode « canal seulement » ('canal')
          const why = f !== 'ouessant_birds.json' ? null : lockedSp && areg.verrou ? 'lock' : areg.champs === 'canal' && (type === 'del' || (type === 'mod' && diffs.some(d => d.k !== CANAL))) ? 'canal' : null;
          const locked = !!why;
          proposals.push({ id, row: ans.row, when, day: dayOf(when), comment, file: f, origKey, type, diffs, data, cur, locked, lockedSp, why });
        });
        ans.msg = !ans.ids.length && !!comment;   // question ou retour sur l'appli (bouton « Une question, un retour ? ») : onglet Messages
      });
      if (!answers.length) throw new Error(skipped ? `Rien de nouveau : les ${skipped} réponse(s) sont déjà marquées « traitées ».` : 'Aucune réponse pour l’instant.');
      const nm = answers.filter(a => a.msg).length;
      msg.className = 'msg good'; msg.textContent = `${answers.length} réponse(s) à trier, ${proposals.length} proposition(s)` + (nm ? `, ${nm} message(s)` : '') + (skipped ? ` (${skipped} déjà traitée(s), masquée(s))` : '') + '. Les listes en ligne ont été chargées pour comparer.';
      buildPeriods(); $('sortView').classList.remove('hidden');
      const todoFiles = proposals.filter(p => p.type !== 'same').map(p => p.file);
      setList(todoFiles.includes(LIST) || (LIST === 'messages' && nm) ? LIST : todoFiles[0] || (nm ? 'messages' : LIST));
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
  // (les réponses déjà traitées sont écartées dès la lecture : la période ne porte que sur les réponses à trier)
  function buildPeriods(){
    const keep = $('period').value, days = {};
    proposals.forEach(p => { days[p.day] = (days[p.day] || 0) + 1; }); answers.filter(a => a.msg).forEach(a => { days[a.day] = (days[a.day] || 0) + 1; });
    const opts = [['all', `tous les jours (${proposals.length + answers.filter(a => a.msg).length})`]];
    Object.keys(days).sort().reverse().forEach(d => opts.push(['d:' + d, `${dayLabel(d)} (${days[d]})`]));
    $('period').innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
    if (opts.some(([v]) => v === keep)) $('period').value = keep;
  }
  function inPeriod(p){
    const v = $('period').value;
    return v === 'all' || 'd:' + p.day === v;
  }

  // ---------- Regroupement : une carte par espèce / lieu-dit, une variante par proposition différente ----------
  function groups(){
    const map = new Map();
    proposals.filter(p => p.file === LIST && inPeriod(p)).forEach(p => {
      const gk = p.file + '|' + norm(p.origKey);
      if (!map.has(gk)) map.set(gk, { gk, file: p.file, origKey: p.origKey, cur: p.cur, locked: true, lockedSp: p.lockedSp, variants: new Map(), same: 0, total: 0 });
      const g = map.get(gk); g.total++;
      if (p.type === 'same'){ g.same++; return; }
      g.locked = g.locked && p.locked;   // rejetée d'office seulement si toutes ses propositions le sont
      const sig = p.type + ':' + JSON.stringify(p.diffs.map(d => [d.k, d.after]).sort());
      if (!g.variants.has(sig)) g.variants.set(sig, { sig, type: p.type, diffs: p.diffs, data: p.data, props: [] });
      g.variants.get(sig).props.push(p);
    });
    const all = [...map.values()];
    groups.alreadyOk = all.filter(g => !g.variants.size).reduce((n, g) => n + g.same, 0);   // demandes déjà conformes à la liste : rien à faire
    return all.filter(g => g.variants.size);
  }
  const stateOf = g => { const d = decisions[g.gk]; return d === 'reject' ? 'no' : d && [...g.variants.keys()].includes(d) ? 'ok' : g.locked ? 'no' : 'todo'; };   // verrouillée : rejetée tant que tu ne valides pas toi-même
  const nameOf = g => {
    const L = LISTS[g.file], src = g.cur || [...g.variants.values()][0].data;
    return g.file === 'ouessant_birds.json' ? { main: show(src[L.name]) || show(g.origKey), sub: show(src[L.key]) } : { main: show(src[L.name]) || show(g.origKey), sub: '' };
  };
  const TYPE = { mod: ['mod', 'Modification'], add: ['new', 'Ajout'], del: ['del', 'Suppression'] };

  // Onglet Messages : questions et retours (commentaire seul, sans modification)
  function renderMessages(){
    const list = answers.filter(a => a.msg && inPeriod(a)).sort((a, b) => (b.when || 0) - (a.when || 0));
    $('summary').textContent = `${list.length} message(s) : questions et retours envoyés depuis l’appli (« Une question, un retour ? »).`;
    $('groups').innerHTML = list.length ? list.map(a => `<article class="grp msg-card"><p class="var-h">${a.when ? `<time>${esc(a.when.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }))}</time>` : 'sans date'} · ligne ${a.row} de la feuille</p><p class="msg-text">${esc(a.comment)}</p></article>`).join('')
      : '<p class="help empty">Aucun message pour cette période.</p>';
    $('doneBtn').disabled = !doneRows().length;
  }
  function render(){
    $('nMsgs').textContent = `(${answers.filter(a => a.msg && inPeriod(a)).length})`;
    document.querySelectorAll('.admin-bar .filters label:not(:first-child)').forEach(l => l.classList.toggle('hidden', LIST === 'messages'));
    if (LIST === 'messages'){ $('nBirds').textContent = `(${proposals.filter(p => p.file === 'ouessant_birds.json' && inPeriod(p) && p.type !== 'same').length})`; $('nPlaces').textContent = `(${proposals.filter(p => p.file === 'lieux_ouessant.json' && inPeriod(p) && p.type !== 'same').length})`; renderMessages(); return; }
    const all = groups(), sortBy = $('sortBy').value, showV = $('show').value;
    const counts = { todo: 0, ok: 0, no: 0 }; all.forEach(g => counts[stateOf(g)]++);
    const nIn = f => proposals.filter(p => p.file === f && inPeriod(p) && p.type !== 'same').length;
    $('nBirds').textContent = `(${nIn('ouessant_birds.json')})`; $('nPlaces').textContent = `(${nIn('lieux_ouessant.json')})`;
    const conflicts = all.filter(g => g.variants.size > 1).length, nLocked = all.filter(g => g.locked && decisions[g.gk] === undefined).length;
    $('summary').textContent = `${all.length} espèce(s) ou lieu(x) concerné(s) : ${counts.todo} à décider, ${counts.ok} validé(s), ${counts.no} rejeté(s)` + (conflicts ? ` · ${conflicts} avec des propositions différentes` : '') + (nLocked ? ` · ${nLocked} rejetée(s) d’office : espèce verrouillée ou changement hors canal (filtre « rejetées »)` : '') + (groups.alreadyOk ? ` · ${groups.alreadyOk} demande(s) déjà conforme(s) à la liste, ignorée(s)` : '');
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
        ${g.lockedSp ? '<span class="tag lock">🔒 verrouillée</span>' : ''}
        ${[...g.variants.values()].some(v => v.diffs.some(d => d.k === LOCK)) ? '<span class="tag warn">change le verrou</span>' : ''}
        <span class="state">${st === 'ok' ? '✔ validée' : st === 'no' ? (g.locked && chosen === undefined ? '✖ rejetée d’office' : '✖ rejetée') : 'à décider'}</span>
      </header>
      ${g.locked ? `<p class="help">${[...g.variants.values()].some(v => v.props.some(p => p.why === 'lock')) ? 'Espèce commune verrouillée' : 'Changement d’autre chose que le canal (réglage « canal seulement »)'} : la proposition est rejetée d’office. Tu peux quand même la valider.</p>` : g.lockedSp ? '<p class="help">Espèce verrouillée, mais le verrou était levé au moment de l’envoi.</p>' : ''}
      ${g.same ? `<p class="help">${g.same} demande(s) déjà conforme(s) à la liste (rien à faire).</p>` : ''}
      ${[...g.variants.values()].sort((a, b) => b.props.length - a.props.length).map(v => variantHtml(g, v, chosen === v.sig, many)).join('')}
      <div class="actions"><button type="button" class="btn danger" data-reject>${st === 'no' ? 'Rejetée' : 'Tout rejeter'}</button>${chosen !== undefined ? '<button type="button" class="btn ghost" data-undo>Annuler la décision</button>' : ''}</div>
    </article>`;
  }
  function variantHtml(g, v, isChosen, many){
    const [cls, label] = TYPE[v.type];
    const rows = v.type === 'del' ? `<li>retirer de la liste</li>`
      : v.diffs.map(d => `<li>${esc(d.k)} : ${v.type === 'add' ? '' : `<del>${esc(show(d.before) || 'vide')}</del> → `}<ins>${esc(show(d.after) || 'vide')}</ins></li>`).join('');
    const notes = v.props.filter(p => p.comment || p.when).map(p => `<li>${p.when ? `<time>${esc(p.when.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))}</time>` : ''}${p.comment ? ' — ' + esc(p.comment) : ''}</li>`).join('');
    return `<div class="var${isChosen ? ' chosen' : ''}" data-sig="${esc(v.sig)}">
      <p class="var-h"><span class="badge ${cls}">${label}</span> <b>${v.props.length} personne${v.props.length > 1 ? 's' : ''}</b>${!g.locked && v.props.every(p => p.locked) ? ` <span class="tag warn">${v.props.some(p => p.why === 'lock') ? 'verrouillée à l’envoi' : 'hors canal : pas permise'}</span>` : ''}</p>
      <ul class="diff">${rows}</ul>
      ${notes ? `<details><summary>Dates et commentaires</summary><ul class="notes">${notes}</ul></details>` : ''}
      <button type="button" class="btn${isChosen ? ' primary' : ''}" data-pick>${isChosen ? 'Validée' : g.locked ? 'Valider quand même' : many ? 'Valider celle-ci' : 'Valider'}</button>
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
  const LIST_NAME = { 'ouessant_birds.json': ['Oiseaux', 'des oiseaux'], 'lieux_ouessant.json': ['Lieux', 'des lieux'], messages: ['Messages', 'des messages'] };
  function setList(f){
    LIST = f;
    document.querySelectorAll('.tabs [data-file]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.file === f)));
    const [tab, de] = LIST_NAME[f];
    $('outTitle').textContent = `3. Les lignes JSON ${de} validées`;
    $('outHelp').innerHTML = `Dans l’éditeur (avec ta clé) : onglet <b>${tab}</b> → <b>Coller des lignes</b> → colle → <b>Vérifier</b> → <b>Appliquer</b> → <b>Enregistrer sur GitHub</b>. Ces lignes ne contiennent que ${de}.`;
    $('genBtn').textContent = `Générer les lignes JSON ${de}`;
    $('doneBtn').textContent = f === 'messages' ? 'Marquer ces messages comme lus' : `Marquer comme traitées les réponses ${de} décidées`;
    const isMsg = f === 'messages'; $('genBtn').classList.toggle('hidden', isMsg); $('outTitle').textContent = isMsg ? '3. Messages lus' : $('outTitle').textContent;
    if (isMsg) $('outHelp').textContent = 'Une fois les messages lus, marque-les : ils ne seront plus affichés (la case « Inclure les réponses déjà marquées » les fait réapparaître).';
    $('outBlocks').innerHTML = ''; $('outMsg').textContent = '';
    render();
  }
  document.querySelectorAll('.tabs [data-file]').forEach(b => b.addEventListener('click', () => setList(b.dataset.file)));

  // ---------- Lignes JSON validées (même format que « Envoyer ma proposition » de l'éditeur) ----------
  $('genBtn').addEventListener('click', () => {
    const ok = groups().filter(g => stateOf(g) === 'ok');
    const out = $('outBlocks'); $('outMsg').textContent = '';
    if (!ok.length){ out.innerHTML = '<p class="help">Aucune proposition validée pour l’instant.</p>'; return; }
    const today = new Date().toLocaleDateString('fr-FR');
    out.innerHTML = [LIST].map(f => {
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
      const text = [`// Modifications de ${f}, validées le ${today} — à coller dans l’onglet ${LIST_NAME[f][0]} de l’éditeur`, `// ${c.mod} modifiée(s), ${c.add} ajoutée(s), ${c.del} supprimée(s). À coller dans l’éditeur : « Coller des lignes ».`, ...lines].join('\n') + '\n';
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
  const decided = p => p.type === 'same' || p.locked || decisions[p.file + '|' + norm(p.origKey)] !== undefined;
  const byId = () => new Map(proposals.map(p => [p.id, p]));
  function doneRows(){
    const m = byId();
    if (LIST === 'messages') return answers.filter(a => a.msg && (!a.when || inPeriod(a)));
    return answers.filter(a => !a.msg && (!a.when || inPeriod(a)) && (a.ids.length ? a.ids.every(id => m.get(id).file === LIST && decided(m.get(id))) : true));   // réponse sans proposition lisible ni message : rien à décider
  }
  $('doneBtn').addEventListener('click', async () => {
    const rows = doneRows(), out = $('outMsg'); if (!rows.length) return;
    const m = byId(), left = LIST === 'messages' ? 0 : Math.max(0, answers.filter(a => (!a.when || inPeriod(a)) && a.ids.some(id => m.get(id).file === LIST)).length - rows.length);
    if (!confirm(LIST === 'messages' ? `Marquer ${rows.length} message(s) comme lu(s) ? Ils ne seront plus affichés.`
      : `Marquer ${rows.length} réponse(s) comme traitée(s) ?` + (left ? ` (${left} autre(s) gardée(s) : elles ont encore des propositions « à décider ».)` : '') + ' Pense à enregistrer les lignes JSON dans l’éditeur avant.')) return;
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
        rows.forEach(a => doneSet.add(a.sig)); saveDone();
        out.className = 'msg good'; out.textContent = `${rows.length} réponse(s) notée(s) « traitée(s) » dans ce navigateur (tu as chargé un fichier .csv : la feuille Google n’est pas modifiée). Avec « Récupérer les réponses » (script Google), le marquage s’écrit dans la feuille, colonne « Traitée ».`;
      }
      const marked = new Set(rows.map(a => a.row));
      answers = answers.filter(a => !marked.has(a.row)); proposals = proposals.filter(p => !marked.has(p.row));
      buildPeriods(); render();
    } catch (e) { out.className = 'msg bad'; out.textContent = 'Marquage impossible : ' + (e.message || e); }
  });

  // ---------- Listes des oiseaux par année ----------
  // ouessant_birds.json reste la liste de l'année en cours (l'appli et l'éditeur la lisent sous ce nom).
  // Les années passées et les sauvegardes sont copiées dans archives/ : ouessant_birds_2026.json, ouessant_birds_2026_sauvegarde_2026-10-06_143005.json
  const BIRDS = 'ouessant_birds.json', ARCH = 'archives', FIRST_YEAR = 2026;   // première année de l'appli
  const ARCH_RE = /^ouessant_birds_(\d{4})(?:_sauvegarde_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})?)?\.json$/;
  const gh = (path, opts = {}) => {
    const h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Authorization': 'Bearer ' + TOKEN };
    if (opts.body) h['Content-Type'] = 'application/json';
    return fetch('https://api.github.com/repos/AureLPhotog/ouessant-birds' + path, Object.assign({ cache: 'no-store' }, opts, { headers: h }));
  };
  const b64dec = b64 => new TextDecoder('utf-8').decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
  const thisYear = () => new Date().getFullYear();
  const pad = n => String(n).padStart(2, '0');
  let archives = [];   // { name, path, year, snap: Date|null, sha }

  async function getFile(path, ref){
    const r = await gh(`/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref || 'main')}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('GitHub a répondu ' + r.status);
    const j = await r.json(), b64 = String(j.content || '').replace(/\s/g, ''), text = b64dec(b64);
    return { sha: j.sha, b64, text, list: JSON.parse(text) };
  }
  async function putFile(path, b64, message, sha){
    const r = await gh(`/contents/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', body: JSON.stringify(Object.assign({ message, content: b64, branch: 'main' }, sha ? { sha } : {})) });
    if (r.status === 409 || r.status === 422) { const e = new Error('conflit'); e.conflict = true; throw e; }
    if (r.status === 401 || r.status === 403 || r.status === 404) throw new Error('la clé n’a pas le droit d’écrire dans le dépôt');
    if (!r.ok) throw new Error('GitHub a répondu ' + r.status);
    return r.json();
  }
  // même numéro de version des listes que l'éditeur (version_listes.json), pour que l'appli voie le changement
  async function bumpListsVersion(){
    try {
      const app = window.OUESSANT_APP_VERSION; if (!app) return;
      const r0 = await gh('/contents/version_listes.json?ref=main'); let cur = {}, sha;
      if (r0.ok){ const j0 = await r0.json(); sha = j0.sha; try { cur = JSON.parse(b64dec(j0.content)); } catch (_) {} }
      const rev = (cur.app === app && Number.isInteger(cur.rev) ? cur.rev : 0) + 1;
      const txt = JSON.stringify({ app, rev }) + '\n', by = new TextEncoder().encode(txt);
      await putFile('version_listes.json', btoa(String.fromCharCode(...by)), `Version des listes : ${app}.${rev}`, sha);
    } catch (_) {}
  }
  const archLabel = a => a.snap ? `Sauvegarde du ${a.snap.toLocaleDateString('fr-FR')} à ${a.snap.toLocaleTimeString('fr-FR')}` : `Liste ${a.year}`;
  async function listArchives(){
    const r = await gh(`/contents/${ARCH}?ref=main`);
    if (r.status === 404) return [];
    if (!r.ok) throw new Error('GitHub a répondu ' + r.status);
    return (await r.json()).map(f => { const m = f.type === 'file' && f.name.match(ARCH_RE); return m && { name: f.name, path: f.path, sha: f.sha, year: +m[1], snap: m[2] ? new Date(+m[2], +m[3] - 1, +m[4], +m[5], +m[6], +(m[7] || 0)) : null }; })
      .filter(Boolean).sort((a, b) => (b.year - a.year) || ((a.snap ? 1 : 0) - (b.snap ? 1 : 0)) || ((b.snap || 0) - (a.snap || 0)));
  }
  // Archive de l'année y : la liste telle qu'elle était au 31 décembre à minuit (heure de Paris), retrouvée dans l'historique
  async function archiveYear(y){
    const r = await gh(`/commits?sha=main&path=${BIRDS}&per_page=1&until=${y}-12-31T23:00:00Z`);
    if (!r.ok) throw new Error('GitHub a répondu ' + r.status);
    const c = (await r.json())[0]; if (!c) return false;   // la liste n'existait pas encore
    const f = await getFile(BIRDS, c.sha); if (!f || !Array.isArray(f.list)) return false;
    try { await putFile(`${ARCH}/ouessant_birds_${y}.json`, f.b64, `Archive de la liste des oiseaux ${y} (au 31/12/${y})`); }
    catch (e) { if (!e.conflict) throw e; }   // déjà archivée (depuis un autre appareil)
    return true;
  }
  async function initYears(){
    const msg = $('yearMsg'); msg.className = 'msg'; msg.textContent = 'Lecture des listes archivées…';
    try {
      archives = await listArchives();
      const made = [];
      for (let y = FIRST_YEAR; y < thisYear(); y++) if (!archives.some(a => a.year === y && !a.snap) && await archiveYear(y)) made.push(y);
      if (made.length) archives = await listArchives();
      msg.className = made.length ? 'msg good' : 'msg';
      msg.textContent = made.length ? `Nouvelle année : la liste ${made.join(', ')} vient d’être archivée.` : '';
      await renderYears();
    } catch (e) { msg.className = 'msg bad'; msg.textContent = 'Listes archivées illisibles : ' + (e.message || e); }
  }
  async function renderYears(){
    const cur = await getFile(BIRDS);
    $('yearCur').innerHTML = `<b>Liste ${thisYear()} (en cours)</b> : ${cur ? cur.list.length : '?'} espèces — c’est celle de l’appli.`;
    $('yearList').innerHTML = archives.length ? `<ul class="years">${archives.map((a, i) => `<li data-i="${i}"><span class="y-name">${esc(archLabel(a))}</span>
        <span class="actions"><button type="button" class="btn ghost" data-diff>Différences avec la liste en cours</button><button type="button" class="btn ghost" data-dl>Télécharger</button><button type="button" class="btn" data-use>Reprendre comme liste ${thisYear()}</button></span></li>`).join('')}</ul>`
      : `<p class="help">Aucune liste archivée pour l’instant : la première (${FIRST_YEAR}) le sera au 1er janvier ${FIRST_YEAR + 1}.</p>`;
  }
  // différences entre deux listes, par nom scientifique
  function diffLists(from, to){
    const k = e => norm(e['Nom Scientifique']), A = new Map(from.map(e => [k(e), e])), B = new Map(to.map(e => [k(e), e]));
    const added = to.filter(e => !A.has(k(e))), removed = from.filter(e => !B.has(k(e))), changed = [];
    to.forEach(e => { const o = A.get(k(e)); if (!o) return; const f = Object.keys(Object.assign({}, o, e)).filter(x => !same(o[x], e[x])); if (f.length) changed.push({ e, o, f }); });
    return { added, removed, changed };
  }
  const bName = e => show(e['Nom Français']) || show(e['Nom Scientifique']);
  async function showDiff(a){
    const box = $('yearDiff'); box.innerHTML = '<p class="help">Comparaison…</p>';
    const [arc, cur] = await Promise.all([getFile(a.path), getFile(BIRDS)]);
    const d = diffLists(arc.list, cur.list), CH = 'Proposition de Canal de Diffusion Ouessant';
    const li = (arr, f) => arr.length ? `<ul class="diff">${arr.map(f).join('')}</ul>` : '<p class="help">aucune</p>';
    box.innerHTML = `<div class="out"><h3>${esc(archLabel(a))} → liste en cours</h3>
      <p class="help">${d.changed.length} espèce(s) modifiée(s), ${d.added.length} ajoutée(s), ${d.removed.length} retirée(s) depuis.</p>
      <details${d.changed.length ? ' open' : ''}><summary>Modifiées (${d.changed.length})</summary>${li(d.changed, c => `<li><b>${esc(bName(c.e))}</b> : ${c.f.map(x => `${x === CH ? 'canal' : esc(x)} <del>${esc(show(c.o[x]) || 'vide')}</del> → <ins>${esc(show(c.e[x]) || 'vide')}</ins>`).join(' ; ')}</li>`)}</details>
      <details><summary>Ajoutées depuis (${d.added.length})</summary>${li(d.added, e => `<li>${esc(bName(e))} <i>${esc(show(e['Nom Scientifique']))}</i></li>`)}</details>
      <details><summary>Retirées depuis (${d.removed.length})</summary>${li(d.removed, e => `<li>${esc(bName(e))} <i>${esc(show(e['Nom Scientifique']))}</i></li>`)}</details></div>`;
  }
  async function download(a){
    const f = await getFile(a.path), url = URL.createObjectURL(new Blob([f.text], { type: 'application/json' }));
    const l = document.createElement('a'); l.href = url; l.download = a.name; document.body.appendChild(l); l.click(); l.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  const snapName = () => { const n = new Date(); return `${ARCH}/ouessant_birds_${n.getFullYear()}_sauvegarde_${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}_${pad(n.getHours())}${pad(n.getMinutes())}${pad(n.getSeconds())}.json`; };
  async function snapshot(cur, why){
    const path = snapName();
    try { await putFile(path, cur.b64, `Sauvegarde de la liste des oiseaux ${thisYear()}${why ? ' (' + why + ')' : ''}`); }
    catch (e) { throw e.conflict ? new Error('une sauvegarde vient d’être faite à la même seconde, réessaie') : e; }
    return path;
  }
  async function useArchive(a){
    const msg = $('yearMsg');
    const [arc, cur] = await Promise.all([getFile(a.path), getFile(BIRDS)]);
    if (!Array.isArray(arc.list) || !arc.list.length || !arc.list.every(e => e && 'Nom Scientifique' in e)) throw new Error('cette archive ne ressemble pas à une liste d’oiseaux');
    if (cur && cur.text === arc.text){ msg.className = 'msg good'; msg.textContent = 'La liste en cours est déjà identique à celle-ci : rien à faire.'; return; }
    const d = cur ? diffLists(cur.list, arc.list) : null;
    if (!confirm(`Remplacer la liste ${thisYear()} de l’appli (${cur ? cur.list.length : 0} espèces) par « ${archLabel(a)} » (${arc.list.length} espèces) ?` +
      (d ? `\n\n${d.changed.length} espèce(s) changeront, ${d.added.length} seront ajoutée(s), ${d.removed.length} retirée(s).` : '') +
      '\n\nLa liste actuelle est d’abord sauvegardée dans les archives : tu pourras la reprendre.')) return;
    msg.className = 'msg'; msg.textContent = 'Sauvegarde de la liste actuelle…';
    if (cur) await snapshot(cur, 'avant reprise de « ' + archLabel(a) + ' »');
    msg.textContent = 'Remplacement de la liste…';
    try { await putFile(BIRDS, arc.b64, `Liste des oiseaux ${thisYear()} : reprise de « ${archLabel(a)} »`, cur && cur.sha); }
    catch (e) { if (e.conflict) throw new Error('la liste vient d’être modifiée ailleurs (éditeur ?) : recharge la page et recommence'); throw e; }
    await bumpListsVersion();
    archives = await listArchives(); await renderYears(); $('yearDiff').innerHTML = '';
    msg.className = 'msg good'; msg.textContent = `C’est fait : la liste ${thisYear()} est maintenant « ${archLabel(a)} ». L’appli sera à jour d’ici quelques minutes. Pense à rouvrir l’éditeur (la liste a changé).`;
  }
  $('yearList').addEventListener('click', async e => {
    const b = e.target.closest('button'), li = e.target.closest('li[data-i]'); if (!b || !li) return;
    const a = archives[+li.dataset.i], msg = $('yearMsg');
    document.querySelectorAll('#yearList button, #yearSnap').forEach(x => { x.disabled = true; });
    try {
      if (b.hasAttribute('data-diff')) await showDiff(a);
      else if (b.hasAttribute('data-dl')) await download(a);
      else if (b.hasAttribute('data-use')) await useArchive(a);
    } catch (err) { msg.className = 'msg bad'; msg.textContent = 'Impossible : ' + (err.message || err); }
    document.querySelectorAll('#yearList button, #yearSnap').forEach(x => { x.disabled = false; });
  });
  $('yearSnap').addEventListener('click', async () => {
    const msg = $('yearMsg'), b = $('yearSnap'); b.disabled = true;
    try {
      msg.className = 'msg'; msg.textContent = 'Sauvegarde…';
      const cur = await getFile(BIRDS); if (!cur) throw new Error('liste introuvable');
      await snapshot(cur, 'à la main');
      archives = await listArchives(); await renderYears();
      msg.className = 'msg good'; msg.textContent = 'Liste actuelle sauvegardée dans les archives.';
    } catch (e) { msg.className = 'msg bad'; msg.textContent = 'Sauvegarde impossible : ' + (e.message || e); }
    b.disabled = false;
  });

  // ---------- Réglages pour tout le monde (reglages.json) : verrou des espèces « Verrouillée », champs modifiables par les visiteurs ----------
  let reglagesSha = null;
  const regLabel = r => `statut « Verrouillée » ${r.verrou ? 'pris en compte' : 'ignoré'} · champs modifiables : ${r.champs === 'tous' ? 'tous' : 'le canal seulement'}`;
  const regForm = () => ({ verrou: $('regVerrou').checked, champs: (document.querySelector('input[name="regChamps"]:checked') || {}).value === 'tous' ? 'tous' : 'canal' });
  const regSame = (a, b) => a.verrou === b.verrou && a.champs === b.champs;
  async function loadReg(){
    try {
      const f = await getFile('reglages.json');
      reglagesSha = f ? f.sha : null;
      if (f && f.list && typeof f.list === 'object') regNow = { verrou: f.list.verrou !== false, champs: f.list.champs === 'tous' ? 'tous' : 'canal' };
    } catch (_) {}
    $('regVerrou').checked = regNow.verrou;
    document.querySelectorAll('input[name="regChamps"]').forEach(r => { r.checked = r.value === regNow.champs; });
    $('regSave').disabled = true; $('lockModePanel').classList.remove('hidden');
  }
  $('lockModePanel').addEventListener('change', () => { $('regSave').disabled = regSame(regForm(), regNow); });
  $('regSave').addEventListener('click', async () => {
    const v = regForm(), msg = $('regMsg'); $('regSave').disabled = true; msg.className = 'msg'; msg.textContent = 'Enregistrement…';
    try {
      const j = await putFile('reglages.json', btoa(JSON.stringify(v) + '\n'), `Réglages : ${regLabel(v)}`, reglagesSha);
      reglagesSha = j.content && j.content.sha; regNow = v;
      msg.className = 'msg good'; msg.textContent = `Enregistré (${regLabel(v)}). L’appli et l’éditeur suivront d’ici quelques minutes.`;
      if (lastRows) processRows(lastRows).catch(() => {});   // le tri en cours tient compte des nouveaux réglages
    } catch (e) {
      msg.className = 'msg bad'; msg.textContent = 'Enregistrement impossible : ' + (e.conflict ? 'les réglages ont changé ailleurs, recharge la page.' : (e.message || e)); $('regSave').disabled = false;
    }
  });
})();
