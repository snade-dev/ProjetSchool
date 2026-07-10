# Story 12 — Saisie de notes en masse + durcissement examens

Écrans : E17 `/list/gradeEntry`, E16 · Dépend de : S02 · Branche : `story/12-grade-entry`

## Étapes

1. **Action** : `src/lib/actions/gradeEntryAction.ts` → `saveGrades(state, {classId, subjectId, semesterId, grades: [{studentId, score?, classScore?}]})` :
   - `requireRole(["admin","teacher"])` ; si teacher : vérifier `prisma.lesson.findFirst({where:{classId, subjectId, teacherId:userId}})` sinon error.
   - Zod : scores `z.coerce.number().min(0).max(20).optional()` ; TOUT le payload validé avant toute écriture (atomicité logique).
   - `$transaction` d'`upsert` sur `@@unique([semesterId, studentId, subjectId])` (Result) ; les lignes sans aucune note sont ignorées (pas de delete).
   - `revalidatePath("/list/results")` + `/list/gradeEntry`.
2. **Page** : `src/app/(dashboard)/list/gradeEntry/page.tsx` (RSC) : selects classe/matière/semestre via searchParams (`ClientFilters` : s'inspirer de `list/makeupSession/[id]/up/components/ClientFilters.tsx` qui fait déjà ce pattern router.push). Teacher : options limitées à ses Lessons (distinct classId/subjectId). Une fois les 3 choisis : charger students de la classe + Results existants (une requête chacun) et rendre le composant client.
3. **Grille client** : `list/gradeEntry/components/GradeGrid.tsx` (`"use client"`) : state local = map studentId→{score, classScore} initialisée des props ; inputs numériques, validation locale [0;20] (bordure rouge + désactivation du submit), moyenne live colorée ; compteur « X/Y saisies » ; footer sticky « Enregistrer tout » → `useActionState(saveGrades)` → toast + `router.refresh()`.
4. **Durcissement ExamForm** : dans l'action exam (`src/lib/actions.ts` ou fichier dédié — localiser `createExam`), imposer côté serveur : teacher → lesson lui appartenant (le code Clerk commenté montre l'endroit exact) ; c'est peut-être déjà couvert par S02 — sinon compléter ici.
5. **Accès & menu** : `"/list/gradeEntry": ["admin","teacher"]` ; item « Saisie des notes » visible admin+teacher.
6. **Vérifs** : prérempli correct ; enregistrement persisté après reload ; note 25 bloquée ; teacher ne voit pas les classes des autres (test avec 2 comptes) ; test négatif action forgée subjectId non enseigné → error.

## Fichiers touchés
`src/lib/formsValidationSchema.ts`, `src/lib/actions/gradeEntryAction.ts` (nouveau), `src/app/(dashboard)/list/gradeEntry/page.tsx` + `components/GradeGrid.tsx` + `components/Filters.tsx` (nouveaux), `src/lib/actions.ts` (exam), `src/lib/setting.ts`, `src/components/Menu.tsx`.

## Échecs probables → parade
- **Result exige un `score Int` non nul** (schéma existant) : si seule classScore est saisie, stocker `score: 0` serait FAUX → règle : une ligne n'est upsertée que si `score` est présent ; classScore seule → garder la ligne en attente et l'indiquer à l'utilisateur (« note d'examen requise »). Documenter dans ledger si trop contraignant.
- **35 upserts lents** : `$transaction` d'upserts est acceptable (<35 lignes) ; ne pas optimiser prématurément.
- **searchParams Promise (Next 16)** : `await props.searchParams` comme partout.
- **Deux inputs contrôlés par cellule × 35 lignes** : state map simple, pas de react-hook-form ici (overkill) — zod ne valide que côté action.

## Done
Critères S12 de `stories.md` + capture de la grille remplie + test négatif documenté.

## Quand s'arrêter
Pas d'import Excel/CSV de notes (ledger), pas de verrouillage de semestre (S18), pas de recalcul de ResultAverage ici (S13 s'en charge).
