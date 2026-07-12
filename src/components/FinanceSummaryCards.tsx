import Link from "next/link";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";
import { formatFCFA } from "@/lib/finance";
import { getOutstandingTotal } from "@/lib/stats/financeStats";

/**
 * S17 — Bandeau financier du dashboard admin (E04, pleine largeur).
 * 3 stat-tiles cliquables :
 *  - CA encaissé du MOIS CIVIL COURANT (Σ Payment.amount, borné par paidAt — fenêtre
 *    glissante, donc les bornes de dates sont ici correctes, contrairement à H38).
 *  - Dépenses du mois courant (Σ Expense.amount borné par date).
 *  - Impayés cumulés (getOutstandingTotal, année active) — rouge si > 0.
 * Toutes les lectures groupées en un Promise.all. Zéro crash sur base vide (→ 0 FCFA).
 */
const FinanceSummaryCards = async () => {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  // V03 — cloisonnement : finance de l'école de la session
  const schoolId = (await getSessionInfo())?.schoolId ?? -1;
  const [encaisseAgg, depenseAgg, outstanding] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        paidAt: { gte: monthStart, lt: nextMonth },
        invoice: { student: { schoolId } },
      },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: monthStart, lt: nextMonth }, schoolYear: { schoolId } },
    }),
    getOutstandingTotal().catch(() => 0),
  ]);

  const encaisse = encaisseAgg._sum.amount ?? 0;
  const depenses = depenseAgg._sum.amount ?? 0;

  const tiles = [
    {
      label: "CA encaissé (ce mois)",
      value: encaisse,
      href: "/stats/finance",
      Icon: TrendingUp,
      accent: "bg-lamaSkyLight text-sky-600",
      danger: false,
    },
    {
      label: "Dépenses (ce mois)",
      value: depenses,
      href: "/list/expenses",
      Icon: TrendingDown,
      accent: "bg-lamaPurpleLight text-purple-600",
      danger: false,
    },
    {
      label: "Impayés cumulés",
      value: outstanding,
      href: "/list/invoices?status=OVERDUE",
      Icon: AlertTriangle,
      accent:
        outstanding > 0
          ? "bg-red-50 text-red-600"
          : "bg-gray-100 text-gray-500",
      danger: outstanding > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {tiles.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-full ${t.accent}`}
          >
            <t.Icon className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">{t.label}</span>
            <span
              className={`text-lg font-semibold ${
                t.danger ? "text-red-600" : "text-gray-700"
              }`}
            >
              {formatFCFA(t.value)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};
export default FinanceSummaryCards;
