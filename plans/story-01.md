# Story 01 — Année scolaire & paramètres établissement

Écran : E40 `/settings` · Dépend de : rien · Branche : `story/01-school-year-settings`

## Étapes

1. **Schéma** : ajouter `SchoolYear` et `SchoolSettings` à `prisma/schema.prisma` (copier tel quel depuis `plans/architecture.md §2.2` — SANS les relations vers Invoice/Expense/FeeStructure/SalaryPayment qui n'existent pas encore : les ajouter en S03). `pnpm prisma migrate dev --name school_year_settings` puis `pnpm prisma generate`.
2. **Zod** : dans `src/lib/formsValidationSchema.ts`, ajouter `schoolYearSchema` (name min 4, startDate/endDate coerce.date, refine end > start) et `schoolSettingsSchema` (name min 2, email optionnel `.email().or(z.literal(""))`). Exporter les types `SchoolYearSchema`, `SchoolSettingsSchema`.
3. **Actions** : `src/lib/actions/settingsAction.ts` (`"use server"`, pattern CurrentState du boilerplate) :
   - `upsertSchoolSettings(data)` : `prisma.schoolSettings.upsert({ where: { id: 1 }, ... })`.
   - `createSchoolYear`, `updateSchoolYear`, `deleteSchoolYear` (delete en try/catch : FK violation → `{success:false,error:true}`).
   - `activateSchoolYear(id)` : `prisma.$transaction([updateMany({data:{isActive:false}}), update({where:{id},data:{isActive:true}})])`.
   - Chaque action se termine par `revalidatePath("/settings")`. (Le guard `requireRole` arrive en S02 — laisser un `// TODO S02: requireRole(["admin"])`.)
4. **Helper** : `src/lib/schoolYear.ts` → `getActiveSchoolYear()` : `findFirst({where:{isActive:true}})`, throw explicite `"Aucune année scolaire active — configurez /settings"` si null.
5. **Page** : `src/app/(dashboard)/settings/page.tsx` (RSC async) : lit session comme `list/announcements/page.tsx`, charge settings + years. Deux cartes (brief E40). Formulaires : `src/components/forms/SchoolSettingsForm.tsx` (inline, pas modal — page dédiée) et `SchoolYearForm.tsx` (via `FormModal`) avec react-hook-form + `InputField`, `useActionState` comme les forms existants. Bouton « Activer » = petit form client → `activateSchoolYear` + toast.
6. **Accès & menu** : `routeAccessMap["/settings"] = ["admin"]` dans `src/lib/setting.ts` ; item « Paramètres » dans `src/components/Menu.tsx`, `visible: ["admin"]`.
7. **Seed** : dans `prisma/seed.ts`, upsert SchoolSettings (id 1) + SchoolYear « 2025-2026 » active (`upsert` sur `name`).

## Fichiers touchés
`prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/formsValidationSchema.ts`, `src/lib/actions/settingsAction.ts` (nouveau), `src/lib/schoolYear.ts` (nouveau), `src/lib/setting.ts`, `src/components/Menu.tsx`, `src/components/forms/SchoolSettingsForm.tsx` (nouveau), `src/components/forms/SchoolYearForm.tsx` (nouveau), `src/components/FormModal.tsx` + `FormContainer.tsx` (enregistrer "schoolYear"), `src/app/(dashboard)/settings/page.tsx` (nouveau).

## Échecs probables → parade
- **`migrate dev` propose un reset** (drift) : NE PAS reset une base avec données ; utiliser `prisma migrate dev --create-only`, relire le SQL, puis `migrate dev`. Si la base est jetable (dev), reset + `db seed` acceptable.
- **`@default(1)` sur SchoolSettings.id** rejeté par Postgres avec autoincrement : déclarer `id Int @id` SANS default et toujours passer `id: 1` dans l'upsert.
- **FormModal exige un `table` connu** : le type union des tables est dans `FormContainer.tsx`/`FormModal.tsx` — ajouter la clé sinon erreur TS.
- **Dates zod** : `<input type="date">` renvoie string → `z.coerce.date()` obligatoire.

## Done
Tous les critères S01 de `plans/stories.md` cochés + `pnpm build` vert + capture de `/settings` dans la PR.

## Quand s'arrêter
Ne PAS : brancher SchoolYear sur d'autres modèles (S03), créer de sélecteur global d'année dans la navbar (les pages liront l'année active), toucher au proxy. Si le build casse sur un fichier existant NON listé ici → corriger uniquement si trivial (import), sinon noter dans `plans/ledger.md` et ouvrir la PR quand même.
