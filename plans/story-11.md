# Story 11 — Paie mensuelle & bulletins de paie PDF

Écran : E36 `/list/payroll` · Dépend de : S10 · Branche : `story/11-payroll`

## Étapes

1. **Actions** : `src/lib/actions/payrollAction.ts` (tous `requireRole(["admin"])`, `revalidatePath("/list/payroll")`) :
   - `generatePayroll(state, {month, year})` : employés `active:true` → `createMany({data: [...], skipDuplicates:true})` de SalaryPayment PENDING (`baseAmount = baseSalary`, netAmount = baseAmount, schoolYearId actif). Retour message « X générés, Y existants ».
   - `updateSalaryAdjustments(state, {id, bonuses, deductions})` : refusé si status PAID ; `net = base + bonuses − deductions` ; si net < 0 → error message. Zod : `bonuses/deductions int min(0)`.
   - `markSalaryPaid(state, {id, method, paidAt})` : PENDING → PAID + paidAt.
   - `unmarkSalaryPaid(id)` (correction d'erreur, admin) : PAID → PENDING, paidAt null.
2. **Page** : `src/app/(dashboard)/list/payroll/page.tsx` : `searchParams month/year` (défaut : mois courant) ; navigation ← → = `Link` avec mois±1 ; charger `salaryPayment.findMany({where:{month,year}, include:{employee:true}})` + `aggregate _sum netAmount` par statut pour les 3 tiles. Si aucune ligne : gros bouton « Générer la paie de {mois} {année} ».
3. **Composants client** (`list/payroll/components/`) : `GeneratePayrollButton.tsx` (confirm + action + toast), `AdjustmentsCell.tsx` (inputs primes/retenues inline avec debounce → action, net recalculé au retour serveur), `MarkPaidButton.tsx` (modal méthode+date), tous petits et branchés `useActionState`.
4. **PDF** : `src/components/pdf/PayslipPdf.tsx` (+ bouton) : établissement (SchoolSettings), employé, poste, mois/année, tableau base/primes/retenues/net, méthode et date de paiement, zone signatures. Visible seulement si PAID.
5. **Accès & menu** : `"/list/payroll": ["admin"]` ; item « Paie » (FINANCE, admin).
6. **Vérifs** : génération, relance sans doublon, ajustements verrouillés après PAID, net jamais négatif, totaux exacts, PDF ok. Vérifier aussi que `deleteEmployee` (S10) est bien bloqué maintenant qu'une paie existe.

## Fichiers touchés
`src/lib/formsValidationSchema.ts`, `src/lib/actions/payrollAction.ts` (nouveau), `src/app/(dashboard)/list/payroll/page.tsx` + `components/*` (nouveaux), `src/components/pdf/PayslipPdf.tsx` + bouton (nouveaux), `src/lib/setting.ts`, `src/components/Menu.tsx`.

## Échecs probables → parade
- **skipDuplicates** exige la contrainte `@@unique([employeeId, month, year])` — elle existe (S03) ; si Prisma refuse skipDuplicates sur le provider, fallback : filtrer en amont les (employeeId) déjà présents.
- **Inputs inline + RSC** : ne pas tenter l'optimistic UI ; après action réussie, `router.refresh()` et re-render serveur — simple et fiable.
- **Employé désactivé après génération** : ses SalaryPayment du mois restent (correct) ; il est juste exclu des générations futures.
- **month/year en URL invalides** : clamp serveur (1-12, 2020-2100) sinon défaut mois courant.

## Done
Critères S11 de `stories.md` + captures (paie générée, ligne payée verrouillée) + bulletin PDF joint.

## Quand s'arrêter
Pas de charges sociales/ITS (H09), pas d'avances sur salaire, pas de virement bancaire réel — uniquement l'enregistrement comptable.
