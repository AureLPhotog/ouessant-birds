/* Oiseaux d'Ouessant — menu ☰ des pages annexes (éditeur, historique), le même que celui de l'appli.
   La page où l'on se trouve n'y figure pas. « Météo et canaux » et « Une question, un retour ? » ouvrent l'appli
   (index.html#meteo, index.html#contact) ; partage, affichage et informations légales fonctionnent sur place.
   Textes : js/textes.js (chargé avant), dans la langue choisie sur la page (même réglage que l'appli).
   La page est reconnue par son adresse (editeur.html, historique.html) ; OuessantMenu.refresh() au changement de langue. */
(function(){
  'use strict';
  const PAGE = /editeur/.test(location.pathname) ? 'editeur' : /historique/.test(location.pathname) ? 'historique' : '';
  const I18N = window.OUESSANT_TEXTES; if (!I18N) return;
  const APP_URL = 'https://aurelphotog.github.io/ouessant-birds/';
  const LANG_KEY = 'ouessant-birds-lang', THEME_KEY = 'ouessant-theme', CVD_KEY = 'ouessant-cvd';
  const store = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };
  const lang = () => { const l = store.get(LANG_KEY) || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en'); return I18N[l] ? l : 'fr'; };
  const T = k => I18N[lang()][k];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    app: '<path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="m21 21-4.3-4.3"/>',
    meteo: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
    hist: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ed: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    guide: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    msg: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'
  };

  // ---------- bouton ☰ dans l'en-tête, panneau et voile en fin de page ----------
  const header = document.querySelector('header'); if (!header) return;
  document.documentElement.classList.add('has-menu');
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'menu-btn'; btn.id = 'menuBtn'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'menu');
  btn.setAttribute('data-notr', ''); btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  header.prepend(btn);
  const scrim = document.createElement('div'); scrim.className = 'menu-scrim'; scrim.hidden = true;
  const menu = document.createElement('aside'); menu.className = 'menu'; menu.id = 'menu'; menu.hidden = true; menu.setAttribute('aria-labelledby', 'menuTitle');
  menu.setAttribute('data-notr', '');   // l'éditeur traduit ses textes à la volée : le menu, lui, est déjà dans la bonne langue
  document.body.append(scrim, menu);
  let legalOpen = false;

  function render(){
    const theme = store.get(THEME_KEY) || 'auto', cvd = store.get(CVD_KEY) === '1';
    const link = (href, ic, label, ext) => `<li><a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${ico(ICON[ic])}<span>${esc(label)}</span></a></li>`;
    const seg = (pref, items, cur) => `<div class="seg" role="group" data-pref="${pref}">${items.map(([v, k]) => `<button type="button" data-v="${v}" aria-pressed="${v === cur}">${esc(T(k))}</button>`).join('')}</div>`;
    menu.innerHTML = `<div class="menu-top"><img src="phare_creach.svg" alt="" width="22" height="51"><b id="menuTitle">${esc(T('title'))}</b>
        <button type="button" class="menu-x" data-close aria-label="${esc(T('menuClose'))}" title="${esc(T('menuClose'))}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <ul class="menu-links">${link('index.html', 'app', T('menuApp'))}${link('index.html#meteo', 'meteo', T('menuPhare'))}</ul>
      <ul class="menu-links">
        ${PAGE !== 'historique' ? link('historique.html', 'hist', T('histLink')) : ''}
        ${PAGE !== 'editeur' ? link('editeur.html', 'ed', T('editorLinkT')) : ''}
        ${link('docs/Guide_utilisation.pdf', 'guide', T('guideLink'), true)}
        ${link('index.html#contact', 'msg', T('contactLink'))}
      </ul>
      <div class="menu-sec menu-share"><h2>${esc(T('shTitle'))}</h2><div class="menu-qr"><img src="qr_ouessant.svg" alt="QR code : ${esc(APP_URL)}" width="116" height="116">
        <div><p>${esc(T('shText'))}</p><div class="btns">${navigator.share ? `<button type="button" class="main" data-share>${esc(T('shBtn'))}</button>` : ''}<button type="button" data-copy>${esc(T('shCopy'))}</button></div></div></div></div>
      <div class="menu-sec"><h2>${esc(T('prefsLabel'))}</h2>
        <p class="prefs-t">${esc(T('themeLabel'))}</p>${seg('theme', [['auto', 'tAuto'], ['light', 'tLight'], ['dark', 'tDark']], theme)}
        <p class="prefs-t">${esc(T('colorsLabel'))}</p>${seg('cvd', [['0', 'cStd'], ['1', 'cCvd']], cvd ? '1' : '0')}
        <p class="prefs-n">${esc(T('cvdNote'))}</p></div>
      <p class="menu-foot"><button type="button" class="link" data-legal aria-expanded="${legalOpen}" aria-controls="menuLegalBox">${esc(T('legalBtn'))}</button><span>v${esc(window.OUESSANT_APP_VERSION || '')}</span></p>
      <div class="legal menu-legal" id="menuLegalBox"${legalOpen ? '' : ' hidden'}>${legalOpen ? T('legalHtml') : ''}</div>`;
    btn.setAttribute('aria-label', T('menuLabel')); btn.title = T('menuLabel');
  }
  function applyPrefs(){
    const r = document.documentElement, theme = store.get(THEME_KEY) || 'auto';
    if (theme === 'light' || theme === 'dark') r.setAttribute('data-theme', theme); else r.removeAttribute('data-theme');
    if (store.get(CVD_KEY) === '1') r.setAttribute('data-cvd', '1'); else r.removeAttribute('data-cvd');
  }
  function open(o, focus = true){
    menu.hidden = !o; scrim.hidden = !o; btn.setAttribute('aria-expanded', String(o));
    document.documentElement.classList.toggle('menu-open', o);
    if (o){ render(); menu.querySelector('[data-close]').focus(); }
    else { legalOpen = false; if (focus) btn.focus(); }
  }
  btn.addEventListener('click', e => { e.stopPropagation(); open(menu.hidden); });
  scrim.addEventListener('click', () => open(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) open(false); });
  menu.addEventListener('click', e => {
    e.stopPropagation();
    if (e.target.closest('[data-close]')){ open(false); return; }
    if (e.target.closest('[data-legal]')){ legalOpen = !legalOpen; render(); if (legalOpen) document.getElementById('menuLegalBox').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    const s = e.target.closest('.seg button');
    if (s){ const pref = s.parentElement.dataset.pref; store.set(pref === 'theme' ? THEME_KEY : CVD_KEY, s.dataset.v); applyPrefs(); render(); return; }
    if (e.target.closest('[data-share]')){ navigator.share({ title: T('title'), url: APP_URL }).catch(() => {}); return; }
    const c = e.target.closest('[data-copy]');
    if (c){
      const done = () => { c.textContent = T('shCopied'); setTimeout(() => { c.textContent = T('shCopy'); }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(APP_URL).then(done, () => {}); return;
    }
    if (e.target.closest('#menuLegalBox')) return;   // liens des informations légales : nouvel onglet, le menu reste ouvert
    if (e.target.closest('a')) open(false, false);
  });
  render();
  window.OuessantMenu = { refresh(){ render(); }, open };
})();
