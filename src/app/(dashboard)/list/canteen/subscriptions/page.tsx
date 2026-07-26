import prisma from "@/lib/prisma";
import { sessionSchoolId } from "@/lib/authGuard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveSchoolYear } from "@/lib/schoolYear";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import CanteenTabs from "../components/CanteenTabs";
import { ITEM_PER_PAGE } from "@/lib/setting";
import { SUBSCRIPTION_STATUS_LABEL } from "@/lib/canteen";
import { Prisma } from "@/app/generated/prisma";
import { Users } from "lucide-react";

/**
 * X01 — Cantine : élèves abonnés (§2.5). Un abonnement par élève et par année ;
 * les dates bornent la facturation du forfait (X03).
 */

const formatFCFA = (amount: number) =>
  `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;

const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("fr-FR").format(d) : "—";

const statusBadge: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-lamaYellowLight text-yellow-800",
  ENDED: "bg-gray-100 text-gray-600",
};

const CanteenSubscriptionsPage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const schoolId = sessionSchoolId(session);

  if (!["admin", "director", "accountant", "supervisor"].includes(role ?? "")) {
    redirect(`/${role ?? "sign-in"}`);
  }
  const canManage = role === "admin" || role === "director";

  let activeYear;
  try {
    activeYear = await getActiveSchoolYear(schoolId);
  } catch {
    return (
      <div className="flex-1 m-4 mt-0">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-lg font-semibold mb-4">Cantine — abonnés</h1>
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

  const { page, search, status } = searchParams;
  const p = page ? parseInt(page) : 1;

  const where: Prisma.CanteenSubscriptionWhereInput = {
    schoolId,
    schoolYearId: activeYear.id,
    ...(status && status !== "ALL"
      ? { status: status as Prisma.EnumCanteenSubscriptionStatusFilter["equals"] }
      : {}),
    ...(search
      ? {
          student: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { surname: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [subscriptions, count, activeCount, planTotals] = await Promise.all([
    prisma.canteenSubscription.findMany({
      where,
      include: {
        mealPlan: { select: { name: true, amount: true, period: true } },
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            username: true,
            enrollments: {
              where: { schoolYearId: activeYear.id },
              select: { class: { select: { name: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ student: { name: "asc" } }, { student: { surname: "asc" } }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.canteenSubscription.count({ where }),
    prisma.canteenSubscription.count({
      where: { schoolId, schoolYearId: activeYear.id, status: "ACTIVE" },
    }),
    // Montant mensuel théorique des forfaits actifs (indicateur d'en-tête)
    prisma.canteenSubscription.findMany({
      where: { schoolId, schoolYearId: activeYear.id, status: "ACTIVE" },
      select: { mealPlan: { select: { amount: true, period: true } } },
    }),
  ]);

  const monthlyExpected = planTotals
    .filter((s) => s.mealPlan.period === "MONTHLY")
    .reduce((sum, s) => sum + s.mealPlan.amount, 0);

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-4">
      <div className="bg-white p-4 rounded-md flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold">Cantine — abonnés</h1>
            <p className="text-xs text-gray-400">
              {activeCount} abonnement{activeCount > 1 ? "s" : ""} actif
              {activeCount > 1 ? "s" : ""} · {formatFCFA(monthlyExpected)} /
              mois attendus (forfaits mensuels)
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <TableSearch />
            {canManage && (
              <FormContainer table="canteenSubscription" type="create" />
            )}
          </div>
        </div>
        <CanteenTabs current="/list/canteen/subscriptions" />
      </div>

      <div className="bg-white p-4 rounded-md">
        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Users size={32} className="text-gray-200" />
            <p className="text-sm text-gray-400">
              Aucun abonné à la cantine
              {search ? " pour cette recherche." : " cette année."}
            </p>
            {canManage && !search && (
              <FormContainer table="canteenSubscription" type="create" />
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="p-3">Élève</th>
                <th className="p-3 hidden md:table-cell">Classe</th>
                <th className="p-3">Formule</th>
                <th className="p-3 text-right hidden md:table-cell">Forfait</th>
                <th className="p-3 hidden lg:table-cell">Début</th>
                <th className="p-3 hidden lg:table-cell">Fin</th>
                <th className="p-3">Statut</th>
                {canManage && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-gray-100 even:bg-slate-50 hover:bg-lamaPurpleLight"
                >
                  <td className="p-3">
                    <div className="font-medium">
                      {sub.student.name} {sub.student.surname}
                    </div>
                    <div className="text-xs text-gray-400">
                      {sub.student.username}
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    {sub.student.enrollments[0]?.class.name ?? "—"}
                  </td>
                  <td className="p-3">{sub.mealPlan.name}</td>
                  <td className="p-3 text-right hidden md:table-cell whitespace-nowrap">
                    {formatFCFA(sub.mealPlan.amount)}
                  </td>
                  <td className="p-3 hidden lg:table-cell whitespace-nowrap">
                    {fmtDate(sub.startDate)}
                  </td>
                  <td className="p-3 hidden lg:table-cell whitespace-nowrap">
                    {fmtDate(sub.endDate)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        statusBadge[sub.status] ?? statusBadge.ENDED
                      }`}
                    >
                      {SUBSCRIPTION_STATUS_LABEL[sub.status] ?? sub.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <FormContainer
                          table="canteenSubscription"
                          type="update"
                          data={{
                            id: sub.id,
                            studentId: sub.studentId,
                            mealPlanId: sub.mealPlanId,
                            startDate: sub.startDate,
                            endDate: sub.endDate,
                            status: sub.status,
                            note: sub.note,
                          }}
                        />
                        <FormContainer
                          table="canteenSubscription"
                          type="delete"
                          id={sub.id}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};

export default CanteenSubscriptionsPage;
