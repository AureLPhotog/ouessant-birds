/* Oiseaux d'Ouessant — mise en forme des noms d'oiseaux (éditeur + nettoyage de la liste).
   Règles :
   • français : une majuscule au premier mot, puis des minuscules, sauf les noms propres (« Bécasseau de Baird », mais « Bécasseau minute »).
     Un mot qui suit « de / du / des / d' » garde la casse saisie (c'est souvent un nom propre : « d'Europe », « de Baird », mais « des roseaux »).
     Les noms propres connus (PROPRES) gardent leur majuscule partout. Apostrophes droites ('). « (spp. x) » et « (S.c.x) » deviennent « (ssp. x) ».
   • anglais : une majuscule à chaque mot (« Steppe Eagle ») ; les mots déjà en casse mixte (McCormick's) sont conservés.
   • scientifique : majuscule au genre, minuscules ensuite (« Aquila nipalensis »).
   Pour ajouter un nom propre : l'ajouter à PROPRES ci-dessous. */
(function(root){
  'use strict';
  const PROPRES = ['Europe', 'Asie', 'Afrique', 'Amérique', 'Océanie', 'Sibérie', 'Groenland', 'Islande', 'Écosse', 'Irlande', 'France', 'Canada', 'Alaska', 'Méditerranée',
    'Balkans', 'Baléares', 'Macaronésie', 'Colchide', 'Caroline', 'Baltimore', 'Petchora', 'Bassan', 'Nord', 'Anglais', 'Saint-Martin', 'Jean-le-Blanc',
    'Baird', 'Bonaparte', 'Yarrell', 'Cetti', 'Kumlien', 'Troïl', 'McCormick', 'Franklin', 'Sabine', 'Wilson', 'Godlewski', 'Richard', 'Bonelli', 'Hume', 'Pallas', 'Schwarz', 'Temminck', 'Scopoli', 'Dougall', 'Belon'];
  const SUIT_DE = new Set(['de', 'du', 'des']);   // après ces mots, la casse saisie est conservée (nom propre possible)
  const propre = new Map(PROPRES.map(p => [p.toLowerCase(), p]));
  const cap = w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w;

  function fmtFr(input){
    let s = String(input == null ? '' : input).replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
    if (!s) return s;
    let rest = '';
    const p = s.indexOf(' (');
    if (p >= 0){ rest = s.slice(p).replace(/\(\s*spp?\.\s*/gi, '(ssp. ').replace(/\(\s*S\.\s*c\.\s*([a-z]+)\s*\)/g, '(ssp. $1)'); s = s.slice(0, p); }
    let apresDe = false;
    const out = s.split(' ').map((tok, i) => {
      let pre = '', w = tok;
      const m = tok.match(/^(d|l)'(.+)$/i);
      if (m){ pre = m[1].toLowerCase() + "'"; w = m[2]; }
      const low = w.toLowerCase();
      let r;
      if (propre.has(low)) r = propre.get(low);                                   // nom propre connu
      else if (i === 0 && !pre) r = cap(w);                                      // premier mot
      else if (pre === "d'" || apresDe) r = (!propre.has(low) && /^[A-ZÀ-ÖØ-Þ]/.test(w)) ? w : low;   // après de / d' : casse saisie conservée
      else r = low;
      if (i === 0 && !pre) r = r.charAt(0).toUpperCase() + r.slice(1);
      // « de » / « du » / « des » ouvrent la porte à un nom propre ; « la » / « le » / « les » la laissent ouverte
      if (SUIT_DE.has(low) || pre === "d'") apresDe = true; else if (!(apresDe && (low === 'la' || low === 'le' || low === 'les'))) apresDe = false;
      return pre + r;
    });
    return out.join(' ') + rest;
  }

  function fmtEn(input){
    const s = String(input == null ? '' : input).replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
    if (!s) return s;
    const p = s.indexOf(' (');
    const main = p >= 0 ? s.slice(0, p) : s, rest = p >= 0 ? s.slice(p) : '';
    const out = main.split(' ').map((w, i) => {
      if (i > 0 && /^(of|the|and)$/i.test(w)) return w.toLowerCase();
      if (w === w.toLowerCase() || w === w.toUpperCase()){                          // tout en minuscules ou en capitales : mise en forme
        return w.split('-').map((part, j) => j === 0 ? cap(part) : part.toLowerCase()).join('-');
      }
      return w.charAt(0).toUpperCase() + w.slice(1);                                // casse mixte (McCormick's) conservée
    });
    return out.join(' ') + rest;
  }

  function fmtSci(input){
    const s = String(input == null ? '' : input).replace(/\s+/g, ' ').trim();
    if (!s) return s;
    const [genre, ...suite] = s.split(' ');
    return [cap(genre), ...suite.map(x => x.toLowerCase())].join(' ');
  }

  const api = { fmtFr, fmtEn, fmtSci, PROPRES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OuessantNoms = api;
})(typeof window !== 'undefined' ? window : globalThis);
