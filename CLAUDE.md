# Consignes pour Claude — Oiseaux d'Ouessant

## Gel des évolutions jusqu'au 31 octobre 2026

Décision du propriétaire (6 octobre 2026) : l'appli est lancée, elle doit « vivre toute seule ».
Jusqu'au **31 octobre 2026 inclus** :

- **Acceptés** : les **correctifs de bugs** (quelque chose ne marche pas, ou plus) et les **améliorations notables**
  (un vrai gain pour les utilisateurs ou l'administration).
- **Refusés** : les **retouches mineures** (libellés, couleurs, espacements, petits réglages d'affichage…).
  Rappeler poliment la règle au propriétaire, même s'il insiste : il a demandé à être freiné.
- En cas de doute, demander s'il s'agit d'un bug ou d'une amélioration notable avant de coder.

Après le 31 octobre, la règle tombe : reprendre le fonctionnement normal.

## Fonctionnement habituel

- Travailler sur la branche **Pre-prod**. Chaque poussée sur Pre-prod est aussi **fusionnée dans `test`**.
- « Pousser sur main » : d'abord vérifier les commits de `main` absents de Pre-prod (enregistrements de listes, réglages,
  sauvegardes faits depuis l'éditeur ou la page Administration) et les **fusionner dans Pre-prod sans les écraser**
  (jamais `-X theirs`, jamais de réécriture d'historique) ; puis rendre `main` identique à Pre-prod.
- **`test` ne doit jamais être fusionnée dans `main` ni dans Pre-prod** : elle contient `js/test-gps.js` (faux GPS),
  sa balise `<script>` dans `index.html`, et une CSP qui autorise les images de `raw.githubusercontent.com` (aperçu raw.githack).
  À chaque fusion dans `test`, le conflit sur `sw.js` se résout en `const VERSION = 'vX.Y-test';`.
- Toute modification de l'appli (HTML, CSS, JS) augmente la version : `js/version.js` et `sw.js` (5.9 → 5.10…).
  README, script Google ou guide seuls : pas de changement de version.
- Le guide PDF (`docs/Guide_utilisation.pdf`) indique la version de l'appli : le régénérer quand elle change.
- Ne jamais écrire de clé, de jeton ou de code secret dans le dépôt.
