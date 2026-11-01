# PlaniLux — Studio de planning & emploi du temps

PlaniLux est une application web moderne et progressive (PWA) conçue pour composer, personnaliser et exporter des emplois du temps et plannings professionnels au quart d’heure près.

L'application repose sur un modèle multi-tenant strict : **zéro données par défaut, isolation totale par utilisateur, et sécurité maximale côté serveur**.

---

## Architecture de sécurité & authentification

- **Authentification serveur (SSR & Cookies)** : Les sessions sont gérées via `@supabase/ssr` avec des cookies HTTP sécurisés.
- **Protection par Proxy / Middleware (`src/proxy.ts`)** : Chaque requête entrante sur `/app/**` et `/api/**` est contrôlée côté serveur avec `supabase.auth.getUser()`. Toute requête sans session valide est bloquée (redirection `/login` pour l'interface, code HTTP `401 Unauthorized` au format JSON pour les API).
- **Zéro fuite d'information** : Les tentatives d'accès à des ressources inexistantes ou appartenant à un tiers renvoient un code `404 Not Found`.

---

## Schéma de base de données & RLS (Row Level Security)

Les données sont hébergées sur PostgreSQL (Supabase) avec deux tables principales :

1. **`public.profiles`** :
   - `id (uuid, PK, references auth.users(id) on delete cascade)`
   - `display_name (text)`
   - `workspace_name (text)`
   - `created_at`, `updated_at (timestamptz)`
   - *Création automatique* via trigger PostgreSQL `on_auth_user_created` sur `auth.users`.
   - *RLS activée & forcée* (`FORCE ROW LEVEL SECURITY`) : seul l'utilisateur propriétaire (`auth.uid() = id`) peut lire ou modifier son profil.

2. **`public.planner_boards`** :
   - `id (text, PK)`
   - `user_id (uuid, FK references auth.users(id) on delete cascade)`
   - `title (text, 1-100 caractères)`
   - `kind (enum: university, weekly, monthly, daily, custom)`
   - `color (hexadécimal)`
   - `events (jsonb, validé par Zod)`
   - `trashed (boolean)`
   - `created_at`, `updated_at (timestamptz)`
   - *RLS activée & forcée* : `auth.uid() = user_id` sur toutes les opérations (SELECT, INSERT, UPDATE, DELETE).

---

## Fonctionnalités principales

- **Grille chronologique au quart d’heure** : placement fin des blocs de cours et d’activités avec gestion des chevauchements.
- **Cinq modèles de plannings prêts à l’emploi** :
  - Emploi du temps scolaire & universitaire (vue hebdomadaire sur 6 jours)
  - Planificateur hebdomadaire (7 jours, créneaux libres)
  - Planificateur mensuel (vue d’ensemble sur 5 semaines)
  - Planificateur quotidien (détaillé de 06h à 22h)
  - Tableau libre (grille vierge entièrement modulable)
- **Studio d’exportation unifié** :
  - Impression papier haute fidélité (A4 portrait/paysage, US Letter)
  - Document Word éditable (`.docx`) avec tableau structuré
  - Fichier vectoriel PDF haute résolution
  - Fonds d’écran optimisés (9:16 pour smartphone, 16:9 pour ordinateur)
- **Gestion du compte & données personnelles** :
  - Modification du nom et de l'espace de travail synchronisée en base.
  - Option de purge complète des tableaux.
  - Option de suppression définitive du compte utilisateur (suppression cascade de toutes les données associées).
- **Confort visuel et accessibilité** :
  - Ajustement dynamique de la taille des écrits (de 75 % à 150 %)
  - Contrôle fin de la luminosité (de 50 % à 150 %)
  - Bascule instantanée entre thème clair et thème sombre

---

## Installation et démarrage local

Prérequis : Node.js 20.19 ou supérieur (22 recommandé).

```bash
npm install
cp .env.example .env.local   # puis renseigner les variables Supabase
npm run dev
```

### Variables d'environnement (`.env.example`)

- `NEXT_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé publique anon Supabase
- `DATABASE_URL` : Chaîne de connexion PostgreSQL (pooler ou direct)
- `DIRECT_URL` : Connexion directe pour les migrations
- `SUPABASE_SERVICE_ROLE_KEY` : Clé d'administration serveur (nécessaire pour la suppression définitive de compte)

---

## Scripts & Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement local |
| `npm run lint` | Validation ESLint |
| `npm run typecheck` | Contrôle strict des types TypeScript |
| `npm test` | Exécution des tests unitaires Vitest |
| `npm run build` | Compilation de production Next.js |
| `node scripts/reset-data.mjs --confirm` | Script sécurisé de purge des tableaux de démonstration |

---

## Migrations Supabase

Les fichiers SQL sont situés dans `supabase/migrations/` :
- `20261101120000_auth_profiles_rls.sql` applique les contraintes d'intégrité, les tables `profiles` et `planner_boards`, le trigger automatique et les règles RLS strictes.

Application via la CLI Supabase :
```bash
npx supabase link --project-ref <votre-reference-projet>
npx supabase db push
```
