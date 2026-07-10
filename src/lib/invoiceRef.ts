import { Prisma } from "@/app/generated/prisma";

/**
 * Génère la prochaine référence de facture au format "FAC-{année}-{n° 5 chiffres}".
 * Le compteur est basé sur le nombre de factures déjà émises l'année COURANTE
 * (préfixe "FAC-{année}-"). Appelée DANS une transaction pour rester cohérente.
 *
 * En cas de collision d'unicité (P2002) sous concurrence, l'appelant
 * (createInvoice) relance la transaction une fois : le count reflète alors la
 * facture insérée entre-temps et la nouvelle référence est libre.
 */
export async function nextInvoiceReference(
  tx: Prisma.TransactionClient
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const count = await tx.invoice.count({
    where: { reference: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}
