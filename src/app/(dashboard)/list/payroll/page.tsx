import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatFCFA, paymentMethodLabel } from "@/lib/finance";
import { Employee, SalaryPayment } from "@/app/generated/prisma";
import GeneratePayrollButton from "./components/GeneratePayrollButton";
import AdjustmentsCell from "./components/AdjustmentsCell";
import MarkPaidButton from "./components/MarkPaidButton";
import UnmarkPaidButton from "./components/UnmarkPaidButton";
import PayslipDownloadButton from "@/components/pdf/PayslipDownloadButton";
import ExportCsvButton from "@/components/ExportCsvButton";
import { clampMonth, clampYear } from "@/lib/queryBuilders";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

type PayrollRow = SalaryPayment & { employee: Employee };

const PayrollPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;

  const now = new Date();
  const month = clampMonth(searchParams.month, now.getMonth() + 1);
  const year = clampYear(searchParams.year, now.getFullYear());
  const monthLabel = MONTHS[month - 1];

  // Navigation ← → avec bascule d'année.
  const prev =
    month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
  const next =
    month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };

  const [rows, settings, masseAgg, payeAgg] = await Promise.all([
    prisma.salaryPayment.findMany({
      where: { month, year },
      include: { employee: true },
      orderBy: { employee: { surname: "asc" } },
    }),
    prisma.schoolSettings.findUnique({ where: { id: 1 } }),
    // Masse salariale = Σ net de tous les bulletins du mois.
    prisma.salaryPayment.aggregate({
      where: { month, year },
      _sum: { netAmount: true },
    }),
    // Payé = Σ net des bulletins PAID.
    prisma.salaryPayment.aggregate({
      where: { month, year, status: "PAID" },
      _sum: { netAmount: true },
    }),
  ]);

  const masse = masseAgg._sum.netAmount ?? 0;
  const paye = payeAgg._sum.netAmount ?? 0;
  const restant = masse - paye;

  const school = settings ?? { name: "Établissement" };

  const columns = [
    { header: "Employé", accessor: "employee" },
    { header: "Poste", accessor: "position", className: "hidden md:table-cell" },
    { header: "Base", accessor: "base" },
    { header: "Primes / Retenues", accessor: "adjust" },
    { header: "Net", accessor: "net" },
    { header: "Statut", accessor: "status" },
    { header: "Actions", accessor: "action" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP : contexte mois + navigation + bouton générer */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Paie du mois</h1>
          <div className="flex items-center gap-2">
            <Link
              href={`/list/payroll?month=${prev.m}&year=${prev.y}`}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow"
              aria-label="Mois précédent"
            >
              <ChevronLeft size={16} />
            </Link>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthLabel} {year}
            </span>
            <Link
              href={`/list/payroll?month=${next.m}&year=${next.y}`}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow"
              aria-label="Mois suivant"
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        {role === "admin" && (
          <div className="flex items-center gap-3">
            <ExportCsvButton endpoint="payroll" filename="paie" />
            <GeneratePayrollButton
              month={month}
              year={year}
              monthLabel={monthLabel}
              alreadyGenerated={rows.length > 0}
            />
          </div>
        )}
      </div>

      {/* STAT-TILES */}
      <div className="flex flex-col md:flex-row gap-4 mt-4">
        <div className="flex-1 rounded-md p-3 bg-lamaSkyLight flex flex-col gap-1">
          <span className="text-xs text-gray-500">Masse salariale</span>
          <span className="text-xl font-semibold">{formatFCFA(masse)}</span>
        </div>
        <div className="flex-1 rounded-md p-3 bg-green-50 flex flex-col gap-1">
          <span className="text-xs text-gray-500">Payé</span>
          <span className="text-xl font-semibold text-green-700">
            {formatFCFA(paye)}
          </span>
        </div>
        <div className="flex-1 rounded-md p-3 bg-lamaYellowLight flex flex-col gap-1">
          <span className="text-xs text-gray-500">Restant</span>
          <span className="text-xl font-semibold text-yellow-700">
            {formatFCFA(restant)}
          </span>
        </div>
      </div>

      {/* CORPS */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-gray-500 text-sm">
            Aucun bulletin de paie pour {monthLabel} {year}.
          </p>
          {role === "admin" ? (
            <GeneratePayrollButton
              month={month}
              year={year}
              monthLabel={monthLabel}
              big
            />
          ) : null}
        </div>
      ) : (
        <table className="w-full mt-6">
          <thead>
            <tr className="text-left text-gray-500 text-sm">
              {columns.map((col) => (
                <th key={col.accessor} className={col.className}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item: PayrollRow) => {
              const isPaid = item.status === "PAID";
              return (
                <tr
                  key={item.id}
                  className={`border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight ${
                    isPaid ? "bg-slate-50 text-gray-500" : ""
                  }`}
                >
                  <td className="p-4 font-medium">
                    {item.employee.surname} {item.employee.name}
                  </td>
                  <td className="hidden md:table-cell">
                    {item.employee.position}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatFCFA(item.baseAmount)}
                  </td>
                  <td>
                    <AdjustmentsCell
                      id={item.id}
                      bonuses={item.bonuses}
                      deductions={item.deductions}
                      locked={isPaid}
                    />
                  </td>
                  <td className="whitespace-nowrap font-semibold">
                    {formatFCFA(item.netAmount)}
                  </td>
                  <td>
                    {isPaid ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                        Payé
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-lamaYellowLight text-yellow-700">
                        En attente
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      {role === "admin" && !isPaid && (
                        <MarkPaidButton id={item.id} />
                      )}
                      {isPaid && (
                        <>
                          <PayslipDownloadButton
                            data={{
                              payslipNo: item.id.slice(0, 8),
                              school: {
                                name: school.name,
                                address: (school as any).address ?? null,
                                phone: (school as any).phone ?? null,
                                email: (school as any).email ?? null,
                                legalFooter:
                                  (school as any).legalFooter ?? null,
                              },
                              employee: {
                                name: item.employee.name,
                                surname: item.employee.surname,
                                position: item.employee.position,
                              },
                              monthLabel,
                              year,
                              baseAmount: item.baseAmount,
                              bonuses: item.bonuses,
                              deductions: item.deductions,
                              netAmount: item.netAmount,
                              methodLabel: paymentMethodLabel(item.method),
                              paidAt: item.paidAt,
                            }}
                          />
                          {role === "admin" && (
                            <UnmarkPaidButton id={item.id} />
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PayrollPage;
