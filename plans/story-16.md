# Story 16 — Statistiques financières

Écran : E39 `/stats/finance` · Dépend de : S07, S09, S11 · Branche : `story/16-finance-stats`

## Étapes

1. **Service** : `src/lib/stats/financeStats.ts` → `getFinanceStats(schoolYearId)` :
   - bornes = startDate/endDate de la SchoolYear ; axe = liste des mois Sept→Juin (H02) générée depuis ces bornes.
   - **CA encaissé/mois** : `payment.groupBy` n'a pas de trunc par mois → `payment.findMany({where:{paidAt:{gte,lte}}, select:{amount, paidAt}})` puis bucket par mois en JS (volumétrie faible) ; OU `$queryRaw` avec `date_trunc` (préférer queryRaw si >10k paiements — sinon JS, plus simple et portable).
   - **Facturé/mois** : idem sur `invoice.issueDate` (`_sum total`, exclure CANCELLED).
   - **Dépenses/mois** : idem sur `expense.date`.
   - **Salaires/mois** : `salaryPayment.groupBy(["month","year"], _sum:{netAmount}, where:{status:"PAID", schoolYearId})` (month/year natifs, facile).
   - tiles : encaissé total, facturé total, taux de recouvrement = encaissé/facturé (0 si facturé=0), dépenses, masse salariale, résultat = encaissé − dépenses − salaires.
   - **Dépenses par catégorie** : `expense.groupBy(["categoryId"], _sum)` + noms.
   - **Impayés par classe** : invoices non PAID/CANCELLED de l'année, include student.class + payments → agréger solde par classe en JS, tri desc.
2. **Page** : `src/app/(dashboard)/stats/finance/page.tsx` : garde `role !== "admin"` → redirect. Select année scolaire (toutes les SchoolYear ; défaut active). Tout charger via le service (une seule fonction, `Promise.all` interne).
3. **Charts** : `components/MonthlyComposedChart.tsx` (recharts ComposedChart : Bar encaissé lamaSky, Bar dépenses+salaires stack lamaPurple, Line résultat jaune ; mois vides = 0), `ExpensePieChart.tsx` (Pie + légende), tableau impayés (Table pattern). Formatage `formatFCFA` partout, tooltips FR.
4. **Menu** : « Stats finance » visible `["admin"]`.
5. **Scénario de test documenté** : sur base seed/état S07-S11 : générer 2 mois de factures, encaisser partiellement, saisir 3 dépenses, payer 1 mois de paie → tableau attendu (calculé à la main) vs affiché, collé dans la PR.

## Fichiers touchés
`src/lib/stats/financeStats.ts` (nouveau), `src/app/(dashboard)/stats/finance/page.tsx` + `components/*` (nouveaux), `src/components/Menu.tsx`.

## Échecs probables → parade
- **Confusion CA facturé vs encaissé** : le CA affiché en « CA » = ENCAISSÉ (Σ Payment). Le facturé sert au taux de recouvrement. Ne pas mélanger (piège classique).
- **Mois à cheval sur 2 années civiles** : bucketer par `"YYYY-MM"` (clé string), jamais par index 0-11 seul.
- **`$queryRaw` + typage** : si utilisé, caster (`Prisma.sql`) et typer le retour ; sinon rester en JS.
- **Année sans données** : tous les buckets à 0, résultat 0, pas de NaN (diviseurs gardés).
- **Salaires PENDING** : exclus du résultat (seul le PAYÉ compte) — cohérent avec l'esprit « trésorerie » ; noté dans l'encadré méthodologique UI.

## Done
Critères S16 de `stories.md` + capture du cockpit + scénario chiffré vérifié dans la PR.

## Quand s'arrêter
Pas de prévisionnel/budget, pas de comptabilité en partie double, pas de multi-devises, export CSV = S18.
