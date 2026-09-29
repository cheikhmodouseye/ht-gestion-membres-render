# HT Gestion des membres - Render + Supabase

Application web mobile complète, hébergée comme site statique sur Render et reliée à une base Supabase centralisée.

## Fonctionnement

- Comptes utilisateurs Supabase par e-mail et mot de passe.
- Données partagées entre tous les téléphones autorisés.
- Membres, renouvellements annuels, activités, présences, social, caisse et statistiques.
- Accès aux tables protégé par Row Level Security.

## Déploiement

1. Exécuter `supabase/schema.sql` dans le SQL Editor du projet Supabase.
2. Déployer la branche `main`.

Render utilise :

- Build Command : `npm ci && npm run build`
- Publish Directory : `dist`

La configuration publique Supabase est intégrée au client. Elle ne donne aucun accès administrateur ; les droits sont contrôlés par les politiques RLS du schéma. Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` peuvent néanmoins la remplacer selon l'environnement.
