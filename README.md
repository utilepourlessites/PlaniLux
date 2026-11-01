# PlaniLux — Studio de planning & emploi du temps

PlaniLux est une application web moderne et progressive (PWA) conçue pour composer, personnaliser et exporter des emplois du temps et plannings professionnels au quart d’heure près.

Chaque utilisateur possède un compte (Supabase Auth) et ses propres plannings, protégés par la sécurité par ligne (RLS) de PostgreSQL. Une copie locale sert de cache pour la réactivité ; le serveur fait foi.

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
- **Confort visuel et accessibilité** :
  - Ajustement dynamique de la taille des écrits (de 75 % à 150 %)
  - Contrôle fin de la luminosité (de 50 % à 150 %)
  - Bascule instantanée entre le thème clair et le thème sombre
- **Comptes & confidentialité** : chaque personne ne voit que ses propres plannings (RLS).

---

## Pile technique

- **Framework** : [Next.js](https://nextjs.org/) (App Router, Webpack)
- **Bibliothèque UI** : [React](https://react.dev/) 19 & [Tailwind CSS](https://tailwindcss.com/)
- **Langage** : [TypeScript](https://www.typescriptlang.org/) (mode strict)
- **Exports documentaires** : [jsPDF](https://github.com/parallax/jsPDF), [docx](https://docx.js.org/), [html-to-image](https://github.com/bubkoo/html-to-image)
- **Authentification & base de données** : [Supabase](https://supabase.com/) (Auth + PostgreSQL, migrations dans `supabase/migrations/`)

---

## Installation et démarrage local

Prérequis : Node.js 20.19 ou supérieur (22 recommandé).

```bash
npm install
cp .env.example .env.local   # puis renseigner les deux variables Supabase
npm run dev
```

Variables (voir `.env.example`) : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique « sb_publishable_… »). Aucun mot de passe de base de données n'est nécessaire dans l'application.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run lint` / `npm run typecheck` / `npm test` | Contrôles qualité |
| `npm run build` | Build de production |

## Base de données

Les migrations vivent dans `supabase/migrations/` et sont appliquées avec la CLI Supabase (`npx supabase link --project-ref <réf>` puis `npx supabase db push`). Voir **DEPLOIEMENT.md** pour la procédure complète (GitHub, Supabase, Vercel).

## Sécurité

- Ne jamais commiter de `.env*` (sauf `.env.example`), de mot de passe de base, de clé `service_role` / `sb_secret_…` ni de jeton.
- Les tables sont protégées par RLS : la clé publique ne donne accès qu'aux données de l'utilisateur connecté.
