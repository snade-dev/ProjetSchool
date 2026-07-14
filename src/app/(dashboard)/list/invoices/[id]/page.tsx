import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";
import {
  formatFCFA,
  invoiceBalance,
  paymentMethodLabel,
} from "@/lib/finance";
import InvoiceStatusBadge from "@/components/InvoiceStatusBadge";
import { ArrowLeft, Wallet } from "lucide-react";
import AddInvoiceLineButton from "./components/AddInvoiceLineButton";
import DeleteInvoiceLineButton from "./components/DeleteInvoiceLineButton";
import CancelInvoiceButton from "./components/CancelInvoiceButton";
import PaymentButton from "./components/PaymentButton";
import DeletePaymentButton from "./components/DeletePaymentButton";
import ReceiptDownloadButton from "@/components/pdf/ReceiptDownloadButton";
import InvoiceDownloadButton from "@/components/pdf/InvoiceDownloadButton";
import type { PaymentReceiptData } from "@/components/pdf/PaymentReceiptPdf";
import type { InvoicePdfData } from "@/components/pdf/InvoicePdf";

const InvoiceDetailPage = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;

  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const currentUserId = session?.user.id;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { id: "asc" } },
      payments: { orderBy: { paidAt: "asc" } },
      student: { include: { parent: true } },
      schoolYear: true,
    },
  });

  if (!invoice) notFound();

  // W03 — classe de l'élève = son inscription sur l'année de la facture
  const invEnrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_schoolYearId: {
        studentId: invoice.studentId,
        schoolYearId: invoice.schoolYearId,
      },
    },
    select: { class: { select: { name: true } } },
  });
  const invClassName = invEnrollment?.class.name ?? null;

  // --- Contrôle de propriété (défense en profondeur) ---
  if (role === "student" && invoice.studentId !== currentUserId) {
    notFound();
  }
  if (role === "parent" && invoice.student.parentId !== currentUserId) {
    notFound();
  }

  // V03 — l'école de la session (en-tête PDF)
  const infoS = await getSessionInfo();
  const settings = await prisma.school.findUnique({
    where: { id: infoS?.schoolId ?? -1 },
  });

  const isAdmin = role === "admin";
  const hasPayments = invoice.payments.length > 0;
  const editable =
    isAdmin &&
    !hasPayments &&
    invoice.status !== "PAID" &&
    invoice.status !== "CANCELLED";
  const balance = invoiceBalance(invoice);
  const paidTotal = invoice.total - balance;

  // Le paiement peut être encaissé tant que la facture n'est ni soldée ni annulée.
  const canCollect =
    isAdmin && invoice.status !== "PAID" && invoice.status !== "CANCELLED";

  // Résolution des noms de caissiers (receivedById → User.name) pour les reçus.
  const cashierIds = Array.from(
    new Set(invoice.payments.map((p) => p.receivedById))
  );
  const cashiers = cashierIds.length
    ? await prisma.user.findMany({
        where: { id: { in: cashierIds } },
        select: { id: true, name: true },
      })
    : [];
  const cashierName = (id: string) =>
    cashiers.find((c) => c.id === id)?.name ?? "Administration";

  const school = {
    name: settings?.name ?? "Établissement",
    address: settings?.address,
    phone: settings?.phone,
    email: settings?.email,
    legalFooter: settings?.legalFooter,
  };
  const studentInfo = {
    name: invoice.student.name,
    surname: invoice.student.surname,
    className: invClassName,
    parentName: invoice.student.parent
      ? `${invoice.student.parent.name} ${invoice.student.parent.surname}`
      : null,
  };

  const invoicePdfData: InvoicePdfData = {
    school,
    reference: invoice.reference,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    schoolYear: invoice.schoolYear.name,
    student: studentInfo,
    lines: invoice.lines.map((l) => ({
      label: l.label,
      quantity: l.quantity,
      unitAmount: l.unitAmount,
    })),
    total: invoice.total,
    paid: paidTotal,
    balance,
  };

  const receiptData = (p: (typeof invoice.payments)[number]): PaymentReceiptData => ({
    receiptNo: p.id.slice(0, 8).toUpperCase(),
    school,
    student: {
      name: studentInfo.name,
      surname: studentInfo.surname,
      className: studentInfo.className,
    },
    invoiceRef: invoice.reference,
    amount: p.amount,
    methodLabel: paymentMethodLabel(p.method),
    date: p.paidAt,
    cashier: cashierName(p.receivedById),
  });

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-4">
      {/* Barre de retour */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href="/list/invoices"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> Retour aux factures
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <InvoiceDownloadButton data={invoicePdfData} />
          {isAdmin && (
            <CancelInvoiceButton
              invoiceId={invoice.id}
              hasPayments={hasPayments}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* GAUCHE — carte facture papier (2/3) */}
        <div className="w-full lg:w-2/3 bg-white p-6 rounded-md flex flex-col gap-6">
          {/* En-tête établissement */}
          <div className="flex items-start justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
            <div>
              <h1 className="text-xl font-semibold">
                {settings?.name ?? "Établissement"}
              </h1>
              {settings?.address && (
                <p className="text-xs text-gray-400">{settings.address}</p>
              )}
              {(settings?.phone || settings?.email) && (
                <p className="text-xs text-gray-400">
                  {[settings?.phone, settings?.email]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-medium">
                {invoice.reference}
              </p>
              <div className="mt-1">
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          {/* Bloc élève / parent */}
          <div className="flex flex-wrap justify-between gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Facturé à</span>
              <span className="font-medium">
                {invoice.student.name} {invoice.student.surname}
              </span>
              <span className="text-xs text-gray-500">
                Classe : {invClassName ?? "-"}
              </span>
              {invoice.student.parent && (
                <span className="text-xs text-gray-500">
                  Parent : {invoice.student.parent.name}{" "}
                  {invoice.student.parent.surname}
                  {invoice.student.parent.phone
                    ? ` — ${invoice.student.parent.phone}`
                    : ""}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-xs text-gray-400">Année scolaire</span>
              <span className="font-medium">{invoice.schoolYear.name}</span>
              <span className="text-xs text-gray-500">
                Émise le{" "}
                {new Intl.DateTimeFormat("fr-FR").format(invoice.issueDate)}
              </span>
              <span className="text-xs text-gray-500">
                Échéance :{" "}
                {new Intl.DateTimeFormat("fr-FR").format(invoice.dueDate)}
              </span>
            </div>
          </div>

          {/* Tableau des lignes */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">
                Détail des lignes
              </span>
              {editable && <AddInvoiceLineButton invoiceId={invoice.id} />}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="p-2">Libellé</th>
                  <th className="p-2 text-right">Qté</th>
                  <th className="p-2 text-right">PU</th>
                  <th className="p-2 text-right">Total</th>
                  {editable && <th className="p-2"></th>}
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr
                    key={line.id}
                    className="border-b border-gray-100 even:bg-slate-50"
                  >
                    <td className="p-2 font-medium">{line.label}</td>
                    <td className="p-2 text-right">{line.quantity}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      {formatFCFA(line.unitAmount)}
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">
                      {formatFCFA(line.quantity * line.unitAmount)}
                    </td>
                    {editable && (
                      <td className="p-2 text-right">
                        <DeleteInvoiceLineButton lineId={line.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td
                    className="p-2 font-semibold text-right"
                    colSpan={editable ? 3 : 3}
                  >
                    Total
                  </td>
                  <td className="p-2 text-right font-semibold whitespace-nowrap">
                    {formatFCFA(invoice.total)}
                  </td>
                  {editable && <td></td>}
                </tr>
                <tr>
                  <td className="p-2 text-right text-gray-500" colSpan={3}>
                    Solde restant
                  </td>
                  <td
                    className={`p-2 text-right font-medium whitespace-nowrap ${
                      balance === 0 ? "text-green-600" : ""
                    }`}
                  >
                    {formatFCFA(balance)}
                  </td>
                  {editable && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* DROITE — paiements (1/3) */}
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-md flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Paiements</h2>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Solde restant</span>
            <span
              className={`text-2xl font-semibold ${
                balance === 0 ? "text-green-600" : ""
              }`}
            >
              {formatFCFA(balance)}
            </span>
          </div>

          {/* Bouton Encaisser — admin ET facture non soldée / non annulée */}
          {canCollect && (
            <PaymentButton invoiceId={invoice.id} balance={balance} />
          )}

          {/* Timeline des paiements (brief E32) */}
          <div className="flex flex-col gap-3">
            <span className="text-xs text-gray-400 font-medium">
              Historique des paiements
            </span>

            {invoice.payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center border border-dashed border-gray-200 rounded-md">
                <Wallet size={26} className="text-gray-300" />
                <p className="text-sm text-gray-400">
                  Aucun paiement enregistré
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {invoice.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-1 border-l-2 border-lamaSky pl-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold whitespace-nowrap">
                        {formatFCFA(p.amount)}
                      </span>
                      {isAdmin && <DeletePaymentButton paymentId={p.id} />}
                    </div>
                    <span className="text-xs text-gray-500">
                      {paymentMethodLabel(p.method)}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Intl.DateTimeFormat("fr-FR").format(p.paidAt)} ·{" "}
                      {cashierName(p.receivedById)}
                    </span>
                    <div className="mt-1">
                      <ReceiptDownloadButton data={receiptData(p)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
