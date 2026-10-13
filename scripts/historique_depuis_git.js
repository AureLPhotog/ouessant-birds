/* Oiseaux d'Ouessant — reconstitue historique.json à partir des commits de main qui ont modifié les listes.
   Utilise le même calcul que l'éditeur et la page Administration (js/historique.js).
   Usage, à la racine du dépôt : node scripts/historique_depuis_git.js [branche, par défaut origin/main] > historique.json */
const { execFileSync } = require('child_process');
const path = require('path');
global.window = {};
require(path.join(__dirname, '..', 'js', 'historique.js'));
const H = window.OuessantHistorique;
const ref = process.argv[2] || 'origin/main';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 });
const show = (c, f) => { try { return execFileSync('git', ['show', `${c}:${f}`], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (_) { return null; } };
const LISTS = ['ouessant_birds.json', 'lieux_ouessant.json'];

const all = git('rev-list', '--first-parent', '--reverse', ref).trim().split('\n');
const idx = new Map(all.map((c, i) => [c, i]));
const touching = files => git('log', '--first-parent', '--format=%H', ref, '--', ...files).trim().split('\n').filter(Boolean).map(c => idx.get(c)).sort((a, b) => a - b);
const listIdx = touching(LISTS), verIdx = touching(['version_listes.json']);

const out = [];
listIdx.forEach((i, n) => {
  const c = all[i], parent = i > 0 ? all[i - 1] : null;
  const [date, ...msg] = git('show', '-s', '--format=%aI%n%s', c).trim().split('\n'), subject = msg.join(' ');
  const source = /page Administration/.test(subject) ? 'administration' : /^(Oiseaux|Lieux) : /.test(subject) ? 'éditeur'
    : /^Update .*\.json$/.test(subject) ? 'github' : 'appli';
  const vjs = show(c, 'js/version.js'), sw = show(c, 'sw.js');
  const app = (vjs && (vjs.match(/OUESSANT_APP_VERSION\s*=\s*'([^']+)'/) || [])[1]) || (sw && (sw.match(/VERSION\s*=\s*'v([\d.]+)/) || [])[1]) || null;
  // numéro de version des listes : celui écrit juste après ce commit (l'éditeur le met à jour dans un second commit)
  const next = n + 1 < listIdx.length ? listIdx[n + 1] : all.length, v = verIdx.find(x => x >= i && x < next);
  let listes = null;   // seulement pour l'éditeur et la page Administration, qui écrivent ce numéro juste après la liste
  if (v !== undefined && (source === 'éditeur' || source === 'administration')){ try { const j = JSON.parse(show(all[v], 'version_listes.json')); if (j && j.app && Number.isInteger(j.rev)) listes = `${j.app}.${j.rev}`; } catch (_) {} }
  LISTS.forEach(f => {
    const a = show(c, f), b = parent ? show(parent, f) : null;
    if (a === null || b === null || a === b) return;   // création de la liste (point de départ) ou fichier inchangé
    let before, after; try { before = JSON.parse(b); after = JSON.parse(a); } catch (_) { process.stderr.write(`illisible : ${c.slice(0, 7)} ${f}\n`); return; }
    if (!Array.isArray(before) || !Array.isArray(after)) return;
    const e = H.entry({ file: f, before, after, app, listes, source, date: new Date(date).toISOString() });
    if (e) out.push(e);
  });
});
process.stdout.write('[\n' + out.map(x => JSON.stringify(x)).join(',\n') + '\n]\n');
process.stderr.write(`${out.length} entrées\n`);
