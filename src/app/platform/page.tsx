import prisma from "@/lib/prisma";
import { Users, GraduationCap } from "lucide-react";
import CreateSchoolForm from "./components/CreateSchoolForm";
import ToggleSchoolButton from "./components/ToggleSchoolButton";
import SubscriptionDrawer, {
  type DrawerSubscription,
} from "./components/SubscriptionDrawer";
import {
  computeSubscriptionStatus,
  subscriptionDeadline,
} from "@/lib/subscription";

/**
 * V04 — Écoles de la plateforme : liste avec effectifs et statut,
 * création d'une école + son premier admin, activation/coupure.
 */
export default async function PlatformSchoolsPage() {
  const [schools, plans] = await Promise.all([
    prisma.school.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { students: true, teachers: true, users: true } },
        // V05 — abonnement + derniers paiements pour le drawer
        subscription: {
          include: {
            plan: true,
            payments: { orderBy: { paidAt: "desc" }, take: 5 },
          },
        },
      },
    }),
    prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: "asc" },
      select: { id: true, name: true, priceMonthly: true },
    }),
  ]);

  // Statut dérivé des dates (le champ en base n'est qu'un cache).
  const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    TRIAL: { label: "Essai", cls: "bg-lamaSkyLight text-sky-800" },
    ACTIVE: { label: "À jour", cls: "bg-green-100 text-green-700" },
    PAST_DUE: { label: "En retard", cls: "bg-lamaYellowLight text-yellow-800" },
    SUSPENDED: { label: "Suspendu", cls: "bg-red-100 text-red-600" },
  };

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Écoles</h1>
          <p className="text-sm text-gray-400">
            {schools.length} établissement{schools.length > 1 ? "s" : ""} sur la
            plateforme
          </p>
        </div>
        <CreateSchoolForm />
      </div>

      <div className="overflow-x-auto rounded-md bg-white p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400">
              <th className="p-3">École</th>
              <th className="hidden p-3 md:table-cell">Slug</th>
              <th className="p-3">Effectifs</th>
              <th className="p-3">Abonnement</th>
              <th className="hidden p-3 md:table-cell">Comptes</th>
              <th className="hidden p-3 lg:table-cell">Créée le</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <tr
                key={s.id}
                className="border-t border-gray-100 hover:bg-lamaSkyLight/30 transition-colors"
              >
                <td className="p-3 font-semibold">
                  {s.name}
                  <span className="ml-2 text-[10px] font-normal text-gray-400">
                    #{s.id}
                  </span>
                </td>
                <td className="hidden p-3 font-mono text-xs text-gray-500 md:table-cell">
                  {s.slug}
                </td>
                <td className="p-3">
                  <span className="mr-3 inline-flex items-center gap-1 text-gray-600">
                    <GraduationCap size={13} />
                    {s._count.students}
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <Users size={13} />
                    {s._count.teachers}
                  </span>
                </td>
                <td className="p-3">
                  {s.subscription ? (
                    (() => {
                      const derived = computeSubscriptionStatus(s.subscription);
                      const badge = STATUS_BADGE[derived];
                      const deadline = subscriptionDeadline(s.subscription);
                      return (
                        <span className="flex flex-col gap-0.5">
                          <span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                              {badge.label}
                            </span>
                            <span className="ml-1.5 text-xs text-gray-500">
                              {s.subscription.plan.name}
                            </span>
                          </span>
                          {deadline && (
                            <span className="text-[10px] text-gray-400">
                              échéance {fmtDate(deadline)}
                            </span>
                          )}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="hidden p-3 text-gray-500 md:table-cell">
                  {s._count.users}
                </td>
                <td className="hidden p-3 text-gray-500 lg:table-cell">
                  {fmtDate(s.createdAt)}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      s.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {s.active ? "Active" : "Coupée"}
                  </span>
                </td>
                <td className="p-3">
                  <span className="flex items-center gap-2">
                    <SubscriptionDrawer
                      schoolId={s.id}
                      schoolName={s.name}
                      plans={plans}
                      subscription={
                        s.subscription
                          ? ({
                              id: s.subscription.id,
                              planId: s.subscription.planId,
                              planName: s.subscription.plan.name,
                              priceMonthly: s.subscription.plan.priceMonthly,
                              status: computeSubscriptionStatus(s.subscription),
                              trialEndsAt:
                                s.subscription.trialEndsAt?.toISOString() ?? null,
                              paidUntil:
                                s.subscription.paidUntil?.toISOString() ?? null,
                              payments: s.subscription.payments.map((p) => ({
                                id: p.id,
                                amount: p.amount,
                                months: p.months,
                                method: p.method,
                                reference: p.reference,
                                paidAt: p.paidAt.toISOString(),
                              })),
                            } satisfies DrawerSubscription)
                          : null
                      }
                    />
                    <ToggleSchoolButton schoolId={s.id} active={s.active} />
                  </span>
                </td>
              </tr>
            ))}
            {schools.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-400">
                  Aucune école — créez la première.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
