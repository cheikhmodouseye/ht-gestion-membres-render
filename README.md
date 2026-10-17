# HT Gestion des membres - Render + Supabase

Application web mobile complète, hébergée comme site statique sur Render et reliée à une base Supabase centralisée.

## Fonctionnement

- Comptes utilisateurs Supabase par e-mail et mot de passe.
- Données partagées entre tous les téléphones autorisés.
- Membres, renouvellements annuels, activités, présences, social, caisse et statistiques.
- Accès aux tables protégé par Row Level Security.

## Déploiement

1. Exécuter `supabase/schema.sql` dans le SQL Editor du projet Supabase.
2. Exécuter `supabase/role_permissions.sql` pour activer les quatre rôles applicatifs.
3. Exécuter `supabase/scoped_access.sql` : affectations et restrictions par zone/kourel, enregistrement atomique des présences.
4. Déployer la fonction Supabase `admin-users` depuis `supabase/functions/admin-users`.
5. Désactiver les nouvelles inscriptions dans **Authentication > Sign In / Providers**.
6. Créer les comptes dans **Authentication > Users** avec les adresses techniques `<identifiant>@ht-gestion.app`, puis renseigner leur rôle dans `public.profiles`. Les utilisateurs saisissent uniquement la partie `<identifiant>` dans l’application.
7. Déployer la branche `main`.

Render utilise :

- Build Command : `npm ci && npm run build`
- Publish Directory : `dist`

La configuration publique Supabase est intégrée au client. Elle ne donne aucun accès administrateur ; les droits sont contrôlés par les politiques RLS du schéma. Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` peuvent néanmoins la remplacer selon l'environnement.

Rôles disponibles : `admin`, `administratif`, `social` et `surveillant_kourel`.

## Affectations et mise à jour d'une installation existante

Appliquer seulement `supabase/scoped_access.sql` sur une installation disposant déjà des rôles, puis déployer `admin-users` et le client Render. Ne pas réexécuter `schema.sql` seul : il recrée les anciennes autorisations générales.

Dans **Comptes utilisateurs**, l'administrateur général attribue une zone au compte `administratif` et un kourel au compte `surveillant_kourel`. Renseigner également la zone de chaque membre dans sa fiche. Utiliser exactement le même libellé de zone pour le compte et les membres. Le compte administratif ne peut pas changer sa zone.

- `administratif` : membres de sa zone et pointage des activités de la Daara de cette zone.
- `surveillant_kourel` : membres de son kourel et pointage des répétitions/prestations de ce kourel.
- `admin` : accès global et gestion des affectations ; choix d'une zone pour créer une fiche de présence de la Daara.
- `social` : accès social existant conservé.

Les comptes restreints sans affectation ne voient aucun membre. Les zones des membres et activités historiques restent vides après migration : l'administrateur doit les renseigner après vérification. Les anciennes activités générales sans zone restent accessibles à l'administrateur général uniquement. Ne pas attribuer automatiquement une zone sur la base d'un nom ou d'une adresse.

Les restrictions sont appliquées par PostgreSQL (RLS), y compris sur les accès directs à l'API, et complétées dans l'interface. La fonction `save_scoped_activity` annule entièrement l'enregistrement si une présence concerne un membre hors périmètre.

## Vérification locale

`npm test` vérifie les politiques RLS dans PostgreSQL embarqué (PGlite), dont les refus hors périmètre, les comptes sans affectation et l'annulation atomique d'un pointage invalide. `npm run build` vérifie TypeScript et la compilation du client. Ces tests ne remplacent pas une validation après déploiement sur le projet Supabase cible.
