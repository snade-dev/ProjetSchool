import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import PaymentReceiptPdf, {
  type PaymentReceiptData,
} from "@/components/pdf/PaymentReceiptPdf";
import BulletinPDF from "@/components/BulletinPDF";
import type { ReportCardData } from "./reportCard";

/**
 * W13 — rendu SERVEUR des PDF existants (@react-pdf/renderer.renderToBuffer)
 * pour les pièces jointes email. Réutilise les composants PURS déjà en place
 * (PaymentReceiptPdf S07, BulletinPDF S13) : aucun accès DB ici, les données
 * arrivent déjà sérialisées. Les appelants try/catchent (jamais bloquant).
 */

/** Reçu de paiement → Buffer PDF (pièce jointe de l'email PAYMENT). */
export async function renderReceiptPdfBuffer(
  data: PaymentReceiptData
): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<PaymentReceiptPdf data={data} />));
}

/** Bulletin d'UN élève → Buffer PDF (« Envoyer par email aux tuteurs »). */
export async function renderBulletinPdfBuffer(
  data: ReportCardData
): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<BulletinPDF data={data} />));
}
