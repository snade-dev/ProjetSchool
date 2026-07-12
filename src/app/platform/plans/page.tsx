import prisma from "@/lib/prisma";
import { formatFCFA } from "@/lib/finance";
import PlanForm from "../components/PlanForm";

/** V05 — Plans d'abonnement : liste + création/édition. */
export default async function PlatformPlansPage() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { priceMonthly: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Plans d&apos;abonnement</h1>
          <p className="text-sm text-gray-400">
            Tarifs mensuels facturés aux établissements (FCFA)
          </p>
        </div>
        <PlanForm />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`flex flex-col gap-3 rounded-2xl border bg-white p-5 ${
              p.active ? "border-gray-100" : "border-red-100 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">{p.name}</h2>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                  p.active
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {p.active ? "Actif" : "Coupé"}
              </span>
            </div>
            <div>
              <span className="text-2xl font-bold">
                {formatFCFA(p.priceMonthly)}
              </span>
              <span className="text-sm text-gray-400"> / mois</span>
            </div>
            <p className="text-xs text-gray-500">
              {p.maxStudents
                ? `Jusqu'à ${p.maxStudents} élèves`
                : "Élèves illimités"}
              {" · "}
              {p._count.subscriptions} école
              {p._count.subscriptions > 1 ? "s" : ""} abonnée
              {p._count.subscriptions > 1 ? "s" : ""}
            </p>
            <div className="mt-auto">
              <PlanForm plan={p} />
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <p className="col-span-full rounded-md bg-white p-6 text-center text-sm text-gray-400">
            Aucun plan — créez le premier pour pouvoir abonner des écoles.
          </p>
        )}
      </div>
    </div>
  );
}
