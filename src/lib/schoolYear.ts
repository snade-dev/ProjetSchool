import prisma from "./prisma";

/**
 * Retourne l'année scolaire active (invariant : une seule isActive=true).
 * Lève une erreur explicite si aucune n'est configurée.
 */
export const getActiveSchoolYear = async () => {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
  });

  if (!activeYear) {
    throw new Error("Aucune année scolaire active — configurez /settings");
  }

  return activeYear;
};
