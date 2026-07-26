import { sessionSchoolId } from "@/lib/authGuard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveSchoolYear } from "@/lib/schoolYear";
import CanteenTabs from "../components/CanteenTabs";
import BillExtrasButton from "./components/BillExtrasButton";
import { getCanteenRecap } from "@/lib/canteen";
import { Download, BarChart2 } from "lucide-react";

/**
 * X04 — Récapitulatif cantine (§2.5) : repas servis, effectifs, montants dus
 * sur un mois. Le mois est passé en URL (?month=&year=) : écran serveur pur.
 */

const formatFCFA = (amount: number) =>
  `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const Stat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-md bg-white p-4">
    <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 text-xl font-semibold">{value}</p>
    {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
  </div>
);

const CanteenRecapPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const schoolId = sessionSchoolId(session);

  if (!["admin", "director", "accountant", "supervisor"].includes(role ?? "")) {
    redirect(`/${role ?? "sign-in"}`);
  }
  // La facturation des extras reste un geste comptable.
  const canBill = role === "admin" || role === "accountant";

  let activeYear;
  try {
    activeYear = await getActiveSchoolYear(schoolId);
  } catch {
    return (
      <div className="flex-1 m-4 mt-0">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-lg font-semibold mb-4">
            Cantine — récapitulatif
          </h1>
          <div className="bg-lamaYellowLight border border-lamaYellow text-yellow-800 text-sm p-4 rounded-md">
            Aucune année scolaire active. Configurez une année scolaire dans{" "}
            <a href="/settings" className="underline font-medium">
              /settings
            </a>
            .
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const month = searchParams.month
    ? Math.min(12, Math.max(1, parseInt(searchParams.month)))
    : now.getMonth() + 1;
  const year = searchParams.year
    ? parseInt(searchParams.year)
    : now.getFullYear();

  const { rows, totals } = await getCanteenRecap({
    schoolId,
    schoolYearId: activeYear.id,
    year,
    month,
  });

  const exportUrl = `/api/export/canteen?month=${month}&year=${year}`;

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-4">
      <div className="bg-white p-4 rounded-md flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold">Cantine — récapitulatif</h1>
            <p className="text-xs text-gray-400">
              {MONTHS[month - 1]} {year} · année scolaire {activeYear.name}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <form className="flex flex-wrap items-end gap-3" method="get">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Mois</label>
                <select
                  name="month"
                  defaultValue={month}
                  className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-lamaSky"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">
                  Année
                </label>
                <input
                  type="number"
                  name="year"
                  defaultValue={year}
                  className="w-24 rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-lamaSky"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-lamaSky px-4 py-2 text-sm font-medium text-sky-900 transition hover:brightness-95"
              >
                Afficher
              </button>
            </form>
            <a
              href={exportUrl}
              className="flex items-center gap-2 rounded-md border-[1.5px] border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              <Download size={15} />
              Export CSV
            </a>
          </div>
        </div>
        <CanteenTabs current="/list/canteen/recap" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Repas servis"
          value={String(totals.servedMeals)}
          hint={`${totals.subscribedMeals} au forfait · ${totals.extraMeals} à l'unité`}
        />
        <Stat
          label="Effectif moyen"
          value={String(totals.averagePerDay)}
          hint={`sur ${totals.serviceDays} jour${totals.serviceDays > 1 ? "s" : ""} d'ouverture`}
        />
        <Stat
          label="Forfaits du mois"
          value={formatFCFA(totals.planAmount)}
          hint={`${totals.diners} élève${totals.diners > 1 ? "s" : ""} à table`}
        />
        <Stat
          label="Total dû"
          value={formatFCFA(totals.expected)}
          hint={`dont ${formatFCFA(totals.extraAmount)} de repas à l'unité`}
        />
      </div>

      <div className="bg-white p-4 rounded-md flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-md font-semibold">Détail par élève</h2>
          {canBill && (
            <BillExtrasButton
              month={month}
              year={year}
              extraMeals={totals.extraMeals}
            />
          )}
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <BarChart2 size={32} className="text-gray-200" />
            <p className="text-sm text-gray-400">
              Aucun repas pointé ni abonnement sur {MONTHS[month - 1]} {year}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="p-3">Élève</th>
                  <th className="p-3 hidden md:table-cell">Classe</th>
                  <th className="p-3 hidden lg:table-cell">Formule</th>
                  <th className="p-3 text-right">Forfait</th>
                  <th className="p-3 text-right">Unité</th>
                  <th className="p-3 text-right hidden md:table-cell">
                    Absences
                  </th>
                  <th className="p-3 text-right">Dû</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.studentId}
                    className="border-b border-gray-100 even:bg-slate-50"
                  >
                    <td className="p-3">
                      <div className="font-medium">
                        {r.name} {r.surname}
                      </div>
                      <div className="text-xs text-gray-400">{r.username}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {r.className ?? "—"}
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      {r.planName ?? (
                        <span className="text-gray-400">Non abonné</span>
                      )}
                    </td>
                    <td className="p-3 text-right">{r.subscribedMeals}</td>
                    <td className="p-3 text-right">
                      {r.extraMeals}
                      {r.extraAmount > 0 && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({formatFCFA(r.extraAmount)})
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right hidden md:table-cell">
                      {r.absences}
                    </td>
                    <td className="p-3 text-right font-medium whitespace-nowrap">
                      {formatFCFA(r.planAmount + r.extraAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td className="p-3" colSpan={3}>
                    Total
                  </td>
                  <td className="p-3 text-right">{totals.subscribedMeals}</td>
                  <td className="p-3 text-right">{totals.extraMeals}</td>
                  <td className="p-3 text-right hidden md:table-cell">
                    {totals.absences}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {formatFCFA(totals.expected)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanteenRecapPage;
