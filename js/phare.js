/* Oiseaux d'Ouessant — le phare de l'en-tête, le même sur toutes les pages (appli, éditeur, historique) : celui de l'appli.
   Le toucher ouvre son panneau : météo d'Ouessant (Open-Meteo) et « Quel canal ? » (avec « Proposer une nouvelle règle »,
   qui ouvre le formulaire du menu ☰). Pastille de vent à son pied ; hors connexion, il s'éteint ; cinq touchers rapides font passer un oiseau.
   Textes : js/textes.js (chargé avant). Styles : css/phare.css. Le bouton lui-même est écrit dans chaque page (pour être là dès l'affichage).
   La page donne sa langue avec OuessantPhare.refresh(lang). L'appli s'y branche avec onClick (bulle de première visite)
   et eggBird (l'oiseau de l'œuf de Pâques, pris dans la liste qu'elle a chargée) ; ailleurs, la liste est lue au besoin. */
(function(){
  'use strict';
  const PAGE = /editeur/.test(location.pathname) ? 'editeur' : /historique/.test(location.pathname) ? 'historique' : 'app';
  const I18N = window.OUESSANT_TEXTES; if (!I18N) return;
  const BASE = location.protocol === 'file:' ? 'https://aurelphotog.github.io/ouessant-birds/' : '';   // éditeur enregistré et ouvert seul
  const LANG_KEY = 'ouessant-birds-lang', CVD_KEY = 'ouessant-cvd';
  const store = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } } };
  let curLang = null;
  const lang = () => { const l = curLang || store.get(LANG_KEY) || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en'); return I18N[l] ? l : 'fr'; };
  const T = k => I18N[lang()][k];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  // Couleurs des canaux : WhatsApp en vert, Telegram en bleu, pas d'annonce en gris ; palette adaptée au daltonisme
  // (couleurs d'Okabe & Ito, distinguables par la plupart des daltoniens). L'appli s'en sert aussi (OuessantPhare.PALETTES).
  const PALETTES = {
    std: { telegram: '#2A9FD8', whatsapp: '#25A244', none: '#8A949A', sq: '214,40,40', verified: '#D62828', proposed: '#1F7A5A', user: '#2B7BE4', num: '#1F3A4D' },
    cvd: { telegram: '#0072B2', whatsapp: '#E69F00', none: '#8A949A', sq: '0,114,178', verified: '#D55E00', proposed: '#009E73', user: '#CC79A7', num: '#000000' }
  };
  const isDark = () => { const t = document.documentElement.getAttribute('data-theme'); return t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches); };
  const PAL = () => { const cvd = store.get(CVD_KEY) === '1'; return (cvd && isDark()) ? Object.assign({}, PALETTES.cvd, { telegram: '#56B4E9' }) : PALETTES[cvd ? 'cvd' : 'std']; };   // en sombre, le bleu foncé d'Okabe & Ito ressort mal
  const CHANNEL_COLORS = new Proxy({}, { get: (_, k) => PAL()[k] });
  const API = window.OuessantPhare = { PALETTES, onClick: null, eggBird: null };

  // ---------- le phare est écrit dans chaque page, juste après le bouton ☰, pour être là dès l'affichage ----------
  if (!$('phareBtn')) return;

  // Silhouette de l'île (tracée depuis la carte), affichée en fond de la boussole du vent
  const ILE = '<svg class="ile" viewBox="0 0 100 67.6" aria-hidden="true"><path d="M62.5 0.0L64.0 0.2L62.7 2.0L64.5 3.4L67.4 2.7L68.1 3.4L68.9 3.2L69.9 4.7L71.1 4.7L71.3 5.4L70.3 6.6L73.3 8.1L73.5 10.3L74.8 11.8L79.9 9.1L81.6 9.1L83.3 10.8L83.3 12.7L77.0 17.9L77.7 19.1L78.7 19.4L81.1 18.6L81.1 19.9L81.9 20.3L81.1 20.8L80.4 19.9L80.1 21.6L79.2 20.8L78.2 21.1L76.2 23.0L76.7 24.0L78.9 24.3L79.7 27.0L82.4 25.5L82.8 24.5L83.8 24.5L85.0 26.2L83.6 28.2L85.0 28.7L85.5 30.4L89.0 26.5L92.2 27.0L92.9 26.2L93.9 27.7L95.8 27.7L97.3 28.7L98.3 27.7L100.0 28.2L99.5 28.7L100.0 29.4L98.0 30.1L97.3 32.8L96.1 33.6L96.1 35.0L95.3 35.8L93.1 35.5L92.2 37.0L89.7 37.0L88.2 35.5L84.3 35.0L81.9 39.0L80.1 39.2L78.9 40.4L79.2 42.2L78.4 43.4L76.5 43.4L75.7 44.1L75.5 45.1L76.2 46.1L75.7 47.3L76.7 48.0L76.2 49.3L75.2 47.5L73.3 48.0L72.5 49.0L71.8 48.8L71.3 46.6L69.9 46.8L68.9 48.5L68.1 48.5L66.2 44.6L65.0 45.8L63.2 45.6L62.3 46.6L62.5 47.8L60.8 48.0L59.3 49.8L57.8 49.0L57.6 47.1L56.1 46.1L55.1 48.3L53.2 49.8L53.2 51.7L52.2 52.2L52.2 52.9L51.5 53.4L50.7 52.2L49.8 52.9L49.0 55.4L49.8 56.9L48.5 57.8L48.8 59.1L47.8 60.5L49.0 61.5L48.0 64.2L47.3 64.0L47.5 62.7L46.3 60.8L42.9 61.5L43.1 60.3L42.2 59.6L41.9 60.8L39.5 62.7L38.2 62.0L37.7 63.2L36.8 63.5L35.5 66.4L34.6 66.7L33.3 65.4L31.9 66.7L31.1 65.9L28.9 65.9L27.2 67.6L26.0 66.2L24.5 65.9L23.3 67.4L24.0 66.2L23.3 65.4L23.5 64.0L21.3 63.7L21.3 63.2L22.5 62.3L23.8 62.5L24.5 61.3L26.0 63.2L28.7 62.7L29.7 61.8L29.9 59.8L29.2 58.8L27.5 59.1L27.2 57.6L27.9 58.1L32.1 54.9L35.3 55.1L37.3 53.7L38.0 54.4L38.7 54.2L40.0 50.5L42.9 50.0L45.1 47.5L43.6 44.1L41.7 43.1L41.4 41.7L39.7 42.6L39.0 41.2L39.2 39.2L38.5 38.5L32.6 40.2L31.1 41.4L26.0 42.4L25.0 43.9L24.0 43.4L21.8 45.6L19.4 43.9L18.6 45.3L17.2 46.1L16.4 44.6L15.7 45.8L15.9 47.1L14.7 47.5L13.7 47.1L13.2 48.0L11.5 47.8L11.0 48.5L9.8 48.3L9.1 49.3L9.3 50.5L7.8 49.3L6.1 49.5L4.7 47.3L3.4 48.0L2.5 50.0L1.0 50.0L0.2 49.3L0.0 48.0L1.2 47.1L0.7 44.6L3.2 44.9L4.2 43.6L3.4 40.7L4.9 41.4L7.4 39.2L7.1 38.0L7.8 37.3L6.9 36.8L7.4 35.8L6.1 35.5L6.6 33.8L8.6 34.3L9.6 33.1L10.8 32.8L13.0 33.3L14.0 31.9L13.5 30.6L15.0 31.6L16.2 30.1L17.6 29.9L18.6 30.6L19.4 29.9L18.9 28.9L20.6 29.2L21.3 27.2L23.8 27.0L24.3 26.2L26.7 27.0L27.7 25.7L28.9 26.2L31.9 25.0L30.1 22.8L29.2 22.5L29.2 21.6L30.4 21.1L31.4 19.4L30.4 18.4L29.4 19.1L28.2 18.9L28.9 17.4L30.1 17.2L30.1 16.4L37.0 16.2L39.7 15.2L42.2 15.7L42.6 15.2L42.2 13.0L43.6 13.0L45.8 11.0L46.6 11.0L46.6 11.8L45.3 13.2L46.1 14.0L46.8 13.7L46.3 14.7L48.3 15.7L50.5 14.5L52.5 16.2L53.9 16.4L54.9 15.0L59.8 14.0L61.0 12.3L61.3 10.0L62.5 10.3L64.2 7.4L63.2 5.9L60.5 6.9L59.6 6.4L58.8 4.7L57.8 4.4L58.8 4.2L59.1 3.2L60.0 3.2L61.0 1.5L62.3 1.7ZM36.0 1.7L37.3 2.2L36.5 3.2L37.3 4.4L38.2 3.7L41.7 3.9L42.9 2.9L44.6 3.4L44.4 5.1L45.6 6.1L47.3 5.9L47.1 7.4L45.1 8.6L43.4 8.3L41.7 9.1L40.2 8.3L38.7 8.6L38.2 7.4L36.0 6.9L35.3 4.7L34.1 4.7L34.1 3.2Z"/></svg>';
  // Rideau de fougères (easter egg) : 3 rangées de 3 émojis cachent le pied du phare, puis s'ouvrent de part et d'autre
  const HUES = [-55, 0, 25, -40, 0, -70, 15, -25, 10, -60, 0, -35];
  const RIDEAU = [];
  for (let row = 0; row < 3; row++) for (let k = 0; k < 3; k++){
    const side = k === 0 ? -1 : k === 2 ? 1 : (row % 2 ? 1 : -1);           // la fougère du milieu part à gauche, puis à droite, une rangée sur deux
    const n = RIDEAU.length, j = RIDEAU.filter(e => e.side === side).length;
    RIDEAU.push({
      side, cx: (k - 1) * 15 + (row % 2 ? 4 : -4), cr: (k - 1) * 14 + (row % 2 ? 6 : -6),   // fermé : serrées devant le phare
      ox: side * (34 + j * 7), or: side * (30 + j * 14),                                      // ouvert : écartées de chaque côté
      hue: HUES[n % HUES.length], b: row * 12 + (k % 2) * 4,
      f: (j % 2 ? -1 : 1) * side,                                                             // symétrie : les fougères de droite sont les inverses de celles de gauche
      d: (row * 0.04 + k * 0.05).toFixed(2)
    });
  }
  const rideauHtml = () => '<span class="egg-ferns" aria-hidden="true">' + RIDEAU.map(e =>
    `<span class="ef" style="--cx:${e.cx}px;--cr:${e.cr}deg;--ox:${e.ox}px;--or:${e.or}deg;--hue:${e.hue}deg;--f:${e.f};bottom:${e.b}px;animation-delay:${e.d}s">🌿</span>`).join('') + '</span>';
  // L'oiseau sort de derrière les fougères, fait un tour du phare (devant puis derrière la tour) et s'envole vers la droite
  const BIRD_SVG = '<svg class="egg-flyer" viewBox="0 0 60 34" aria-hidden="true">'
    + '<defs>'
    + '<radialGradient id="eb-eye" cx="44.9" cy="14.1" r="1.05" gradientUnits="userSpaceOnUse">'
    + '<stop offset="0.7" stop-color="white"/><stop offset="0.9" stop-color="#ddd"/>'
    + '</radialGradient>'
    + '<linearGradient id="eb-beak" x1="47" y1="15.6" x2="53.4" y2="15.6" gradientUnits="userSpaceOnUse">'
    + '<stop offset="0" stop-color="#222"/><stop offset="1" stop-color="#111"/>'
    + '</linearGradient>'
    + '</defs>'
    // Aile arrière
    + '<g transform="translate(36 0) scale(.85 1) translate(-32 0)">'
    + '<g class="eb-far">'
    + '<path fill="#555" d="M31 16.6C30.4 12 28.8 7.8 26 4.4C23 0.8 18.4-1.5 12.4-1.8C9.4-2 6.4-1.6 3.6-1L8 2.3L6 3.7L10.4 5.6L8.6 7.2L13.2 8.8L11.6 10.4L16.2 11.6L14.8 13.2L19.4 14.2L18.2 15.8L22.9 16.4L22.2 17.7L26.4 17.9C28.4 18 30 17.7 31 16.6Z"/>'
    + '<path fill="#666" d="M3.6-1C10-1.7 17-0.2 22.6 3.8C17.5 0.5 11.2-0.9 3.6-1Z"/>'
    + '<path fill="#4a4a4a" d="M8.6 7.2C14.6 7.6 20.4 9.8 25.6 14C21 11 15 8.4 8.6 7.2Z"/>'
    + '</g>'
    + '</g>'
    // Queue : 6 plumes, extrémités échelonnées (raccourcie de 28 % et rapprochée du corps)
    + '<g transform="translate(24.2 0) scale(.72 1) translate(-21.2 0)">'
    + '<path fill="#222" d="M21.2 18.2C16.4 17.2 11.2 15.6 6 14L2 12.6L4.6 14.8L3.4 15.4L6.2 17L4.4 18.4L7.4 19.2L5.2 20.6L8 21.2L5.8 22.8C11.8 22 17 21.2 21.2 20.8Z"/>'
    + '<path fill="#333" d="M21 19.2C16 19.6 11.2 20.6 6.2 22L2.2 23.6L6.6 23.2L5.6 24.4C10.4 23.6 15.8 22.6 21 21.6Z"/>'
    + '<path fill="none" stroke="#444" stroke-width=".3" stroke-linecap="round" d="M20.6 18.7C15 18.4 9.4 17.4 4.4 15.2M20.6 19.4C15 19.7 9.4 20.4 3.4 22.9"/>'
    + '</g>'
    // Corps (raccourci de 20 %)
    + '<path transform="translate(43 0) scale(.8 1) translate(-43 0)" fill="#222" d="M18.1 18.7c1.1-3.4 4.7-6.2 10.1-6.8 4.9-.6 9.7.4 12.5 2.1.7.4 1.4 1 2.1 1.5 1 2.3-.2 4.6-2.1 6.1-2 .6-4 .9-6 .9C30.3 23.7 25.7 22.8 21.1 22.1 19 21.3 18.1 19.8 18.1 18.7z"/>'
    // Aile avant : 8 plumes primaires/secondaires + couvertures
    + '<g transform="translate(36 0) scale(.85 1) translate(-32 0)">'
    + '<g class="eb-near">'
    + '<path fill="#292929" d="M32.8 17.6C32.2 13 30.6 8.8 27.8 5.4C24.8 1.7 20.2-0.6 14.2-0.9C11.2-1.1 8.2-0.7 5.4-0.1L9.8 3.3L7.8 4.7L12.2 6.6L10.4 8.2L15 9.8L13.4 11.4L18 12.6L16.6 14.2L21.2 15.2L20 16.8L24.7 17.4L24 18.7L28.2 18.9C30.2 19 31.7 18.7 32.8 17.6Z"/>'
    // séparations des plumes
    + '<path fill="none" stroke="#555" stroke-width=".3" stroke-linecap="round" d="M9.8 3.3C15 5 20.8 8 27 13.2M12.2 6.6C17 8.2 22 10.6 27.6 15M15 9.8C19 11.2 23 13.2 27.8 16.2M18 12.6C21.2 13.4 24.4 14.8 28 17M21.2 15.2C23.6 15.8 26 16.6 28.4 17.8"/>'
    // couvertures : trois bandes plus claires le long du bras
    + '<path fill="#3a3a3a" d="M32.8 17.6C32.2 13.2 30.4 9.4 27.8 6.2C25.2 3 21 1 16 0.4C20.4 3.4 23.6 7.2 25.4 11.6C26.6 14.6 29 16.8 32 18Z"/>'
    + '<path fill="#454545" d="M32.4 17.8C31.6 14 29.8 10.6 27.2 7.8C24.8 5.2 21.2 3.4 17.2 2.8C21.2 5.8 23.8 9.2 25.2 13C26.2 15.6 28.6 17.4 31.4 18.2Z"/>'
    + '<path fill="#505050" d="M31.8 18C31 15 29.2 12.4 27 10.2C25 8.2 22.2 6.8 19.2 6.2C22.4 8.6 24.4 11.4 25.4 14.4C26.2 16.2 28.4 17.6 30.8 18.3Z"/>'
    // rémiges primaires, bord de fuite
    + '<path fill="#3f3f3f" d="M5.4-0.1C12-0.8 19 1 24.6 5C19.2 1.3 12.8-0.3 5.4-0.1Z"/>'
    + '<path fill="#444" d="M7.8 4.7C14.4 5 20.8 7.6 26 11.6C21.2 7.8 15.2 5.2 7.8 4.7Z"/>'
    + '</g>'
    + '</g>'
    // Tête (réduite de 12 %)
    + '<path transform="translate(43.5 15) scale(.88) translate(-43.5 -15)" fill="#222" d="M38.4 14.3c1.3-2.6 4.1-4.1 6.7-3.6 2.1.4 3.5 2.1 3.5 4.1 0 2-1.3 3.7-3.3 4.3-2.1.6-4.7-.1-6.1-1.8-.9-1.1-1.3-2.2-.8-3z"/>'
    // Bec
    + '<path fill="url(#eb-beak)" d="M47.1 13.8L53.4 15.6c.5.1.5.6 0 .8L47 17.4c.6-1.2.7-2.5.1-3.6z"/>'
    // Œil
    + '<circle transform="translate(43.5 15) scale(.88) translate(-43.5 -15)" cx="44.9" cy="14.1" r="1.05" fill="url(#eb-eye)"/>'
    + '<circle transform="translate(43.5 15) scale(.88) translate(-43.5 -15)" cx="45.15" cy="13.8" r=".3" fill="#222"/>'
    + '</svg>';
  function flyBird(btn){
    btn.insertAdjacentHTML('beforeend', BIRD_SVG);
    const bird = btn.querySelector('.egg-flyer:last-child'), near = bird.querySelector('.eb-near'), far = bird.querySelector('.eb-far');
    const rect = btn.getBoundingClientRect(), exitX = Math.max(rect.width + 120, innerWidth - rect.left + 20);
    const CX = rect.width / 2, R = 30, RY = 8, DELAY = 1.0, OM = 2.7, RAMP = 0.45, Y0 = 112, Y1 = 52;
    const T1 = 2 * Math.PI / OM + RAMP / 2;                                   // fin du tour : devant le phare, vers la droite, à pleine vitesse
    const th = t => t < RAMP ? OM * t * t / (2 * RAMP) : OM * (t - RAMP / 2);  // angle : départ progressif puis vitesse constante
    const sm = u => u * u * (3 - 2 * u);
    const vxEnd = R * OM, T2 = 1.7, ax = 2 * ((exitX - CX) - vxEnd * T2) / (T2 * T2);   // sortie : même vitesse qu'à la fin du tour, puis accélération douce
    const pos = t => {
      if (t <= T1){ const a = th(t), u = t / T1; return { x: CX + R * Math.sin(a), y: Y0 + (Y1 - Y0) * sm(u) + RY * Math.cos(a), d: Math.cos(a), u }; }
      const q = t - T1; return { x: CX + vxEnd * q + ax * q * q / 2 + 0 * R, y: Y1 + RY - 16 * q * q, d: 1, u: 1 + q / T2 };
    };
    const wing = (g, k) => g.setAttribute('transform', `translate(32 17) scale(1 ${k.toFixed(2)}) translate(-32 -17)`);
    const t0 = performance.now();
    (function frame(now){
      const t = (now - t0) / 1000 - DELAY;
      if (t < 0){ bird.style.opacity = 0; requestAnimationFrame(frame); return; }
      const P = pos(t), Q = pos(t + 0.016), vx = (Q.x - P.x) / 0.016;
      const turn = Math.max(-1, Math.min(1, vx / 35));                         // le demi-tour se fait en s'écrasant, sans saut
      const sc = (0.9 + 0.2 * P.d) * Math.min(1, 0.55 + t * 0.9);
      const vy = (Q.y - P.y) / 0.016, tilt = Math.max(-12, Math.min(12, vy * 0.06));      // le bec se lève quand il monte
      bird.style.transform = `translate(${(P.x - 18).toFixed(1)}px,${(P.y - 10.2).toFixed(1)}px) scale(${(turn * sc).toFixed(3)},${sc.toFixed(3)}) rotate(${tilt.toFixed(1)}deg)`;
      bird.style.zIndex = P.d > 0 ? (P.y > 78 ? 1 : 3) : -1;           // 1 : derrière les fougères (z 2) tant qu'il est à leur hauteur ; 3 : devant la tour ; -1 : derrière la tour
      bird.style.opacity = Math.min(1, t * 5, Math.max(0, (exitX - P.x) / 80));
      const ph = t * Math.PI * 2 * 5; wing(near, 0.15 + 0.85 * Math.sin(ph)); wing(far, 0.15 + 0.85 * Math.sin(ph - 0.6));
      if (P.x < exitX + 10 && t < T1 + T2 + 0.5) requestAnimationFrame(frame); else bird.remove();
    })(performance.now());
  }
  const GROUP_URL = 'https://chat.whatsapp.com/Dev158f45VTCriqkYm2igt';   // groupe WhatsApp « Ouessant Outragée, Ouessant brisée mais Ouessant libérée » (lien d'invitation public, voulu par le propriétaire)
  // invitation affichée ou non : page Administration → reglages.json (groupe : oui / non ; groupeFin : dernier jour, '' = sans fin)
  const GROUPE_FIN = '2026-11-01';   // par défaut, si reglages.json ne dit rien (la même date que dans js/admin.js)
  let groupeReg = null;
  function groupeOn(){
    if (!groupeReg) groupeReg = (location.protocol === 'file:' ? Promise.reject() : fetch('reglages.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject()))
      .then(j => ({ on: j.groupe !== false, fin: typeof j.groupeFin === 'string' ? j.groupeFin : GROUPE_FIN }), () => ({ on: true, fin: GROUPE_FIN }));
    return groupeReg.then(g => { if (!g.on) return false; if (!g.fin) return true;
      const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return today <= g.fin; });
  }
  // l'oiseau annoncé : une espèce au hasard parmi celles à annoncer sur Telegram (pas les sous-espèces)
  let eggList = null;
  function eggPick(){
    if (API.eggBird) return Promise.resolve(API.eggBird());
    const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const pick = () => { const r = (eggList || []).filter(b => norm(b['Proposition de Canal de Diffusion Ouessant']).startsWith('tele') && !norm(b['Type de taxon']).startsWith('sous'));
      const b = r.length ? r[Math.floor(Math.random() * r.length)] : null; return b ? ((lang() === 'en' && b['Nom Anglais']) || b['Nom Français']) : null; };
    if (eggList) return Promise.resolve(pick());
    return fetch(BASE + 'ouessant_birds.json').then(r => r.ok ? r.json() : []).catch(() => []).then(l => { eggList = Array.isArray(l) ? l : []; return pick(); });
  }
  function egg(){
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce){
      const btn = $('phareBtn');
      btn.insertAdjacentHTML('beforeend', rideauHtml());
      const ferns = btn.querySelector('.egg-ferns'); setTimeout(() => ferns.remove(), 4300);
      flyBird(btn);
    }
    Promise.all([eggPick(), groupeOn()]).then(([name, groupe]) => {
      // avec l'invitation au groupe WhatsApp, le message reste affiché jusqu'à ✕ ou Échap ; sans, il part seul au bout de 4,5 s
      document.querySelectorAll('.egg-toast').forEach(o => o.remove());
      const t = document.createElement('div'); t.className = 'egg-toast'; t.setAttribute('role', 'status'); t.setAttribute('data-notr', '');
      t.innerHTML = `<button type="button" class="egg-x" aria-label="${esc(T('eggClose'))}" title="${esc(T('eggClose'))}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`
        + `<p>${esc(name ? T('egg')(name) : T('eggNone'))}</p>`
        + (groupe ? `<p class="egg-join-t">${esc(T('eggJoin'))}</p><a class="egg-join" href="${GROUP_URL}" target="_blank" rel="noopener">${esc(T('eggJoinBtn'))}</a>` : '');
      const close = () => { t.remove(); document.removeEventListener('keydown', esc_); };
      const esc_ = e => { if (e.key === 'Escape') close(); };
      t.addEventListener('click', e => { e.stopPropagation(); if (e.target.closest('.egg-x')) close(); });
      document.addEventListener('keydown', esc_);
      document.body.appendChild(t);
      if (!groupe) setTimeout(close, 4500);
    });
  }
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
    fetch(WX_URL).then(r => r.ok ? r.json() : Promise.reject()).then(d => { wx = d; wxAt = Date.now(); wxState = 'ok'; renderPhare(); windPill(); })
      .catch(() => { wxState = wx ? 'ok' : 'err'; renderPhare(); windPill(); });
  }
  // pastille de vent au pied du phare : montre que le phare s'ouvre (météo), et donne le vent d'un coup d'œil
  function windPill(){
    const el = $('windPill'), c = wx && wx.current;
    if (!c || navigator.onLine === false || typeof c.wind_speed_10m !== 'number'){ el.hidden = true; return; }
    const kmh = Math.round(c.wind_speed_10m);
    el.innerHTML = `${arrow(c.wind_direction_10m, 13)}${kmh} km/h`; el.hidden = false;
    el.title = T('windT')(T('dirs16')[dir16(c.wind_direction_10m)], kmh);
  }
  function wxHtml(){
    if (navigator.onLine === false && !wx) return `<p class="wind-sub">${esc(T('wOffline'))}</p>`;
    if (!wx) return `<p class="wind-sub">${esc(wxState === 'err' ? T('wErr') : T('wLoading'))}</p>`;
    const c = wx.current, d = wx.daily, kmh = Math.round(c.wind_speed_10m), i = dir16(c.wind_direction_10m);
    const days = d.time.map((t, j) => {
      const label = j === 0 ? T('today') : j === 1 ? T('tomorrow') : (s => s.charAt(0).toUpperCase() + s.slice(1))(new Date(t + 'T12:00').toLocaleDateString(lang(), { weekday: 'long' }));
      return `<div class="day"><b>${esc(label)}</b><span class="dw">${arrow(d.wind_direction_10m_dominant[j], 14)} ${esc(T('dirsShort')[dir16(d.wind_direction_10m_dominant[j])])} ${Math.round(d.wind_speed_10m_max[j])} km/h</span>${esc(T('wx')[d.weather_code[j]] || '')}<br>${Math.round(d.temperature_2m_max[j])} °C</div>`;
    }).join('');
    return `<div class="wind"><div class="wind-ar">${ILE}<span class="n">N</span>${arrow(c.wind_direction_10m, 30)}</div>
      <div><div class="wind-main">${esc(T('wNow')(T('dirs16')[i], kmh, beaufort(c.wind_speed_10m)))}</div>
      <div class="wind-sub">${esc(T('wGust')(Math.round(c.wind_gusts_10m)))}, ${esc(T('wx')[c.weather_code] || '')}, ${Math.round(c.temperature_2m)} °C</div></div></div>
      <div class="days">${days}</div><p class="pp-src">${esc(T('wSrc'))}</p>`;
  }
  // le panneau du phare ne sert qu'à la météo et aux règles de canal (partage, version et informations légales : menu ☰)
  function renderPhare(){
    const canaux = [['telegram', 'cTelegram'], ['whatsapp', 'cWhatsapp'], ['whatsapp', 'cChat'], ['none', 'cNone']]
      .map(([k, t]) => `<li><span class="dot" style="background:${CHANNEL_COLORS[k]}"></span><span>${T(t)}</span></li>`).join('');
    $('pharePanel').innerHTML = `<div class="pp-sec"><h2 class="pp-h">${esc(T('wTitle'))}</h2>${wxHtml()}</div>
      <div class="pp-sec"><h2 class="pp-h">${esc(T('cTitle'))}</h2><ul class="pp-canaux">${canaux}</ul><button type="button" class="link pp-rule" data-ph="rule">${esc(T('ruleBtn'))}</button></div>`;
  }
  function openPhare(open){
    $('pharePanel').hidden = !open; $('phareBtn').setAttribute('aria-expanded', String(open));
    if (open){ loadWx(); renderPhare(); }
  }
  // hors connexion, le phare s'éteint (pas de faisceau ni de lanterne allumée)
  function updatePhare(){
    const off = navigator.onLine === false, img = $('phareBtn').querySelector('img');
    if (off) $('windPill').hidden = true; else if (wx) windPill(); else loadWx();
    img.src = BASE + (off ? 'phare_creach_eteint.svg' : 'phare_creach.svg');
    img.removeAttribute('data-secours');   // éditeur : l'image de secours (phare allumé, sur le site) ne doit pas remplacer le phare éteint
    $('phareBtn').classList.toggle('off', off);
    $('phareBtn').title = off ? T('phareOff') : T('phareLabel');
    if (!$('pharePanel').hidden) renderPhare();
  }
  window.addEventListener('online', updatePhare); window.addEventListener('offline', updatePhare);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && navigator.onLine !== false) loadWx(); });   // retour sur l'appli : vent à jour (au plus toutes les 15 min)
  // un clic ouvre le panneau ; cinq clics rapides font passer un oiseau
  let clicks = [], eggLock = 0;
  $('phareBtn').addEventListener('click', e => {
    e.stopPropagation(); if (API.onClick) API.onClick();
    const now = Date.now();
    if (now < eggLock) return;                                   // juste après l'oiseau, on ignore les clics en trop
    clicks = clicks.filter(t => now - t < 2000); clicks.push(now);
    if (clicks.length >= 5){ clicks = []; eggLock = now + 6800; openPhare(false); egg(); return; }
    openPhare($('pharePanel').hidden);
  });
  $('pharePanel').addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('[data-ph]'); if (!b) return;
    // proposer une nouvelle règle : ouvre « Une question, un retour ? » avec un message pré-rempli
    if (b.dataset.ph === 'rule'){ openPhare(false); window.dispatchEvent(new CustomEvent('ouessant-contact', { detail: T('ruleTpl') })); }
  });
  document.addEventListener('click', () => { if (!$('pharePanel').hidden) openPhare(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('pharePanel').hidden){ openPhare(false); $('phareBtn').focus(); } });
  window.addEventListener('ouessant-prefs', () => { if (!$('pharePanel').hidden) renderPhare(); });   // couleurs des canaux
  function texts(){
    $('phareBtn').setAttribute('aria-label', T('phareLabel')); $('phareBtn').title = navigator.onLine === false ? T('phareOff') : T('phareLabel');
    if (!$('windPill').hidden) windPill();
    if (!$('pharePanel').hidden) renderPhare();
  }
  API.open = openPhare; API.isOpen = () => !$('pharePanel').hidden;
  API.refresh = l => { if (l) curLang = l; texts(); };
  texts(); updatePhare();
})();
