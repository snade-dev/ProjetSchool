import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";
import { formatFCFA } from "@/lib/finance";
import { getFinanceStats } from "@/lib/stats/financeStats";
import Table from "@/components/Table";
import YearSelect from "./components/YearSelect";
import MonthlyComposedChart from "./components/MonthlyComposedChart";
import ExpensePieChart from "./components/ExpensePieChart";

type Accent = "sky" | "purple" | "yellow" | "green" | "red" | "gray";

/** Carte-statistique (style UserCard/StatTile S14). */
function StatTile({
  value,
  label,
  accent = "gray",
  sub,
}: {
  value: string;
  label: string;
  accent?: Accent;
  sub?: string;
}) {
  const bg: Record<Accent, string> = {
    sky: "bg-lamaSky",
    purple: "bg-lamaPurple",
    yellow: "bg-lamaYellow",
    green: "bg-green-100",
    red: "bg-red-100",
    gray: "bg-gray-100",
  };
  return (
    <div className={`rounded-2xl ${bg[accent]} p-4 flex-1 min-w-[150px]`}>
      <h1 className="text-xl font-semibold my-1">{value}</h1>
      <h2 className="text-sm font-medium text-gray-600">{label}</h2>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

/**
 * E39 — Statistiques financières (`/stats/finance`), ADMIN UNIQUEMENT.
 * `/stats` est ouvert à teacher dans routeAccessMap (S14) → la garde EN PAGE est
 * OBLIGATOIRE ici. Le cockpit du directeur : CA encaissé (≠ facturé), dépenses,
 * salaires payés, résultat, recouvrement, impayés par classe.
 */
export default async function FinanceStatsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const info = await getSessionInfo();
  if (!info) return notFound();
  const { role } = info;
  if (role !== "admin") redirect("/" + role);

  const searchParams = await props.searchParams;

  const years = await prisma.schoolYear.findMany({
    select: { id: true, name: true, isActive: true },
    orderBy: { startDate: "desc" },
  });

  if (years.length === 0) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <h1 className="text-lg font-semibold">Statistiques financières</h1>
        <p className="mt-6 text-sm text-gray-400">
          Aucune année scolaire configurée. Rendez-vous dans les paramètres.
        </p>
      </div>
    );
  }

  // Défaut : année active, sinon la plus récente.
  const requestedId = searchParams.schoolYearId
    ? parseInt(searchParams.schoolYearId)
    : undefined;
  const activeYear = years.find((y) => y.isActive) ?? years[0];
  const schoolYearId =
    requestedId != null && years.some((y) => y.id === requestedId)
      ? requestedId
      : activeYear.id;

  const stats = await getFinanceStats(schoolYearId);
  if (!stats) return notFound();

  const currentYear = years.find((y) => y.id === schoolYearId)!;

  const chartData = stats.months.map((m) => ({
    label: m.label,
    encaisse: m.encaisse,
    depenses: m.depenses,
    salaires: m.salaires,
    resultat: m.resultat,
  }));

  const resultatPositif = stats.resultat >= 0;

  const outstandingColumns = [
    { header: "Classe", accessor: "className" },
    { header: "Factures", accessor: "invoiceCount", className: "text-center" },
    { header: "Montant", accessor: "amount" },
    { header: "% du total", accessor: "pct", className: "text-right" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex flex-col gap-6">
      {/* Header + select année */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Statistiques financières</h1>
          <p className="text-sm text-gray-400">
            Année scolaire {currentYear.name}
            {currentYear.isActive ? " (active)" : ""}
          </p>
        </div>
        <YearSelect years={years} currentYearId={schoolYearId} />
      </div>

      {/* Rangée de tuiles */}
      <div className="flex gap-4 flex-wrap">
        <StatTile
          accent="sky"
          label="CA encaissé"
          value={formatFCFA(stats.totalEncaisse)}
        />
        <StatTile
          accent="gray"
          label="Total facturé"
          value={formatFCFA(stats.totalFacture)}
        />
        <StatTile
          accent="purple"
          label="Taux de recouvrement"
          value={`${Math.round(stats.tauxRecouvrement * 100)} %`}
          sub="encaissé / facturé"
        />
        <StatTile
          accent="yellow"
          label="Dépenses"
          value={formatFCFA(stats.totalDepenses)}
        />
        <StatTile
          accent="yellow"
          label="Masse salariale (payée)"
          value={formatFCFA(stats.totalSalaires)}
        />
        <StatTile
          accent={resultatPositif ? "green" : "red"}
          label="Résultat"
          value={formatFCFA(stats.resultat)}
          sub="encaissé − dépenses − salaires"
        />
      </div>

      {/* Encadré méthodologique */}
      <div className="bg-lamaSkyLight rounded-md p-3 text-xs text-gray-500">
        <span className="font-semibold text-gray-600">Méthodologie : </span>
        le <strong>CA</strong> correspond aux montants réellement{" "}
        <strong>encaissés</strong> (Σ des paiements reçus), et non au facturé. Le
        taux de recouvrement rapporte l&apos;encaissé au total facturé de
        l&apos;année (hors factures annulées). La masse salariale ne compte que
        les salaires <strong>effectivement payés</strong> (les bulletins en
        attente sont exclus du résultat). Résultat = encaissé − dépenses −
        salaires payés. L&apos;axe du graphique suit l&apos;année scolaire
        (septembre → juin).
      </div>

      {/* Chart mensuel principal */}
      <div className="bg-white border rounded-2xl p-4 h-96 flex flex-col">
        <h2 className="text-lg font-semibold mb-2">
          Évolution mensuelle (septembre → juin)
        </h2>
        <div className="flex-1">
          <MonthlyComposedChart data={chartData} />
        </div>
      </div>

      {/* Grille 2 colonnes : dépenses par catégorie + impayés par classe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-2xl p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-3">Dépenses par catégorie</h2>
          <div className="flex-1 min-h-[240px]">
            <ExpensePieChart data={stats.expensesByCategory} />
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-1">Impayés par classe</h2>
          <p className="text-sm text-gray-400 mb-2">
            Total impayé : {formatFCFA(stats.totalOutstanding)}
          </p>
          {stats.outstandingByClass.length === 0 ? (
            <p className="text-sm text-gray-400 mt-4">
              Aucun impayé sur cette année. 🎉
            </p>
          ) : (
            <Table
              columns={outstandingColumns}
              data={stats.outstandingByClass}
              renderRow={(row) => (
                <tr
                  key={row.classId}
                  className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
                >
                  <td className="p-4 font-medium">{row.className}</td>
                  <td className="text-center">{row.invoiceCount}</td>
                  <td className="text-red-600 font-medium">
                    {formatFCFA(row.amount)}
                  </td>
                  <td className="text-right pr-2">
                    {Math.round(row.pct * 100)} %
                  </td>
                </tr>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
