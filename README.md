# Oiseaux d'Ouessant

Petite appli web pour les observateurs d'oiseaux à Ouessant :

- **Oiseaux** : sur quel canal annoncer une observation (Alerte Telegram, Alerte WhatsApp, Pas d'alerte) ;
- **Lieux** : coordonnées GPS indicatives des lieux-dits de l'île, avec un aperçu de la carte ;
- **Où suis-je ?** : les 5 lieux-dits les plus proches de sa position ;
- **le phare** (en haut à gauche) : météo du jour à Ouessant et QR code pour partager l'appli.

En ligne : <https://aurelphotog.github.io/ouessant-birds/>

L'appli fonctionne **hors connexion** une fois ouverte une première fois (sauf la météo).

---

## Organisation des fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | l'appli (structure de la page) |
| `editeur.html` | l'éditeur des listes (réservé à Aurélien pour l'enregistrement sur GitHub) |
| `ouessant_birds.json` | **liste des oiseaux** et canal d'annonce de chacun |
| `lieux_ouessant.json` | **liste des lieux-dits** et leurs coordonnées |
| `css/commun.css` | couleurs (clair, sombre, daltonisme) et bases, partagées par l'appli et l'éditeur |
| `css/appli.css`, `css/editeur.css` | mise en page de l'appli et de l'éditeur |
| `js/textes.js` | **tous les textes de l'appli**, en français et en anglais |
| `js/carte.js` | grille des carrés de la carte et recalage GPS (partagé appli / éditeur) |
| `js/recherche.js` | recherche tolérante aux fautes de frappe |
| `js/appli.js`, `js/editeur.js` | fonctionnement de l'appli et de l'éditeur |
| `sw.js` | mode hors connexion |
| `carte_ouessant.webp` (et `.jpg` en secours), `Map_Ouessant.pdf` | carte de l'île, de l'Association Naturaliste d'Ouessant |
| `phare_creach.svg`, `favicon*`, `icon-*.png`, `apple-touch-icon.png`, `apercu.png`, `qr_ouessant.svg` | images, icônes, aperçu de lien, QR code |
| `manifest.webmanifest` | raccourci sur l'écran d'accueil du téléphone |
| `scripts/verifier_listes.py`, `.github/workflows/verifier-listes.yml` | vérification automatique des listes |

## Les listes

### `ouessant_birds.json`

```json
{"Nom Français": "Buse pattue", "Nom Scientifique": "Buteo lagopus", "Nom Anglais": "Rough-legged Buzzard",
 "Type de taxon": "espèce", "Proposition de Canal de Diffusion Ouessant": "Télégram"}
```

- **Canal** : `Télégram`, `Whatsapp` ou `Pas d'annonce` (l'appli les affiche « Alerte Telegram », « Alerte WhatsApp », « Pas d'alerte »).
- **Type de taxon** : `espèce` ou `sous-espèce`.

**Méthode de classement** : à partir des données Faune France, en croisant la fréquence de chaque espèce à Ouessant (depuis 1900) avec sa rareté à l'échelle nationale (données 2025), puis ajusté à la main.

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

## Mettre à jour les listes

1. Ouvrir l'éditeur : <https://aurelphotog.github.io/ouessant-birds/editeur.html>
2. **Ouvrir depuis GitHub**, modifier, puis **Enregistrer sur GitHub** (clé d'accès nécessaire, voir ci-dessous).
3. Les propositions des visiteurs arrivent dans les Google Sheets des deux formulaires (lieux, oiseaux) :
   copier la colonne « Ligne JSON » dans l'éditeur, bouton **Coller des lignes**.
4. Les contributeurs peuvent aussi utiliser l'éditeur, puis **Exporter > Seulement mes modifications**
   et envoyer le texte obtenu par e-mail : il se colle tel quel dans **Coller des lignes**.

**Clé d'accès** : jeton GitHub « à granularité fine », limité au dépôt `ouessant-birds`, permission
*Contents : Read and write*, avec une date d'expiration. Ne jamais la partager ni l'écrire dans un fichier.

À chaque modification d'une liste, GitHub la vérifie automatiquement (onglet **Actions**) : en cas d'erreur
(canal inconnu, doublon, carré inexistant, coordonnées hors de l'île…), le commit est marqué d'une croix rouge
et un e-mail est envoyé. Les avertissements (nom anglais manquant…) ne bloquent rien.

## Publier une nouvelle version de l'appli

1. Travailler dans une **branche**, et tester avec
   `https://raw.githack.com/AureLPhotog/ouessant-birds/NOM-DE-LA-BRANCHE/index.html`
2. **Avant de fusionner**, si des fichiers de l'appli ont changé (HTML, CSS, JS, images) :
   augmenter le numéro de version
   - dans `sw.js` : `const VERSION = 'v3.1';` (c'est ce qui met à jour l'appli chez les utilisateurs, mode hors connexion compris) ;
   - dans `js/appli.js` : `const APP_VERSION = '3.1';` (le numéro affiché en bas de page).
3. Fusionner dans `main` : le site est à jour quelques minutes plus tard.

Les listes JSON, elles, n'ont pas besoin de changement de version : l'appli vérifie toujours en ligne s'il en existe une plus récente.

## Recalage de la carte

La carte de l'association n'a pas de coordonnées GPS. Elle est recalée sur 19 repères relevés sur le terrain
(îlots, chapelles, phares, château d'eau, fort Saint-Michel, piste de l'aérodrome) : écart moyen d'environ 30 m,
au pire 95 m. Les coefficients sont dans `js/carte.js` (`AFF`) et, à l'identique, dans `scripts/verifier_listes.py`.

## Crédits

- Carte de l'île : réalisée par Gaëtan Mineau pour l'Association Naturaliste d'Ouessant.
- Météo : [Open-Meteo.com](https://open-meteo.com/).
- Données d'observation : Faune France.
