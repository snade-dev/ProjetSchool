// Helpers de lecture Finance (S05) — réutilisés par les stories S06/S07/S08/S16.

/**
 * Formate un montant entier en FCFA : 1250000 → "1 250 000 FCFA".
 */
export const formatFCFA = (n: number): string =>
  `${n.toLocaleString("fr-FR")} FCFA`;

type InvoiceForBalance = {
  total: number;
  payments?: { amount: number }[] | null;
};

/**
 * Solde restant d'une facture = total − somme des paiements encaissés.
 * Les paiements ne sont introduits qu'en S07 ; d'ici là la somme vaut 0.
 */
export const invoiceBalance = (invoice: InvoiceForBalance): number => {
  const paid = (invoice.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  return invoice.total - paid;
};
