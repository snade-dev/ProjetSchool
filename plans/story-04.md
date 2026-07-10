# Story 04 — Grille des frais de scolarité

Écran : E29 `/list/fees` · Dépend de : S03 · Branche : `story/04-fee-structure`

## Étapes

1. **Zod** : `feeStructureSchema` dans `formsValidationSchema.ts` : `id` optionnel, `label` min 2, `amount z.coerce.number().int().positive()`, `period z.enum(["MONTHLY","YEARLY","ONE_TIME"])`, `classId z.coerce.number()`. Type `FeeStructureSchema`.
2. **Actions** : `src/lib/actions/feeAction.ts` :
   - `createFee` / `updateFee` / `deleteFee` — pattern CurrentState, `await requireRole(["admin"])`, année = `getActiveSchoolYear()`, catch de l'erreur P2002 (doublon classe+année+label) → `{success:false,error:true}` (le form affichera le toast d'erreur standard).
   - `duplicateFees(fromClassId, toClassId)` : lit les frais source de l'année active, `createMany({skipDuplicates:true})` vers la cible (la contrainte unique gère les labels déjà présents). Retourner `{success,error}`.
   - `revalidatePath("/list/fees")` partout.
3. **Form** : `src/components/forms/FeeForm.tsx` (copier la structure d'`EventsForm`/`ClassForm`) : label, montant, select période (libellés FR : Mensuel/Annuel/Unique), select classe (relatedData). Enregistrer `"fee"` dans `FormModal.tsx` (lazy import + deleteAction map) et `FormContainer.tsx` (relatedData : classes).
4. **Page** : `src/app/(dashboard)/list/fees/page.tsx` : RSC, garde de rôle en tête (`role !== "admin"` → `redirect("/")` par sécurité, en plus du proxy). Charger `prisma.class.findMany({include:{feeStructures:{where:{schoolYearId: active.id}}}})`. Rendu : une carte par classe (brief E29) — ici PAS le composant Table générique (structure en accordéon), mais réutiliser badges/typo. Total mensuel = somme des MONTHLY. Bouton dupliquer : petit composant client `DuplicateFeesButton.tsx` (deux selects + confirm) dans `list/fees/components/`.
5. **Accès & menu** : `routeAccessMap["/list/fees"]=["admin"]` ; item « Grille des frais » (section FINANCE) dans `Menu.tsx`, `visible:["admin"]`.
6. **Vérifs manuelles** : création/doublon/suppression/duplication ; montant négatif bloqué par le form (message zod sous le champ).

## Fichiers touchés
`src/lib/formsValidationSchema.ts`, `src/lib/actions/feeAction.ts` (nouveau), `src/components/forms/FeeForm.tsx` (nouveau), `src/components/FormModal.tsx`, `src/components/FormContainer.tsx`, `src/app/(dashboard)/list/fees/page.tsx` (nouveau), `src/app/(dashboard)/list/fees/components/DuplicateFeesButton.tsx` (nouveau), `src/lib/setting.ts`, `src/components/Menu.tsx`.

## Échecs probables → parade
- **FormModal switch géant** : il mappe `table → deleteAction` et lazy-load les forms ; oublier une des DEUX inscriptions (`FormModal` + `FormContainer`) donne un modal vide — vérifier les deux.
- **`getActiveSchoolYear()` throw** (base sans année active) : le catch standard renvoie error:true ; s'assurer que la PAGE, elle, affiche un bandeau « Configurez une année scolaire dans /settings » au lieu de crasher (try/catch autour du helper dans la page).
- **relatedData** : `FormContainer` fait ses requêtes par `table` — ajouter le `case "fee"` qui charge les classes.

## Done
Critères S04 de `stories.md` + capture de `/list/fees` remplie dans la PR.

## Quand s'arrêter
Ne PAS générer de factures ici, ni gérer plusieurs années dans l'UI (année active uniquement — le select d'année du brief attendra que le besoin existe : noter dans ledger si gênant).
