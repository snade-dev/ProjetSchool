# Story 05 — Factures : liste, détail, création manuelle

Écrans : E30 `/list/invoices`, E32 `/list/invoices/[id]` · Dépend de : S04 · Branche : `story/05-invoices`

## Étapes

1. **Référence** : `src/lib/invoiceRef.ts` → `nextInvoiceReference(tx)` : dans la transaction, `tx.invoice.count({where:{reference:{startsWith:"FAC-2026-"}}})` puis `FAC-2026-${String(n+1).padStart(5,"0")}` ; re-tenter une fois sur P2002.
2. **Zod** : `invoiceSchema` : studentId, dueDate coerce.date, `lines: z.array({label min1, quantity int positive, unitAmount int positive}).min(1)` ; `invoiceLineSchema` séparé pour l'ajout de ligne au détail.
3. **Actions** : `src/lib/actions/invoiceAction.ts` (toutes `requireRole(["admin"])` + `revalidatePath`) :
   - `createInvoice(state, data)` : `$transaction` → référence, create Invoice (status ISSUED, schoolYear active, `total` = Σ lignes, createdById=userId) + `lines.createMany`.
   - `addInvoiceLine` / `deleteInvoiceLine` : refusés si `payments.length > 0` ou status PAID/CANCELLED ; recalculer `total` dans la même transaction.
   - `cancelInvoice(id)` : refusé si un Payment existe → CANCELLED.
4. **Helpers lecture** : `src/lib/finance.ts` → `invoiceBalance(invoice)` (total − Σ payments) et `formatFCFA(n)` (`n.toLocaleString("fr-FR") + " FCFA"`) — utilisés partout ensuite.
5. **Liste** : `src/app/(dashboard)/list/invoices/page.tsx` sur le pattern EXACT d'`announcements/page.tsx` : searchParams await, `$transaction([findMany({include:{student:{include:{class:true}}, payments:true}}), count])`, ITEM_PER_PAGE, filtres `status`, `month`, `search` (sur student.name). **Périmètre par rôle** : admin → tout ; student → `where.studentId = currentUserId` ; parent → `where.student = {parentId: currentUserId}` ; colonnes Actions seulement admin. Stat-tiles cliquables = 4 `Link` avec `?status=` (les counts via `prisma.invoice.groupBy({by:["status"], _count, _sum:{total}})`). Badge statut : composant `src/components/InvoiceStatusBadge.tsx` (map statut→libellé FR + couleur).
6. **Création** : `src/components/forms/InvoiceForm.tsx` — form à lignes dynamiques (`useFieldArray` de react-hook-form) : select élève (relatedData), échéance, lignes label/qté/PU + total live. Enregistrer `"invoice"` dans FormModal/FormContainer (relatedData : students avec classe).
7. **Détail** : `src/app/(dashboard)/list/invoices/[id]/page.tsx` : `params` est un **Promise en Next 16** → `const { id } = await params`. Charger invoice + lines + payments + student + SchoolSettings. **Contrôle d'accès : si role student et `invoice.studentId !== currentUserId` (ou parent et l'élève n'est pas son enfant) → `notFound()`**. Layout brief E32 (paiements = placeholder « Encaissement disponible bientôt » ; S07 le remplit). Boutons ligne add/delete : petits composants client dans `[id]/components/`.
8. **Accès & menu** : routeAccessMap `"/list/invoices": ["admin","student","parent"]` ; items menu « Factures » (admin) et « Mes factures » (student, parent).

## Fichiers touchés
`src/lib/invoiceRef.ts`, `src/lib/finance.ts`, `src/lib/actions/invoiceAction.ts`, `src/lib/formsValidationSchema.ts`, `src/components/forms/InvoiceForm.tsx`, `src/components/InvoiceStatusBadge.tsx`, `src/components/FormModal.tsx`, `src/components/FormContainer.tsx`, `src/app/(dashboard)/list/invoices/page.tsx` + `[id]/page.tsx` + `[id]/components/*`, `src/lib/setting.ts`, `src/components/Menu.tsx`.

## Échecs probables → parade
- **routeAccessMap matche par préfixe** (`path.startsWith`) : `"/list/invoices"` couvre aussi `/list/invoices/[id]` — OK, mais c'est pourquoi le contrôle de propriété DANS la page est obligatoire.
- **useFieldArray + InputField** : InputField attend register simple ; pour les lignes, utiliser `register(\`lines.${i}.label\`)` directement — ne pas surcomplexifier InputField.
- **Total dénormalisé faux** : TOUJOURS recalculer `total` dans la même transaction que la mutation de lignes ; jamais côté client.
- **Référence en collision** sous concurrence : la re-tentative P2002 (étape 1) suffit pour un usage mono-école.

## Done
Critères S05 de `stories.md` + captures liste (admin) et détail + test URL forgée student documenté dans la PR.

## Quand s'arrêter
Pas de paiements (S07), pas de génération auto (S06), pas de PDF (S07), pas d'OVERDUE (S08 — le tile « En retard » peut afficher 0).
