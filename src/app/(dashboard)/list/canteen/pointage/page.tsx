import prisma from "@/lib/prisma";
import { sessionSchoolId } from "@/lib/authGuard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveSchoolYear } from "@/lib/schoolYear";
import CanteenTabs from "../components/CanteenTabs";
import PointageTable, { type PointageRow } from "./components/PointageTable";
import { getCanteenRoster, mealDay, mealDayInputValue, coversDay } from "@/lib/canteen";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";

/**
 * X02 — Pointage du réfectoire (§2.5) : la feuille du jour, classe par classe.
 * Jour et classe passent par l'URL (?date=YYYY-MM-DD&classId=…) : le formulaire
 * de sélection est un simple GET, l'écran reste un composant serveur.
 */
const CanteenPointagePage = async (props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user.role;
  const schoolId = sessionSchoolId(session);

  if (!["admin", "director", "accountant", "supervisor"].includes(role ?? "")) {
    redirect(`/${role ?? "sign-in"}`);
  }
  // Le pointage est un geste quotidien : direction, comptable ET surveillant.
  const canEdit = ["admin", "director", "accountant", "supervisor"].includes(
    role ?? ""
  );

  let activeYear;
  try {
    activeYear = await getActiveSchoolYear(schoolId);
  } catch {
    return (
      <div className="flex-1 m-4 mt-0">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-lg font-semibold mb-4">Cantine — pointage</h1>
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

  const classes = await prisma.class.findMany({
    where: { schoolId, schoolYearId: activeYear.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Jour demandé (défaut : aujourd'hui) et classe demandée (défaut : la première).
  const dateParam = searchParams.date;
  const day = dateParam ? mealDay(dateParam) : mealDay(new Date());
  const dayValue = mealDayInputValue(day);
  const classIdParam = searchParams.classId;
  const selectedClassId = classIdParam
    ? parseInt(classIdParam)
    : classes[0]?.id;

  const roster =
    selectedClassId != null
      ? await getCanteenRoster({
          schoolId,
          schoolYearId: activeYear.id,
          day,
          classId: selectedClassId,
        })
      : [];

  const rows: PointageRow[] = roster.map((r) => {
    const covered = r.subscription ? coversDay(r.subscription, day) : false;
    return {
      studentId: r.studentId,
      name: r.name,
      surname: r.surname,
      username: r.username,
      className: r.className,
      planName: r.subscription?.mealPlanName ?? null,
      covered,
      unitPrice: r.subscription?.unitPrice ?? null,
      // Pointage déjà saisi, sinon présélection : abonné couvert → forfait.
      kind: (r.meal?.kind as PointageRow["kind"]) ?? (covered ? "SUBSCRIBED" : "NONE"),
    };
  });

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-4">
      <div className="bg-white p-4 rounded-md flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold">Cantine — pointage du jour</h1>
            <p className="text-xs text-gray-400">
              Année scolaire active : {activeYear.name}
            </p>
          </div>
          {/* Sélection jour + classe : formulaire GET, pas de state client */}
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500">Jour</label>
              <input
                type="date"
                name="date"
                defaultValue={dayValue}
                className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-lamaSky"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500">Classe</label>
              <select
                name="classId"
                defaultValue={selectedClassId}
                className="rounded-md ring-[1.5px] ring-gray-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-lamaSky"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-lamaSky px-4 py-2 text-sm font-medium text-sky-900 transition hover:brightness-95"
            >
              Afficher
            </button>
          </form>
        </div>
        <CanteenTabs current="/list/canteen/pointage" />
      </div>

      <div className="bg-white p-4 rounded-md">
        {classes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ClipboardCheck size={32} className="text-gray-200" />
            <p className="text-sm text-gray-400">
              Aucune classe cette année : créez des classes avant de pointer les
              repas.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ClipboardCheck size={32} className="text-gray-200" />
            <p className="text-sm text-gray-400">
              Aucun élève inscrit dans cette classe.
            </p>
            <Link
              href="/list/canteen/subscriptions"
              className="text-xs text-sky-700 underline"
            >
              Gérer les abonnements
            </Link>
          </div>
        ) : (
          <PointageTable date={dayValue} rows={rows} canEdit={canEdit} />
        )}
      </div>
    </div>
  );
};

export default CanteenPointagePage;
