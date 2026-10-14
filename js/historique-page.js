/* Oiseaux d'Ouessant — page historique.html : les changements des listes (historique.json), jour par jour.
   Pour une même entrée et un même champ, plusieurs changements dans la journée ne montrent que l'état du début et celui de la fin. */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const store = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };
  const I18N = window.OUESSANT_TEXTES, H = window.OuessantHistorique;
  const LANG_KEY = 'ouessant-birds-lang';   // même réglage que l'appli et l'éditeur
  let lang = store.get(LANG_KEY) || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  if (!I18N[lang]) lang = 'fr';
  const T = () => I18N[lang].hist;
  (function(){   // même thème que l'appli
    const t = store.get('ouessant-theme'), r = document.documentElement;
    if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t);
    if (store.get('ouessant-cvd') === '1') r.setAttribute('data-cvd', '1');
  })();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = H.norm, same = H.same;
  const CANAL = 'Proposition de Canal de Diffusion Ouessant';

  let entries = [], filter = '', query = '', failed = false;
  let view = location.hash === '#versions' ? 'versions' : 'listes', versions = null, versFailed = false;   // onglet : listes ou versions de l'appli

  // ---------- valeurs lisibles ----------
  function canalLabel(v){
    const n = norm(v), ch = I18N[lang].channels;
    return n.startsWith('tele') ? ch.telegram : n.startsWith('whats') ? ch.whatsapp : n.startsWith('pas') ? ch.none : v;
  }
  function val(k, v){
    if (v === null || v === undefined || v === '') return T().none;
    if (typeof v === 'boolean') return v ? T().yes : T().no;
    if (Array.isArray(v)) return v.join(', ') || T().none;
    if (k === CANAL) return canalLabel(v);
    if (k === 'Raison du canal' || k === 'Origine') return I18N[lang].reasons[v] || v;
    return String(v);
  }
  const fieldName = k => T().fields[k] || k;

  // ---------- regroupement par jour (heure locale) ----------
  const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function byDay(){
    const days = new Map();
    entries.forEach(e => {
      const d = new Date(e.date); if (isNaN(d)) return;
      const k = dayKey(d); if (!days.has(k)) days.set(k, { key: k, date: d, list: [] });
      days.get(k).list.push(e);
    });
    return [...days.values()].sort((a, b) => b.key.localeCompare(a.key)).map(day => {
      day.list.sort((a, b) => a.date.localeCompare(b.date));
      const apps = [...new Set(day.list.map(e => e.app).filter(Boolean))], lists = day.list.map(e => e.listes).filter(Boolean);
      // une entrée (espèce ou lieu-dit) : état au début de la journée → état à la fin, champ par champ
      const items = new Map(), bulks = [];
      day.list.forEach(e => {
        if (e.resume){ if (Object.keys(e.resume.champs || {}).some(f => f !== 'Verrouillée')) bulks.push(e); return; }
        (e.changements || []).forEach(c => {
          const k = e.fichier + '|' + norm(c.cle);
          if (!items.has(k)) items.set(k, { fichier: e.fichier, nom: c.nom, cle: c.cle, start: c.t !== 'add', end: true, before: {}, after: {} });
          const it = items.get(k); it.nom = c.nom || it.nom; it.cle = c.cle; it.end = c.t !== 'del';
          c.champs.filter(([f]) => f !== 'Verrouillée').forEach(([f, a, b]) => { if (!(f in it.before)) it.before[f] = a; it.after[f] = b; });
        });
      });
      const changes = [...items.values()].map(it => {
        if (!it.start && !it.end) return null;   // ajoutée puis retirée le même jour
        const t = !it.start ? 'add' : !it.end ? 'del' : 'mod';
        const fields = Object.keys(it.after).filter(f => t !== 'mod' || !same(it.before[f], it.after[f]))
          .filter(f => t !== 'add' || it.after[f] !== null).filter(f => t !== 'del' || it.before[f] !== null)
          .filter(f => t !== 'add' || (f !== H.NOM[it.fichier] && f !== H.CLE[it.fichier]));   // un ajout : les noms sont déjà dans le titre
        if (t === 'mod' && !fields.length) return null;   // revenue à son état du matin
        return Object.assign(it, { t, fields });
      }).filter(Boolean).sort((a, b) => String(a.nom).localeCompare(String(b.nom), lang));
      return { key: day.key, date: day.date, apps, lists: lists.length ? lists[lists.length - 1] : null, changes, bulks };
    }).filter(d => d.changes.length || d.bulks.length);
  }

  // ---------- affichage ----------
  function changeHtml(c){
    const kind = c.t === 'add' ? T().add : c.t === 'del' ? T().del : T().mod;
    const sub = c.fichier === 'ouessant_birds.json' && c.cle && c.cle !== c.nom ? ` <i lang="la">${esc(c.cle)}</i>` : '';
    const rows = c.t === 'del' ? '' : c.fields.map(f => `<li><span class="f">${esc(fieldName(f))}</span> : ${c.t === 'add' ? '' : `<del>${esc(val(f, c.before[f]))}</del> → `}<ins>${esc(val(f, c.after[f]))}</ins></li>`).join('');
    return `<li class="hc is-${c.t}"><p class="hc-h"><b>${esc(c.nom || c.cle)}</b>${sub} <span class="badge">${esc(kind)}</span></p>${rows ? `<ul>${rows}</ul>` : ''}</li>`;
  }
  function bulkHtml(e){
    const r = e.resume, n = r.mod + r.add + r.del, what = e.fichier === 'ouessant_birds.json' ? T().bulkBirds : T().bulkPlaces;
    const fields = Object.entries(r.champs).filter(([f]) => f !== 'Verrouillée').sort((a, b) => b[1] - a[1]).map(([f, x]) => `${fieldName(f)} (${x})`).join(', ');
    return `<li class="hc is-bulk"><p class="hc-h">${esc(T().bulk(n, what, fields))}</p></li>`;
  }
  // onglet « Versions de l'appli » : versions_appli.json (modifications majeures, en français et en anglais)
  function renderVersions(){
    const out = $('histList');
    if (versFailed){ out.innerHTML = `<p class="help">${esc(T().error)}</p>`; return; }
    if (!versions){ out.innerHTML = ''; return; }
    const loc = lang === 'en' ? 'en-GB' : 'fr-FR';
    out.innerHTML = `<p class="hist-note">${esc(T().versNote)}</p>` + versions.map(v => {
      const d = new Date(v.date + 'T12:00:00'), items = (v[lang] || v.fr || []);
      return `<section class="hday hver"><h2>v${esc(v.version)}</h2><p class="hmeta"><time datetime="${esc(v.date)}">${esc(isNaN(d) ? v.date : d.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }))}</time></p>
        <ul class="hlist">${items.map(t => `<li class="hc is-ver">${esc(t)}</li>`).join('')}</ul></section>`;
    }).join('');
  }
  function render(){
    const out = $('histList');
    document.querySelectorAll('.hist-views [data-view]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === view)));
    document.querySelector('.hist-bar').hidden = view !== 'listes'; document.querySelector('.hist-note').hidden = view !== 'listes';
    if (view === 'versions'){ renderVersions(); return; }
    if (failed){ out.innerHTML = `<p class="help">${esc(T().error)}</p>`; return; }
    const q = norm(query);
    const days = byDay().map(d => {
      const changes = d.changes.filter(c => (!filter || c.fichier === filter) && (!q || norm(c.nom).includes(q) || norm(c.cle).includes(q)));
      const bulks = q ? [] : d.bulks.filter(e => !filter || e.fichier === filter);
      return Object.assign({}, d, { changes, bulks });
    }).filter(d => d.changes.length || d.bulks.length);
    if (!days.length){ out.innerHTML = `<p class="help">${esc(T().empty)}</p>`; return; }
    const loc = lang === 'en' ? 'en-GB' : 'fr-FR';
    out.innerHTML = days.map(d => {
      const ver = [d.apps.length ? T().app(d.apps.length > 1 ? `${d.apps[0]} → ${d.apps[d.apps.length - 1]}` : d.apps[0]) : '', d.lists ? T().lists(d.lists) : ''].filter(Boolean).join(' · ');
      const n = d.changes.length + d.bulks.length;
      return `<section class="hday"><h2><time datetime="${d.key}">${esc(d.date.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</time></h2>
        <p class="hmeta">${esc(T().count(n))}${ver ? ' · ' + esc(ver) : ''}</p>
        <ul class="hlist">${d.bulks.map(bulkHtml).join('')}${d.changes.map(changeHtml).join('')}</ul></section>`;
    }).join('');
  }
  function applyLang(){
    document.documentElement.lang = lang;
    document.title = `${T().title} · ${lang === 'en' ? 'Birds of Ouessant' : 'Oiseaux d’Ouessant'}`;
    document.querySelectorAll('[data-t]').forEach(el => { const v = T()[el.dataset.t]; if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('[data-t-ph]').forEach(el => { const v = T()[el.dataset.tPh]; el.placeholder = v; el.setAttribute('aria-label', v); });
    document.querySelectorAll('[data-t-title]').forEach(el => { const v = T()[el.dataset.tTitle]; el.title = v; el.setAttribute('aria-label', v); });
    document.querySelectorAll('.hist-lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    if (window.OuessantMenu) window.OuessantMenu.refresh(lang);
    render();
  }
  document.querySelector('.hist-lang').addEventListener('click', e => {
    const b = e.target.closest('button[data-lang]'); if (!b) return;
    lang = b.dataset.lang; store.set(LANG_KEY, lang); applyLang();
  });
  document.querySelector('.hist-tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    filter = b.dataset.f; document.querySelectorAll('.hist-tabs button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); render();
  });
  $('histQ').addEventListener('input', e => { query = e.target.value; render(); });
  document.querySelector('.hist-views').addEventListener('click', e => {
    const b = e.target.closest('[data-view]'); if (!b) return;
    view = b.dataset.view; history.replaceState(null, '', view === 'versions' ? '#versions' : location.pathname + location.search); render();
    if (view === 'versions') loadVersions();
  });
  function loadVersions(){
    if (versions || versFailed) return;
    fetch('versions_appli.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject())
      .then(list => { versions = Array.isArray(list) ? list : []; render(); }).catch(() => { versFailed = true; render(); });
  }
  if (view === 'versions') loadVersions();

  applyLang();
  fetch(H.FILE, { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject())
    .then(list => { entries = Array.isArray(list) ? list.filter(e => e && e.date && e.fichier) : []; render(); })
    .catch(() => { failed = true; render(); });
})();
