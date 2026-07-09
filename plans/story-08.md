# Story 08 — Impayés & recouvrement

Écran : E33 (vue filtrée de `/list/invoices`) · Dépend de : S06, S07 · Branche : `story/08-overdue`

## Étapes

1. **Synchro** : dans `src/lib/actions/invoiceAction.ts`, `syncOverdueInvoices()` (fonction serveur simple, pas une form action) : `updateMany({where:{status:{in:["ISSUED","PARTIALLY_PAID"]}, dueDate:{lt:new Date()}}, data:{status:"OVERDUE"}})`. Appelée en tête de `list/invoices/page.tsx` UNIQUEMENT si role admin (peu coûteux, idempotent).
2. **Recalcul statut** : vérifier que `createPayment`/`deletePayment` (S07) partent du bon état : une OVERDUE payée intégralement → PAID ; partiellement → reste OVERDUE si dueDate passée (règle : le recalcul post-paiement fait `Σ==total ? PAID : (dueDate < now ? OVERDUE : PARTIALLY_PAID)`). Ajuster S07 si écart.
3. **Vue recouvrement** : quand `?status=OVERDUE` : colonnes supplémentaires « Retard (j) » (`Math.floor((now - dueDate)/86400000)`) et « Parent » (nom + téléphone, via `student.parent`) — ajouter `parent:true` à l'include. Tile « En retard » : rouge, `_sum` des soldes (total − Σ payments, calculé sur les factures OVERDUE chargées via groupBy + agrégat payments : deux requêtes, assembler en JS).
4. **Note de relance** (léger) : champ `reminderNote String?` + `remindedAt DateTime?` sur Invoice (petite migration) ; action `markReminded(id, note)` (admin) ; icône cloche dans la ligne OVERDUE, tooltip avec date/note.
5. **Vérifs** : facture échue hier → OVERDUE au chargement ; total impayés exact sur données connues ; paiement total → PAID.

## Fichiers touchés
`prisma/schema.prisma` (+migration `invoice_reminder`), `src/lib/actions/invoiceAction.ts`, `src/lib/actions/paymentAction.ts` (règle de recalcul), `src/app/(dashboard)/list/invoices/page.tsx`, `src/app/(dashboard)/list/invoices/components/RemindButton.tsx` (nouveau).

## Échecs probables → parade
- **Fuseau horaire** : comparer à `new Date()` serveur suffit (précision au jour non critique) ; ne pas sortir date-fns pour ça.
- **Somme des soldes** : PAS de N+1 — `groupBy(["invoiceId"], _sum.amount)` sur Payment pour les ids OVERDUE de la page + `aggregate _sum.total` ; assembler.
- **updateMany à chaque visite** : c'est un UPDATE no-op la plupart du temps ; acceptable. Ne PAS créer de cron.

## Done
Critères S08 de `stories.md` + capture de la vue recouvrement avec une facture en retard.

## Quand s'arrêter
Pas d'envoi de SMS/e-mail de relance (hors scope, ledger). Pas de pénalités de retard.
