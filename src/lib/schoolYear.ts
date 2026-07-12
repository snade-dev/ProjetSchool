import prisma from "./prisma";
import { getSessionInfo } from "./authGuard";

/**
 * Retourne l'année scolaire active de l'ÉCOLE DE LA SESSION (V03 — invariant :
 * une seule isActive=true PAR ÉCOLE). `schoolId` explicite prioritaire ;
 * sinon lu dans la session. Lève une erreur explicite si aucune configurée.
 */
export const getActiveSchoolYear = async (schoolId?: number) => {
  const effectiveSchoolId =
    schoolId ?? (await getSessionInfo())?.schoolId ?? -1;

  const activeYear = await prisma.schoolYear.findFirst({
    where: { isActive: true, schoolId: effectiveSchoolId },
  });

  if (!activeYear) {
    throw new Error("Aucune année scolaire active — configurez /settings");
  }

  return activeYear;
};
