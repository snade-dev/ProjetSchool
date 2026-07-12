import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";
import Image from "next/image";

/**
 * Carte compteur du dashboard.
 * - `type` "employé" compte les employés ACTIFS (`active: true`), les autres = count brut.
 * - `year` (optionnel) : libellé de l'année scolaire active affiché en badge.
 *   Non fourni (dashboards teacher/student legacy) → fallback "2024/25" (comportement inchangé).
 */
const UserCard = async ({
  type,
  year,
}: {
  type: "admin" | "enseignant" | "élève" | "parent" | "employé";
  year?: string;
}) => {
  // V03 — cloisonnement : compteurs limités à l'école de la session
  const info = await getSessionInfo();
  const schoolId = info?.schoolId ?? -1;

  const data =
    type === "employé"
      ? await prisma.employee.count({ where: { active: true, schoolId } })
      : type === "enseignant"
      ? await prisma.teacher.count({ where: { schoolId } })
      : type === "élève"
      ? await prisma.student.count({ where: { schoolId } })
      : type === "parent"
      ? await prisma.parent.count({ where: { schoolId } })
      : await prisma.admin.count();

  return (
    <div className=" rounded-2xl odd:bg-lamaPurple even:bg-lamaYellow p-4 flex-1 min-w-[130px]">
      <div className=" flex justify-between items-center">
        <span className=" text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
          {year ?? "2024/25"}
        </span>
        <Image src="/more.png" alt="" width={20} height={20} />
      </div>
      <h1 className=" text-2xl font-semibold my-4">{data}</h1>
      <h2 className=" text-sm font-medium text-gray-500 capitalize">{type}</h2>
    </div>
  );
};
export default UserCard;
