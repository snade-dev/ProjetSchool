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

/**
 * Libellés FR des méthodes de paiement (enum PaymentMethod).
 * Réutilisé par le formulaire d'encaissement, la timeline et les reçus PDF.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  BANK_TRANSFER: "Virement bancaire",
  CHEQUE: "Chèque",
};

export const paymentMethodLabel = (method: string): string =>
  PAYMENT_METHOD_LABELS[method] ?? method;
