import prisma from "@/lib/prisma";
import { sessionSchoolId } from "@/lib/authGuard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveSchoolYear } from "@/lib/schoolYear";
import FormContainer from "@/components/FormContainer";
import { MEAL_PERIOD_LABEL } from "@/lib/canteen";
import CanteenTabs from "./components/CanteenTabs";
import { UtensilsCrossed } from "lucide-react";

/**
 * X01 — Cantine : formules de restauration (§2.5).
 * Écran d'entrée du module. Le forfait d'une formule est facturé sur les
 * factures de l'élève (X03) ; le prix unitaire sert aux repas à l'unité (X02).
 */

const formatFCFA = (amount: number) =>
  `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;

const periodBadge: Record<string, string> = {
  MONTHLY: "bg-lamaSky text-sky-800",
  YEARLY: "bg-lamaPurple text-indigo-800",
  ONE_TIME: "bg-gray-100 text-gray-600",
};

const CanteenPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;

  // Défense en profondeur (le proxy garde déjà /list/canteen)
  if (!["admin", "director", "accountant", "supervisor"].includes(role ?? "")) {
    redirect(`/${role ?? "sign-in"}`);
  }
  const canManage = role === "admin" || role === "director";

  let activeYear;
  try {
    activeYear = await getActiveSchoolYear();
  } catch {
    return (
      <div className="flex-1 m-4 mt-0">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-lg font-semibold mb-4">Cantine</h1>
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

  const plans = await prisma.mealPlan.findMany({
    where: {
      schoolId: sessionSchoolId(session),
      schoolYearId: activeYear.id,
    },
    include: {
      _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-4">
      <div className="bg-white p-4 rounded-md flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold">Cantine — formules</h1>
            <p className="text-xs text-gray-400">
              Année scolaire active : {activeYear.name}
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 hidden md:block">
                Ajouter une formule
              </span>
              <FormContainer table="mealPlan" type="create" />
            </div>
          )}
        </div>
        <CanteenTabs current="/list/canteen" />
      </div>

      {plans.length === 0 ? (
        <div className="bg-white p-8 rounded-md flex flex-col items-center gap-3 text-center">
          <UtensilsCrossed size={32} className="text-gray-200" />
          <p className="text-sm text-gray-400">
            Aucune formule de restauration cette année. Créez-en une pour
            pouvoir inscrire des élèves à la cantine.
          </p>
          {canManage && <FormContainer table="mealPlan" type="create" />}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white p-4 rounded-md flex flex-col gap-3 ${
                plan.active ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-md font-semibold flex items-center gap-2">
                    <UtensilsCrossed size={16} className="text-gray-400 shrink-0" />
                    <span className="truncate">{plan.name}</span>
                  </h2>
                  {plan.description && (
                    <p className="text-xs text-gray-400 mt-1">
                      {plan.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canManage && (
                    <>
                      <FormContainer
                        table="mealPlan"
                        type="update"
                        data={{
                          id: plan.id,
                          name: plan.name,
                          description: plan.description,
                          period: plan.period,
                          amount: plan.amount,
                          unitPrice: plan.unitPrice,
                          active: plan.active,
                        }}
                      />
                      <FormContainer
                        table="mealPlan"
                        type="delete"
                        id={plan.id}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    periodBadge[plan.period] ?? periodBadge.ONE_TIME
                  }`}
                >
                  {MEAL_PERIOD_LABEL[plan.period] ?? plan.period}
                </span>
                {!plan.active && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                    Retirée
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-sm">
                <div>
                  <p className="text-[11px] text-gray-400">Forfait</p>
                  <p className="font-semibold whitespace-nowrap">
                    {formatFCFA(plan.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Repas à l&apos;unité</p>
                  <p className="font-semibold whitespace-nowrap">
                    {plan.unitPrice != null ? formatFCFA(plan.unitPrice) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Abonnés actifs</p>
                  <p className="font-semibold">{plan._count.subscriptions}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CanteenPage;
