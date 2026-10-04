/* Oiseaux d'Ouessant — recherche tolérante aux fautes de frappe (sans bibliothèque externe).
   On cherche le texte tapé n'importe où dans les noms, en acceptant quelques erreurs (lettre en trop,
   en moins, remplacée ou inversée) : environ une erreur pour 4 lettres. */
(function(){
  'use strict';
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

  /** plus petite distance d'édition entre le motif et n'importe quel morceau du texte (algorithme de Sellers) */
  function distanceDansTexte(p, t){
    const m = p.length; if (!m) return 0;
    let prev = new Array(m + 1), cur = new Array(m + 1), prev2 = new Array(m + 1);
    for (let i = 0; i <= m; i++) prev[i] = i;
    let best = prev[m];
    for (let j = 1; j <= t.length; j++){
      cur[0] = 0;                                   // le morceau peut commencer n'importe où
      for (let i = 1; i <= m; i++){
        const cost = p[i - 1] === t[j - 1] ? 0 : 1;
        let v = Math.min(prev[i] + 1, cur[i - 1] + 1, prev[i - 1] + cost);
        if (i > 1 && j > 1 && p[i - 1] === t[j - 2] && p[i - 2] === t[j - 1]) v = Math.min(v, prev2[i - 2] + 1);   // lettres inversées
        cur[i] = v;
      }
      if (cur[m] < best) best = cur[m];
      [prev2, prev, cur] = [prev, cur, prev2];
    }
    return best;
  }

  /**
   * @param list   liste d'éléments
   * @param texts  fonction élément → tableau de textes où chercher
   * @param query  texte tapé
   * @param ratio  erreurs tolérées par lettre (0.25 par défaut)
   * @returns éléments trouvés, du plus proche au moins proche
   */
  function fuzzy(list, texts, query, ratio){
    const q = norm(query); if (!q) return [];
    const max = q.length < 4 ? 0 : Math.max(1, Math.floor(q.length * (ratio ?? 0.25)));
    const out = [];
    list.forEach((it, idx) => {
      let best = Infinity;
      for (const s of texts(it)){ if (!s) continue; const d = distanceDansTexte(q, norm(s)); if (d < best) best = d; if (!best) break; }
      if (best <= max) out.push({ it, d: best, idx });
    });
    return out.sort((a, b) => a.d - b.d || a.idx - b.idx).map(x => x.it);
  }

  window.OuessantRecherche = { fuzzy, norm };
})();
