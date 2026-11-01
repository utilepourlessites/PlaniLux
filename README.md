# PlaniLux — Studio de planning & emploi du temps

PlaniLux est une application web moderne et progressive (PWA) conçue pour composer, personnaliser et exporter des emplois du temps et plannings professionnels au quart d’heure près.

L’application privilégie une approche **Local-First** : les plannings sont conservés localement sur le poste de travail pour une réactivité immédiate et un fonctionnement hors-ligne continu, tout en offrant la possibilité d’une synchronisation cloud avec PostgreSQL / Supabase.

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
- **Local-First & Confidentialité** : fonctionnement hors ligne sans dépendance réseau bloquante.

---

## Pile technique

- **Framework** : [Next.js](https://nextjs.org/) (App Router, Webpack)
- **Bibliothèque UI** : [React](https://react.dev/) 19 & [Tailwind CSS](https://tailwindcss.com/)
- **Langage** : [TypeScript](https://www.typescriptlang.org/) (mode strict)
- **Exports documentaires** : [jsPDF](https://github.com/parallax/jsPDF), [docx](https://docx.js.org/), [html-to-image](https://github.com/bubkoo/html-to-image)
- **Base de données & ORM** : [PostgreSQL](https://www.postgresql.org/), [Drizzle ORM](https://orm.drizzle.team/), [Supabase](https://supabase.com/)

---

## Installation et démarrage local

### Prérequis

- [Node.js](https://nodejs.org/) version 20 ou supérieure (Node.js 22 recommandé)
- npm ou gestionnaire de paquets compatible

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration des variables d’environnement

Dupliquez le fichier d’exemple `.env.example` en `.env.local` pour définir vos identifiants de base de données :

```bash
cp .env.example .env.local
```

*(Note : le fichier `.env.local` est ignoré par Git et ne doit jamais être commité).*

### 3. Lancement du serveur de développement

```bash
npm run dev
```

L’application est accessible à l’adresse [http://localhost:3000](http://localhost:3000).

---

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur de développement Next.js |
| `npm run build` | Compile l’application pour la production |
| `npm run start` | Démarre le serveur de production |
| `npm run lint` | Analyse le code source avec ESLint |
| `npm run typecheck` | Vérifie les types TypeScript (`tsc --noEmit`) |

---

## Structure du projet

```text
├── public/                 # Ressources statiques, manifest PWA et icônes
├── src/
│   ├── app/                # Pages, routes et mise en page Next.js (App Router)
│   ├── components/         # Composants React de l’application et du studio
│   ├── db/                 # Schéma Drizzle et configuration PostgreSQL
│   ├── lib/                # Gabarits, types métier et moteurs d’export
│   └── types/              # Déclarations TypeScript complémentaires
├── .env.example            # Gabarit des variables d’environnement sans secrets
├── .gitignore              # Règles d’exclusion Git
└── package.json            # Dépendances et scripts du projet
```

---

## Règles de contribution et conventions

- **Sécurité** : aucun secret, jeton ou mot de passe ne doit figurer dans le code ou l’historique Git.
- **Typographie** : l’ensemble des textes d’interface et de documentation utilise le français avec des apostrophes typographiques courbées (`’`).
- **Nom officiel** : l’application s’écrit strictement **PlaniLux** en toutes circonstances.
