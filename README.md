# HT Gestion des membres - OVH + PostgreSQL

Application web mobile de gestion des membres, renouvellements, activites, presences, cotisations sociales, caisse et statistiques.

## Architecture OVH

- `ht-web-postgres` : interface web Nginx.
- `ht-api` : API Node.js et controle des acces.
- `ht-postgres` : base PostgreSQL reservee a cette application.
- Volume persistant : `ht_gestion_postgres`.
- Reseau Docker prive : `ht_gestion_internal`.

Cette installation est independante de DMPOS : elle ne partage ni conteneur, ni base, ni volume PostgreSQL avec cette autre application.

## Comptes et acces

Les utilisateurs se connectent avec un identifiant, sans adresse e-mail. Seul l'administrateur peut creer, modifier, desactiver ou supprimer des comptes depuis la page **Comptes utilisateurs**.

Roles disponibles :

- `admin` : acces global et gestion des comptes.
- `administratif` : membres de sa zone et activites de la Daara.
- `social` : cotisations, evenements sociaux et caisse.
- `surveillant_kourel` : repetitions et prestations de son kourel.

Les autorisations sont verifiees dans l'API, pas seulement dans l'interface.

## Deploiement

1. Copier `server/`, `dist/`, `docker-compose.ovh.yml` et `deploy/nginx-ovh.conf` sur le VPS.
2. Copier le contenu de `dist/` dans le dossier distant `site/`.
3. Creer `.env` a partir de `deploy/.env.example` et remplacer `HT_DB_PASSWORD` par un secret aleatoire.
4. Lancer `docker compose -f docker-compose.ovh.yml up -d --build`.
5. Verifier `http://SERVEUR:PORT/api/health`.

Le mot de passe PostgreSQL et les mots de passe utilisateurs ne doivent jamais etre ajoutes a Git.

## Developpement et verification

- `npm test` : tests des regles de perimetre et de l'enregistrement atomique des presences.
- `npm run build` : verification TypeScript et compilation du client dans `dist/`.
- `server/schema.sql` : schema initialise automatiquement lors de la creation du volume PostgreSQL.

Les anciens fichiers sous `supabase/` sont conserves uniquement comme historique de migration. L'application deployee sur OVH ne depend plus de Supabase.
