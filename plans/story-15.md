# Story 15 — Statistiques enseignants

Écran : E38 `/stats/teachers` · Dépend de : S12 · Branche : `story/15-teacher-stats`

## Étapes

1. **Service** : `src/lib/stats/teacherStats.ts` → `getTeacherStats(semesterId, subjectId?)` :
   - charger les Lessons (teacherId, subjectId, classId) en une requête → map enseignant → paires (subjectId, classId).
   - charger les Results agrégés du semestre : `result.groupBy(["subjectId"], ...)` ne suffit pas (il faut le croisement classe×matière) → `result.findMany({where:{semesterId}, select:{score, classScore, subjectId, student:{select:{classId}}}})` PUIS agréger en mémoire par (subjectId, classId) (volumétrie : une école = quelques milliers de lignes, OK ; noter H dans ledger si >50k).
   - par enseignant : moyenne pondérée par nb de notes de ses paires, taux de réussite (moyenne élève ≥10 sur ses paires), nb d'élèves notés, leçons/semaine (`lesson.count`).
   - retourner un tableau trié (searchParam `sort`), enseignants sans note avec `average: null`.
2. **Page** : `src/app/(dashboard)/stats/teachers/page.tsx` : garde stricte en tête `if (role !== "admin") redirect("/" + role)`. Filtres semestre/matière, tri par colonne (Links sur les headers → `?sort=average|successRate&dir=`).
3. **Chart** : `components/TeacherBarChart.tsx` (client, recharts BarChart horizontal si >8 enseignants) — exclut les `average: null`.
4. **Tableau** : pattern Table existant (pas de pagination nécessaire si <50 enseignants ; sinon ITEM_PER_PAGE). Barre de progression /20 : div Tailwind (largeur %), couleur rouge/jaune/vert.
5. **Menu** : « Stats enseignants » visible `["admin"]`.
6. **Vérifs** : recouper à la main UN enseignant (lister ses lessons, ses results, refaire la moyenne) et coller le calcul dans la PR ; enseignant sans note → « — » et absent du chart ; tri fonctionne.

## Fichiers touchés
`src/lib/stats/teacherStats.ts` (nouveau), `src/app/(dashboard)/stats/teachers/page.tsx` + `components/TeacherBarChart.tsx` (nouveaux), `src/components/Menu.tsx`.

## Échecs probables → parade
- **Attribution ambiguë** : un Result n'a pas de teacherId — l'attribution passe par Lesson(classe,matière) ; si DEUX enseignants partagent la même paire (classe,matière), les notes comptent pour les deux : l'assumer et l'écrire dans l'encadré méthodologique de l'UI + ledger.
- **Moyenne de moyennes vs moyenne pondérée** : pondérer par le nombre de notes (sinon une classe de 5 pèse comme une de 40) — c'est le choix retenu, le documenter dans l'encadré.
- **role check** : `/stats` est ouvert à teacher dans routeAccessMap (pour S14) → la garde EN PAGE est obligatoire ici, ne pas l'oublier.

## Done
Critères S15 de `stories.md` + capture + recoupement manuel collé dans la PR.

## Quand s'arrêter
Pas d'évaluation qualitative, pas d'historique multi-années, pas de lien salaire↔performance. Cette page est descriptive, pas décisionnelle.
