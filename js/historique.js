/* Oiseaux d'Ouessant — historique des listes (historique.json).
   À chaque enregistrement d'une liste sur main (éditeur ou page Administration), une entrée est ajoutée à historique.json :
   { date, app, listes, fichier, source, changements: [{ t: 'mod' | 'add' | 'del', nom, cle, champs: [[champ, avant, après], …] }] }
   (au-delà de 40 changements d'un coup, seulement un résumé : resume: { mod, add, del, champs: { champ: nombre } }).
   La page historique.html regroupe ensuite les changements d'une même journée (état initial → état final).
   Le même calcul a servi à reconstituer l'historique passé à partir des commits de main (scripts/historique_depuis_git.py). */
(function(){
  const FILE = 'historique.json', MAX = 40;
  const CLE = { 'ouessant_birds.json': 'Nom Scientifique', 'lieux_ouessant.json': 'nom' };
  const NOM = { 'ouessant_birds.json': 'Nom Français', 'lieux_ouessant.json': 'nom' };
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const empty = v => v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && !v.length);
  // champs qui changent entre deux versions d'une entrée (un champ vide et un champ absent comptent pareil)
  const fieldsDiff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter(k => !same(a[k], b[k]) && !(empty(a[k]) && empty(b[k]))).map(k => [k, empty(a[k]) ? null : a[k], empty(b[k]) ? null : b[k]]);

  function diff(file, before, after){
    const K = CLE[file], N = NOM[file]; if (!K) return [];
    const B = new Map(before.map(e => [norm(e[K]), e])), A = new Set(after.map(e => norm(e[K])));
    const out = [], adds = [], dels = before.filter(e => !A.has(norm(e[K])));
    after.forEach(e => {
      const o = B.get(norm(e[K]));
      if (!o){ adds.push(e); return; }
      const c = fieldsDiff(o, e); if (c.length) out.push({ t: 'mod', nom: e[N], cle: e[K], champs: c });
    });
    // nom scientifique corrigé : même nom français supprimé puis ajouté → une seule modification
    if (N !== K) dels.slice().forEach(d => {
      const i = adds.findIndex(a => norm(a[N]) === norm(d[N])); if (i < 0) return;
      const a = adds.splice(i, 1)[0]; dels.splice(dels.indexOf(d), 1);
      out.push({ t: 'mod', nom: a[N], cle: a[K], champs: fieldsDiff(d, a) });
    });
    adds.forEach(e => out.push({ t: 'add', nom: e[N], cle: e[K], champs: fieldsDiff({}, e) }));
    dels.forEach(e => out.push({ t: 'del', nom: e[N], cle: e[K], champs: fieldsDiff(e, {}) }));
    return out;
  }

  function entry({ file, before, after, app, listes, source, date }){
    const ch = diff(file, before, after); if (!ch.length) return null;
    const e = { date: date || new Date().toISOString(), app: app || null, listes: listes || null, fichier: file, source };
    if (ch.length > MAX){
      const champs = {}; ch.forEach(c => c.champs.forEach(([k]) => { champs[k] = (champs[k] || 0) + 1; }));
      e.resume = { mod: ch.filter(c => c.t === 'mod').length, add: ch.filter(c => c.t === 'add').length, del: ch.filter(c => c.t === 'del').length, champs };
    } else e.changements = ch;
    return e;
  }

  const enc = str => { const by = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < by.length; i += 8192) bin += String.fromCharCode.apply(null, by.subarray(i, i + 8192)); return btoa(bin); };
  const dec = b64 => new TextDecoder('utf-8').decode(Uint8Array.from(atob(String(b64).replace(/\s/g, '')), c => c.charCodeAt(0)));
  const fmt = list => '[\n' + list.map(x => JSON.stringify(x)).join(',\n') + '\n]\n';   // une entrée par ligne
  const LABEL = { 'ouessant_birds.json': 'Oiseaux', 'lieux_ouessant.json': 'Lieux' };

  // Ajoute l'entrée à historique.json sur main. api(chemin, options) : la fonction d'appel à l'API GitHub de la page (avec la clé).
  async function record(api, e){
    if (!e) return true;
    for (let n = 0; n < 3; n++){   // si quelqu'un vient d'écrire l'historique (conflit), on relit et on recommence
      const r0 = await api(`/contents/${FILE}?ref=main`); let list = [], sha;
      if (r0.ok){
        const j = await r0.json(); sha = j.sha; let b64 = j.content;
        if (!b64){ const rb = await api('/git/blobs/' + sha); if (!rb.ok) return false; b64 = (await rb.json()).content; }   // fichier de plus de 1 Mo
        list = JSON.parse(dec(b64)); if (!Array.isArray(list)) return false;
      } else if (r0.status !== 404) return false;
      list.push(e);
      const nb = e.changements ? e.changements.length : e.resume.mod + e.resume.add + e.resume.del;
      const r = await api(`/contents/${FILE}`, { method: 'PUT', body: JSON.stringify(Object.assign({
        message: `Historique des listes : ${LABEL[e.fichier] || e.fichier}, ${nb} changement${nb > 1 ? 's' : ''}`, content: enc(fmt(list)), branch: 'main' }, sha ? { sha } : {})) });
      if (r.ok) return true;
      if (r.status !== 409 && r.status !== 422) return false;
    }
    return false;
  }

  window.OuessantHistorique = { FILE, CLE, NOM, diff, entry, record, norm, same };
})();
