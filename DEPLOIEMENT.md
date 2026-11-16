# Déploiement de PlaniLux — GitHub, Supabase, Vercel

Le code (authentification, RLS, API sécurisée, migrations) est prêt. Il reste les opérations qui touchent à **vos comptes**, dans cet ordre.

## 0. Avant tout
1. **Changez le mot de passe de la base** (Supabase → Project Settings → Database → Reset database password). L'ancien se trouvait dans un `.env.local` partagé.
2. Ne partagez plus jamais `.env.local`, `node_modules` ni `.next`.

## 1. GitHub
```bash
git checkout -b chore/securite-auth-supabase
git add --renormalize .
git commit -m "chore: normaliser les fins de ligne (LF)"
git add -A && git commit -m "feat(auth): Supabase Auth, RLS, API sécurisée, migrations, tests"
git push -u origin chore/securite-auth-supabase
```
Ouvrez la Pull Request vers `main`, attendez une CI verte, puis fusionnez. Les branches `feat/phase-0…3` (corrections d'impression, d'export et d'éditeur) doivent être fusionnées avant ou en même temps.

## 2. Supabase — base de données
```bash
npx supabase login                                    # vous seul(e)
npx supabase link --project-ref asxwrokenlfntzzcohil  # mot de passe de la base : à saisir vous-même
npx supabase db push --dry-run                        # vérifier ce qui sera appliqué
npx supabase db push
```
Puis, dans le SQL Editor, suivez `supabase/manual/01_lignes_existantes.sql` (supprimer ou attribuer les anciennes lignes de `planner_boards`, qui sont invisibles tant qu'elles n'ont pas de propriétaire).

Vérification : `select tablename, rowsecurity from pg_tables where schemaname='public';` doit donner `true` pour `profiles` et `planner_boards`. Lancez aussi les « Security Advisors » de Supabase.

## 3. Vercel — Variables d'environnement

Les variables d'environnement nécessaires sur Vercel (Production, Preview, Development) sont strictement les suivantes :

| Nom de variable | Portée | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Serveur | URL du projet Supabase (`https://<projet>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Serveur | Clé publique / publishable (`sb_publishable_…` ou clé anon) protégée par RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **Serveur uniquement** | Clé d'administration Supabase requise pour `auth.admin.deleteUser` (suppression complète de compte) et lecture sécurisée des flux calendriers |
| `CALENDAR_SIGNING_SECRET` | **Serveur uniquement** | Secret aléatoire robuste (ex. chaîne hexadécimale de 32 octets) pour la signature HMAC des liens d'abonnement calendrier (ICS/webcal) |

> [!CAUTION]
> **Sécurité des clés serveur :** `SUPABASE_SERVICE_ROLE_KEY` et `CALENDAR_SIGNING_SECRET` ne doivent **JAMAIS** porter de préfixe `NEXT_PUBLIC_` et ne doivent jamais être exposées au client web.
> 
> **Nettoyage :** Vous pouvez supprimer de Vercel `DATABASE_URL` et `DIRECT_URL` si elles existaient : l'application utilise l'API Supabase via HTTPS (`@supabase/ssr`) et n'effectue aucune connexion TCP directe en production.

Connectez le dépôt GitHub (production = `main`) puis lancez le déploiement.

## 4. Supabase Auth (tableau de bord)
Avec l'URL de production `https://<domaine>` :
- Authentication → URL Configuration : **Site URL** = `https://<domaine>` ; **Redirect URLs** = `https://<domaine>/auth/callback`, `https://<domaine>/auth/reset`, `http://localhost:3000/auth/callback` (+ le motif des déploiements de prévisualisation si utilisés).
- Providers → Email : confirmation d'e-mail activée ; mot de passe de 8 caractères minimum.
- **SMTP personnalisé** avant toute ouverture au public (le SMTP par défaut de Supabase est limité à un quota restreint et réservé aux tests).
- Modèles d'e-mail en français (confirmation d'inscription, réinitialisation de mot de passe).

## 5. Protocole de recette en production

Exécutez ce protocole séquentiel pour valider l'intégrité de bout en bout :

1. **Contrôle d'accès non authentifié** :
   - Accéder à `/app` sans session : redirection immédiate vers `/login`.
   - Requête directe `GET /api/boards` : code de réponse `401 Unauthorized`.
2. **Inscription & Activation (Compte A)** :
   - Remplir le formulaire sur `/login?mode=signup`.
   - Message affiché : « Compte créé. La connexion sera disponible dès que votre compte sera activé. »
   - Réception de l'e-mail de confirmation Supabase avec lien d'activation (`/auth/callback?code=...`).
   - Clic sur le lien : session établie, redirection vers `/app`, profil créé en base dans `public.profiles`.
3. **Persistance & isolation des données (Compte A vs Compte B)** :
   - Créer un emploi du temps, ajouter des créneaux de couleurs variées, modifier le nom du tableau.
   - Recharger la page : toutes les modifications sont conservées.
   - Ouvrir un navigateur en navigation privée, créer le **Compte B** : aucun des plannings du Compte A n'est visible (étanchéité RLS totale).
4. **Studio d'export & impression** :
   - Ouvrir le Studio (`Ctrl+P` ou bouton « Imprimer & Exporter »).
   - Tester l'export PDF en A4 portrait et paysage : vérifier que le texte reste lisible et contrasté même avec des couleurs d'événements sombres.
   - Tester l'export Document Word (`.docx`) et Image HD (`.png`).
   - Tester l'abonnement calendrier (lien webcal/ICS signé par HMAC).
5. **Réinitialisation de mot de passe** :
   - Depuis `/login`, cliquer sur « Mot de passe oublié », renseigner l'e-mail.
   - Suivre le lien reçu, saisir un nouveau mot de passe sur `/auth/reset`, puis se reconnecter.
6. **Suppression définitive de compte** :
   - Dans les Paramètres → Données → « Supprimer mon compte ».
   - Saisir « SUPPRIMER » pour confirmer.
   - Vérifier que la suppression s'exécute de manière atomique (profil, tableaux et compte auth supprimés, déconnexion immédiate et redirection `/login`). En l'absence de clé service-role, l'opération est refusée en amont sans perte partielle de données.

## Prompt court pour l'agent (étapes restantes)
> Tu es l'ingénieur de déploiement de PlaniLux. Le code est prêt (voir DEPLOIEMENT.md). Exécute les sections 1, 2 (sauf `supabase login`, que je fais moi-même), 3 et 5, en t'arrêtant avant chaque action destructive ou qui exige un secret. Ne mets jamais de secret dans Git, dans les logs ou dans le chat. Utilise le MCP Supabase en lecture seule pour vérifier la RLS et les advisors. À la fin, écris RAPPORT_DEPLOIEMENT.md sans aucun secret.
