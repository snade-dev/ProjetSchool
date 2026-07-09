# Story 06 — Génération automatique des factures mensuelles

Écran : E31 (modal sur `/list/invoices`) · Dépend de : S05 · Branche : `story/06-invoice-generation`

## Étapes

1. **Action** : dans `src/lib/actions/invoiceAction.ts`, `generateMonthlyInvoices(state, {month, year})` :
   - `requireRole(["admin"])` ; année scolaire active ; valider month 1-12.
   - Charger EN UNE REQUÊTE les élèves facturables : `prisma.student.findMany({where:{class:{feeStructures:{some:{period:"MONTHLY", schoolYearId}}}}, include:{class:{include:{feeStructures:{where:{period:"MONTHLY", schoolYearId}}}}}})`.
   - Charger les `generationKey` existants du mois (`findMany where generationKey in [...]` ou `startsWith`) → set des déjà-facturés.
   - Pour les restants : construire en mémoire les factures (`generationKey = "auto-{studentId}-{schoolYearId}-{month}"`, dueDate = 5 du mois (year, month-1, 5), total = Σ frais MONTHLY de sa classe, lignes = un InvoiceLine par FeeStructure avec `feeStructureId`).
   - Écriture : boucle de `prisma.invoice.create({data:{..., lines:{create:[...]}}})` PAR PAQUETS via `$transaction` de ~25 creates (les références séquentielles empêchent un `createMany` naïf ; générer les références AVANT la boucle depuis un seul count).
   - Retour `{success:true, error:false, message:"X créées, Y ignorées"}` (pattern CurrentState2 déjà présent dans le repo).
2. **Aperçu** : petit helper serveur `getGenerationPreview(month, year)` appelé par la PAGE (pas par le modal) quand `?generate=1&month=&year=` : nb facturables, nb déjà générés.
3. **UI** : `src/app/(dashboard)/list/invoices/components/GenerateInvoicesButton.tsx` (client) : bouton principal (admin only) → modal (style FormModal) : selects mois/année, texte d'aperçu, confirm → `useActionState(generateMonthlyInvoices)` → toast avec le message, `router.refresh()`.
4. **Vérifs** : générer janvier → factures visibles ; RE-générer janvier → « 0 créées, N ignorées » ; élève d'une classe sans frais MONTHLY → aucune facture ; chronométrer sur le seed.

## Fichiers touchés
`src/lib/actions/invoiceAction.ts`, `src/app/(dashboard)/list/invoices/page.tsx` (bouton + aperçu), `src/app/(dashboard)/list/invoices/components/GenerateInvoicesButton.tsx` (nouveau).

## Échecs probables → parade
- **Références dupliquées dans le batch** : réserver le bloc de références d'un coup (count initial + index) DANS la transaction englobante ; en cas de P2002 malgré tout, relancer l'action (l'idempotence par generationKey rend la relance sûre).
- **Timeout de transaction Prisma** (défaut 5 s) sur gros batch : passer `{timeout: 30000}` au `$transaction`, ou transactions par paquets (la clé d'idempotence rend un échec partiel rattrapable en relançant).
- **Mois de l'année civile vs scolaire** : `dueDate = new Date(year, month-1, 5)` — attention au décalage 0-index des mois JS.
- **Élève sans classe/grille modifiée entre aperçu et exécution** : l'exécution refait ses propres requêtes ; l'aperçu est indicatif.

## Done
Critères S06 de `stories.md` + le message « X créées, Y ignorées » visible en capture + double exécution documentée.

## Quand s'arrêter
Pas de cron/planification automatique (déclenchement manuel uniquement), pas d'e-mails, pas de frais YEARLY/ONE_TIME dans le batch (facturation manuelle S05 — noter dans ledger si l'école veut l'automatiser).
