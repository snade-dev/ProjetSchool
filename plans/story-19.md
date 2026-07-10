# Story 19 — Réparer la couche comptes (création/màj/suppression parent, enseignant, élève)

Constat (10 juil. 2026, logs prod) : la création de parent échoue sur `prisma.parent.create — Argument id is missing`, la suppression est « ignorée » silencieusement. Cause racine : les server actions utilisent `authClient` (SDK **navigateur** de better-auth) côté serveur. Ses fetchs vers `/api/auth` partent SANS cookie de session (→ 401) et ses méthodes retournent `{data, error}` SANS lever d'exception — le code lit `user.id` (undefined) et les catch avalent tout.

## Étapes

1. **Helper serveur** `src/lib/authAdmin.ts` : wrappers autour de `auth.api` (le serveur a déjà le plugin admin — cf. `src/lib/auth.ts`) :
   - `createAuthUser({email, password, name, role})` → `auth.api.createUser({ body, headers: await headers() })` ; retourne l'id ou lève une erreur avec message exploitable (email déjà pris…).
   - `setAuthUserPassword(userId, newPassword)` → `auth.api.setUserPassword({ body:{userId, newPassword}, headers: await headers() })`.
   - `removeAuthUser(userId)` → `auth.api.removeUser({ body:{userId}, headers: await headers() })` ; tolérer « user introuvable » (comptes seedés sans User) mais REMONTER toute autre erreur.
2. **createParent / createTeacher / createStudent** : remplacer le bloc `authClient.admin.createUser` par le helper ; si le prisma.create échoue APRÈS la création du compte, supprimer le compte (compensation) pour ne pas laisser d'orphelin. Supprimer le mot de passe par défaut littéral `"<PASSWORD>"` : le champ devient obligatoire à la création (zod : min 8 en create, optionnel en update).
3. **updateParent / updateTeacher / updateStudent** : aligner sur le pattern (déjà presque bon dans updateStudent) : `prisma.user.update` pour name/email + `setAuthUserPassword` si mot de passe fourni ; retirer `authClient.updateUser` (updateTeacher — il ciblait au mieux l'utilisateur COURANT).
4. **deleteParent / deleteTeacher / deleteStudent** : ordre sûr = prisma d'abord (dans les limites de S20), PUIS `removeAuthUser` du/des comptes ; ne JAMAIS retourner `success:true` si le prisma.delete n'a pas eu lieu. deleteParent supprime aussi les comptes User de ses élèves cascadés.
5. **Vérifs E2E (build prod)** : créer un parent → ligne visible + connexion possible avec le mot de passe saisi ; créer un élève rattaché ; modifier mot de passe parent puis se connecter ; supprimer l'élève puis le parent → lignes disparues ET comptes User disparus (vérifier en base).

## Fichiers touchés
`src/lib/authAdmin.ts` (nouveau), `src/lib/actions.ts` (teacher/student), `src/lib/actions/parentAction.ts`, `src/lib/formsValidationSchema.ts` (password requis en create), formulaires Teacher/Student/Parent si le schéma change.

## Échecs probables → parade
- **`auth.api.createUser` refuse le rôle** : les rôles custom sont déclarés dans le plugin admin — passer `role` dans `body` ; si typage bloquant, `body: {...} as any` avec commentaire.
- **headers() hors requête** : toujours appeler les helpers DANS l'action (jamais au module).
- **Comptes seedés sans User** : `removeAuthUser` tolérant (warn) mais uniquement pour « not found ».

## Done
Les 3 entités se créent, se modifient (y compris mot de passe) et se suppriment depuis l'UI, avec messages d'erreur exacts ; `pnpm build` vert ; ledger mis à jour.

## Quand s'arrêter
Pas de gestion d'e-mails d'invitation, pas de « mot de passe oublié » (hors scope).
