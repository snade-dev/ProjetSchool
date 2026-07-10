# Story 02 — Garde d'accès `requireRole` + sécurisation des server actions

Écran : transverse (aucune UI nouvelle) · Dépend de : S01 · Branche : `story/02-require-role`

## Étapes

1. **Guard** : créer `src/lib/authGuard.ts` :
   ```ts
   import "server-only";
   import { headers } from "next/headers";
   import { auth } from "./auth";

   export async function getSessionInfo() {
     const session = await auth.api.getSession({ headers: await headers() });
     if (!session) return null;
     return { userId: session.user.id, role: session.user.role ?? "guest" };
   }
   export async function requireRole(roles: string[]) {
     const info = await getSessionInfo();
     if (!info || !roles.includes(info.role)) throw new Error("FORBIDDEN");
     return info;
   }
   ```
2. **Inventaire** : lister toutes les actions : `src/lib/actions.ts` + chaque fichier de `src/lib/actions/*.ts` (≈20 fichiers). Pour chacune, déterminer les rôles autorisés d'après la matrice `architecture.md §5` (créer/maj/supprimer entités scolaires = admin ; notes/présences = admin+teacher ; réponses quiz/réclamations/inscription rattrapage = student ; etc.).
3. **Application mécanique** dans CHAQUE action de mutation :
   - première ligne du `try` : `const { userId, role } = await requireRole([...]);`
   - pour teacher : ajouter la vérification de propriété quand la matrice dit « ses classes/matières » (ex. exam : `prisma.lesson.findFirst({where:{id:data.lessonId, teacherId:userId}})` — le code commenté Clerk montre l'intention, le réécrire avec better-auth).
   - supprimer les blocs commentés Clerk morts.
   - dernière ligne avant `return {success:true,...}` : `revalidatePath("/list/<ressource>")` (décommenter/ajouter).
4. **Catch** : `requireRole` throw → le `catch` existant renvoie déjà `{success:false,error:true}` : conserver ce comportement (pas de refonte des retours).
5. **signIn** : dans `src/lib/authAction.ts`, remplacer le `redirect("/admin")` en dur par une redirection selon `response.user.role` (`/${role}`), fallback `/sign-in?error=...`.
6. **Vérification manuelle** : avec un compte student, tenter une mutation admin (appel du form ou fetch forgé sur l'action) → échec propre, rien en base ; avec admin → OK ; les listes se rafraîchissent après create/update/delete sans F5.

## Fichiers touchés
`src/lib/authGuard.ts` (nouveau), `src/lib/actions.ts`, `src/lib/actions/*.ts` (tous), `src/lib/authAction.ts`.

## Échecs probables → parade
- **`headers()` hors requête** : `requireRole` ne doit être appelé QUE dans des server actions / RSC — jamais importé côté client (le `import "server-only"` fera échouer le build si c'est le cas : c'est voulu, corriger l'import fautif).
- **revalidatePath sur route inexistante** : sans gravité, mais utiliser le chemin exact de la liste concernée.
- **Actions appelées par plusieurs rôles avec périmètres différents** (ex. resultAction) : autoriser l'union des rôles puis brancher la restriction par rôle DANS l'action (where teacherId…), pas en dupliquant l'action.
- **Boucle de redirection après changement signIn** : si `role` est vide (`""`, défaut du schéma), fallback explicite vers `/sign-in?error=no-role` et noter dans ledger.

## Done
Critères S02 de `stories.md` + `grep -L "requireRole" src/lib/actions/*.ts` ne retourne aucun fichier contenant une mutation + `pnpm build` vert.

## Quand s'arrêter
Ne PAS : refactorer la forme des retours d'action, ajouter zod `safeParse` serveur partout (hors scope), toucher au proxy.ts, renommer des fichiers. Si une action existante est manifestement cassée d'origine (bug préexistant), la sécuriser quand même, noter le bug dans `ledger.md`, ne pas le corriger ici.
