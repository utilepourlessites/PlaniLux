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

## 3. Vercel
Variables (Production, Preview, Development) — rien d'autre n'est nécessaire :

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://asxwrokenlfntzzcohil.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `sb_publishable_…` (Supabase → Project Settings → API) |

Supprimez de Vercel `DATABASE_URL`, `DIRECT_URL` et toute clé `service_role` si elles existent. Connectez le dépôt GitHub (production = `main`) puis déployez.

## 4. Supabase Auth (tableau de bord)
Avec l'URL de production `https://<domaine>` :
- Authentication → URL Configuration : **Site URL** = `https://<domaine>` ; **Redirect URLs** = `https://<domaine>/auth/callback`, `https://<domaine>/auth/reset`, `http://localhost:3000/auth/callback` (+ le motif des déploiements de prévisualisation si utilisés).
- Providers → Email : confirmation d'e-mail activée ; mot de passe de 8 caractères minimum.
- **SMTP personnalisé** avant toute ouverture au public (le SMTP par défaut est limité et réservé aux tests).
- Modèles d'e-mail en français (confirmation, réinitialisation).

## 5. Recette en production
1. `/app` sans connexion redirige vers `/login`.
2. Compte A : inscription → e-mail de confirmation → connexion → ligne dans `profiles`.
3. Création / modification / corbeille / suppression d'un planning ; rechargement : tout est conservé ; déconnexion réelle.
4. Compte B : ne voit aucun planning de A.
5. Mot de passe oublié : l'e-mail arrive et le nouveau mot de passe fonctionne (ouvrir le lien dans le même navigateur que la demande).
6. Impression et exports PDF / PNG / Word fonctionnent.

## Prompt court pour l'agent (étapes restantes)
> Tu es l'ingénieur de déploiement de PlaniLux. Le code est prêt (voir DEPLOIEMENT.md). Exécute les sections 1, 2 (sauf `supabase login`, que je fais moi-même), 3 et 5, en t'arrêtant avant chaque action destructive ou qui exige un secret. Ne mets jamais de secret dans Git, dans les logs ou dans le chat. Utilise le MCP Supabase en lecture seule pour vérifier la RLS et les advisors. À la fin, écris RAPPORT_DEPLOIEMENT.md sans aucun secret.
