import "server-only";
import prisma from "./prisma";
import type { Prisma } from "@/app/generated/prisma";

/**
 * W03 — Enrollment : helpers centraux autour de l'inscription de l'année.
 *
 * `Student.classId` n'existe plus : la classe d'un élève est celle de son
 * inscription (Enrollment) sur l'année scolaire ACTIVE de son école.
 * Une Class appartenant à UNE année (W02), filtrer des élèves par `classId`
 * via `enrollments: { some: { classId } }` est déjà borné à cette année-là.
 */

/** Include Prisma réutilisable : l'inscription de l'année active de l'école. */
export const activeEnrollmentInclude = (schoolYearId: number) =>
  ({
    enrollments: {
      where: { schoolYearId },
      include: { class: { include: { level: true } } },
      take: 1,
    },
  }) satisfies Prisma.StudentInclude;

/** Classe portée par un include `activeEnrollmentInclude` (null si non inscrit). */
export const enrollmentClass = <
  T extends { enrollments: { class: C }[] },
  C,
>(
  student: T
): C | null => student.enrollments[0]?.class ?? null;

/**
 * Inscription active d'un élève : celle de l'année scolaire ACTIVE de SON
 * école. Retourne null si l'élève n'existe pas, si aucune année n'est active
 * ou s'il n'est pas (encore) inscrit sur cette année.
 */
export const currentEnrollment = async (studentId: string) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { schoolId: true },
  });
  if (!student) return null;

  const activeYear = await prisma.schoolYear.findFirst({
    where: { schoolId: student.schoolId, isActive: true },
    select: { id: true },
  });
  if (!activeYear) return null;

  return prisma.enrollment.findUnique({
    where: {
      studentId_schoolYearId: {
        studentId,
        schoolYearId: activeYear.id,
      },
    },
    include: { class: { include: { level: true } }, schoolYear: true },
  });
};

/** Classe actuelle d'un élève (inscription de l'année active), ou null. */
export const currentClass = async (studentId: string) => {
  const enrollment = await currentEnrollment(studentId);
  return enrollment?.class ?? null;
};

/**
 * Écrit/actualise l'inscription d'un élève pour l'année d'une classe.
 * Utilisée par la création/modification d'élève : le champ « classe » du
 * formulaire pilote l'Enrollment de l'année de la classe choisie.
 * `tx` permet de participer à une transaction existante.
 */
export const upsertEnrollment = async (
  studentId: string,
  classId: number,
  schoolYearId: number,
  tx: Prisma.TransactionClient = prisma
) =>
  tx.enrollment.upsert({
    where: { studentId_schoolYearId: { studentId, schoolYearId } },
    update: { classId, status: "ACTIVE" },
    create: { studentId, classId, schoolYearId, status: "ACTIVE" },
  });
