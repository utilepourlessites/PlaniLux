# PlaniLux — Analyse complète et plan d'action

> **Projet analysé :** `planilux_Luna.zip` (application de planning / emploi du temps)
> **Date de l'analyse :** 1er novembre 2026
> **Objectif :** corriger l'impression, les exports (formats), les documents téléchargés, l'emploi du temps, l'organisation des boutons et des tableaux, puis **déployer sur GitHub + Vercel + Supabase depuis un agent IA**.

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Ce qui a été vérifié et comment](#2-ce-qui-a-été-vérifié-et-comment)
3. [Description du logiciel](#3-description-du-logiciel)
4. [Défauts de l'impression](#4-défauts-de-limpression)
5. [Défauts des exports (PDF, PNG, Word, formats)](#5-défauts-des-exports-pdf-png-word-formats)
6. [Défauts de l'emploi du temps (éditeur)](#6-défauts-de-lemploi-du-temps-éditeur)
7. [Boutons, tableaux et organisation de l'interface](#7-boutons-tableaux-et-organisation-de-linterface)
8. [Données, synchronisation et sécurité](#8-données-synchronisation-et-sécurité)
9. [Qualité du code, accessibilité, performance, PWA](#9-qualité-du-code-accessibilité-performance-pwa)
10. [Déploiement GitHub + Vercel + Supabase](#10-déploiement-github--vercel--supabase)
11. [Prompts prêts à l'emploi pour l'agent IA](#11-prompts-prêts-à-lemploi-pour-lagent-ia)
12. [Feuille de route et recommandations](#12-feuille-de-route-et-recommandations)
13. [Annexes](#13-annexes)

---

## 1. Résumé exécutif

### Verdict

PlaniLux est une application **visuellement soignée et fonctionnelle en local**, mais elle n'est **pas prête à être déployée** et ses fonctions d'impression et d'export **ne tiennent pas leur promesse** (« aperçu fidèle »). Vos observations sont **toutes confirmées** par des tests réels, et j'ai trouvé des problèmes plus graves que ceux signalés, notamment :

- **le build échoue sur Vercel** si la variable `DATABASE_URL` n'existe pas au moment du build (reproduit) ;
- **il n'y a aucune authentification** : la page de connexion est factice et l'API est ouverte à tout le monde ;
- **le message « Enregistré / synchronisé automatiquement » est faux** quand la base de données est indisponible (reproduit) ;
- **l'aperçu, le PDF, le PNG, le Word et l'impression donnent cinq rendus différents** du même planning.

### Ce que vous avez signalé → ce que j'ai confirmé

| Votre remarque | Confirmé ? | Cause principale | Section |
|---|---|---|---|
| Défauts d'impression | ✅ Oui | `window.print()` ignore le format et l'orientation choisis ; le tableau mensuel s'imprime comme une semaine | [4](#4-défauts-de-limpression) |
| Défauts d'export / de format | ✅ Oui | Cinq moteurs de rendu indépendants ; le format « fond téléphone » produit un PDF de 90×160 mm, pas une image | [5](#5-défauts-des-exports-pdf-png-word-formats) |
| Documents téléchargés incorrects | ✅ Oui | PDF sans heures ni dates, chevauchements illisibles, texte qui déborde ; Word = simple liste sans tableau | [5](#5-défauts-des-exports-pdf-png-word-formats) |
| Emploi du temps incorrect | ✅ Oui | Plage 8 h–20 h figée, événements hors plage tronqués, « GMT+2 » codé en dur, vue matricielle trompeuse | [6](#6-défauts-de-lemploi-du-temps-éditeur) |
| Boutons / tableaux mal organisés | ✅ Oui | Boutons en double, cartes qui débordent, polices de 6 à 9 px, libellés ambigus | [7](#7-boutons-tableaux-et-organisation-de-linterface) |

### Les 12 actions les plus importantes (dans l'ordre)

| # | Action | Gravité | Effort |
|---|---|---|---|
| 1 | Créer un `.gitignore` et **ne jamais publier** `.env.local`, `.next/`, `node_modules/` | 🔴 Critique | 5 min |
| 2 | Rendre la connexion à la base **paresseuse** (sinon le build Vercel échoue) | 🔴 Critique | 15 min |
| 3 | Mettre en place une **vraie authentification** (Supabase Auth) + `user_id` + RLS | 🔴 Critique | 1 à 2 j |
| 4 | **Impression :** injecter `@page { size … }` selon le format choisi | 🟠 Majeur | 30 min |
| 5 | **Unifier le rendu** (un seul modèle de mise en page pour aperçu, PDF, PNG, impression) | 🟠 Majeur | 2 à 3 j |
| 6 | **PDF :** ajouter les heures, les dates, la gestion des chevauchements et du texte long | 🟠 Majeur | 1 j |
| 7 | **Tableau mensuel :** vraie grille de mois pour l'aperçu, le PNG et l'impression | 🟠 Majeur | 1 j |
| 8 | **Word :** exporter un vrai tableau, respecter format / police / langue | 🟡 Moyen | 0,5 j |
| 9 | **Fonds d'écran :** exporter en PNG 1080×1920 et 1920×1080 (pas en PDF) | 🟡 Moyen | 0,5 j |
| 10 | **Éditeur :** plage horaire automatique, événements hors plage visibles, fuseau réel | 🟡 Moyen | 0,5 j |
| 11 | **Interface :** supprimer les boutons en double, corriger les débordements, polices ≥ 11 px | 🟡 Moyen | 1 j |
| 12 | **Synchronisation :** file d'attente fiable + statut honnête (« Hors ligne », « Erreur ») | 🟠 Majeur | 1 j |

> **Estimation globale :** environ **8 à 10 jours** pour tout corriger proprement. Les 5 premières lignes (blocages de déploiement) tiennent en **une demi-journée** hors authentification.

---

## 2. Ce qui a été vérifié et comment

Je n'ai pas seulement lu le code : j'ai **exécuté** l'application et testé les exports réels.

### Vérifications effectuées

| Vérification | Résultat |
|---|---|
| Lecture complète des sources (`src/`, config, API, base) | ✅ Faite |
| `npm install` + `tsc --noEmit` (TypeScript) | ✅ **0 erreur** |
| `eslint src` | ❌ **21 erreurs + 1 avertissement** (voir [annexe A](#annexe-a--détail-des-erreurs-eslint)) |
| `next build` **avec** `DATABASE_URL` | ✅ Réussi |
| `next build` **sans** `DATABASE_URL` (cas Vercel) | ❌ **Échec** : `Failed to collect page data for /api/boards/[id]` |
| Génération de **PDF réels** avec le vrai code d'export (A4 paysage/portrait, Letter, téléphone, PC, mensuel) puis conversion en image pour les inspecter | ✅ Fait |
| Application lancée dans **Chromium** : éditeur, vue matricielle, Studio d'export, mesures de débordement | ✅ Fait |
| **Impression** simulée en média `print` | ✅ Fait → rendu inexact (voir 4.1) |
| **Export PNG** et **Word** réellement téléchargés et inspectés | ✅ Fait |
| Version **mobile** (390 px de large) | ✅ Fait |

### Ce qui n'a PAS été testé (à valider de votre côté)

- La connexion à une **vraie base PostgreSQL / Supabase** (aucune base disponible dans mon environnement). Le comportement de l'API sans base a été observé (erreur 500), le reste est analysé par lecture du code.
- Le rendu du `.docx` **ouvert dans Microsoft Word** (j'ai vérifié le contenu, pas l'affichage).
- **Firefox et Safari** (j'ai testé Chromium uniquement). Des points à risque sont signalés comme « à vérifier ».
- Une **vraie imprimante** (j'ai produit le PDF d'impression du navigateur).
- Le niveau de zoom ≠ 100 % pour l'export PNG (risque signalé en 5.3).

> Les extraits de code cités ci-dessous le sont avec leur **fichier et numéro de ligne** pour que votre agent IA les retrouve directement.

---

## 3. Description du logiciel

### Technologies

| Élément | Détail |
|---|---|
| Framework | Next.js **16.2.6** (App Router), React **19.2.6**, TypeScript **5.9** |
| Style | CSS maison (≈ 2 660 lignes dans 3 fichiers). Tailwind 4 est installé mais très peu utilisé |
| Base de données | PostgreSQL via **Drizzle ORM** + `pg` (une seule table `planner_boards`) |
| Exports | `jspdf` (PDF), `docx` (Word), `html-to-image` (PNG), `window.print()` (impression) |
| Icônes | `lucide-react` |
| PWA | `manifest.json` + `sw.js` (service worker simple) |

### Pages et fonctionnement

| Route | Rôle |
|---|---|
| `/` et `/login` | Écran de connexion / inscription (**factice**, voir 8.1) |
| `/app` | Application complète (une seule page client qui change de « vue ») |
| `/api/boards` (GET, POST) | Liste / création de tableaux |
| `/api/boards/[id]` (PATCH, DELETE) | Modification / suppression |
| `/api/health` | Test de la connexion base de données |

**Types de tableaux :** emploi du temps (`school`), hebdomadaire, mensuel, quotidien, libre.
**Vues dans l'app :** vue d'ensemble, bibliothèque de tableaux, favoris, corbeille, université, personnel, éditeur, Studio d'export.

### Modèle de données

```ts
// src/db/schema.ts — une seule table
planner_boards(
  id uuid PK, title text, kind text, color text,
  events jsonb,            // tableau de ScheduleEvent
  favorite bool, is_deleted bool,
  created_at, updated_at
)

// src/lib/planner-types.ts
ScheduleEvent { id, title, day (0=lundi…6), date?, start "HH:MM", end "HH:MM",
                location?, teacher?, color, notes? }
```

> ⚠️ Un événement hebdomadaire est repéré uniquement par `day` (jour de la semaine) : **il se répète toutes les semaines** et ne peut pas appartenir à une semaine précise. Voir la recommandation 6.6.

### Fonctionnement des données (« hors-ligne d'abord »)

1. Les tableaux sont stockés dans le **`localStorage`** du navigateur (clé `planilux-boards-v1`).
2. Au démarrage, l'application interroge `/api/boards` et **fusionne** avec le local (le plus récent gagne).
3. Chaque modification déclenche un `PATCH`/`POST` ; en cas d'échec, l'erreur est **ignorée en silence** (voir 8.3).

### Taille et hygiène du projet

- L'archive pèse **282 Mo** (736 Mo décompressée) car elle contient le dossier **`.next/`** (cache de développement) — **aucun `.gitignore` n'existe**.
- Le fichier **`.env.local`** est présent dans l'archive.
- Pas de `README`, pas de tests, pas de CI, pas de `.env.example`.

---

## 4. Défauts de l'impression

### 4.1 🟠 [I-1] Le bouton « Imprimer » ignore le format et l'orientation choisis

**Constat (reproduit).** Dans le Studio, j'ai laissé « A4 · Paysage » et simulé l'impression. Résultat : une page **Letter en portrait**, avec le planning réduit à la moitié haute de la feuille, le texte minuscule et l'ombre du « papier » imprimée.

**Cause.**
- `src/lib/exports.ts:239` : `printSchedule()` ne fait que `window.print()`.
- `src/app/globals.css:435` : la règle d'impression ne contient que `@page { margin: 8mm }` — **aucun `size`**. Le navigateur utilise donc son papier par défaut.
- Le bloc `.export-paper` garde son `aspect-ratio` d'écran et sa largeur de 700 px.

**Quoi faire.**

1. Injecter dynamiquement la taille de page dans `src/components/export-studio.tsx` :

```tsx
useEffect(() => {
  const paper = options.format === "letter" ? "letter" : "A4";
  const el = document.createElement("style");
  el.id = "print-page-size";
  el.textContent = `@page { size: ${paper} ${options.orientation}; margin: 8mm; }`;
  document.head.appendChild(el);
  return () => el.remove();
}, [options.format, options.orientation]);
```

2. Dans `globals.css`, en média `print`, neutraliser l'aspect-ratio et remplir la feuille :

```css
@media print {
  .export-paper {
    aspect-ratio: auto !important;
    width: 100% !important;
    height: var(--print-height, 194mm) !important; /* A4 paysage : 210 − 16 mm */
    box-shadow: none !important;
    background: #fff !important;
  }
}
```

   Définir `--print-height` en React selon le format : A4 paysage `194mm`, A4 portrait `281mm`, Letter paysage `191mm`, Letter portrait `248mm`.

3. Pour **« Fond téléphone »** et **« Fond d'écran PC »**, l'impression n'a pas de sens : **désactiver** le bouton avec une infobulle (« Disponible pour A4 et Letter ») ou imprimer sur A4.

### 4.2 🟠 [I-2] Le tableau mensuel s'imprime comme une semaine

**Constat (reproduit).** Pour un tableau « Planificateur mensuel », l'aperçu du Studio (et donc l'impression et le PNG) affiche une **grille de 7 jours** avec l'intitulé « TON RYTHME · TA SEMAINE ». Les événements du 2 et du 23 novembre se retrouvent empilés dans la même colonne « LUN ».

**Cause.** `export-studio.tsx:36` regroupe les événements par `event.day` uniquement et ignore `event.date` ; l'en-tête est codé en dur (`export-studio.tsx:42`).

**Quoi faire.** Créer un composant `MonthSheet` (grille 6 lignes × 7 colonnes, numéro du jour, 2 à 3 pastilles + « +N de plus ») et l'afficher quand `board.kind === "monthly"`. Réutiliser **la même logique** que `monthly-planner.tsx`. Voir aussi la solution d'unification en 5.1.

### 4.3 🟡 [I-3] Le bouton « Imprimer » de l'éditeur imprime l'interface, pas la feuille

**Constat.** Dans l'éditeur (`schedule-editor.tsx`, deux endroits), « Imprimer » appelle `window.print()` directement. La règle CSS d'impression ne cible que `.export-paper` (qui n'existe que dans le Studio) : on imprime donc la vue de travail, avec ses défilements, sans les options du Studio.

**Quoi faire.** Supprimer ce bouton ou le faire ouvrir le Studio avec l'impression pré-sélectionnée. **Un seul chemin d'impression.**

### 4.4 🟡 [I-4] Message de confirmation incorrect

`export-studio.tsx:70-71` affiche « **impression prêt à télécharger** » (et « Impossible de générer le impression ») : le libellé est conçu pour « PDF », « Word », « PNG ». Corriger avec un libellé par action :

```tsx
const messages = {
  pdf:   { ok: "PDF téléchargé",     ko: "Le PDF n'a pas pu être généré" },
  word:  { ok: "Document Word prêt", ko: "Le fichier Word n'a pas pu être généré" },
  png:   { ok: "Image enregistrée",  ko: "L'image n'a pas pu être générée" },
  print: { ok: "Impression lancée",  ko: "L'impression n'a pas pu démarrer" },
};
```

---

## 5. Défauts des exports (PDF, PNG, Word, formats)

### 5.1 🟠 [E-1] Cinq rendus différents pour un même planning (cause racine)

| Sortie | Moteur | Aspect (semaine) |
|---|---|---|
| Aperçu du Studio | HTML + CSS | **Liste de cartes** par jour (pas d'échelle horaire), 4 événements max |
| Impression | HTML + CSS (même que l'aperçu) | Idem + problèmes de page (4.1) |
| PNG | `html-to-image` sur l'aperçu | Idem l'aperçu, **couleurs perdues** (5.3) |
| PDF | `jsPDF` dessiné à la main | **Grille proportionnelle aux heures** (autre mise en page) |
| Word | `docx` | **Simple liste à puces** |

Conséquence : l'aperçu annonce « *Un aperçu fidèle* » et « *Prêt à exporter* », mais le PDF ne ressemble pas à l'aperçu, et le Word ne ressemble à aucun des deux.

**Quoi faire — une seule source de vérité.** Créer `src/lib/sheet-layout.ts` :

```ts
// Un seul calcul de mise en page, partagé par tous les rendus
export type Box = { x: number; y: number; w: number; h: number }; // en %
export type SheetModel = {
  title: string; subtitle: string; hours: number[];          // ex. [8..20]
  columns: { label: string; date?: string; events: PlacedEvent[] }[];
};
export type PlacedEvent = ScheduleEvent & Box & { col: number; cols: number; overflowTop?: boolean };

export function buildSheetModel(board, options, weekStart: Date): SheetModel { /* … */ }
```

Puis :

- **Aperçu / impression / PNG** : un composant React qui dessine `SheetModel` (idéalement en SVG, qui s'imprime et s'exporte sans surprise).
- **PDF** : une fonction qui parcourt `SheetModel` avec `jsPDF` (mêmes positions, mêmes couleurs).
- **Word** : un tableau `docx` construit depuis le même modèle (5.5).

Ainsi, « ce que vous voyez est ce que vous obtenez » — et chaque correction ne se fait qu'une fois.

### 5.2 🟠 [E-2] PDF : constats détaillés (reproduits sur 6 PDF)

Chaque défaut a été observé sur les PDF générés avec le vrai code.

| ID | Défaut | Preuve / cause | Correctif |
|---|---|---|---|
| E-2a | **Aucune étiquette d'heure** : impossible de lire à quelle heure commence un cours sans lire le petit texte | Le code trace les lignes (`exports.ts:151-156`) mais n'écrit jamais « 08:00 … 20:00 » | Ajouter une colonne d'heures à gauche |
| E-2b | **Aucune date** (seulement « LUN, MAR… ») alors que l'aperçu en affiche | `exports.ts:151` n'écrit que le nom du jour | Écrire « Lun 26 » (date de la semaine exportée) |
| E-2c | **Chevauchements illisibles** : deux cours à la même heure sont dessinés l'un sur l'autre (observé : « Chevauchement A » masque « Design d'interaction ») | Pas d'algorithme de colonnes ; l'éditeur écran en a un (`schedule-editor.tsx:31`), pas le PDF | Déplacer `layoutDayEvents` dans `lib/` et l'utiliser partout |
| E-2d | **Texte qui déborde** : un titre long passe sur 3 lignes et **recouvre l'horaire** | `doc.text(..., { maxWidth })` renvoie à la ligne sans limiter la hauteur (`exports.ts:166`) | `doc.splitTextToSize` + limite de lignes + « … » |
| E-2e | **Police minuscule** : titres 5,3 pt, horaires 4,3 pt (3,4 / 2,8 pt en fond d'écran) | `exports.ts:164-170` | Minimum **7 pt** sur A4 ; sinon réduire la plage horaire ou passer en portrait |
| E-2f | **Salle et enseignant absents** du PDF alors qu'ils sont saisis | Jamais écrits dans `downloadPdf` | Les afficher quand la hauteur du créneau le permet (comme l'écran, `height > 47`) |
| E-2g | **Horaires hors 8 h–20 h** : un cours à 07:00–09:00 est tronqué à 08:00 ; un cours à 19:00–21:30 sort de la grille | `exports.ts:158-159` (`480` / `1200` codés en dur) | Plage automatique (6.1) + indicateur « commence à 07:00 » |
| E-2h | **Tableau mensuel = liste**, pas un calendrier, et **tous les mois mélangés** (pas de filtre sur le mois affiché) | `exports.ts:76-116` | Grille de mois + paramètre « mois à exporter » |
| E-2i | **Titre trop long sur « fond téléphone »** : il passe sur deux lignes et **recouvre le sous-titre** | `exports.ts:57` (`maxWidth`, pas de réduction de police) | Réduire la police jusqu'à tenir, ou tronquer |
| E-2j | **Sous-titre générique** « SEMAINE · PLANNING PERSONNEL » : ne dit pas quelle semaine | `exports.ts:62-65` | « Semaine du 26 oct. au 1er nov. 2026 » |
| E-2k | **Nom de fichier** : seul le titre sert de nom (`semestre-de-printemps.pdf`), sans date ni format | `exports.ts` (`safeName`) | `titre-AAAA-MM-JJ-a4-paysage.pdf` |
| E-2l | Le PDF **n'a pas de métadonnées** (titre, auteur) ni de pagination | Aucun `doc.setProperties` | Ajouter titre / sujet / date |

**Extrait de correctif (texte qui tient dans son cadre) :**

```ts
function fitText(doc: jsPDF, text: string, maxW: number, maxLines: number): string[] {
  const lines = doc.splitTextToSize(text, maxW) as string[];
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && doc.getTextWidth(last + "…") > maxW) last = last.slice(0, -1);
  kept[maxLines - 1] = last + "…";
  return kept;
}
```

### 5.3 🟠 [E-3] PNG : couleurs perdues, événements coupés, risque de zoom

| ID | Défaut | Preuve / cause | Correctif |
|---|---|---|---|
| E-3a | **Les couleurs des cours disparaissent** : tous les créneaux sont gris-lavande, seule une fine bordure gauche garde la couleur | `export-studio.tsx:16` applique `event.color` à `borderLeftColor` seulement ; le fond est `rgba(246,244,249,.87)` (CSS) | Utiliser `background: event.color` (version « éco-encre » = fond blanc) |
| E-3b | **4 événements maximum par jour**, les autres sont **supprimés sans le dire** | `export-studio.tsx:16` : `events.slice(0, 4)` | Afficher « +N de plus » ou adapter la hauteur |
| E-3c | **Lignes d'heures irrégulières** (deux systèmes de lignes superposés) et **aucune étiquette d'heure** | CSS `.export-paper-day-content` (gradient à 24 %) + `.export-paper-hour-lines` (flex `space-evenly`) | Un seul système, calculé depuis `SheetModel` |
| E-3d | **Texte de jour vide coupé** (« Un espace pour de nouvelles / idées ») avec un grand interligne | `.export-empty-line` (`globals.css`) | Texte plus court ou supprimé |
| E-3e | **Résolution non adaptée aux fonds d'écran** : l'export produit 2100×1485 px (A4 paysage) mais pour « téléphone » la largeur du papier est limitée à 340 px × 3 ≈ 1020 px | `exports.ts:232` (`pixelRatio: 3` fixe) | Calculer `pixelRatio = largeurCible / node.offsetWidth` (voir 5.4) |
| E-3f | **Polices non attendues** : aucune attente de `document.fonts.ready` avant la capture | `exports.ts:232` | `await document.fonts.ready` avant `toPng` |
| E-3g | **Risque (à vérifier)** : la taille des écrits est appliquée avec `document.body.style.zoom` (`planner-app.tsx:70`). Cette propriété non standard décale souvent les captures `html-to-image` | — | Remplacer par `html { font-size: X% }` et unités `rem` ; en attendant, forcer le zoom à 1 pendant la capture |

### 5.4 🟡 [E-4] Formats : « Fond téléphone » et « Fond d'écran PC » ne donnent pas un fond d'écran

**Constat (reproduit).** Ces deux formats produisent un **PDF de 90 × 160 mm** (téléphone) ou 160 × 90 mm (PC). Un PDF n'est pas utilisable comme fond d'écran, et ces dimensions n'ont aucun rapport avec une vraie résolution.

**Quoi faire.**

| Format | Sortie correcte | Résolution cible |
|---|---|---|
| A4 / Letter | PDF **et** impression **et** Word | 210×297 mm / 215,9×279,4 mm |
| Fond téléphone | **PNG uniquement** | **1080 × 1920** (ou 1170 × 2532 pour iPhone) |
| Fond d'écran PC | **PNG uniquement** | **1920 × 1080** (ou 2560 × 1440) |

Dans l'interface : quand un format « fond d'écran » est choisi, **masquer** « PDF », « Word » et « Imprimer », et mettre « Image HD » en bouton principal. Exemple :

```ts
const TARGETS = { phone: { w: 1080, h: 1920 }, desktop: { w: 1920, h: 1080 } };
export async function downloadPng(node: HTMLElement, board: PlannerBoard, format: ExportFormat) {
  await document.fonts.ready;
  const t = TARGETS[format as "phone" | "desktop"];
  const pixelRatio = t ? t.w / node.offsetWidth : 3;
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio, backgroundColor: "#ffffff" });
  /* … téléchargement … */
}
```

### 5.5 🟡 [E-5] Word : liste à puces, options ignorées

**Constat (reproduit).** Le `.docx` produit contient seulement des titres de jours et des lignes à puces (`07:30 – 08:30   Yoga & café   Maison`). Aucun tableau, aucune date, aucune couleur.

| ID | Défaut | Correctif |
|---|---|---|
| E-5a | **Format A4 / Letter / fonds d'écran ignorés** : la page Word est toujours celle par défaut (`exports.ts:226`) | Définir `size: { width, height }` selon le format |
| E-5b | **Police Sans / Serif / Mono ignorée** | `styles: { default: { document: { run: { font } } } }` |
| E-5c | **« Fond blanc », « Titre », « Signature » ignorés** (seuls titre et horaires sont pris en compte) | Respecter les options |
| E-5d | **Pas de tableau** : un planning se lit mieux en grille | Tableau 7 colonnes × lignes d'heures (ou un tableau par jour) avec `docx.Table` |
| E-5e | **Pas de dates** et **pas de langue** : le correcteur de Word ne sait pas que le texte est français | Dates réelles ; `language: { value: "fr-FR" }` |
| E-5f | **Espaces insécables en dur** (`"   "`) pour séparer les colonnes | Utiliser des tabulations / cellules |
| E-5g | **Mensuel :** tous les mois mélangés, pas d'année sur certains titres | Filtrer sur le mois exporté ; toujours afficher l'année |
| E-5h | **Pas d'en-tête / pied de page** (page X/Y, date d'export) | `Header` / `Footer` + `PageNumber` |

> **Astuce :** pour le Word, la version la plus utile est un **tableau modifiable** (c'est la promesse « .docx modifiable » du bouton).

### 5.6 🟡 [E-6] Chargement : les bibliothèques d'export alourdissent toute l'application

Le plus gros fichier JavaScript de production fait **759 Ko (230 Ko compressé)** et contient `jspdf`, `html2canvas`, `canvg` et `dompurify`, chargés **même si l'on n'exporte jamais**.

**Quoi faire.** Charger à la demande :

```ts
// export-studio.tsx
const useExport = async (format: string, run: () => Promise<void>) => { /* … */ };

onClick={() => runExport("pdf", async () => {
  const { downloadPdf } = await import("@/lib/exports");
  downloadPdf(board, options);
})}
```

---

## 6. Défauts de l'emploi du temps (éditeur)

### 6.1 🟠 [T-1] Plage horaire figée de 8 h à 20 h — créneaux hors plage tronqués

**Constat (reproduit).** Le cours « Yoga & café » de **07:30 à 08:30** apparaît collé en haut de la grille, **sans son titre** (seul « 07:30 – 08:30 » est visible). Un cours à 19:00–21:30 serait coupé à 20 h. Les événements qui commencent avant 8 h ou après 20 h sont **impossibles à lire**.

**Cause.** `schedule-editor.tsx:14-15` (`hourStart = 8`, `hourEnd = 20`) et `:204` (hauteur minimale 27 px, titre masqué sous 47 px).

**Quoi faire.**

```ts
function getHourRange(events: ScheduleEvent[], min = 8, max = 20) {
  if (!events.length) return { start: min, end: max };
  const starts = events.map(e => Math.floor(minutesFromTime(e.start) / 60));
  const ends   = events.map(e => Math.ceil(minutesFromTime(e.end)   / 60));
  return { start: Math.min(min, ...starts), end: Math.max(max, ...ends) };
}
```

Utiliser cette plage dans l'éditeur, la vue matricielle **et** tous les exports. Dans le formulaire (`event-dialog.tsx`), proposer aussi un réglage « Plage affichée : 6 h – 22 h ».

### 6.2 🟡 [T-2] « GMT+2 » codé en dur

`schedule-editor.tsx:192` affiche toujours « GMT+2 », quel que soit le pays de l'utilisateur. Remplacer par le fuseau réel :

```ts
const tzLabel = new Intl.DateTimeFormat("fr-FR", { timeZoneName: "short" })
  .formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value ?? "";
```

…ou **supprimer** cette étiquette (elle n'apporte rien à un emploi du temps).

### 6.3 🟡 [T-3] Vue « Matriciel » trompeuse

**Constat (reproduit).** Un créneau de **09:00 à 11:30** est dessiné dans **trois cases** (9 h, 10 h, 11 h), chacune affichant « 09:00 » : on dirait **trois cours différents**. Le créneau de 07:30 apparaît dans la ligne 08:00.

**Quoi faire.**
- Fusionner les cases avec `rowSpan` (durée en heures arrondie), **ou** n'afficher le titre que dans la première case et une barre de continuation dans les suivantes.
- Les éléments `<span onClick>` sont **à l'intérieur d'un `<button>`** (`schedule-editor.tsx`, vue matricielle) : HTML invalide et inutilisable au clavier. Remplacer par des `<div>` positionnés ou des boutons non imbriqués.

### 6.4 🟡 [T-4] En-têtes de jours mal lisibles

**Constat.** Dans la vue chronologique, « LUN » et « 26 » sont écartés l'un de l'autre et ressemblent à **deux colonnes distinctes** (surtout sur mobile, 3 jours visibles seulement). Le jour courant est marqué d'un point sous le numéro.

**Quoi faire.** Un en-tête par jour : nom sur la première ligne, numéro en dessous (ou pastille), centré sur toute la largeur de la colonne.

### 6.5 🟡 [T-5] Pas de détection de conflits ni de contraintes de saisie

`saveEvent` (`schedule-editor.tsx:133`) vérifie seulement fin > début. Aucun avertissement si deux cours se chevauchent, aucune vérification que l'événement dépasse minuit, aucune limite de nombre d'événements. Les créneaux superposés se dessinent côte à côte à l'écran (bien) mais **pas** dans le PDF (voir E-2c).

**Quoi faire.** Afficher un avertissement non bloquant (« Chevauche *Typographie* 09:00–11:00 ») dans la boîte de dialogue.

### 6.6 🟠 [T-6] Modèle de données : événements non rattachés à une semaine

Pour les tableaux « emploi du temps », « hebdo » et « quotidien », un événement ne connaît que son **jour de la semaine**. Conséquences :

- naviguer à la semaine suivante montre **les mêmes événements** (cohérent pour un emploi du temps scolaire, **faux** pour un planificateur hebdo où l'on note des tâches datées) ;
- l'export affiche des dates (« 26–01 ») calculées à partir de **la date de dernière modification du tableau** (`export-studio.tsx:25`) — donc fausses dès que la semaine courante change ;
- il n'y a **aucune récurrence** (« tous les lundis jusqu'au 15 janvier »), ni **semaines A/B**, ni **période de validité** (début/fin de semestre).

**Quoi faire (par ordre de simplicité).**

1. Ajouter au type `ScheduleEvent` : `recurrence?: "weekly" | "none"`, `validFrom?: string`, `validTo?: string`.
2. Dans l'éditeur, afficher un événement si `recurrence === "weekly"` (et dans la période) **ou** si `date` correspond à la semaine affichée.
3. Pour l'export, ajouter un sélecteur « **Semaine à exporter** » (par défaut : la semaine affichée dans l'éditeur).

### 6.7 🟡 [T-7] Autres points de l'éditeur

| ID | Constat | Correctif |
|---|---|---|
| T-7a | Les 7 jours sont toujours affichés, même pour un emploi du temps du lundi au vendredi | Option « Masquer le week-end » |
| T-7b | Pas de glisser-déposer / redimensionnement des créneaux | À prévoir (roadmap) |
| T-7c | Le titre du tableau se valide au `blur` **et** avec un bouton ✓ très éloigné du champ | Supprimer le ✓ (enregistrement automatique) ou le coller au champ |
| T-7d | Le bouton « Semaine / Jour » (`schedule-editor.tsx:186`) affiche l'**état courant** et non l'**action** : on ne sait pas s'il faut cliquer pour passer en jour ou en semaine | Contrôle segmenté « Semaine \| Jour » |

---

## 7. Boutons, tableaux et organisation de l'interface

### 7.1 🟡 [U-1] Cartes « Format de page » qui débordent du panneau (mesuré)

**Constat (reproduit à 1440 px de large).** Dans le Studio, les cartes « US Letter » et « Fond d'écran PC » dépassent du panneau d'options : bord droit des cartes à **562 px** pour un panneau qui s'arrête à **544 px** (**18 px de débordement**). On le voit à l'œil nu : les cartes sortent de leur cadre.

**Quoi faire.**
- Passer la grille des formats en **une colonne** (4 lignes) ou en `grid-template-columns: repeat(2, minmax(0, 1fr))` avec `min-width: 0` sur les cartes.
- Retirer les largeurs fixes de `.format-option` et laisser le texte passer à la ligne.
- Élargir le panneau d'options à `clamp(260px, 22vw, 320px)`.

### 7.2 🟡 [U-2] Boutons en double ou qui font la même chose

| Action | Où elle apparaît | Recommandation |
|---|---|---|
| **Imprimer** | En-tête de l'éditeur + Studio (+ version mensuelle de l'éditeur) | **Un seul** : dans le Studio |
| **Exporter** | En-tête de l'éditeur + Studio (« Télécharger le PDF ») + 3 boutons en bas du Studio | Studio : **un bouton principal** + menu « Autres formats » |
| **Ajouter un créneau** | En-tête + « Nouveau créneau » en pied + cases « + » + « Ajouter » dans les jours vides | Garder : en-tête + clic sur la grille |
| **Nouveau tableau** | Barre latérale + titre de page + carte « Créer un tableau » + état vide | Garder : barre latérale + carte |
| **Voir les dossiers** (barre latérale) | Identique à « Mes tableaux » (`planner-sidebar.tsx:105`) | **Supprimer** ou en faire un vrai écran de dossiers |
| **✓ du titre** | Bouton ✓ à droite du titre, très éloigné du champ | Supprimer (enregistrement au `blur`) |

**Studio — organisation proposée :**

```
┌────────────────────────────────────────────────────────────────┐
│ ← Retour au planning        [ Réinitialiser ]  [ Exporter ▾ ]  │  ← 1 seul bouton principal
├──────────────┬─────────────────────────────────────────────────┤
│ 1 Format     │                                                 │
│ 2 Contenu    │            APERÇU (identique au résultat)       │
│ 3 Style      │                                                 │
│              │   Semaine : ◀ 26 oct. – 1 nov. ▶                │
└──────────────┴─────────────────────────────────────────────────┘
Menu « Exporter » : PDF · Word · Image · Imprimer   (selon le format choisi)
```

### 7.3 🟡 [U-3] Libellés et options ambigus

| Libellé actuel | Problème | Proposition |
|---|---|---|
| « Dates & en-tête » | Deux choses en une | Séparer : « Dates des jours » / « En-tête du document » |
| « Horaires des cours » | Faux pour un planning hebdo ou quotidien | « Horaires » |
| « Signature PlaniLux » | Peu clair | « Afficher le logo PlaniLux » |
| « Fond blanc (éco-encre) » | Le comportement diffère selon la sortie | « Sans couleurs (économie d'encre) » et l'appliquer **partout** |
| Badge « Créer » du bouton « Nouveau tableau » | Ressemble à un raccourci clavier mais n'en est pas un | Supprimer ou afficher un vrai raccourci (« N ») |
| Compteur « 3 » de « Vue d'ensemble » (`planner-sidebar.tsx:82`) | **Valeur écrite en dur** | Supprimer ce compteur |
| « Offre personnelle » sous le nom de l'espace | Faux plan commercial inexistant | Supprimer |
| E-mail `prenom@email.fr` du profil (`planner-sidebar.tsx:128`) | **Adresse inventée** à partir du prénom | Afficher la vraie adresse (après authentification) |
| « CM · Camille » sur chaque carte (`board-library.tsx:78`) | Nom **écrit en dur**, ignore le profil | Utiliser le nom du profil |

### 7.4 🟠 [U-4] Polices de 6 à 9 px — c'est la cause principale du « pas bien organisé »

Comptage dans `globals.css` : **14 déclarations à 6 px, 34 à 7 px, 55 à 8 px, 50 à 9 px** (153 au total ≤ 9 px), dont les libellés des boutons du Studio sur mobile (6–7 px), les en-têtes du tableau, les horaires et les légendes. À cette taille, l'interface est **difficile à lire**, les boutons paraissent désordonnés et les cibles tactiles sont trop petites.

**Quoi faire.**
1. Définir une échelle de tailles en variables CSS :

```css
:root {
  --fs-xs: 0.75rem;   /* 12 px — minimum absolu */
  --fs-sm: 0.8125rem; /* 13 px */
  --fs-md: 0.9375rem; /* 15 px */
  --fs-lg: 1.125rem;
  --fs-xl: 1.5rem;
}
```

2. Remplacer **toutes** les valeurs `6px…9px` par `var(--fs-xs)` au minimum. Les aperçus d'export (`clamp(4px, …)`) peuvent rester petits, car ils reproduisent une feuille, mais pas les contrôles.
3. Utiliser `rem` plutôt que `px` pour que le réglage « Taille des écrits » fonctionne partout (au lieu de `body.style.zoom`).

### 7.5 🟡 [U-5] Contrastes insuffisants (calculés)

Contraste du texte sur fond blanc (WCAG AA exige **4,5 : 1**) :

| Couleur | Usage | Contraste | Verdict |
|---|---|---|---|
| `#a7a1b0` | Sur-titres, légendes d'aperçu | **2,51 : 1** | ❌ |
| `#c3bfc9` | Texte des jours vides | **1,81 : 1** | ❌ |
| `#9c97a2` | Salles / lieux d'aperçu | **2,85 : 1** | ❌ |
| `#aaa5b0` | Pied de page d'aperçu | **2,41 : 1** | ❌ |
| `#817b89` | Horaires d'aperçu | 4,10 : 1 | ⚠️ limite |

→ Assombrir ces gris (viser `#6b6577` ou plus foncé pour le texte utile).

### 7.6 🟡 [U-6] Mobile (390 px)

- Le sélecteur de jour (L M M J V S D) **fait doublon** avec l'en-tête de la grille et mène à une vue « un jour » alors que la grille affiche encore 3 jours.
- La grille de la semaine n'affiche que **3 jours à la fois** (défilement horizontal non signalé).
- **Cibles tactiles trop petites :** boutons d'icônes de la barre supérieure à 30 px, recherche à 29 px, bascule grille/liste à 23 px (`globals.css`, bloc `max-width: 460px`). Le minimum recommandé est **44 × 44 px**.
- Les boutons « Exporter / Image HD / Word » du Studio ont un texte de 6–7 px.

**Quoi faire.** Sur mobile : afficher **un seul jour** (avec glissement gauche/droite) et masquer le sélecteur en double ; passer toutes les zones tactiles à 44 px ; mettre les actions d'export dans une **feuille de partage** (bottom sheet).

### 7.7 🟡 [U-7] Autres incohérences d'interface

| ID | Constat | Correctif |
|---|---|---|
| U-7a | Fenêtres **natives** `window.confirm` / `alert` (restauration depuis la corbeille, réinitialisation, « mot de passe oublié ») | Utiliser les boîtes de dialogue de l'application |
| U-7b | La **corbeille** : ouvrir un tableau supprimé demande une confirmation native | Bouton « Restaurer » visible sur la carte |
| U-7c | **Notifications fictives** (3 messages statiques) et pastille rouge « non lu » | Supprimer tant qu'il n'y a pas de vraies notifications |
| U-7d | Carte « Garder un moment pour soi » (Vue d'ensemble) : la case à cocher **n'est pas enregistrée** (`overview.tsx:70`) | Enregistrer ou supprimer |
| U-7e | Dossiers « Université / Personnel » = simples **filtres par type**, pas de vrais dossiers | Renommer en « Filtres » ou créer de vrais dossiers |
| U-7f | **Import de sauvegarde destructif** : remplace tout sans confirmation ni fusion (`planner-app.tsx:481`), et affiche **deux messages** (un dans `settings-dialog.tsx:93`, un dans `planner-app.tsx:483`) | Confirmation + choix « Fusionner / Remplacer » + un seul message |
| U-7g | Le bouton d'export Word/PNG n'a **pas d'état d'erreur détaillé** (« Réessaie dans un instant ») | Afficher la cause quand elle est connue |

---

## 8. Données, synchronisation et sécurité

### 8.1 🔴 [S-1] Aucune authentification (connexion factice)

`src/components/login-view.tsx:38-49` : le formulaire attend 350 ms puis fait `router.push("/app")` **sans jamais vérifier** l'e-mail ni le mot de passe. Le bouton « Mot de passe oublié » affiche une alerte qui **promet un e-mail qui n'est jamais envoyé** (`:164`). Le mode « invité » mène au même endroit.

**Conséquence en production :** n'importe qui peut ouvrir `/app`. Combiné à 8.2, **les données de tous les visiteurs sont mélangées**.

**Quoi faire.** Supprimer la fausse connexion et brancher **Supabase Auth** (section 10).

### 8.2 🔴 [S-2] API ouverte et partagée par tous

- `src/app/api/boards/route.ts` et `[id]/route.ts` : **aucun contrôle d'identité**. Toute personne connaissant l'URL peut **lire, modifier et supprimer** tous les tableaux.
- La table `planner_boards` n'a **pas de colonne `user_id`** : il n'y a qu'un seul « espace » pour toute l'application.
- Le `GET` **recrée les 3 tableaux d'exemple** dès que la table est vide (`api/boards/route.ts:23`) : si un utilisateur supprime tout, les exemples **réapparaissent**.

**Quoi faire.** Ajouter `user_id`, filtrer chaque requête sur l'utilisateur authentifié, et activer **RLS** (section 10.4).

### 8.3 🟠 [S-3] Le statut « Enregistré » est faux quand la base est indisponible (reproduit)

Pendant mes tests, l'API répondait **500** (pas de base) et l'interface affichait quand même :
- « **● Enregistré** » (`schedule-editor.tsx`, en-tête de l'éditeur),
- « **synchronisé automatiquement** » (sous le titre),
- « **Chaque modification est enregistrée automatiquement** » (bas de l'éditeur).

Ces textes sont **statiques** : aucune variable ne les relie à l'état réel. Dans `planner-app.tsx`, les échecs réseau sont avalés par `.catch(() => undefined)` / `.catch(() => { … })` (lignes 138 et 197).

**Quoi faire.** Introduire un état de synchronisation réel :

```ts
type SyncState = "saved" | "saving" | "offline" | "error";
// affiché dans l'en-tête : ● Enregistré · ◌ Enregistrement… · ⚠ Hors ligne (modifs conservées) · ✖ Erreur (Réessayer)
```

et une **file d'attente** de modifications à rejouer (voir 8.4).

### 8.4 🟠 [S-4] La synchronisation peut perdre ou ressusciter des données

| Scénario | Ce qui se passe (lecture du code) |
|---|---|
| Tableau créé **hors ligne**, importé depuis un fichier, ou issu de « Réinitialiser » | Il est ajouté localement lors de la fusion mais **jamais envoyé au serveur** (`planner-app.tsx:128-136` : fusion sans `POST`) → il n'existe que sur cet appareil |
| Suppression définitive pendant que le serveur est indisponible | Le `DELETE` échoue en silence ; au prochain chargement, le serveur **renvoie le tableau** et il **réapparaît** |
| Deux appareils modifient le même tableau | **Le dernier écrit gagne**, selon l'horloge de chaque appareil : des créneaux peuvent disparaître |
| Chaque modification de créneau | Un `PATCH` complet (tous les créneaux) à chaque fois, sans temporisation |

**Quoi faire.**
1. Une **file d'opérations** persistée (`{ boardId, type, payload, tries }`) rejouée au retour du réseau.
2. Envoyer **tous les tableaux locaux absents du serveur** (`POST`) lors de la fusion.
3. Temporiser (**debounce ≈ 800 ms**) les `PATCH`.
4. Résolution de conflit : comparer `updated_at` **du serveur** (pas l'horloge cliente) et prévenir l'utilisateur en cas de conflit.
5. Idéalement, passer à des modifications **par événement** (table `events`) plutôt qu'un gros JSON.

### 8.5 🟠 [S-5] Aucune validation des entrées côté serveur

`route.ts` (POST) et `[id]/route.ts` (PATCH) acceptent **n'importe quel JSON** :

- `kind` n'est pas comparé à la liste autorisée ; `color` n'est pas validée ;
- `events` : aucune vérification de structure, de taille, de nombre ;
- `request.json()` pas protégé contre un corps invalide ou énorme ;
- messages d'erreur incohérents (`[id]/route.ts:45` : le `DELETE` répond « Impossible de **déplacer** le tableau », alors qu'il supprime).

**Quoi faire.** Valider avec **Zod** :

```ts
import { z } from "zod";
const Event = z.object({
  id: z.string().min(1).max(64), title: z.string().min(1).max(80),
  day: z.number().int().min(0).max(6), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  location: z.string().max(70).optional(), teacher: z.string().max(70).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i), notes: z.string().max(300).optional(),
});
export const BoardInput = z.object({
  title: z.string().trim().min(1).max(100),
  kind: z.enum(["school","weekly","monthly","daily","blank"]),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#c6b8f5"),
  events: z.array(Event).max(500).default([]),
  favorite: z.boolean().default(false),
});
```

### 8.6 🔴 [S-6] Secrets et hygiène du dépôt

| Constat | Risque | Action |
|---|---|---|
| **Aucun `.gitignore`** | `.next/` (736 Mo), `node_modules/`, `.env.local` seraient envoyés sur GitHub | Créer le fichier (section 10.1) |
| `.env.local` présent (URL locale `postgresql://postgres:…@127.0.0.1`) | Fuite d'identifiants si publié | Ne pas publier ; créer `.env.example` sans secrets |
| `drizzle.config.json` contient une **URL de base codée en dur** | Mauvaise base visée / identifiants dans le dépôt | Remplacer par `drizzle.config.ts` lisant l'environnement (10.3) |
| Pas d'en-têtes de sécurité, pas de limitation de débit | Abus de l'API | `headers()` dans `next.config.ts` + limitation de débit (Vercel Firewall / Upstash) |

> Si un mot de passe réel a déjà été utilisé dans `.env.local` ou dans une archive partagée, **changez-le**.

---

## 9. Qualité du code, accessibilité, performance, PWA

### 9.1 🟡 [Q-1] ESLint : 21 erreurs + 1 avertissement (TypeScript : 0 erreur)

Le détail ligne par ligne est en [annexe A](#annexe-a--détail-des-erreurs-eslint). Résumé et correctifs :

| Règle | Nb | Où | Correctif |
|---|---|---|---|
| `react-hooks/rules-of-hooks` | 4 | `export-studio.tsx:79, 97` | La fonction `useExport` (ligne 68) **n'est pas un hook** mais son nom commence par `use`. La renommer `runExport` |
| `react-hooks/purity` | 1 | `export-studio.tsx:25` | `Date.now()` pendant le rendu. Calculer la semaine **hors rendu** (et avec la bonne règle, voir 6.6) |
| `react-hooks/set-state-in-effect` | 3 | `login-view.tsx:24`, `planner-app.tsx:91`, `schedule-editor.tsx:115` | Initialiser l'état directement (`useState(() => …)`), utiliser un `key` pour réinitialiser, ou `useSyncExternalStore` pour `localStorage` |
| `react/no-unescaped-entities` | 13 | `help-dialog.tsx`, `settings-dialog.tsx` | Remplacer l'apostrophe droite par `’` (cohérent avec le reste du texte) ou `&apos;` |
| `jsx-a11y/alt-text` (avert.) | 1 | `export-studio.tsx:97` | **Faux positif** : l'icône `Image` de lucide masque l'élément HTML. Écrire `import { Image as ImageIcon } from "lucide-react"` |

**Objectif :** `npm run lint` à **0 erreur**, et le brancher dans la CI (10.1) pour que ça le reste.

### 9.2 🟡 [Q-2] Lisibilité et structure du code

| Constat | Conséquence | Action |
|---|---|---|
| Lignes de **plus de 1 000 caractères** (`export-studio.tsx:97`, plusieurs lignes de `globals.css` avec des dizaines de règles) | Revue de code impossible, conflits Git permanents, erreurs difficiles à repérer | Passer **Prettier** sur tout le projet (`npx prettier --write .`) |
| `planner-app.tsx` concentre ~25 états, la synchronisation, les préférences, la navigation | Fragile : toute modification peut en casser une autre | Extraire `useBoards()` (données + synchro), `usePreferences()` (thème, zoom, nom), `useToast()` |
| 3 fichiers CSS de 2 660 lignes, Tailwind 4 installé mais quasi inutilisé | Doublons, styles contradictoires, 17 `!important` | Choisir : **soit** Tailwind, **soit** CSS Modules ; découper par composant |
| `package.json` : nom `nextjs-postgresql-template`, pas d'`engines`, pas de `packageManager` | Déploiements non reproductibles | Renommer en `planilux`, ajouter `"engines": { "node": ">=22" }` |
| Aucun test | Chaque correctif d'export risque d'en casser un autre | Voir 9.3 |

### 9.3 🟠 [Q-3] Tests à ajouter (peu coûteux, très utiles ici)

1. **Tests unitaires (Vitest)** sur `layoutDayEvents`, `getHourRange`, `buildSheetModel`, la validation Zod.
2. **Tests d'export (Playwright)** : cliquer « PDF » et vérifier la taille de page (A4 = 595×842 pt), « Image HD » et vérifier les dimensions du PNG (1080×1920), « Word » et vérifier la présence d'un tableau.
3. **Test d'impression** : `page.pdf({ preferCSSPageSize: true })` et vérifier format + orientation.
4. **Test de non-régression visuelle** (`toHaveScreenshot`) pour la vue semaine, la vue mois et le Studio, en 1440 px et 390 px.

### 9.4 🟡 [Q-4] Accessibilité

| Constat | Correctif |
|---|---|
| Éléments cliquables imbriqués : `<span onClick>` dans un `<button>` (vue matricielle) | Éviter l'imbrication |
| `div role="button"` pour la semaine miniature, le profil de la barre latérale | Utiliser de vrais `<button>` (focus + Entrée + Espace gérés) |
| Contrastes insuffisants (7.5), cibles tactiles < 44 px (7.6) | Corriger |
| Le jour du calendrier n'a pas de nom accessible complet (« 26 » seul) | `aria-label="Lundi 26 octobre"` |
| Pas de style `:focus-visible` homogène | Anneau de focus visible sur tous les contrôles |
| Texte « Chaque modification est enregistrée » statique | Utiliser `aria-live="polite"` sur le vrai statut de synchronisation |

### 9.5 🟡 [Q-5] Performance

- **759 Ko de JavaScript (230 Ko compressé)** dans le plus gros fichier, à cause des bibliothèques d'export → **import dynamique** (5.6).
- **95 Ko de CSS** global → purge et découpage (9.2).
- Le service worker met en cache `/_next/static/` sans limite de taille.

### 9.6 🟡 [P-1] PWA (installation sur téléphone)

| Constat | Correctif |
|---|---|
| `manifest.json` : `start_url: "/"` = **page de connexion** | Mettre `/app` (une fois l'authentification en place) |
| Icônes : un seul **SVG** | Ajouter des **PNG 192×192 et 512×512** (+ une version *maskable*) |
| `sw.js` : cache nommé `planilux-v1`, jamais renouvelé | Versionner avec le numéro de déploiement ; ne mettre en cache que le nécessaire |
| Hors ligne : `/app` n'est pas pré-chargé (seulement `/` et le manifeste) | Ajouter `/app` à la liste de pré-cache **ou** utiliser une bibliothèque éprouvée (Serwist) |
| `themeColor` clair figé | Ajouter une variante sombre via `media` |

---

## 10. Déploiement GitHub + Vercel + Supabase

### 10.0 Choisir l'architecture (à décider avant de commencer)

| | **Option A — minimale** | **Option B — recommandée** |
|---|---|---|
| Accès aux données | Garder Drizzle + `pg` + routes `/api/boards` | **`@supabase/supabase-js` + `@supabase/ssr`** (HTTPS, sans connexion Postgres directe) |
| Authentification | À écrire vous-même (ou Auth.js) | **Supabase Auth** (e-mail / lien magique / Google) |
| Sécurité des données | Dans **votre code** (chaque requête filtre `user_id`) | **RLS** dans la base (même si le code oublie un filtre) |
| Connexions sur Vercel | Pooler obligatoire, `max: 1`, SSL, risques de saturation | Aucun souci de pool |
| Effort | 1 à 2 jours | 2 à 3 jours |
| Piège majeur | ⚠️ le rôle `postgres` utilisé par `pg` **contourne RLS** : la sécurité repose à 100 % sur votre code | Ne **jamais** exposer la clé `service_role` côté navigateur |

> **Recommandation : Option B.** Elle supprime `pg`, `drizzle-orm`, `drizzle-kit`, les routes d'API et le problème de build (`DATABASE_URL` obligatoire). Les sections 10.3 (option A) et 10.4–10.5 (option B) sont détaillées toutes les deux.

### 10.1 GitHub — préparer et publier le dépôt

**Étape 1 — Nettoyer (obligatoire avant tout `git add`).** Créer `.gitignore` :

```gitignore
# dépendances & builds
node_modules/
.next/
out/
build/
coverage/
*.tsbuildinfo

# secrets & environnement
.env
.env.*
!.env.example

# divers
.vercel/
.DS_Store
npm-debug.log*
playwright-report/
test-results/
```

Supprimer du dossier **avant** de l'envoyer : `.next/`, `tsconfig.tsbuildinfo`, `.env.local`. Créer `.env.example` :

```bash
# Option B (recommandée)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # clé « anon » / « publishable » (publique par conception)
# Option A uniquement
DATABASE_URL=postgresql://postgres.xxxxxxxx:MOT_DE_PASSE@aws-0-REGION.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.xxxxxxxx:MOT_DE_PASSE@aws-0-REGION.pooler.supabase.com:5432/postgres
```

**Étape 2 — Initialiser et publier** (avec la CLI GitHub `gh`) :

```bash
cd planilux_Luna
git init -b main
git add -A && git status        # ⚠️ vérifier : aucun .env, aucun .next, aucun node_modules
git commit -m "chore: import initial PlaniLux"
gh auth login
gh repo create planilux --private --source=. --remote=origin --push
```

**Étape 3 — Protéger et automatiser.**
- Activer *Secret scanning* et *Push protection* (Settings → Code security).
- Protéger `main` : PR obligatoire + contrôles de CI réussis.
- Ajouter `.github/workflows/ci.yml` :

```yaml
name: CI
on: { pull_request: {}, push: { branches: [main] } }
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-placeholder
```

> Le `build` en CI utilise des **valeurs factices** : il doit passer **sans** vraie base (c'est justement ce que corrige l'étape 10.3).

### 10.2 Supabase — créer et configurer le projet

1. **Créer le projet** (supabase.com → New project). Choisir la **région la plus proche de vos utilisateurs** et noter-la : vous mettrez la fonction Vercel dans la même région (10.6). Garder le mot de passe de base dans un gestionnaire de mots de passe.
2. **Récupérer les valeurs** (Project Settings) :
   - *API* : `Project URL`, clé **anon / publishable** (publique) ; la clé **service_role / secret** ne doit **jamais** aller dans le navigateur ni dans une variable `NEXT_PUBLIC_*`.
   - *Database → Connection string* (option A) : utiliser le **pooler** (« Transaction pooler », port **6543**) pour l'application, et la connexion **session/directe** (port 5432) pour les migrations. Vercel est en IPv4 : la connexion directe n'est pas toujours joignable, **le pooler est la bonne voie**.
3. **Authentification** (Authentication → URL Configuration) :
   - *Site URL* : l'URL de production (ex. `https://planilux.vercel.app`) ;
   - *Redirect URLs* : `http://localhost:3000/**`, l'URL de production et le modèle des **aperçus Vercel** (`https://*-<votre-équipe>.vercel.app/**`).
4. **Fournisseurs** : activer *Email* (confirmation par e-mail) ; Google en option. Configurer un **SMTP personnalisé** avant l'ouverture au public (le service d'e-mails par défaut est très limité).
5. **Offre gratuite** : vérifier les conditions de mise en pause des projets inactifs et l'absence de sauvegardes automatiques ; prévoir une **sauvegarde régulière** (export) ou une offre payante.

### 10.3 Option A — adapter l'accès Postgres (si vous gardez Drizzle)

**1. Connexion paresseuse (corrige l'échec du build).** Remplacer `src/db/index.ts` :

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const pool = new Pool({
    connectionString: url,
    max: 1,                                    // 1 connexion par instance serverless
    idleTimeoutMillis: 10_000,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });
  _db = drizzle(pool);
  return _db;
}
```

Puis remplacer `db.` par `getDb().` dans les trois routes API. Ajouter `export const dynamic = "force-dynamic";` dans `api/boards/[id]/route.ts`.

> `rejectUnauthorized: false` accepte tout certificat : à remplacer par le certificat racine de Supabase (téléchargeable dans *Database → SSL*) dès que possible.

**2. Remplacer `drizzle.config.json` par `drizzle.config.ts`** (lit l'environnement, plus d'URL en dur) :

```ts
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL! },
});
```

**3. Scripts** dans `package.json` : `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`.
**4. Ajouter `user_id`** à `schema.ts` et filtrer **chaque** requête : `.where(and(eq(plannerBoards.id, id), eq(plannerBoards.userId, user.id)))`.
**5. Authentification** : vous devrez vérifier l'identité de l'utilisateur dans chaque route (Auth.js ou Supabase Auth côté serveur). **RLS n'est pas appliquée** à cette connexion.

### 10.4 Option B — base Supabase avec RLS (recommandé)

Créer le fichier `supabase/migrations/0001_planner_boards.sql` (ou coller dans l'éditeur SQL de Supabase) :

```sql
-- Table des tableaux, rattachés à leur propriétaire
create table if not exists public.planner_boards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 100),
  kind        text not null default 'school'
              check (kind in ('school','weekly','monthly','daily','blank')),
  color       text not null default '#c6b8f5' check (color ~ '^#[0-9a-fA-F]{6}$'),
  events      jsonb not null default '[]'::jsonb
              check (jsonb_typeof(events) = 'array' and jsonb_array_length(events) <= 500),
  favorite    boolean not null default false,
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists planner_boards_user_updated_idx
  on public.planner_boards (user_id, updated_at desc);

-- updated_at géré par la base (plus d'horloge cliente)
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger planner_boards_set_updated_at
  before update on public.planner_boards
  for each row execute function public.set_updated_at();

-- Sécurité : chacun ne voit et ne modifie que ses tableaux
alter table public.planner_boards enable row level security;

create policy "boards_select_own" on public.planner_boards
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "boards_insert_own" on public.planner_boards
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "boards_update_own" on public.planner_boards
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "boards_delete_own" on public.planner_boards
  for delete to authenticated using ((select auth.uid()) = user_id);
```

> Si une table `planner_boards` de test existe déjà dans votre base (sans `user_id`), **sauvegardez-la** (export JSON depuis *Paramètres → Données*) puis supprimez-la avant d'appliquer ce script.

**Vérifier la sécurité** : dans *Authentication → Policies*, la table doit afficher « RLS enabled » et 4 politiques. Puis lancer les *Security Advisors* (Database → Advisors) : aucune alerte « RLS disabled ».

### 10.5 Option B — brancher Supabase dans l'application

```bash
npm i @supabase/supabase-js @supabase/ssr
npm rm pg drizzle-orm drizzle-kit dotenv @types/pg   # si vous abandonnez Drizzle
```

Fichiers à créer :

| Fichier | Rôle |
|---|---|
| `src/lib/supabase/client.ts` | `createBrowserClient(URL, ANON_KEY)` pour les composants client |
| `src/lib/supabase/server.ts` | `createServerClient(...)` avec les cookies, pour les composants serveur |
| `proxy.ts` (Next 16 ; anciennement `middleware.ts`) | Rafraîchit la session et **redirige vers `/login`** si l'utilisateur n'est pas connecté sur `/app` |
| `src/app/auth/callback/route.ts` | Reçoit le lien magique / OAuth et échange le code contre une session |
| `src/lib/boards-repo.ts` | `list()`, `create()`, `update()`, `remove()` via `supabase.from("planner_boards")` ; **remplace** les `fetch("/api/boards…")` de `planner-app.tsx` |

Modifier `login-view.tsx` : remplacer le `setTimeout` factice par `supabase.auth.signInWithPassword` / `signUp` / `signInWithOtp`, afficher les **vraies erreurs** (mot de passe incorrect, e-mail non confirmé) et brancher « Mot de passe oublié » sur `resetPasswordForEmail`.

Conserver le `localStorage` comme **cache hors ligne** et appliquer la file d'attente décrite en 8.4. Supprimer le tableau d'exemples auto-créé côté serveur : proposer plutôt « Créer depuis un modèle » au premier lancement.

### 10.6 Vercel — déployer

1. **Importer le dépôt** GitHub (Add New → Project). Le préréglage *Next.js* est détecté automatiquement.
2. **Variables d'environnement** (Settings → Environment Variables), à définir pour *Production* **et** *Preview* :

| Variable | Valeur | Visible navigateur ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet | Oui (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon / publishable | Oui (publique, protégée par RLS) |
| `DATABASE_URL` *(option A)* | URL du **pooler** port 6543 | **Non** |
| `DIRECT_URL` *(option A, migrations)* | URL session/directe port 5432 | **Non** |
| `SUPABASE_SERVICE_ROLE_KEY` | *(à éviter : inutile pour cette application)* | **Jamais** public |

   > Les variables `NEXT_PUBLIC_*` sont **figées au moment du build** : après modification, **redéployez**. Alternative : l'intégration *Supabase ↔ Vercel* synchronise ces variables automatiquement.
3. **Node.js :** version 22 (Settings → General).
4. **Région des fonctions :** la même zone que votre base Supabase (ex. `fra1` pour l'Europe centrale) — inutile si vous ne gardez aucune route API.
5. **Déployer.** Chaque *pull request* génère un **déploiement d'aperçu** ; `main` déploie en production.
6. **Domaine** (optionnel) : Settings → Domains, puis ajouter ce domaine aux *Redirect URLs* de Supabase.
7. Activer **Vercel Analytics / Speed Insights** (optionnel) et surveiller les journaux d'exécution.

> L'offre *Hobby* de Vercel est réservée à un **usage personnel / non commercial** : si PlaniLux sert une activité commerciale, prévoir l'offre *Pro*.

### 10.7 Check-list de recette après déploiement

- [ ] Le **build** Vercel est vert, **sans** `DATABASE_URL` (option B) ou avec `DATABASE_URL` du pooler (option A).
- [ ] Création de compte → e-mail de confirmation reçu → connexion → arrivée sur `/app`.
- [ ] `/app` **inaccessible** sans connexion (redirection vers `/login`).
- [ ] **Isolation :** avec **deux comptes**, chacun ne voit que ses tableaux (test **indispensable** de la RLS).
- [ ] Créer / modifier / supprimer un tableau, recharger : les données persistent.
- [ ] Mode avion : modifier un créneau → l'état affiche « Hors ligne » → reconnexion → l'état repasse à « Enregistré ».
- [ ] **PDF A4 paysage** : bonne taille, heures et dates visibles, aucun texte qui déborde.
- [ ] **PNG téléphone** : 1080×1920 ; **PNG PC** : 1920×1080.
- [ ] **Impression** (Chrome et Firefox) : respecte A4/Letter et paysage/portrait.
- [ ] **Word** : tableau modifiable, bonne taille de page, correcteur en français.
- [ ] Planning **mensuel** : aperçu, PDF, PNG, Word et impression montrent un vrai mois.
- [ ] Lighthouse mobile : accessibilité ≥ 90 ; l'application s'installe comme PWA.
- [ ] Aucune clé `service_role` dans le code ni dans les variables publiques ; *Secret scanning* GitHub actif.

### 10.8 Erreurs fréquentes et remèdes

| Symptôme | Cause probable | Remède |
|---|---|---|
| Build Vercel : `Failed to collect page data for /api/boards/[id]` / `DATABASE_URL is required` | Connexion créée à l'import (reproduit) | Connexion paresseuse (10.3) ou Option B |
| `ECONNREFUSED` / `ENETUNREACH` vers la base | Connexion directe IPv6 depuis Vercel | Utiliser l'adresse du **pooler** |
| `too many connections` / `remaining connection slots` | Un pool par instance sans limite | `max: 1` + pooler en mode transaction |
| `SSL connection is required` / `self-signed certificate` | Paramètres SSL manquants | Option `ssl` (10.3) |
| Connexion OK en local, **redirection cassée** en production | URL de production absente des *Redirect URLs* | Compléter Supabase (10.2) |
| L'utilisateur voit une liste **vide** après connexion | RLS active mais `user_id` non renseigné, ou politique absente | Vérifier `default auth.uid()` et les 4 politiques |
| Les nouvelles variables d'environnement « ne marchent pas » | `NEXT_PUBLIC_*` figées au build | **Redéployer** |
| Un autre compte voit mes données | RLS désactivée ou accès via `service_role` / rôle `postgres` | Réactiver RLS ; utiliser la clé anon + session utilisateur |
