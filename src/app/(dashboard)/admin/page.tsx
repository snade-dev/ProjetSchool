import { Suspense } from "react";
import { Users } from "lucide-react";
import UserCard from "@/components/UserCard";
import CountChartContainer from "@/components/CountChartContainer";
import AttendanceChartConainer from "@/components/AttendanceChartConainer";
import EventCalandarContainer from "@/components/EventCalandarContainer";
import Annoucement from "@/components/Annoucement";
import FinanceSummaryCards from "@/components/FinanceSummaryCards";
import FinanceChartContainer from "@/components/FinanceChartContainer";
import prisma from "@/lib/prisma";
import { getActiveSchoolYear } from "@/lib/schoolYear";

/**
 * E04 — Dashboard admin refondu (S17). Toutes les données sont réelles (Prisma) :
 * plus aucune donnée mockée de `lib/data.ts`. Bandeau finance + graphique finance
 * alimentés par S16. Badge année active (try/catch → "—"). Zéro crash sur base vide.
 */
const Adminpage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [keys: string]: string | undefined }>;
}) => {
  const sp = await searchParams;

  // Bornes du jour civil courant (UTC) pour la présence du jour.
  const now = new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const nextDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );

  // Année active (badge) + présence du jour, groupées.
  const [yearLabel, attendanceGroups] = await Promise.all([
    getActiveSchoolYear()
      .then((y) => y.name)
      .catch(() => "—"),
    prisma.attendance.groupBy({
      by: ["present"],
      _count: { _all: true },
      where: { date: { gte: dayStart, lt: nextDay } },
    }),
  ]);

  const presentToday =
    attendanceGroups.find((g) => g.present)?._count._all ?? 0;
  const totalToday = attendanceGroups.reduce(
    (sum, g) => sum + g._count._all,
    0
  );

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* USER CARDS */}
      <div className="flex gap-4 justify-between flex-wrap">
        <UserCard type="élève" year={yearLabel} />
        <UserCard type="enseignant" year={yearLabel} />
        <UserCard type="parent" year={yearLabel} />
        <UserCard type="employé" year={yearLabel} />
      </div>

      {/* BANDEAU FINANCE (pleine largeur) */}
      <FinanceSummaryCards />

      {/* GRILLE PRINCIPALE 2/3 - 1/3 */}
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* LEFT */}
        <div className="w-full lg:w-2/3 flex flex-col gap-8">
          {/* CHARTS ÉLÈVES / PRÉSENCE */}
          <div className="flex gap-4 flex-col lg:flex-row">
            <div className="w-full lg:w-1/3 h-[400px]">
              <CountChartContainer />
            </div>
            <div className="w-full lg:w-2/3 h-[400px]">
              <AttendanceChartConainer />
            </div>
          </div>
          {/* FINANCE CHART (données réelles S16) */}
          <div className="w-full h-[450px]">
            <Suspense
              fallback={
                <div className="bg-white rounded-xl w-full h-full p-4 flex items-center justify-center text-gray-400">
                  Chargement des finances…
                </div>
              }
            >
              <FinanceChartContainer />
            </Suspense>
          </div>
        </div>

        {/* RIGHT */}
        <div className="w-full lg:w-1/3 flex flex-col gap-8">
          {/* PRÉSENCE DU JOUR */}
          <div className="bg-white rounded-md p-4 flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-lamaSkyLight text-sky-600">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">
                Présents aujourd&apos;hui
              </span>
              <span className="text-lg font-semibold text-gray-700">
                {presentToday}/{totalToday}
              </span>
            </div>
          </div>

          <EventCalandarContainer searchParams={sp} />
          <Annoucement />
        </div>
      </div>
    </div>
  );
};

export default Adminpage;
