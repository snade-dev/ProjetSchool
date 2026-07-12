import prisma from "@/lib/prisma";
import { Users, GraduationCap } from "lucide-react";
import CreateSchoolForm from "./components/CreateSchoolForm";
import ToggleSchoolButton from "./components/ToggleSchoolButton";

/**
 * V04 — Écoles de la plateforme : liste avec effectifs et statut,
 * création d'une école + son premier admin, activation/coupure.
 */
export default async function PlatformSchoolsPage() {
  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { students: true, teachers: true, users: true } },
    },
  });

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
                  <ToggleSchoolButton schoolId={s.id} active={s.active} />
                </td>
              </tr>
            ))}
            {schools.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
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
