# HT Gestion des membres - version Render

Cette copie est prête pour un déploiement en tant que site statique sur Render.

## Fonctionnement

- Aucun compte utilisateur n'est requis.
- Les données sont enregistrées dans le navigateur avec `localStorage`.
- Les données ne sont pas partagées entre les téléphones.
- La version principale avec base centralisée reste séparée et privée.

## Déploiement avec le Blueprint

1. Placer ce dossier dans un dépôt GitHub ou GitLab.
2. Dans Render, choisir **New > Blueprint**.
3. Connecter le dépôt contenant `render.yaml`.
4. Valider la création du service `ht-gestion-membres`.

Render utilisera automatiquement :

- Type : `Static Site`
- Build Command : `echo "Static site ready"`
- Publish Directory : `dist`

## Déploiement manuel

Créer un **Static Site** dans Render avec les paramètres suivants :

- Build Command : `echo "Static site ready"`
- Publish Directory : `dist`

Le fichier `render.yaml` active également les aperçus de pull request, les en-têtes de sécurité et la réécriture des routes vers `index.html`.
