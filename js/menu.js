/* Oiseaux d'Ouessant — le menu ☰, le même sur toutes les pages (appli, éditeur, historique).
   La page où l'on se trouve n'y figure pas. Le reste est identique partout : météo et canaux, historique, éditeur, guide,
   « Une question, un retour ? » (qui se déplie dans le menu), partage, affichage, informations légales et version.
   « Météo et canaux » ouvre le panneau du phare : sur place dans l'appli, ailleurs en revenant à l'appli (index.html#meteo).
   Textes : js/textes.js (chargé avant). La page donne sa langue avec OuessantMenu.refresh(lang).
   L'appli s'y branche avec OuessantMenu.onOpen (avant l'ouverture), onPhare (« Météo et canaux ») et listDate (dates des listes) ;
   un changement d'affichage (thème, couleurs) envoie l'événement « ouessant-prefs ». */
(function(){
  'use strict';
  const PAGE = /editeur/.test(location.pathname) ? 'editeur' : /historique/.test(location.pathname) ? 'historique' : 'app';
  const I18N = window.OUESSANT_TEXTES; if (!I18N) return;
  const APP_URL = 'https://aurelphotog.github.io/ouessant-birds/';
  const FILE = location.protocol === 'file:', BASE = FILE ? APP_URL : '';   // éditeur enregistré et ouvert seul : liens vers le site
  const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSfO5eaqQZ_NS10ChZhazXZLLach0Bm0aQYUt9yZQsi-Qdh3LA/viewform', COMMENT = 'entry.253715776';
  const LANG_KEY = 'ouessant-birds-lang', THEME_KEY = 'ouessant-theme', CVD_KEY = 'ouessant-cvd';
  const APP_VERSION = window.OUESSANT_APP_VERSION || '?';
  const store = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };
  let curLang = null;
  const lang = () => { const l = curLang || store.get(LANG_KEY) || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en'); return I18N[l] ? l : 'fr'; };
  const T = k => I18N[lang()][k];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const ico = (d, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    app: '<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="m21 21-4.3-4.3"/>',
    meteo: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
    hist: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ed: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    guide: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    msg: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'
  };
  const ORIOLE = `<span class="oriole" aria-hidden="true"><img class="o-sh" src="${BASE}oriole_baltimore.webp" alt="" width="47" height="69"><img class="o-bd" src="${BASE}oriole_baltimore.webp" alt="" width="47" height="69"></span>`;
  const FERN = '<span class="fern" aria-hidden="true">🌿</span>';

  // ---------- bouton ☰ en tête de l'en-tête, panneau et voile en fin de page ----------
  const header = document.querySelector('header'); if (!header) return;
  if (PAGE !== 'app') document.documentElement.classList.add('has-menu');   // éditeur, historique : rangée du haut comme l'appli
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'menu-btn'; btn.id = 'menuBtn'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'menu');
  btn.setAttribute('data-notr', ''); btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  header.prepend(btn);
  const scrim = document.createElement('div'); scrim.className = 'menu-scrim'; scrim.id = 'menuScrim'; scrim.hidden = true;
  const menu = document.createElement('aside'); menu.className = 'menu'; menu.id = 'menu'; menu.hidden = true; menu.setAttribute('aria-labelledby', 'menuTitle');
  menu.setAttribute('data-notr', '');   // l'éditeur traduit ses textes à la volée : le menu, lui, est déjà dans la bonne langue
  const link = (href, ic, key, ext) => `<li><a href="${BASE}${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${ico(ICON[ic])}<span data-m="${key}"></span></a></li>`;
  const seg = (pref, items) => `<div class="seg" role="group" data-pref="${pref}">${items.map(([v, k]) => `<button type="button" data-v="${v}" data-m="${k}"></button>`).join('')}</div>`;
  menu.innerHTML = `<div class="menu-top"><img src="${BASE}phare_creach.svg" alt="" width="22" height="51"><b id="menuTitle" data-m="title"></b>
      <button type="button" class="menu-x" id="menuClose"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <ul class="menu-links">
      ${PAGE !== 'app' ? link('index.html', 'app', 'menuApp') : ''}
      <li><button type="button" id="menuPhare">${ico(ICON.meteo, 20)}<span data-m="menuPhare"></span></button></li>
    </ul>
    <ul class="menu-links">
      ${PAGE !== 'historique' ? link('historique.html', 'hist', 'histLink') : ''}
      ${PAGE !== 'editeur' ? link('editeur.html', 'ed', 'editorLinkT') : ''}
      ${link('docs/Guide_utilisation.pdf', 'guide', 'guideLink', true)}
      <li><button type="button" id="contactBtn" aria-expanded="false" aria-controls="contactPanel">${ico(ICON.msg)}<span data-m="contactLink"></span></button>
        <div id="contactPanel" class="contact menu-contact" hidden>
          <label for="contactMsg" data-m="contactLabel"></label>
          <textarea id="contactMsg" rows="4" maxlength="1500"></textarea>
          <button type="button" id="contactSend" class="sbtn" data-m="contactSend"></button>
          <p class="contact-help" data-m="contactHelp"></p>
        </div>
      </li>
    </ul>
    <div class="menu-sec menu-share" id="menuShare"></div>
    <div class="menu-sec" id="prefsPanel"><h2 data-m="prefsLabel"></h2>
      <p class="prefs-t" data-m="themeLabel"></p>${seg('theme', [['auto', 'tAuto'], ['light', 'tLight'], ['dark', 'tDark']])}
      <p class="prefs-t" data-m="colorsLabel"></p>${seg('cvd', [['0', 'cStd'], ['1', 'cCvd']])}
      <p class="prefs-n" data-m="cvdNote"></p></div>
    <p class="menu-foot"><button type="button" class="link" id="menuLegal" data-m="legalBtn" aria-expanded="false" aria-controls="menuLegalBox"></button><span id="menuVer"></span></p>
    <div class="legal menu-legal" id="menuLegalBox" hidden></div>`;
  document.body.append(scrim, menu);
  const API = window.OuessantMenu = { onOpen: null, onPhare: null };

  // ---------- version : appli, révision des listes (version_listes.json) et date des listes ----------
  let listsRev = null, infoAsked = false;
  const listsDate = { birds: null, places: null };
  function versionText(){
    const fmt = h => { const d = h ? new Date(h) : null; return d && !isNaN(d) ? d.toLocaleDateString(lang() === 'fr' ? 'fr-FR' : 'en-GB') : null; };
    const b = fmt(listsDate.birds), p = fmt(listsDate.places);
    const dates = b && p && b !== p ? T('listsOfBoth')(b, p) : (b || p) ? T('listsOf')(b || p) : '';
    const rev = listsRev && listsRev.app === APP_VERSION && listsRev.rev > 0 ? '.' + listsRev.rev : '';   // autre version d'appli : on repart de zéro
    return 'v' + APP_VERSION + rev + (dates ? ' · ' + dates : '');
  }
  const showVer = () => { if (!menu.hidden) $('menuVer').textContent = versionText(); };
  function loadInfo(){   // à la première ouverture (l'appli donne elle-même la date des listes qu'elle vient de charger)
    if (infoAsked || FILE) return; infoAsked = true;
    fetch('version_listes.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(v => { if (v && typeof v.rev === 'number'){ listsRev = v; showVer(); } }).catch(() => {});
    if (PAGE !== 'app') [['birds', 'ouessant_birds.json'], ['places', 'lieux_ouessant.json']].forEach(([k, f]) =>
      fetch(f, { method: 'HEAD', cache: 'no-cache' }).then(r => { if (r.ok && !listsDate[k]){ listsDate[k] = r.headers.get('last-modified'); showVer(); } }).catch(() => {}));
  }
  API.listDate = (k, h) => { listsDate[k] = h; showVer(); };

  // ---------- textes, partage, affichage ----------
  function renderShare(){
    $('menuShare').innerHTML = `<h2>${esc(T('shTitle'))}</h2><div class="qr">
        <div class="qr-box">${ORIOLE}${FERN}<img src="${BASE}qr_ouessant.svg" alt="QR code : ${esc(APP_URL)}" width="116" height="116" style="display:block;width:100%;height:100%"></div>
        <div class="qr-txt">${esc(T('shText'))}<div class="btns">${navigator.share ? `<button type="button" class="main" data-sh="share">${esc(T('shBtn'))}</button>` : ''}<button type="button" data-sh="copy">${esc(T('shCopy'))}</button></div></div>
      </div>`;
  }
  function prefsState(){
    const theme = store.get(THEME_KEY) || 'auto', cvd = store.get(CVD_KEY) === '1' ? '1' : '0';
    menu.querySelectorAll('.seg[data-pref="theme"] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === theme)));
    menu.querySelectorAll('.seg[data-pref="cvd"] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === cvd)));
  }
  function texts(){
    menu.querySelectorAll('[data-m]').forEach(el => { el.textContent = T(el.dataset.m); });
    btn.setAttribute('aria-label', T('menuLabel')); btn.title = T('menuLabel');
    $('menuClose').setAttribute('aria-label', T('menuClose')); $('menuClose').title = T('menuClose');
    prefsState();
    if (!$('menuLegalBox').hidden) $('menuLegalBox').innerHTML = T('legalHtml');
    if (!menu.hidden){ renderShare(); showVer(); }
  }
  function applyPrefs(){
    const r = document.documentElement, theme = store.get(THEME_KEY) || 'auto';
    if (theme === 'light' || theme === 'dark') r.setAttribute('data-theme', theme); else r.removeAttribute('data-theme');
    if (store.get(CVD_KEY) === '1') r.setAttribute('data-cvd', '1'); else r.removeAttribute('data-cvd');
  }
  function copy(txt, done){
    const old = () => { const t = document.createElement('textarea'); t.value = txt; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { if (document.execCommand('copy')) done(); } catch (_) {} t.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, old); else old();
  }

  // ---------- ouverture, informations légales ----------
  function legal(o){
    const box = $('menuLegalBox');
    box.hidden = !o; $('menuLegal').setAttribute('aria-expanded', String(o));
    if (o){ box.innerHTML = T('legalHtml'); box.scrollIntoView({ block: 'start', behavior: 'smooth' }); } else box.innerHTML = '';
  }
  function open(o, focus = true){
    if (o && API.onOpen) API.onOpen();
    menu.hidden = !o; scrim.hidden = !o; btn.setAttribute('aria-expanded', String(o));
    document.documentElement.classList.toggle('menu-open', o);
    if (o){ loadInfo(); renderShare(); showVer(); $('menuClose').focus(); }
    else { legal(false); $('contactPanel').hidden = true; $('contactBtn').setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); }   // le message tapé est gardé
  }
  btn.addEventListener('click', e => { e.stopPropagation(); open(menu.hidden); });
  $('menuClose').addEventListener('click', () => open(false));
  scrim.addEventListener('click', () => open(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) open(false); });
  menu.addEventListener('click', e => {
    e.stopPropagation();   // un toucher dans le menu ne ferme rien d'autre
    if (e.target.closest('#menuPhare')){
      if (API.onPhare){ open(false, false); API.onPhare(); } else location.href = BASE + 'index.html#meteo';
      return;
    }
    if (e.target.closest('#menuLegal')){ legal($('menuLegalBox').hidden); return; }
    if (e.target.closest('#menuLegalBox')) return;   // liens des informations légales : nouvel onglet, le menu reste ouvert
    const s = e.target.closest('.seg button');
    if (s){
      const pref = s.parentElement.dataset.pref; store.set(pref === 'theme' ? THEME_KEY : CVD_KEY, s.dataset.v);
      applyPrefs(); prefsState(); window.dispatchEvent(new CustomEvent('ouessant-prefs')); return;
    }
    const sh = e.target.closest('#menuShare [data-sh]');
    if (sh){
      if (sh.dataset.sh === 'share') navigator.share({ title: T('title'), text: T('lede').replace(/<[^>]+>/g, ''), url: APP_URL }).catch(() => {});
      else copy(APP_URL, () => { sh.textContent = T('shCopied'); setTimeout(() => { sh.textContent = T('shCopy'); }, 1600); });
      return;
    }
    if (e.target.closest('#contactBtn, #contactPanel')) return;   // « Une question, un retour ? » : son propre gestionnaire
    if (e.target.closest('a')) open(false, false);
  });

  // ---------- « Une question, un retour ? » : se déplie dans le menu ----------
  // Le message part par le même formulaire Google que les propositions, dans le seul champ « commentaire » (aucune ligne JSON) :
  // la page Administration les range dans l'onglet « Messages ».
  const cBtn = $('contactBtn'), panel = $('contactPanel'), msg = $('contactMsg');
  function contact(tpl){   // ouverture directe : depuis le phare (« Proposer une nouvelle règle », message pré-rempli) ou une autre page
    open(true, false);
    panel.hidden = false; cBtn.setAttribute('aria-expanded', 'true');
    if (tpl && (!msg.value.trim() || msg.value === msg.dataset.tpl)){ msg.value = tpl; msg.dataset.tpl = tpl; }
    panel.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (tpl) setTimeout(() => { const i = msg.value.indexOf('\n') + 1, j = msg.value.indexOf('\n', i); msg.focus({ preventScroll: true }); try { msg.setSelectionRange(j > 0 ? j : msg.value.length, j > 0 ? j : msg.value.length); } catch (_) {} }, 450);   // curseur après « Telegram : »
  }
  window.addEventListener('ouessant-contact', e => contact(String(e.detail || '')));
  // à l'ouverture : on montre la zone, sans ouvrir le clavier (il s'ouvre quand on touche le champ)
  cBtn.addEventListener('click', () => { const o = panel.hidden; panel.hidden = !o; cBtn.setAttribute('aria-expanded', String(o)); if (o) panel.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  // clavier ouvert : le champ doit rester visible au-dessus. Si le clavier recouvre la page sans la réduire,
  // on ajoute en bas la place qu'il occupe, pour pouvoir y faire défiler le champ.
  const vv = window.visualViewport;
  const reveal = () => {
    if (document.activeElement !== msg) return;
    const kb = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0;
    menu.style.paddingBottom = kb ? `calc(1.5rem + ${kb}px)` : '';   // le menu défile seul
    msg.scrollIntoView({ block: 'center' });
  };
  msg.addEventListener('focus', () => { setTimeout(reveal, 350); if (vv) vv.addEventListener('resize', reveal); });
  msg.addEventListener('blur', () => { if (vv) vv.removeEventListener('resize', reveal); menu.style.paddingBottom = ''; });
  $('contactSend').addEventListener('click', () => {
    const text = msg.value.trim(); if (!text){ msg.focus(); msg.placeholder = T('contactEmpty'); return; }
    const q = new URLSearchParams({ usp: 'pp_url' }); q.set(COMMENT, text.slice(0, 1500));
    window.open(FORM + '?' + q.toString(), '_blank', 'noopener');
  });

  API.open = open; API.contact = contact; API.isOpen = () => !menu.hidden;
  API.refresh = l => { if (l) curLang = l; texts(); };
  texts();
})();
