# Story 14 — Statistiques élèves

Écran : E37 `/stats/students` · Dépend de : S13 · Branche : `story/14-student-stats`

## Étapes

1. **Service** : `src/lib/stats/studentStats.ts` (server-only) :
   - `getClassStats(classId, semesterId)` : moyenne de classe (`resultAverage.aggregate _avg` — alimenté par S13, fallback calcul direct sur Result si vide), taux de réussite (`count where average >= 10` / effectif noté), effectif (`student.count`), taux de présence (`attendance.groupBy(["present"], _count)` sur la classe).
   - `getSubjectAverages(classId, semesterId)` : `result.groupBy(["subjectId"], _avg)` + jointure noms de matières.
   - `getTopFlop(classId, semesterId)` : `resultAverage.findMany({orderBy:{average:"desc"}, take:5, include:{student}})` + asc.
   - `getClassTrend(classId)` : moyenne de classe par semestre (`resultAverage.groupBy(["semesterId"], _avg)` filtré via `student:{classId}` — si groupBy ne permet pas la relation, filtrer par liste d'ids d'élèves de la classe).
2. **Page** : `src/app/(dashboard)/stats/students/page.tsx` (RSC) : searchParams `classId`, `semesterId` (défauts : première classe autorisée, dernier semestre). **Rôles** : admin → toutes les classes ; teacher → classes de ses Lessons (select restreint + garde : si classId hors périmètre → redirect). Charger les 4 services en `Promise.all`.
3. **Charts** : composants client dans `src/app/(dashboard)/stats/students/components/` : `TrendLineChart.tsx`, `SubjectBarChart.tsx` (recharts, pattern données-en-props comme `AttendanceChart` existant + son Container). Tiles = même style `UserCard`. Top/Flop = listes avec `Link` vers `/list/students/[id]`.
4. **États vides** : chaque bloc gère « aucune donnée » (texte + icône) — tester classe sans notes : AUCUN NaN (garde `count>0` avant division partout).
5. **Accès & menu** : `"/stats": ["admin","teacher"]` dans routeAccessMap (préfixe) — la restriction fine teachers-uniquement-stats-élèves est faite en page (les pages `/stats/teachers` et `/stats/finance` redirigeront non-admin — S15/S16). Section « STATISTIQUES » dans Menu.tsx : « Stats élèves » visible `["admin","teacher"]`.
6. **Vérifs** : chiffres recoupés sur le jeu de test S13 ; filtres ; teacher limité ; états vides.

## Fichiers touchés
`src/lib/stats/studentStats.ts` (nouveau), `src/app/(dashboard)/stats/students/page.tsx` + `components/*` (nouveaux), `src/lib/setting.ts`, `src/components/Menu.tsx`.

## Échecs probables → parade
- **groupBy sur relation impossible** : Prisma groupBy ne traverse pas les relations → pré-résoudre les ids (`student.findMany({where:{classId}, select:{id}})`) puis `where:{studentId:{in:ids}}`.
- **Sur-agrégation en JS** : interdit de charger tous les Results de l'école ; toujours filtré classe+semestre.
- **Recharts en RSC** : "use client" obligatoire sur les composants charts ; données passées en props sérialisables.
- **Semestre par défaut absent** (base vide) : bandeau « Aucun semestre » et sortie propre.

## Done
Critères S14 de `stories.md` + capture du dashboard rempli + note de recoupement des chiffres.

## Quand s'arrêter
Pas de stats individuelles par élève au-delà du lien vers sa fiche (la fiche élève a déjà Performance/attendance) ; pas d'export (S18) ; pas de comparaison inter-années.
