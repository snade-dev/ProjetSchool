import prisma from "@/lib/prisma";
import { sessionSchoolId } from "@/lib/authGuard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveSchoolYear } from "@/lib/schoolYear";
import FormContainer from "@/components/FormContainer";
import DuplicateFeesButton from "./components/DuplicateFeesButton";
import { Wallet } from "lucide-react";

// Formatage FCFA : "1 250 000 FCFA"
const formatFCFA = (amount: number) =>
  `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;

const periodLabels: Record<string, { label: string; className: string }> = {
  MONTHLY: { label: "Mensuel", className: "bg-lamaSky text-sky-800" },
  YEARLY: { label: "Annuel", className: "bg-lamaPurple text-indigo-800" },
  ONE_TIME: { label: "Unique", className: "bg-gray-100 text-gray-600" },
};

const FeesPage = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;

  // Défense en profondeur — W07 : admin et comptable gèrent la grille,
  // la direction la consulte (finance en lecture).
  if (!["admin", "accountant", "director"].includes(role ?? "")) {
    redirect(`/${role ?? "sign-in"}`);
  }
  // Écriture : admin + comptable (les actions feeAction l'imposent aussi).
  const canManage = role === "admin" || role === "accountant";

  // Aucune année active → bandeau au lieu d'un crash
  let activeYear;
  try {
    activeYear = await getActiveSchoolYear();
  } catch {
    return (
      <div className="flex-1 m-4 mt-0">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-lg font-semibold mb-4">Grille des frais</h1>
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

  // V03 — cloisonnement : classes de l'école de la session uniquement
  // W02 — et de l'année scolaire active uniquement
  const classes = await prisma.class.findMany({
    where: {
      schoolId: sessionSchoolId(session),
      schoolYear: { isActive: true },
    },
    orderBy: { name: "asc" },
    include: {
      feeStructures: {
        where: { schoolYearId: activeYear.id },
        orderBy: { label: "asc" },
      },
    },
  });

  const classOptions = classes.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-md flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-semibold">Grille des frais</h1>
          <p className="text-xs text-gray-400">
            Année scolaire active : {activeYear.name}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden md:block">
              Ajouter un frais
            </span>
            <FormContainer table="fee" type="create" />
          </div>
        )}
      </div>

      {classes.length === 0 && (
        <div className="bg-white p-8 rounded-md text-center text-sm text-gray-400">
          Aucune classe. Créez d&apos;abord des classes pour définir leurs
          frais.
        </div>
      )}

      {/* Une carte par classe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {classes.map((classItem) => {
          const fees = classItem.feeStructures;
          const monthlyTotal = fees
            .filter((f) => f.period === "MONTHLY")
            .reduce((sum, f) => sum + f.amount, 0);

          return (
            <div
              key={classItem.id}
              className="bg-white p-4 rounded-md flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-md font-semibold flex items-center gap-2">
                  <Wallet size={16} className="text-gray-400" />
                  {classItem.name}
                </h2>
                <span className="text-xs text-gray-400">
                  {fees.length} frais
                </span>
              </div>

              {fees.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <Wallet size={28} className="text-gray-200" />
                  <p className="text-sm text-gray-400">
                    Aucun frais défini pour cette classe.
                  </p>
                  {canManage && <FormContainer table="fee" type="create" />}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="p-2">Libellé</th>
                      <th className="p-2">Périodicité</th>
                      <th className="p-2 text-right">Montant</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((fee) => {
                      const badge =
                        periodLabels[fee.period] ?? periodLabels.ONE_TIME;
                      return (
                        <tr
                          key={fee.id}
                          className="border-b border-gray-100 even:bg-slate-50 hover:bg-lamaPurpleLight"
                        >
                          <td className="p-2 font-medium">{fee.label}</td>
                          <td className="p-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {formatFCFA(fee.amount)}
                          </td>
                          <td className="p-2">
                            {canManage && (
                              <div className="flex items-center justify-end gap-2">
                                <FormContainer
                                  table="fee"
                                  type="update"
                                  data={{
                                    id: fee.id,
                                    label: fee.label,
                                    amount: fee.amount,
                                    period: fee.period,
                                    classId: fee.classId,
                                  }}
                                />
                                <FormContainer
                                  table="fee"
                                  type="delete"
                                  id={fee.id}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Pied de carte */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-100">
                <span className="text-sm font-semibold">
                  Total mensuel : {formatFCFA(monthlyTotal)}
                </span>
                {canManage && fees.length > 0 && (
                  <DuplicateFeesButton
                    fromClassId={classItem.id}
                    fromClassName={classItem.name}
                    classes={classOptions}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeesPage;
