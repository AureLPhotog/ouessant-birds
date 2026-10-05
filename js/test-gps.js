/* MODE TEST : simule une position GPS sur l'île d'Ouessant, pour tester les alertes et « Où suis-je ? » depuis n'importe où.
   INACTIF par défaut : il ne s'active que
   • sur le site de test (raw.githack.com), automatiquement ;
   • ailleurs (dont le site en ligne), seulement si l'adresse contient ?test=1 (le réglage est ensuite mémorisé dans ce navigateur) ;
   ?test=0 le désactive.
   Actif, un bandeau rouge s'affiche en bas de l'écran : le toucher permet de choisir la position sur la carte.
   Position imposée par l'adresse : ?lat=48.4502&lon=-5.139 */
(function(){
  const KEY = 'test-gps-position', ON = 'test-gps-on', q = new URLSearchParams(location.search);
  try { if (q.get('test') === '1') localStorage.setItem(ON, '1'); if (q.get('test') === '0') localStorage.removeItem(ON); } catch (_) {}
  let on = /githack\.com$/.test(location.hostname) && q.get('test') !== '0';
  try { on = on || localStorage.getItem(ON) === '1'; } catch (_) {}
  if (q.get('test') === '1') on = true;
  if (!on) return;   // site en ligne : rien ne change
  let cur = { lat: 48.4502, lon: -5.139 };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && isFinite(s.lat) && isFinite(s.lon)) cur = s; } catch (_) {}
  if (isFinite(parseFloat(q.get('lat'))) && isFinite(parseFloat(q.get('lon')))) cur = { lat: parseFloat(q.get('lat')), lon: parseFloat(q.get('lon')) };
  const fake = () => ({ coords: { latitude: cur.lat, longitude: cur.lon, accuracy: 15 }, timestamp: Date.now() });
  const geo = { getCurrentPosition: (ok) => setTimeout(() => ok(fake()), 400), watchPosition: (ok) => { setTimeout(() => ok(fake()), 400); return 0; }, clearWatch: () => {} };
  try { Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true }); } catch (_) { navigator.geolocation = geo; }

  let banner = null;
  const label = () => `MODE TEST : position simulée (${cur.lat.toFixed(4)}, ${cur.lon.toFixed(4)}) · toucher pour choisir sur la carte`;

  function picker(){
    const C = window.OuessantCarte; if (!C) return;
    const { GRID_X, GRID_Y, MAP_W, MAP_H, toPixel, fromPixel, cellNameAt } = C;
    const x0 = GRID_X[0], x1 = GRID_X[GRID_X.length - 1], y0 = GRID_Y[0], y1 = GRID_Y[GRID_Y.length - 1], Wg = x1 - x0, Hg = y1 - y0;
    const bw = (MAP_W / Wg * 100).toFixed(3), bx = (x0 / (MAP_W - Wg) * 100).toFixed(3), by = (y0 / (MAP_H - Hg) * 100).toFixed(3);
    let pick = { lat: cur.lat, lon: cur.lon };
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:100;background:#0F1B23;display:flex;flex-direction:column;font:500 14px system-ui,sans-serif;color:#fff';
    ov.innerHTML = `<div style="padding:10px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><strong style="flex:1;min-width:12em">Choisis la position simulée : touche la carte</strong>
        <button data-z="-" style="font:700 18px system-ui;width:36px;height:36px;border-radius:8px;border:0">−</button><button data-z="+" style="font:700 18px system-ui;width:36px;height:36px;border-radius:8px;border:0">+</button></div>
      <div data-scroll style="flex:1;overflow:auto;background:#ABDCFF"><div data-wrap style="position:relative;width:250%;aspect-ratio:${Wg} / ${Hg};background:url(carte_ouessant.webp) no-repeat;background-size:${bw}% auto;background-position:${bx}% ${by}%;cursor:crosshair">
        <span data-pin style="position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#D62828;border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.4);pointer-events:none"></span></div></div>
      <div style="padding:10px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span data-info style="flex:1;min-width:12em"></span>
        <button data-cancel style="padding:9px 14px;border-radius:8px;border:0;font:600 14px system-ui">Annuler</button><button data-ok style="padding:9px 14px;border-radius:8px;border:0;background:#D62828;color:#fff;font:600 14px system-ui">Utiliser cette position</button></div>`;
    document.body.appendChild(ov);
    const wrap = ov.querySelector('[data-wrap]'), scroll = ov.querySelector('[data-scroll]'), pin = ov.querySelector('[data-pin]'), info = ov.querySelector('[data-info]');
    const draw = () => {
      const [x, y] = toPixel(pick.lat, pick.lon);
      pin.style.left = ((x - x0) / Wg * 100) + '%'; pin.style.top = ((y - y0) / Hg * 100) + '%';
      const c = cellNameAt ? cellNameAt(x, y) : null;
      info.textContent = `${pick.lat.toFixed(5)}, ${pick.lon.toFixed(5)}` + (c ? ` · carré ${c}` : ' · hors de la carte');
    };
    wrap.addEventListener('click', e => {
      const R = wrap.getBoundingClientRect();
      const [lat, lon] = fromPixel(x0 + (e.clientX - R.left) / R.width * Wg, y0 + (e.clientY - R.top) / R.height * Hg);
      pick = { lat, lon }; draw();
    });
    ov.addEventListener('click', e => {
      const z = e.target.closest('[data-z]');
      if (z){ const cx = (scroll.scrollLeft + scroll.clientWidth / 2) / scroll.scrollWidth, cy = (scroll.scrollTop + scroll.clientHeight / 2) / scroll.scrollHeight;
        const w = Math.min(600, Math.max(100, parseFloat(wrap.style.width) * (z.dataset.z === '+' ? 1.5 : 1 / 1.5))); wrap.style.width = w + '%';
        scroll.scrollLeft = cx * scroll.scrollWidth - scroll.clientWidth / 2; scroll.scrollTop = cy * scroll.scrollHeight - scroll.clientHeight / 2; }
      if (e.target.closest('[data-cancel]')) ov.remove();
      if (e.target.closest('[data-ok]')){ cur = pick; try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (_) {} banner.textContent = label(); ov.remove(); }
    });
    draw();
    // centre la vue sur la position actuelle
    requestAnimationFrame(() => { const [x, y] = toPixel(cur.lat, cur.lon); scroll.scrollLeft = (x - x0) / Wg * scroll.scrollWidth - scroll.clientWidth / 2; scroll.scrollTop = (y - y0) / Hg * scroll.scrollHeight - scroll.clientHeight / 2; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    banner = document.createElement('button'); banner.type = 'button'; banner.textContent = label();
    banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99;border:0;cursor:pointer;background:#D62828;color:#fff;font:600 13px system-ui,sans-serif;text-align:center;padding:6px 8px;padding-bottom:calc(6px + env(safe-area-inset-bottom,0px))';
    banner.addEventListener('click', picker);
    document.body.appendChild(banner);
  });
})();
