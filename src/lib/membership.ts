import "server-only";
import prisma from "./prisma";

/**
 * W06 — Compte multi-établissements (§2.2.8, §2.7.10).
 *
 * La table UserSchoolMembership est la VÉRITÉ des rattachements d'un compte
 * (1 compte, N écoles/rôles) ; User.schoolId + User.role restent le CONTEXTE
 * ACTIF de la session, alimenté par le sélecteur d'espace. Le superadmin
 * (rôle global) n'a aucune membership.
 */

/**
 * Rôles d'espace disponibles. W07 ajoute les rôles PRÉDÉFINIS élargis
 * (§2.7.4, §2.7.6) : director (direction), accountant (comptable),
 * supervisor (surveillant général).
 */
export const SPACE_ROLES = [
  "admin",
  "director",
  "teacher",
  "accountant",
  "supervisor",
  "student",
  "parent",
] as const;

export const SPACE_ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  director: "Direction",
  teacher: "Enseignant",
  accountant: "Comptable",
  supervisor: "Surveillant général",
  student: "Élève",
  parent: "Parent",
};

export type SelectableMembership = {
  id: number;
  schoolId: number;
  role: string;
  schoolName: string;
};

/**
 * Memberships « sélectionnables » d'un compte : actives, dans une école
 * active, avec un rôle qui ouvre un espace. C'est la liste proposée par le
 * sélecteur d'espace (connexion + header).
 */
export async function getSelectableMemberships(
  userId: string
): Promise<SelectableMembership[]> {
  const memberships = await prisma.userSchoolMembership.findMany({
    where: {
      userId,
      active: true,
      role: { in: [...SPACE_ROLES] },
      school: { active: true },
    },
    include: { school: { select: { name: true } } },
    orderBy: [{ schoolId: "asc" }, { role: "asc" }],
  });
  return memberships.map((m) => ({
    id: m.id,
    schoolId: m.schoolId,
    role: m.role,
    schoolName: m.school.name,
  }));
}

/** Client Prisma OU client transactionnel ($transaction async). */
type PrismaLike = Pick<typeof prisma, "userSchoolMembership">;

/**
 * Crée (ou réactive) la membership d'un compte pour une école et un rôle.
 * Idempotente (@@unique([userId, schoolId, role])) — à appeler PARTOUT où un
 * User est rattaché à une école avec un rôle.
 */
export async function ensureMembership(
  userId: string,
  schoolId: number,
  role: string,
  client: PrismaLike = prisma
) {
  return client.userSchoolMembership.upsert({
    where: { userId_schoolId_role: { userId, schoolId, role } },
    update: { active: true },
    create: { userId, schoolId, role, active: true },
  });
}
