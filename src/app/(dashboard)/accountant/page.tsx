import { Suspense } from "react";
import Link from "next/link";
import { FileText, Receipt, Wallet, BadgeDollarSign } from "lucide-react";
import FinanceSummaryCards from "@/components/FinanceSummaryCards";
import FinanceChartContainer from "@/components/FinanceChartContainer";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";
import { formatFCFA } from "@/lib/finance";

/**
 * W07 — Tableau de bord du COMPTABLE (§2.7.6) : uniquement la finance.
 * Réutilise les composants du dashboard admin / de /stats/finance :
 * FinanceSummaryCards (encaissé du mois, dépenses du mois, impayés cumulés)
 * + FinanceChartContainer (série mensuelle de l'année active), complétés par
 * les factures du mois courant et des raccourcis vers les écrans finance.
 */
const AccountantPage = async () => {
  const schoolId = (await getSessionInfo())?.schoolId ?? -1;

  // Factures émises sur le mois civil courant (même convention UTC que
  // FinanceSummaryCards).
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const monthInvoices = await prisma.invoice.aggregate({
    _count: { _all: true },
    _sum: { total: true },
    where: {
      issueDate: { gte: monthStart, lt: nextMonth },
      status: { not: "CANCELLED" },
      student: { schoolId },
    },
  });

  const shortcuts = [
    { icon: FileText, label: "Factures", href: "/list/invoices" },
    { icon: Receipt, label: "Dépenses", href: "/list/expenses" },
    { icon: Wallet, label: "Paie", href: "/list/payroll" },
    { icon: BadgeDollarSign, label: "Grille des frais", href: "/list/fees" },
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Factures du mois */}
      <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-lamaPurpleLight text-purple-600">
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">
            Factures émises ce mois-ci
          </span>
          <span className="text-lg font-semibold text-gray-700">
            {monthInvoices._count._all} facture(s) ·{" "}
            {formatFCFA(monthInvoices._sum.total ?? 0)}
          </span>
        </div>
      </div>

      {/* Encaissé / dépenses / impayés (composants du dashboard admin) */}
      <FinanceSummaryCards />

      {/* Évolution mensuelle de l'année active */}
      <div className="w-full h-[450px]">
        <Suspense
          fallback={
            <div className="bg-white rounded-xl w-full h-full p-4 flex items-center justify-center text-gray-400">
              Chargement des finances…
            </div>
          }
        >
          <FinanceChartContainer />
        </Suspense>
      </div>

      {/* Raccourcis vers les écrans finance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <s.icon size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AccountantPage;
