/* Oiseaux d'Ouessant — carte de l'île : grille des carrés et recalage GPS.
   Partagé par l'appli (index.html) et l'éditeur (editeur.html).
   Carte d'origine : 7015 × 4944 pixels, colonnes A→S et lignes 1→13. */
(function(){
  'use strict';
  // Bords des colonnes A→S et des lignes 1→13, en pixels de la carte d'origine
  const GRID_X = [357,708,1055,1409,1761,2123,2477,2819,3183,3535,3881,4243,4587,4949,5301,5655,6009,6353,6715,7015];
  const GRID_Y = [357,717,1067,1413,1761,2113,2467,2829,3183,3531,3883,4245,4591,4944];
  const MAP_W = 7015, MAP_H = 4944;

  // Recalage affine ajusté sur 19 repères relevés sur le terrain (îlots, chapelles, phares, château d'eau, fort, piste) :
  // écart moyen ≈ 30 m, au pire ≈ 95 m en validation croisée. Pour ajouter des repères, il faut recalculer AFF.
  const AFF = [[0.709161048, -0.002042154, 2964.964458201], [-0.000573242, -0.712172752, 3202.871361484]];
  const MLAT = 111132, MLON = 111320 * Math.cos(48.45 * Math.PI / 180);

  /** GPS → pixel de la carte d'origine */
  function toPixel(lat, lon){
    const E = (lon + 5.1) * MLON, N = (lat - 48.45) * MLAT;
    return [AFF[0][0] * E + AFF[0][1] * N + AFF[0][2], AFF[1][0] * E + AFF[1][1] * N + AFF[1][2]];
  }
  /** pixel de la carte d'origine → GPS */
  function fromPixel(x, y){
    const a = AFF[0][0], b = AFF[0][1], d = AFF[1][0], e = AFF[1][1], det = a * e - b * d, X = x - AFF[0][2], Y = y - AFF[1][2];
    const E = (e * X - b * Y) / det, N = (a * Y - d * X) / det;
    return [48.45 + N / MLAT, -5.1 + E / MLON];
  }
  /** "B8" → [1, 7] */
  function cellIdx(c){ return [c.charCodeAt(0) - 65, parseInt(c.slice(1), 10) - 1]; }
  /** [1, 7] → "B8" */
  const cellName = ([c, r]) => String.fromCharCode(65 + c) + (r + 1);
  /** pixel → [colonne, ligne] ou null hors de la grille */
  function cellAt(x, y){
    let c = -1, r = -1;
    for (let i = 0; i < GRID_X.length - 1; i++) if (x >= GRID_X[i] && x < GRID_X[i + 1]) c = i;
    for (let i = 0; i < GRID_Y.length - 1; i++) if (y >= GRID_Y[i] && y < GRID_Y[i + 1]) r = i;
    return c < 0 || r < 0 ? null : [c, r];
  }
  /** pixel → "B8" ou null */
  const cellNameAt = (x, y) => { const c = cellAt(x, y); return c ? cellName(c) : null; };
  /** centre GPS d'un ou plusieurs carrés */
  function cellsCenter(cells){
    const pts = cells.map(cellIdx).map(([c, r]) => [(GRID_X[c] + GRID_X[c + 1]) / 2, (GRID_Y[r] + GRID_Y[r + 1]) / 2]);
    return fromPixel(pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length);
  }
  /** distance en mètres entre deux points GPS */
  function distM(a, b, c, d){
    const R = 6371000, r = Math.PI / 180, dl = (c - a) * r, dn = (d - b) * r;
    const h = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  /** lecture de coordonnées collées : décimales (48.45606, -5.08603 ou 48,45606 -5,08603) ou degrés-minutes-secondes */
  function parseCoords(str){
    const t = String(str || '').replace(/[′’]/g, "'").replace(/[″”]/g, '"').trim();
    if (!t) return null;
    const dms = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*'\s*)?(?:(\d+(?:[.,]\d+)?)\s*"\s*)?([NSEWO])/gi)];
    let lat, lon;
    if (dms.length >= 2){
      const val = m => (parseFloat(m[1].replace(',', '.')) + (m[2] ? parseFloat(m[2].replace(',', '.')) / 60 : 0) + (m[3] ? parseFloat(m[3].replace(',', '.')) / 3600 : 0)) * (/[SWO]/i.test(m[4]) ? -1 : 1);
      dms.slice(0, 2).forEach(m => { if (/[NS]/i.test(m[4])) lat = val(m); else lon = val(m); });
    } else {
      const nums = t.match(/-?\d+(?:[.,]\d+)?/g);
      if (!nums || nums.length < 2) return null;
      lat = parseFloat(nums[0].replace(',', '.')); lon = parseFloat(nums[1].replace(',', '.'));
      if (Math.abs(lat) < 10 && Math.abs(lon) > 40){ const x = lat; lat = lon; lon = x; }   // ordre inversé
      if (lon > 0 && /[WO]/i.test(t)) lon = -lon;
    }
    return isFinite(lat) && isFinite(lon) ? [lat, lon] : null;
  }

  window.OuessantCarte = { GRID_X, GRID_Y, MAP_W, MAP_H, AFF, toPixel, fromPixel, cellIdx, cellName, cellAt, cellNameAt, cellsCenter, distM, parseCoords };
})();
