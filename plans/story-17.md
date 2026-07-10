# Story 17 — Dashboard admin refondu (KPIs réels)

Écran : E04 `/admin` · Dépend de : S16 · Branche : `story/17-admin-dashboard`

## Étapes

1. **Inventaire de l'existant** : lire `src/app/(dashboard)/admin/page.tsx` — repérer ce qui est déjà branché (UserCard, CountChartContainer, AttendanceChartConainer, EventCalendarContainer, Announcements) et ce qui est mocké (`FinanceChart` importe `lib/data.ts`).
2. **UserCards** : vérifier/brancher les 4 compteurs sur `prisma.<model>.count()` (admin/teacher/student/parent → remplacer la carte « admin » par « Employés » `employee.count({where:{active:true}})`). Badge année active (`getActiveSchoolYear`, try/catch → « — »).
3. **Bandeau finance** : nouveau composant RSC `src/components/FinanceSummaryCards.tsx` : 3 tiles — CA encaissé du mois courant (`payment.aggregate _sum where paidAt in mois`), Dépenses du mois (`expense.aggregate`), Impayés cumulés (réutiliser la logique S08/S16 — factoriser dans `financeStats.ts` une fonction `getOutstandingTotal()`). Chaque tile = `Link` (vers `/stats/finance`, `/list/expenses`, `/list/invoices?status=OVERDUE`). Rouge si impayés > 0.
4. **FinanceChart réel** : créer `FinanceChartContainer.tsx` (RSC) qui appelle `getFinanceStats(activeYear.id)` et passe la série mensuelle (encaissé/dépenses) au `FinanceChart` client existant (adapter ses `dataKey` ; supprimer l'import de `lib/data.ts`).
5. **Présence du jour** : tile ou ligne « Présents aujourd'hui : X/Y » (`attendance.groupBy(["present"]) where date = aujourd'hui` — bornes jour).
6. **Perf** : toutes les requêtes du RSC en `Promise.all` ; viser < ~8 requêtes groupées.
7. **Nettoyage** : si plus rien n'importe les données finance de `lib/data.ts`, retirer UNIQUEMENT les exports devenus morts (vérifier par grep chaque export avant suppression).

## Fichiers touchés
`src/app/(dashboard)/admin/page.tsx`, `src/components/FinanceSummaryCards.tsx` (nouveau), `src/components/FinanceChartContainer.tsx` (nouveau), `src/components/FinanceChart.tsx`, `src/components/UserCard.tsx` (si besoin d'un prop count), `src/lib/stats/financeStats.ts`, éventuellement `src/lib/data.ts`.

## Échecs probables → parade
- **UserCard déjà branché** (il l'est peut-être : `CountChartContainer` fait des requêtes) : NE PAS casser — vérifier avant de réécrire ; ne toucher que ce qui est mocké.
- **`lib/data.ts` utilisé ailleurs** (menu, autres pages) : grep AVANT toute suppression ; en cas de doute, laisser le fichier.
- **Base sans année active / sans données finance** : chaque bloc doit rendre « 0 FCFA » proprement (le dashboard est la première page vue — zéro crash toléré).
- **Lenteur** : si > 1 s sur seed, envelopper les blocs lourds dans `<Suspense>` avec fallback skeleton (pattern `Loading.tsx` existant).

## Done
Critères S17 de `stories.md` + capture avant/après dans la PR.

## Quand s'arrêter
Ne PAS refondre les dashboards teacher/student/parent (hors scope), ni redisposer toute la page — la structure visuelle existante reste, seules les DONNÉES deviennent réelles + le bandeau finance s'ajoute.
