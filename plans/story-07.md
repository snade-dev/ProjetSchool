# Story 07 — Encaissement : paiements, reçus PDF, migration TuitionPayment

Écran : E32 (colonne paiements) · Dépend de : S05 · Branche : `story/07-payments`

## Étapes

1. **Zod** : `paymentSchema` : invoiceId, `amount int positive`, `method z.enum(["CASH","MOBILE_MONEY","BANK_TRANSFER","CHEQUE"])`, `paidAt coerce.date`, `reference` optionnel.
2. **Action** : `src/lib/actions/paymentAction.ts` → `createPayment(state, data)` :
   - `requireRole(["admin"])`. `$transaction` : relire l'invoice + Σ payments ; refuser si CANCELLED, ou si `amount > solde restant` → `{success:false,error:true, message:"Montant supérieur au solde"}` ;
   - create Payment (receivedById = userId) ; recalculer statut : Σ==total → PAID, sinon PARTIALLY_PAID ; update invoice.
   - `deletePayment` (admin, corrige une erreur de saisie) : delete + recalcul du statut (peut redescendre à ISSUED). `revalidatePath("/list/invoices")` + du détail.
3. **UI encaissement** : `src/components/forms/PaymentForm.tsx` (montant prérempli du solde passé en `data`), enregistré dans FormModal/FormContainer (`table:"payment"`). Sur `[id]/page.tsx` : remplacer le placeholder par la timeline des paiements (brief E32) ; bouton Encaisser visible admin ET si statut ≠ PAID/CANCELLED.
4. **PDF** : sur le modèle de `ReceipPdf.tsx`/`BulletinPDF.tsx` :
   - `src/components/pdf/PaymentReceiptPdf.tsx` : reçu (n° = 8 premiers chars du payment.id, établissement depuis SchoolSettings, élève, réf facture, montant, méthode, date, caissier) + bouton client `ReceiptDownloadButton.tsx` (PDFDownloadLink).
   - `src/components/pdf/InvoicePdf.tsx` : la facture complète (lignes + total + solde) + bouton.
5. **Migration TuitionPayment** : `scripts/migrate-tuition.ts` (lancé via `pnpm tsx scripts/migrate-tuition.ts`) :
   - pour chaque TuitionPayment : si `generationKey = "legacy-{id}"` n'existe pas → create Invoice (status PAID, month/year copiés, total = round(amount), 1 ligne « Scolarité {month}/{year} », dueDate = paymentDate) + 1 Payment (amount, paidAt=paymentDate, method CASH).
   - log récapitulatif ; relançable (skip si generationKey existe).
6. **Redirection legacy** : `src/app/(dashboard)/list/tuitionPayment/page.tsx` → `redirect("/list/invoices")` (garder les sous-fichiers, retirer l'item de menu au profit de « Factures »).
7. **Vérifs** : paiement partiel → PARTIALLY_PAID ; complément → PAID ; sur-paiement refusé ; reçu PDF ouvert ; student voit ses reçus sans bouton Encaisser ; script de migration 2× → pas de doublon.

## Fichiers touchés
`src/lib/formsValidationSchema.ts`, `src/lib/actions/paymentAction.ts` (nouveau), `src/components/forms/PaymentForm.tsx` (nouveau), `src/components/pdf/PaymentReceiptPdf.tsx` + `InvoicePdf.tsx` + boutons (nouveaux), `src/components/FormModal.tsx`, `FormContainer.tsx`, `src/app/(dashboard)/list/invoices/[id]/page.tsx`, `src/app/(dashboard)/list/tuitionPayment/page.tsx`, `scripts/migrate-tuition.ts` (nouveau), `src/components/Menu.tsx`.

## Échecs probables → parade
- **Course sur le solde** (2 encaissements simultanés) : relire le solde DANS la transaction ; usage mono-caissier → risque résiduel accepté (ledger).
- **@react-pdf côté serveur** : PDFDownloadLink est client-only → les boutons PDF sont des composants `"use client"` avec `dynamic(() => …, {ssr:false})` si erreur d'hydratation (voir comment `BulletinButton`/`ReceiptButton` existants s'en sortent — copier leur approche).
- **Montants Float legacy** : `Math.round(amount)` ; si des montants à décimales significatives apparaissent, les lister dans le log et continuer.
- **Script hors contexte Next** : importer PrismaClient directement (`new PrismaClient()`), PAS `@/lib/prisma` (alias @ indisponible en tsx script) — chemin relatif vers `src/app/generated/prisma`.

## Done
Critères S07 de `stories.md` + reçu PDF joint à la PR + sortie du script de migration collée dans la PR.

## Quand s'arrêter
Ne PAS supprimer le modèle TuitionPayment ni sa table (dépréciation seulement — suppression dans une story ultérieure hors plan). Pas d'e-mail de reçu.
