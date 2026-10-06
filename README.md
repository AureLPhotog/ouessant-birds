# Oiseaux d'Ouessant

Petite appli web pour les observateurs d'oiseaux à Ouessant :

- **Oiseaux** : sur quel canal annoncer une observation (Alerte Telegram, Alerte WhatsApp, Pas d'alerte). Toucher le canal prépare le **message d'alerte** (voir plus bas). Un filtre de canal (Telegram, WhatsApp, Pas d'alerte) affiche en dessous un rappel discret de son usage habituel (rien pour « Toutes »). Sur la liste complète, un **rail de lettres** à droite permet d'y glisser le doigt pour passer directement d'une lettre à l'autre (aussi dans **Lieux**) ;
- **Lieux** : coordonnées GPS indicatives des lieux-dits de l'île, avec un aperçu de la carte ;
- **Où suis-je ?** : les lieux-dits les plus proches de sa position (de 3 à 10, au choix avec le curseur). Toucher un lieu-dit ouvre Google Maps sur son point GPS. Un bouton **Partager ma position** prépare un message (coordonnées, lien Google Maps, lieu-dit le plus proche) ;
- **le phare** (en haut à gauche) : météo du jour à Ouessant, rappel « Quel canal ? » (Telegram : raretés à l'échelle nationale ; WhatsApp : raretés locales, espèces peu communes sur l'île et suivi des raretés déjà annoncées ; rien : espèces communes ou nicheuses), QR code pour partager l'appli, numéro de version et informations légales.
- **en bas de page** : le guide d'utilisation (PDF), **« Une question, un retour ? »** (message anonyme, envoyé par le formulaire Google des propositions, dans le seul champ commentaire ; la page Administration le range dans l'onglet **Messages**) et l'**éditeur des listes** (ouvert aussi par le crayon ✎ d'une espèce, « Proposer une meilleure position » d'un lieu-dit, ou « Proposer un nouvel oiseau / lieu-dit »).

En ligne : <https://aurelphotog.github.io/ouessant-birds/>

L'appli fonctionne **hors connexion** une fois ouverte une première fois (sauf la météo).

---

## Organisation des fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | l'appli (structure de la page) |
| `editeur.html` | l'éditeur des listes (onglets Oiseaux / Lieux ; enregistrement direct sur GitHub avec la « Clé Admin » ; sans clé, envoi d'une proposition) |
| `admin.html`, `js/admin.js`, `css/admin.css` | **page Administration** : tri des propositions et messages reçus, réglages des visiteurs, listes par année (page réservée : verrouillée par la Clé Admin, voir « Page Administration ») |
| `ouessant_birds.json` | **liste des oiseaux** et canal d'annonce de chacun |
| `archives/` | **listes des oiseaux des années passées** (`ouessant_birds_2026.json`…) et sauvegardes, gérées depuis la page Administration (voir « Listes des oiseaux par année ») |
| `lieux_ouessant.json` | **liste des lieux-dits** et leurs coordonnées |
| `reglages.json` | réglages de l'admin : verrou des espèces « Verrouillée » et champs modifiables par les visiteurs (canal seulement / tous), modifiés depuis la page Administration |
| `version_listes.json` | numéro de version des listes (`{"app": "4.0", "rev": 2}` → affiché « v4.0.2 »), mis à jour par l'éditeur à chaque enregistrement |
| `css/polices.css`, `polices/` | polices Spectral et Public Sans hébergées avec l'appli (licence SIL OFL 1.1, voir `polices/LICENCES.txt`) : plus d'appel à Google Fonts |
| `css/commun.css` | couleurs (clair, sombre, daltonisme) et bases, partagées par l'appli et l'éditeur |
| `css/appli.css`, `css/editeur.css` | mise en page de l'appli et de l'éditeur |
| `js/textes.js` | **tous les textes de l'appli**, en français et en anglais |
| `js/carte.js` | grille des carrés de la carte et recalage GPS (partagé appli / éditeur) |
| `js/recherche.js` | recherche tolérante aux fautes de frappe |
| `js/version.js` | **numéro de version de l'appli** (à augmenter à chaque modification de l'appli) |
| `js/appli.js`, `js/editeur.js` | fonctionnement de l'appli et de l'éditeur |
| `js/editeur-langue.js` | éditeur : version anglaise (tables de traduction), thème clair / sombre, couleurs pour daltonisme |
| `sw.js` | mode hors connexion |
| `carte_ouessant.webp` (et `.jpg` en secours), `Map_Ouessant.pdf` | carte de l'île, de l'Association Naturaliste d'Ouessant |
| `phare_creach.svg` (et `phare_creach_eteint.svg`, affiché hors connexion), `favicon*`, `icon-*.png`, `apple-touch-icon.png`, `apercu.png`, `qr_ouessant.svg` | images, icônes, aperçu de lien, QR code |
| `oriole_baltimore.webp` | oriole de Baltimore posé sur le cadre du QR code (panneau du phare) : photo d'Aurélien, détourée et légèrement stylisée. Seule cette version retouchée est dans le dépôt, pas la photo d'origine ; pour la remplacer, garder le même nom et la même taille (≈ 158 × 270 px, fond transparent). L'oiseau en vol de l'easter egg (5 clics sur le phare) est un dessin dans `js/appli.js` (`BIRD_SVG`) |
| `manifest.webmanifest` | raccourci sur l'écran d'accueil du téléphone |
| `docs/Guide_utilisation.pdf` | guide d'utilisation (l'appli, puis l'éditeur pour proposer une correction) : à partager, et lié en bas de l'appli et de l'éditeur |
| `scripts/verifier_listes.py` | vérification des listes (voir « Vérifier les listes ») |

## Les listes

### `ouessant_birds.json`

```json
{"Nom Français": "Buse pattue", "Nom Scientifique": "Buteo lagopus", "Nom Anglais": "Rough-legged Buzzard",
 "Type de taxon": "espèce", "Proposition de Canal de Diffusion Ouessant": "Télégram"}
```

- **Canal** : `Télégram`, `Whatsapp` ou `Pas d'annonce` (l'appli les affiche « Alerte Telegram », « Alerte WhatsApp », « Pas d'alerte »).
- **Type de taxon** : `espèce` ou `sous-espèce`.
- **Verrouillée** (facultatif) : `true` pour une **espèce commune** que les visiteurs ne doivent pas modifier.
  Pré-rempli au départ avec toutes les espèces en `Pas d'annonce` (140), à ajuster dans l'éditeur avec la Clé Admin
  (case **Verrouillée** ; décochée, le champ disparaît). Voir « Espèces communes verrouillées ».

**Règles d'écriture des noms** (appliquées automatiquement par l'éditeur à l'enregistrement, code dans `js/noms.js`) :
- **français** : une majuscule au premier mot, puis des minuscules, sauf les noms propres : `Bécasseau de Baird`, mais `Bécasseau minute`, `Grand corbeau`, `Pouillot ibérique`. Un mot qui suit « de » ou « d' » garde la casse saisie (`d'Europe`, `de Baird`) ; après « du » et « des », minuscule (`des roseaux`) sauf nom propre connu (`du Canada`, `des Balkans`). Apostrophes droites ('). Sous-espèces : `(ssp. nom)`.
- **anglais** : une majuscule à chaque mot (`Steppe Eagle`, `Rough-legged Buzzard`).
- **scientifique** : majuscule au genre, minuscules ensuite (`Aquila nipalensis`).

Pour qu'un nom propre garde sa majuscule partout dans le nom, l'ajouter à la liste `PROPRES` de `js/noms.js`.

**Méthode de classement** : établi à la main, en s'inspirant des données de Faune France (l'appli n'y accède pas), en croisant la fréquence de chaque espèce à Ouessant (depuis 1900) avec sa rareté à l'échelle nationale (données 2025), puis ajusté à la main.

### `lieux_ouessant.json`

```json
{"nom": "Pern", "carres": ["B8"], "lat": 48.4502, "lon": -5.13905, "precision_m": 100, "verifie": false}
```

La position affichée dépend de `precision_m` et `verifie` :

| `precision_m` | `verifie` | Dans l'appli |
|---|---|---|
| 50 m ou moins | — | position exacte (phares) : point plein |
| — | `true` | vérifiée sur le terrain : point plein |
| 51 à 499 m | `false` | placée sur la carte : anneau |
| 500 m ou plus | `false` | centre du carré, recalculé (les `lat`/`lon` enregistrées sont ignorées) |

## Le message d'alerte

Sur une espèce « Alerte Telegram » ou « Alerte WhatsApp », toucher le canal :

1. l'appli relève la position GPS (elle suit le GPS jusqu'à 8 secondes et garde le relevé le plus précis) ;
2. elle prépare ce message et le **copie** :
   ```
   Pouillot Ibérique (Phylloscopus ibericus)
   GPS : 48.45020, -5.13900
   Lieu-dit le plus proche : Pointe de Pern
   https://www.google.com/maps?q=48.450200,-5.139000
   ```
3. un bouton « Ouvrir WhatsApp » ou « Ouvrir Telegram » ouvre l'appli de messagerie : l'utilisateur choisit lui-même le groupe et colle le message. **Aucun lien de groupe n'est publié dans l'appli.**
4. pour une espèce « Alerte Telegram », une **bulle** rappelle qu'un oiseau qui **stationne depuis plusieurs jours** s'annonce plutôt
   sur WhatsApp, même s'il est très rare, avec un bouton **Envoyer sur WhatsApp** (même message).

Cas particuliers : hors de l'île, l'appli prévient qu'on ne peut pas signaler l'oiseau ; si le GPS est indisponible, le
message ne contient que l'espèce ; si la précision dépasse 1900 m, l'appli explique que la position exacte n'est pas
partagée (sur Chrome Android : menu ⋮ → Paramètres → Paramètres des sites → Position → choisir le site → **Exacte**).

## Mettre à jour les listes

1. Ouvrir l'éditeur : <https://aurelphotog.github.io/ouessant-birds/editeur.html>
2. Choisir l'onglet **Oiseaux** ou **Lieux**, modifier, puis **Enregistrer sur GitHub** (il faut la « Clé Admin », voir ci-dessous).
3. Les **propositions des visiteurs** passent aussi par l'éditeur : dans l'appli, le petit crayon ✎ à droite d'une espèce,
   « Proposer une meilleure position », « Proposer un nouvel oiseau / lieu-dit » ouvrent l'éditeur sur la bonne liste
   et la bonne entrée (pour un lieu, le bouton « Je suis sur place : envoyer ma position GPS » est dans l'éditeur).
   Le visiteur modifie, puis clique sur **Envoyer ma proposition** : un formulaire Google unique s'ouvre, prérempli avec
   trois champs (Modifications, Commentaire, Lignes JSON). Dans le Google Sheet des réponses, copier la colonne
   « Lignes JSON » dans l'éditeur, bouton **Coller des lignes** (visible seulement avec une clé valide).
   Le lien prérempli du formulaire est dans `js/editeur.js` (`PROPOSAL_FORM`), avec les mots MODIFS, COMMENTAIRE et JSON.
4. Pour revenir de l'éditeur à l'appli : le bouton « Revenir à l'appli » en bas de page, ou le phare.

**Clé Admin** : jeton GitHub « à granularité fine », limité au dépôt `ouessant-birds`, permission
*Contents : Read and write*, avec une date d'expiration. Ne jamais la partager ni l'écrire dans un fichier.
Cochée « Mémoriser la clé sur cet appareil », elle est oubliée automatiquement au bout de **30 jours** ; sinon elle disparaît à la fermeture de l'onglet.

## Page Administration : trier les propositions

Quand beaucoup de propositions arrivent (parfois plusieurs pour la même espèce), la page **`admin.html`** les regroupe :

1. Ouvrir l'éditeur avec la Clé Admin → bouton **Administration** (ou directement `admin.html`, qui demande la clé).
2. Dans Google Forms : **Réponses → Afficher dans Sheets**, puis **Fichier → Télécharger → .csv**, et choisir ce fichier dans la page.
   Le fichier est lu sur l'appareil : rien n'est mis en ligne.
3. Choisir l'onglet **Oiseaux**, **Lieux** ou **Messages** (questions et retours envoyés depuis l'appli : à lire, puis « Marquer ces messages comme lus »). Pour Oiseaux et Lieux (les deux listes ne sont jamais mélangées : tri, lignes JSON et marquage se font
   onglet par onglet), puis la période (tous les jours ou un jour). Chaque espèce / lieu-dit a sa carte : la valeur actuelle, chaque proposition
   différente (avec le nombre de personnes, les dates et les commentaires), et les boutons **Valider** / **Tout rejeter**.
   Les propositions déjà conformes à la liste sont signalées et ignorées. Les décisions sont gardées dans le navigateur.
4. **Générer les lignes JSON des oiseaux** (ou **des lieux**) → les coller dans le **même onglet** de l'éditeur (l'éditeur refuse
   des lignes de lieux dans les oiseaux et inversement) (**Coller des lignes → Vérifier → Appliquer →
   Enregistrer sur GitHub**). Puis **Marquer les réponses décidées comme traitées** : avec le script Google, la décision est écrite dans une
   colonne **« Traitée »** de la feuille (ajoutée à droite des réponses) : « validée le … », « rejetée le … », « en partie validée le … »
   ou « lu le … » pour un message, puis une ligne par proposition (✓ validée, ✗ rejetée, ○ déjà comme ça dans la liste) ;
   avec le fichier .csv seul, la feuille n'est pas modifiée : c'est noté dans le navigateur. Une réponse qui contient encore une proposition
   « à décider » n'est pas marquée. Les réponses traitées ne sont plus proposées au tri, mais rien n'est effacé : elles restent visibles,
   avec leur décision, dans **« Réponses déjà traitées »** (ou **« Messages déjà lus »**) en bas de chaque onglet. Les réponses marquées
   avant la version 5.28 n'ont que la date : elles y apparaissent avec « décision non notée ». Pour remettre une réponse à trier,
   vider sa case « Traitée » dans la feuille.

### Récupération automatique des réponses (à installer une fois)

Au lieu de télécharger le .csv, la page peut aller chercher les réponses elle-même, grâce à un petit script Google attaché à la
feuille des réponses (`scripts/apps_script_reponses.gs`). Le script ne répond qu'avec un **code secret** connu de toi seul.

1. Ouvrir la feuille Google des réponses → **Extensions → Apps Script**. Effacer le contenu, coller celui de
   `scripts/apps_script_reponses.gs`, enregistrer (icône disquette).
2. Dans la page Administration : **Réglages de la récupération automatique → Créer un code**, et copier ce code.
3. Dans Apps Script : **Paramètres du projet** (roue dentée) → **Propriétés du script → Ajouter une propriété** :
   nom `CODE`, valeur = le code copié → Enregistrer.
4. **Déployer → Nouveau déploiement** → type **Application Web** → *Exécuter en tant que* : **Moi** ;
   *Qui a accès* : **Tout le monde** → Déployer → autoriser l'accès (compte Google) → copier l'**URL de l'application Web** (finit par `/exec`).
   (« Tout le monde » est nécessaire pour que la page puisse l'appeler ; sans le code secret, le script ne renvoie rien.)
5. Dans la page Administration : coller l'adresse et le code → **Enregistrer les réglages** → **Récupérer les réponses**.

Après une mise à jour du script (nouveau contenu de `scripts/apps_script_reponses.gs`) : le recoller dans Apps Script, puis
**Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer** (l'adresse `/exec` ne change pas).
Pour changer le code : modifier la propriété `CODE` dans Apps Script, puis dans la page. Pour tout couper : Apps Script →
**Déployer → Gérer les déploiements → Archiver**. Documentation Google : <https://developers.google.com/apps-script/guides/web>.
Le fichier .csv reste possible en secours.

### Alertes par mail (facultatif)

Le même script peut t'envoyer un mail : **toutes les Y nouvelles réponses**, et/ou **chaque matin vers 8 h si la plus ancienne
réponse non traitée a plus de X jours** (rappel répété tant qu'elle n'est pas traitée).

1. Dans Apps Script → **Paramètres du projet → Propriétés du script**, ajouter (au choix) :
   `ALERTE_NB` = Y (ex. `20`), `ALERTE_JOURS` = X (ex. `3`), et si besoin `ALERTE_MAIL` = l'adresse qui reçoit les mails
   (par défaut : ton compte Google). Vide ou `0` = alerte coupée. Modifiable à tout moment, sans rien réinstaller.
2. En haut de l'éditeur Apps Script, choisir la fonction **installerAlertes** → **Exécuter** → autoriser l'envoi de mails
   (une seule fois). Pour tout arrêter : exécuter **couperAlertes**.

« Non traitée » = colonne **Traitée** vide : elle est remplie par le bouton « Marquer les réponses décidées comme traitées » de la page
de tri **en mode récupération automatique** (avec le .csv, le marquage reste sur l'appareil et le script ne le voit pas).
Documentation Google : <https://developers.google.com/apps-script/guides/triggers/installable> et quotas d'envoi :
<https://developers.google.com/apps-script/guides/services/quotas>.

Confidentialité : la page est verrouillée (la clé est vérifiée auprès de GitHub : seul le propriétaire du dépôt l'ouvre) et ne contient
aucune donnée. Son code reste visible, comme tout le dépôt public ; les réponses, elles, ne quittent jamais la feuille Google et ton appareil.

## Listes des oiseaux par année

Une espèce à annoncer sur WhatsApp une année peut ne plus l'être l'année suivante : la page Administration (`admin.html`, section
**Listes des oiseaux par année**) garde une liste par année.

- `ouessant_birds.json` reste **la liste de l'année en cours** : c'est toujours elle que l'appli et l'éditeur utilisent.
- **Archivage automatique** : à la première ouverture de la page Administration dans une nouvelle année, la liste de l'année écoulée est
  copiée dans `archives/ouessant_birds_<année>.json`. Elle est retrouvée dans l'historique GitHub telle qu'elle était le
  31 décembre à minuit (heure de Paris), même si la page n'est ouverte qu'en février. La nouvelle année démarre avec la même liste.
- Pour chaque liste archivée : **Différences avec la liste en cours** (canaux changés, espèces ajoutées ou retirées),
  **Télécharger**, et **Reprendre comme liste <année>** : elle remplace `ouessant_birds.json`, après une sauvegarde automatique
  de la liste remplacée (`archives/ouessant_birds_<année>_sauvegarde_<date>_<heure>.json`), que l'on peut reprendre de la même façon.
- **Sauvegarder la liste actuelle** fait une sauvegarde à la main, à tout moment.

La première archive (2026) sera créée en janvier 2027. Les lieux-dits, eux, ne sont pas concernés.

## Espèces communes verrouillées

- **Dans l'appli** : un **cadenas** remplace le crayon ✎ ; on ne peut pas proposer de modification. **Pour l'admin**
  (Clé Admin entrée dans l'éditeur et reconnue par GitHub, dans cet onglet, ou sur l'appareil avec « Mémoriser »), toutes les
  espèces gardent leur crayon. L'appli ne fait que constater la présence de la clé dans le navigateur, sans l'utiliser ni l'envoyer.
- **Bouton « 🔑 Mode admin »** : en haut à droite de l'appli, de l'éditeur et de la page Administration, tant que la Clé Admin est active (rien sinon).
  Il ouvre le panneau de la clé dans l'éditeur (`editeur.html?cle`) : la changer ou l'oublier.
- **Dans l'éditeur, sans la Clé Admin** : l'espèce s'affiche avec 🔒, en lecture seule (pas d'Enregistrer, Supprimer ni Dupliquer),
  et on ne peut pas la recréer comme « nouvel oiseau » (même nom scientifique). La case **Verrouillée** n'est pas montrée.
- **Dans l'éditeur, avec la Clé Admin** : tout reste modifiable, avec un rappel ; la case **Verrouillée** et le filtre du même nom
  servent à gérer la liste.
- **Dans la page Administration** : une proposition sur une espèce verrouillée est **rejetée d'office** (filtre « rejetées », étiquette 🔒) ;
  « Valider quand même » reste possible. Une proposition qui touche au verrou lui-même est signalée « change le verrou ».

**Ce que les visiteurs peuvent modifier (oiseaux)** : deux réglages pour tout le monde, dans la page Administration, enregistrés dans
`reglages.json` (`{"verrou": true, "champs": "canal"}` par défaut) :
- **`verrou`** : `true` = les espèces marquées « Verrouillée » ont un cadenas, aucune proposition ; `false` = elles suivent la règle
  des autres (pratique au lancement de l'appli) ;
- **`champs`** : `"canal"` (fonctionnement normal) = sur une espèce **déjà dans la liste**, un visiteur ne peut proposer **qu'un autre
  canal** (seul ce menu est affiché, ni suppression ni duplication ; recréer une espèce existante est refusé ; une espèce verrouillée
  n'affiche aucun champ) ; `"tous"` = tous les champs.

Ajouter une nouvelle espèce reste toujours possible. Les lieux-dits ne sont pas concernés. Avec la Clé Admin, tout est modifiable.
L'éditeur ajoute à chaque proposition d'oiseau une ligne `// réglages : verrou actif|levé, champs canal|tous` : la page Administration juge
chaque proposition selon les réglages **du moment de son envoi** (« rejetée d'office » si espèce verrouillée, ou si elle change autre
chose que le canal en mode « canal seulement » ; « Valider quand même » reste possible).

Le blocage de l'éditeur n'est qu'un confort : le formulaire Google est public, quelqu'un peut y envoyer n'importe quoi. La vraie
barrière, c'est que seule la Clé Admin enregistre sur GitHub, et que la page Administration écarte ces propositions. Comme le verrou est
dans `ouessant_birds.json`, il suit les **listes par année** (archivé chaque 1er janvier).

## Sécurité

- **Politique de sécurité du contenu (CSP)** : une balise `<meta http-equiv="Content-Security-Policy">` en tête de `index.html` et
  d'`editeur.html` n'autorise que les scripts de l'appli et les connexions nécessaires (Open-Meteo pour l'appli ; GitHub et
  iNaturalist pour l'éditeur). **Ajouter un service extérieur** (autre API, autre script) demande de l'ajouter dans cette balise.
- **Scripts intégrés de l'éditeur** : les deux balises `<script>` d'`editeur.html` sont autorisées par leur empreinte SHA-256
  (`'sha256-…'` dans la CSP). Si l'une change, il faut recalculer son empreinte, sinon l'éditeur ne se charge plus :
  `python3 -c "import re,hashlib,base64;s=open('editeur.html').read();print([base64.b64encode(hashlib.sha256(x.encode()).digest()).decode() for x in re.findall(r'<script>(.*?)</script>',s,re.S)])"`
- **Clickjacking** : l'éditeur refuse de s'afficher dans le cadre (`iframe`) d'un autre site.
- **Polices** hébergées dans le dépôt : les visiteurs ne sont plus envoyés vers Google (vie privée, RGPD).
- **À garder en tête** : tous les sites GitHub Pages du compte partagent l'origine `aurelphotog.github.io` (et donc le stockage
  du navigateur, où peut se trouver la clé mémorisée). Ne publier sur GitHub Pages, sous ce compte, que des projets de confiance.
  La clé Admin peut modifier tout le dépôt (y compris le code) : en cas de doute, la révoquer sur GitHub.

À chaque enregistrement d'une liste, l'éditeur fait **deux commits** : la liste, puis `version_listes.json` (numéro de version des listes).

### Vérifier les listes

`python3 scripts/verifier_listes.py` contrôle les deux listes (canal inconnu, doublon, carré inexistant, coordonnées hors de
l'île…) ; les avertissements (nom anglais manquant…) ne bloquent rien. Aucune vérification automatique n'est
configurée dans le dépôt pour l'instant (pas de fichier `.github/workflows`).

## Les numéros de version

- **Version de l'appli** (`4.0`) : à augmenter à chaque modification de l'appli (HTML, CSS, JS, images), **avant de fusionner dans `main`** :
  - dans `js/version.js` : `window.OUESSANT_APP_VERSION = '4.0';` (numéro affiché dans le phare) ;
  - dans `sw.js` : `const VERSION = 'v4.0';` (c'est ce qui met l'appli à jour chez les utilisateurs, mode hors connexion compris).
- **Version des listes** (`4.0.2`) : automatique. Chaque enregistrement de liste dans l'éditeur ajoute 1 au dernier chiffre.
  Quand la version de l'appli change, le compteur repart de zéro (`v4.1`, puis `v4.1.1`…).
  Une modification faite directement sur le site GitHub ne fait pas monter le compteur.

## Publier une nouvelle version de l'appli

Trois branches :
- **`main`** : le code en ligne (GitHub Pages). Il ne reçoit que du code validé, jamais la branche `test`.
- **`Pre-prod`** : la branche de travail. On y fait les modifications, on les vérifie avec
  `https://raw.githack.com/AureLPhotog/ouessant-birds/Pre-prod/index.html`, puis on les fusionne dans `main` après avoir augmenté la version de l'appli (voir plus haut). Le site est à jour quelques minutes plus tard.
- **`test`** : l'environnement de test, une copie de l'appli avec un **mode test** (bandeau rouge « MODE TEST ») : la position GPS est
  simulée sur l'île et se choisit sur la carte en touchant le bandeau. Il sert à tester les alertes et « Où suis-je ? » sans
  être sur place (`https://raw.githack.com/AureLPhotog/ouessant-birds/test/index.html`). On y fusionne les nouveautés de `Pre-prod`, mais **jamais dans l'autre sens, et jamais dans `main`**.

Les listes JSON, elles, n'ont pas besoin de changement de version de l'appli : l'appli vérifie toujours en ligne s'il en existe une plus récente.

## Recalage de la carte

La carte de l'association n'a pas de coordonnées GPS. Elle est recalée sur 19 repères relevés sur le terrain
(îlots, chapelles, phares, château d'eau, fort Saint-Michel, piste de l'aérodrome) : écart moyen d'environ 30 m,
au pire 95 m. Les coefficients sont dans `js/carte.js` (`AFF`) et, à l'identique, dans `scripts/verifier_listes.py`.

## Crédits

- Carte de l'île : réalisée par Gaëtan Mineau pour l'Association Naturaliste d'Ouessant.
- Météo : [Open-Meteo.com](https://open-meteo.com/).
- Aide à la saisie d'un nouvel oiseau dans l'éditeur (noms scientifique et dans l'autre langue) : [iNaturalist](https://www.inaturalist.org/), via son API publique. Rien n'est rempli si le nom ne correspond qu'à une seule espèce d'oiseau.
- Classement des espèces : établi à la main d'après des données de Faune France. L'appli n'interroge pas leur base de données.

## Licence

Projet libre et gratuit. L'auteur ne revendique aucune paternité ni aucun droit sur le code et les listes : ils peuvent
être copiés, modifiés et réutilisés librement (dédicace au domaine public,
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.fr)). Exception : la carte de l'île, qui reste l'œuvre de
Gaëtan Mineau et de l'Association Naturaliste d'Ouessant. Les mêmes informations sont dans l'appli (phare → « Informations légales »).
