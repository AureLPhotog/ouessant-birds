/* Oiseaux d'Ouessant — éditeur : version anglaise, thème clair / sombre et couleurs pour daltonisme.
   Les textes de l'éditeur sont écrits en français ; en anglais, ils sont traduits à l'affichage grâce aux tables
   ci-dessous (texte exact, puis modèles avec des parties variables). Pour corriger une traduction : la modifier ici.
   Les réglages (langue, thème, couleurs) sont partagés avec l'appli. */
(function(){
  'use strict';
  const LANG_KEY = 'ouessant-birds-lang', THEME_KEY = 'ouessant-theme', CVD_KEY = 'ouessant-cvd';
  const store = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } },
                  set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };

  // ---------- Textes exacts (français → anglais) ----------
  const EXACT = {
    // en-tête, accueil
    "Éditeur de listes": "List editor",
    "Cherche un oiseau ou un lieu-dit, corrige-le ou ajoutes-en un, puis envoie ta proposition.": "Search for a bird or a place name, correct it or add a new one, then send your suggestion.",
    "Oiseaux": "Birds", "Lieux": "Places",
    "Revenir à l'appli": "Back to the app", "Guide d'utilisation (PDF)": "User guide (PDF, in French)",
    "Depuis GitHub": "From GitHub",
    "Fichier du dépôt": "Repository file",
    "Ouvrir depuis GitHub": "Open from GitHub",
    "ou depuis ton ordinateur": "or from your computer",
    "Glisse ton fichier JSON ici": "Drop your JSON file here",
    "ou clique pour le choisir (ouessant_birds.json, lieux_ouessant.json…)": "or click to choose it (ouessant_birds.json, lieux_ouessant.json…)",
    "Coller du JSON": "Paste JSON",
    "Charger": "Load",
    "Reprendre le brouillon": "Resume the draft",
    "Gérer la clé": "Manage the key",
    "Ajouter une clé": "Add a key",
    "Clé GitHub mémorisée sur cet appareil.": "GitHub key remembered on this device.",
    "Clé GitHub active dans cet onglet (oubliée à sa fermeture).": "GitHub key active in this tab (forgotten when it closes).",
    "Tu peux corriger ou compléter les informations sans clé : chaque modification sera simplement soumise à validation avant d'être intégrée. La Clé Admin est réservée à l'administrateur.": "You can correct or add information without a key: each change will simply be reviewed before being included. The Admin key is reserved for the administrator.",
    "Chargement depuis GitHub…": "Loading from GitHub…",
    "Chargement de la liste…": "Loading the list…",
    // barre d'outils
    
    "Rechercher dans tous les champs…": "Search all fields…",
    "Rechercher": "Search",
    "+ Ajouter une entrée": "+ Add an entry", "+ Ajouter un oiseau": "+ Add a bird", "+ Ajouter un lieu": "+ Add a place",
    "Coller des lignes": "Paste lines",
    "Envoyer ma proposition": "Send my suggestion",
    "Enregistrer sur GitHub": "Save to GitHub",
    "Clé Admin": "Admin key",
    "Tous": "All", "(vide)": "(empty)", "État": "Status", "Modifiés": "Modified", "Ajoutés": "Added", "Modifiés ou ajoutés": "Modified or added",
    "Aucune entrée ne correspond.": "No entry matches.", "Canal de diffusion": "Broadcast channel", "Trier les propositions": "Sort suggestions",
    "Carrés": "Grid squares", "Précision (m)": "Accuracy (m)", "Nom": "Name",
    "Recherche des noms sur iNaturalist…": "Looking up the names on iNaturalist…",
    "Faute de frappe corrigée, noms retrouvés sur iNaturalist : à vérifier avant d'enregistrer.": "Typo corrected, names found on iNaturalist: check them before saving.",
    "Noms retrouvés sur iNaturalist : à vérifier avant d'enregistrer.": "Names found on iNaturalist: check them before saving.",
    "Aucun nom retrouvé automatiquement : complète les champs à la main.": "No name found automatically: fill in the fields by hand.",
    "Recherche automatique indisponible : complète les champs à la main.": "Automatic lookup unavailable: fill in the fields by hand.",
    "vide": "empty", "oui": "yes", "non": "no",
    // bandeau d'arrivée depuis l'appli
    "Clé GitHub active.": "GitHub key active.",
    "Corrige l'entrée ouverte ci-dessous, clique sur « Enregistrer », puis sur": "Correct the entry opened below, click “Save”, then",
    "« Enregistrer sur GitHub »": "“Save to GitHub”",
    ": la modification sera en ligne directement.": ": the change will go live straight away.",
    "Tu proposes une modification.": "You are suggesting a change.",
    "Corrige l'entrée ouverte ci-dessous (ou complète la nouvelle), clique sur « Enregistrer », puis sur": "Correct the entry opened below (or fill in the new one), click “Save”, then",
    "Entrée enregistrée. Pour la soumettre : « Envoyer ma proposition » (en jaune).": "Entry saved. To submit it: “Send my suggestion” (in yellow).",
    "Entrée enregistrée, noms mis en forme. Pour la soumettre : « Envoyer ma proposition » (en jaune).": "Entry saved, names formatted. To submit it: “Send my suggestion” (in yellow).",
    "Aucune modification à envoyer : modifie d'abord une entrée.": "No change to send: edit an entry first.",
    "Envoyer quand même": "Send anyway", "Aucune modification à envoyer : modifie d'abord l'entrée.": "No change to send: edit the entry first.",
    "Le formulaire s'est ouvert, déjà rempli : il ne reste qu'à cliquer sur « Envoyer ».": "The form has opened, already filled in: just press “Submit”.",
    "Proposition longue : les lignes JSON ont été copiées, à coller dans le formulaire.": "Long suggestion: the JSON lines have been copied, paste them into the form.",
    "L'envoi n'est pas encore configuré.": "Sending is not set up yet.",
    "« Envoyer ma proposition »": "“Send my suggestion”",
    "(en jaune) : le formulaire s'ouvre déjà rempli. Elle sera vérifiée avant d'être intégrée.": "(in yellow): the form opens already filled in. It will be checked before being added.",
    // formulaire d'une entrée
    "Enregistrer": "Save", "Fermer": "Close", "Revenir à l'original": "Revert to original", "Dupliquer": "Duplicate", "Supprimer": "Delete",
    "Enregistrer quand même": "Save anyway",
    "— choisir —": "— choose —",
    "Alerte Telegram": "Telegram alert", "Alerte WhatsApp": "WhatsApp alert", "Pas d'alerte": "No alert",
    "espèce": "species", "sous-espèce": "subspecies",
    "Je suis sur place : envoyer ma position GPS": "I am on site: send my GPS position",
    "Placer le point": "Place the point", "Choisir les carrés": "Pick squares", "Toucher la carte pour": "Tap the map to",
    "Touche la carte à l'endroit exact : le point GPS s'y place et son carré se coche.": "Tap the exact spot on the map: the GPS point goes there and its square is ticked.",
    "Touche les carrés pour les cocher ou les décocher (un lieu-dit peut en couvrir plusieurs).": "Tap squares to tick or untick them (a place can cover several).",
    "Centrer sur la sélection": "Centre on selection",
    "Toute la carte": "Whole map",
    "Zoom de la carte": "Map zoom", "Zoomer": "Zoom in", "Dézoomer": "Zoom out",
    "Carrés de la carte": "Map squares",
    "clique sur la grille ou tape B8, B9": "click the grid or type B8, B9",
    "valeurs séparées par des virgules": "comma-separated values",
    "Le point GPS est en dehors de la carte d'Ouessant.": "The GPS point is outside the Ouessant map.",
    "Ce navigateur ne donne pas accès à la position GPS.": "This browser gives no access to the GPS position.",
    "Recherche de ta position…": "Getting your position…",
    "Ta position est en dehors de la carte d'Ouessant : rien n'a été modifié.": "Your position is outside the Ouessant map: nothing was changed.",
    "Position GPS indisponible : autorise la localisation, ou place le point sur la carte.": "GPS position unavailable: allow location access, or place the point on the map.",
    "Entrée enregistrée.": "Entry saved.", "Entrée enregistrée. Noms mis en forme.": "Entry saved. Names formatted.",
    "Entrée remise comme à l'origine.": "Entry reverted to the original.",
    "Copie ajoutée juste en dessous : modifie-la.": "Copy added just below: edit it.",
    "Entrée supprimée.": "Entry deleted.",
    "Annuler": "Undo",
    // coller des lignes
    "Coller des lignes JSON": "Paste JSON lines",
    "Colle une ou plusieurs lignes : la colonne « Ligne JSON » de ton Google Sheet, ou un fichier de modifications reçu par e-mail (les lignes « // » sont ignorées, les suppressions sont prises en compte). Si une entrée porte déjà la même valeur de": "Paste one or more lines: the “JSON line” column of your Google Sheet, or a changes file received by email (lines starting with “//” are ignored, deletions are applied). If an entry already has the same value of",
    ", elle sera remplacée, sinon elle sera ajoutée.": ", it will be replaced, otherwise it will be added.",
    "Vérifier": "Check", "Appliquer": "Apply",
    "Lignes illisibles : vérifie qu'il s'agit bien de JSON ({ … }).": "Unreadable lines: check that this really is JSON ({ … }).",
    "Rien à coller.": "Nothing to paste.",
    "Suppression": "Deletion", "Ajout": "Addition", "Remplacement": "Replacement",
    "Aucune différence.": "No difference.",
    "Introuvable dans la liste (déjà supprimée ?) : ignorée.": "Not found in the list (already deleted?): ignored.",
    // envoi d'une proposition
    "Tes modifications partent dans un formulaire, avec ton commentaire. Elles seront vérifiées avant d'être intégrées à l'appli.": "Your changes are sent through a form, with your comment. They will be checked before being added to the app.",
    "Commentaire (facultatif : pourquoi ce changement, d'où vient l'info…)": "Comment (optional: why this change, where the information comes from…)",
    "Envoyer": "Send",
    "Copier ma proposition": "Copy my suggestion",
    "Tu as une clé d'accès GitHub ?": "Do you have a GitHub access key?",
    "Ajouter ma clé": "Add my key",
    "pour enregistrer directement.": "to save directly.",
    "Aucune modification pour l'instant : modifie, ajoute ou supprime une entrée, puis reviens ici.": "No change yet: edit, add or delete an entry, then come back here.",
    "L'envoi n'est pas encore configuré. Utilise « Copier ma proposition ».": "Sending is not set up yet. Use “Copy my suggestion”.",
    "Ta proposition est longue : les lignes JSON ont été copiées. Colle-les dans le champ « Lignes JSON » du formulaire qui vient de s'ouvrir, puis clique sur « Envoyer ».": "Your suggestion is long: the JSON lines have been copied. Paste them into the “Lignes JSON” field of the form that has just opened, then press “Submit”.",
    "Le formulaire s'est ouvert, déjà rempli : il ne reste qu'à cliquer sur « Envoyer ». Ta proposition sera vérifiée, puis prise en compte dans les prochains jours.": "The form has opened, already filled in: just press “Submit”. Your suggestion will be checked, then applied within the next few days.",
    "Proposition copiée.": "Suggestion copied.",
    // enregistrement sur GitHub
    "Message du commit": "Commit message",
    "(1re ligne : résumé ; en dessous : le détail des modifications)": "(1st line: summary; below: the details of the changes)",
    "Aucune modification à enregistrer.": "No change to save.",
    "Attention :": "Warning:",
    "ce fichier vient de ton ordinateur, la version en ligne sera entièrement remplacée.": "this file comes from your computer, the online version will be entirely replaced.",
    "Enregistrement sur GitHub…": "Saving to GitHub…",
    "Voir le commit": "See the commit",
    "L'appli en ligne sera à jour d'ici quelques minutes.": "The online app will be up to date within a few minutes.",
    ". L'appli en ligne sera à jour d'ici quelques minutes.": ". The online app will be up to date within a few minutes.",
    // clé
    "Clé d'accès GitHub": "GitHub access key",
    "Pour enregistrer dans le dépôt": "To save to the repository",
    ", l'éditeur a besoin d'un jeton d'accès personnel « à granularité fine », limité à ce dépôt, avec la permission": ", the editor needs a “fine-grained” personal access token, limited to this repository, with the permission",
    "Contents : lecture et écriture": "Contents: read and write",
    ". Par défaut, il n'est gardé que dans cet onglet et oublié à sa fermeture.": ". By default, it is only kept in this tab and forgotten when it closes.",
    "Créer un jeton sur GitHub": "Create a token on GitHub",
    "Jeton": "Token",
    "Mémoriser la clé sur cet appareil": "Remember the key on this device",
    "À cocher seulement sur un appareil personnel. Non cochée, la clé reste dans cet onglet et disparaît à sa fermeture : aucune autre page ne peut la récupérer ensuite.": "Only tick this on a personal device. Unticked, the key stays in this tab and disappears when it closes: no other page can retrieve it afterwards.",
    "Vérifier et enregistrer": "Check and save",
    "Oublier la clé": "Forget the key",
    "Clé effacée de ce navigateur.": "Key deleted from this browser.",
    "Colle d'abord ton jeton.": "Paste your token first.",
    "Vérification…": "Checking…",
    "GitHub refuse ce jeton (mal copié ou expiré).": "GitHub rejects this token (badly copied or expired).",
    "ce jeton peut lire le dépôt mais pas y écrire : ajoute la permission « Contents : Read and write ».": "this token can read the repository but not write to it: add the “Contents: Read and write” permission.",
    "Clé valide : l'éditeur peut enregistrer dans AureLPhotog/ouessant-birds. Elle est mémorisée sur cet appareil.": "Valid key: the editor can save to AureLPhotog/ouessant-birds. It is remembered on this device.",
    "Clé valide : l'éditeur peut enregistrer dans AureLPhotog/ouessant-birds. Elle sera oubliée à la fermeture de l'onglet.": "Valid key: the editor can save to AureLPhotog/ouessant-birds. It will be forgotten when the tab closes.",
    "Tes modifications non envoyées de cette liste seront perdues. Changer de liste ?": "Your unsent changes to this list will be lost. Change list?",
    "Choix de la liste": "Choose a list",
    // noms des champs (seul l'affichage est traduit : les fichiers gardent leurs noms de champs)
    "Nom Français": "French name", "Nom Scientifique": "Scientific name", "Nom Anglais": "English name",
    "Type de taxon": "Taxon type", "Proposition de Canal de Diffusion Ouessant": "Reporting channel (Ouessant)",
    "Verrouillée": "Locked", "🔑 Mode admin": "🔑 Admin mode", "Clé Admin active sur cet appareil": "Admin key active on this device", "Espèce commune verrouillée": "Locked common species",
    "🔒 Espèce commune : elle est verrouillée et ne peut pas être modifiée.": "🔒 Common species: it is locked and cannot be changed.",
    "🔒 Espèce verrouillée : les visiteurs ne peuvent pas la modifier. Décoche « Verrouillée » pour la rouvrir aux propositions.": "🔒 Locked species: visitors cannot change it. Untick “Locked” to open it to suggestions again.",
    "Espèce commune verrouillée : pas de modification possible.": "Locked common species: no changes possible.",
    "nom": "name", "carres": "squares", "precision_m": "accuracy (m)", "verifie": "checked on site",
    // réglages d'affichage
    "Affichage": "Display", "Thème": "Theme", "Auto": "Auto", "Clair": "Light", "Sombre": "Dark",
    "Couleurs": "Colours", "Standard": "Standard", "Daltonisme": "Colour-blind",
    "« Daltonisme » utilise des couleurs distinguables par la plupart des personnes daltoniennes. « Auto » suit le réglage du téléphone.": "“Colour-blind” uses colours most colour-blind people can tell apart. “Auto” follows your device’s setting."
  };

  // ---------- Modèles avec des parties variables ----------
  const PATTERNS = [
    [/^Le point GPS est bien dans le carré (\w+)\.$/, (c) => `The GPS point is inside square ${c}.`],
    [/^Le point GPS est dans le carré$/, () => 'The GPS point is in square'],
    [/^, qui n'est pas sélectionné\.$/, () => ', which is not selected.'],
    [/^Ajouter (\w+)$/, (c) => `Add ${c}`],
    [/^\(position GPS ± (\d+) m(?: : précision faible, réessaie à découvert)?\)$/, (m, full) => `(GPS position ± ${m} m${/faible/.test(full) ? ': low accuracy, try again in the open' : ''})`],
    [/^Le point GPS tombe dans le carré (\w+), qui ne fait pas partie des carrés sélectionnés \((.*)\)\.$/, (c, l) => `The GPS point falls in square ${c}, which is not one of the selected squares (${l}).`],
    [/^(\d+) entrées$/, (n) => `${n} entries`],
    [/^(\d+) (oiseaux?|lieux?)(?:, (\d+) affichés)?$/, (n, w, m) => `${n} ${/^oiseau/.test(w) ? (n > 1 ? 'birds' : 'bird') : (n > 1 ? 'places' : 'place')}${m ? `, ${m} shown` : ''}`],
    [/^(\d+) entrées, (\d+) affichés$/, (n, m) => `${n} entries, ${m} shown`],
    [/^(\d+) modifiées?$/, (n) => `${n} modified`],
    [/^(\d+) ajoutées?$/, (n) => `${n} added`],
    [/^(\d+) supprimées?$/, (n) => `${n} deleted`],
    [/^Afficher (\d+) de plus \((\d+) restantes\)$/, (a, b) => `Show ${a} more (${b} left)`],
    [/^avant : (.*)$/, (v) => `before: ${v === 'vide' ? 'empty' : v}`],
    [/^(.*) \(valeur non reconnue\)$/, (v) => `${v} (unrecognised value)`],
    [/^« (.+) » doit être un nombre\.$/, (k) => `“${k}” must be a number.`],
    [/^« (.+) » ne doit contenir que des nombres\.$/, (k) => `“${k}” must only contain numbers.`],
    [/^« (.+) » n'est pas un JSON valide\.$/, (k) => `“${k}” is not valid JSON.`],
    [/^Carrés? inconnus? : (.*) \(de A1 à S13\)\.$/, (l) => `Unknown square(s): ${l} (from A1 to S13).`],
    [/^par (.+)$/, (k) => `by ${EX[key(k)] || k}`],
    [/^(\d+) lignes? lues? : (\d+) remplacements?, (\d+) ajouts?, (\d+) suppressions?\.(.*)$/, (n, r, a, d, rest) => `${n} line(s) read: ${r} replacement(s), ${a} addition(s), ${d} deletion(s).${rest.replace(/Attention, champs? inconnus? : /, 'Warning, unknown field(s): ')}`],
    [/^(\d+) lignes? appliquées?\. Affichage des entrées modifiées ou ajoutées\.$/, (n) => `${n} line(s) applied. Showing modified or added entries.`],
    [/^« (.+) » est déjà dans la liste, verrouillée \(espèce commune\) : pas de modification possible\.$/, (n) => `“${n}” is already in the list, locked (common species): no changes possible.`],
    [/^Fichier illisible : (.*)$/, (e) => `Unreadable file: ${e === 'JSON invalide' ? 'invalid JSON' : e}`],
    [/^JSON illisible : (.*)$/, (e) => `Unreadable JSON: ${e}`],
    [/^(Oiseaux|Lieux) : (\d+) (?:oiseaux?|lieux?) chargés depuis GitHub\.$/, (f, n) => `${f === 'Oiseaux' ? 'Birds' : 'Places'}: ${n} loaded from GitHub.`],
    [/^Impossible d'ouvrir depuis GitHub : (.*)$/, (e) => `Could not open from GitHub: ${trError(e)}`],
    [/^Échec : (.*)$/, (e) => `Failed: ${trError(e)}`],
    [/^Fichier :$/, () => 'File:'],
    [/^sur la branche$/, () => 'on branch'],
    [/^\. (\d+) modifiée\(s\), (\d+) ajoutée\(s\), (\d+) supprimée\(s\)\.$/, (m, a, d) => `. ${m} modified, ${a} added, ${d} deleted.`],
    [/^\. Aucune modification à enregistrer\.$/, () => '. No change to save.'],
    [/^Version des listes : (.+)\.$/, (v) => `Lists version: ${v}.`],
    [/^Le numéro de version des listes n'a pas pu être mis à jour\.$/, () => 'The lists version number could not be updated.'],
    [/^Enregistré sur$/, () => 'Saved to'],
    [/^!$/, () => '!'],
    [/^Remplacer (.+) sur GitHub par cette version \?$/, (f) => `Replace ${f} on GitHub with this version?`],
    [/^(Oiseaux|Lieux), modifié le (.+)$/, (f, d) => `${f === 'Oiseaux' ? 'Birds' : 'Places'}, edited on ${d}`],
    [/^(.+), modifié le (.+)$/, (f, d) => `${f.replace('(GitHub, branche ', '(GitHub, branch ')}, edited on ${d}`]
  ];
  const ERRORS = [
    [/^clé refusée par GitHub \(expirée ou invalide \?\)$/, 'key rejected by GitHub (expired or invalid?)'],
    [/^(.+) introuvable sur la branche (.+)$/, '$1 not found on branch $2'],
    [/^accès refusé ou limite de requêtes atteinte, réessaie dans quelques minutes$/, 'access denied or request limit reached, try again in a few minutes'],
    [/^la liste a été modifiée sur GitHub depuis que tu l'as ouverte\. (.*)$/, 'the list was changed on GitHub since you opened it. To avoid overwriting anything, your changes have just been copied: reopen the list from GitHub, then paste them with “Paste lines”.'],
    [/^clé refusée \(expirée \?\)\. Mets-la à jour avec « Gérer la clé »\.$/, 'key rejected (expired?). Update it with “Manage the key”.'],
    [/^la clé n'a pas le droit d'écrire dans ce dépôt (.*)$/, 'the key is not allowed to write to this repository (missing “Contents: Read and write” permission?).'],
    [/^la branche (.+) est protégée par une règle du dépôt(.*)$/, 'branch $1 is protected by a repository rule, and this key cannot write to it directly.'],
    [/^erreur (\d+)\.?$/, 'error $1'],
    [/^le dépôt est inaccessible avec ce jeton \(erreur (\d+)\)\.$/, 'the repository cannot be reached with this token (error $1).']
  ];
  function trError(e){ const t = e.replace(/\.$/, ''); for (const [re, r] of ERRORS) if (re.test(t)) return t.replace(re, r) + '.'; return e; }

  // ---------- Moteur de traduction ----------
  const key = s => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const EX = {}; Object.entries(EXACT).forEach(([fr, en]) => { EX[key(fr)] = en; });
  function tr(fr){
    const k = key(fr); if (!k) return null;
    if (EX[k] !== undefined) return EX[k];
    for (const [re, f] of PATTERNS){ const m = k.match(re); if (m) return f(...m.slice(1), k); }
    for (const [re, r] of ERRORS) if (re.test(k)) return k.replace(re, r);
    return null;
  }
  let lang = store.get(LANG_KEY) || ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
  if (lang !== 'fr' && lang !== 'en') lang = 'fr';
  const ORIG = new WeakMap(), SHOWN = new WeakMap();
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const skip = n => { const el = n.nodeType === 1 ? n : n.parentElement; return !el || el.closest('script,style,textarea,[data-notr]'); };
  function doText(n){
    if (skip(n)) return;
    const cur = n.nodeValue, fr = (ORIG.has(n) && cur === SHOWN.get(n)) ? ORIG.get(n) : cur;
    if (lang === 'fr'){ if (fr !== cur){ n.nodeValue = fr; } ORIG.delete(n); return; }
    const en = tr(fr); if (en === null){ ORIG.delete(n); return; }
    const out = (fr.match(/^\s*/)[0]) + en + (fr.match(/\s*$/)[0]);
    ORIG.set(n, fr); SHOWN.set(n, out); if (cur !== out) n.nodeValue = out;
  }
  function doAttrs(el){
    if (skip(el)) return;
    for (const a of ATTRS){
      if (!el.hasAttribute(a)) continue;
      const d = 'data-fr-' + a, cur = el.getAttribute(a), saved = el.getAttribute(d);
      const fr = (saved !== null && el.getAttribute('data-en-' + a) === cur) ? saved : cur;
      if (lang === 'fr'){ if (fr !== cur) el.setAttribute(a, fr); el.removeAttribute(d); continue; }
      const en = tr(fr); if (en === null) continue;
      el.setAttribute(d, fr); el.setAttribute('data-en-' + a, en); if (cur !== en) el.setAttribute(a, en);
    }
  }
  function walk(root){
    if (root.nodeType === 3){ doText(root); return; }
    if (root.nodeType !== 1) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = tw.nextNode())) n.nodeType === 3 ? doText(n) : doAttrs(n);
  }
  const mo = new MutationObserver(muts => {
    for (const m of muts){
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  const nativeConfirm = window.confirm.bind(window);
  window.confirm = msg => nativeConfirm(lang === 'en' ? (tr(msg) || msg) : msg);

  // ---------- Thème et couleurs (mêmes réglages que l'appli) ----------
  let theme = store.get(THEME_KEY) || 'auto', cvd = store.get(CVD_KEY) === '1';
  function applyPrefs(){
    const r = document.documentElement;
    if (theme === 'light' || theme === 'dark') r.setAttribute('data-theme', theme); else r.removeAttribute('data-theme');
    if (cvd) r.setAttribute('data-cvd', '1'); else r.removeAttribute('data-cvd');
    document.querySelectorAll('.seg[data-pref="theme"] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === theme)));
    document.querySelectorAll('.seg[data-pref="cvd"] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === (cvd ? '1' : '0'))));
  }
  function applyLang(){
    document.documentElement.lang = lang;
    document.title = lang === 'en' ? 'List editor · Birds of Ouessant' : 'Éditeur de listes · Oiseaux d\u2019Ouessant';
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    walk(document.body);
  }
  applyPrefs();
  function init(){
    const tools = document.querySelector('header .tools');
    if (tools){
      tools.addEventListener('click', e => {
        const lb = e.target.closest('.lang button');
        if (lb){ lang = lb.dataset.lang; store.set(LANG_KEY, lang); applyLang(); return; }
        if (e.target.closest('#prefsBtn')){ e.stopPropagation(); const p = document.getElementById('prefsPanel'); p.hidden = !p.hidden; document.getElementById('prefsBtn').setAttribute('aria-expanded', String(!p.hidden)); return; }
        const sb = e.target.closest('.seg button');
        if (sb){ e.stopPropagation();
          if (sb.parentElement.dataset.pref === 'theme'){ theme = sb.dataset.v; store.set(THEME_KEY, theme); }
          else { cvd = sb.dataset.v === '1'; store.set(CVD_KEY, cvd ? '1' : '0'); }
          applyPrefs(); }
      });
      document.addEventListener('click', e => { const p = document.getElementById('prefsPanel'); if (p && !p.hidden && !e.target.closest('header .tools')){ p.hidden = true; document.getElementById('prefsBtn').setAttribute('aria-expanded', 'false'); } });
      document.addEventListener('keydown', e => { const p = document.getElementById('prefsPanel'); if (e.key === 'Escape' && p && !p.hidden){ p.hidden = true; document.getElementById('prefsBtn').focus(); } });
    }
    applyPrefs(); applyLang();
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.OuessantEditeurLangue = { tr, get lang(){ return lang; } };
})();
