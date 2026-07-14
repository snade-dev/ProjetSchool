import "server-only";
import prisma from "./prisma";

/**
 * W16 — Messagerie interne 1-à-1 (§2.6.5) : règles de mise en relation
 * CODÉES EN DUR. Tout passe par `canMessage()` côté serveur — l'UI (sélecteur
 * de destinataires, zone d'envoi) ne fait que REFLÉTER ces règles, jamais les
 * porter.
 *
 * Matrice (V1, sans groupes ni vocal) :
 * - parent ↔ direction (admin + director de l'école) ;
 * - parent ↔ enseignant D'UN DE SES ENFANTS (Lesson de la classe d'un enfant,
 *   inscription de l'année active) ;
 * - enseignant ↔ direction ; enseignant ↔ enseignant (même école) ;
 * - direction ↔ tout membre du personnel (teacher, accountant, supervisor,
 *   autre admin/director — les employés « ayant un compte » ont une
 *   membership avec l'un de ces rôles) ;
 * - élève ↔ enseignant de SA classe, SEULEMENT si l'école l'a activé
 *   (School.studentMessagingEnabled, toggle /settings) ;
 * - INTERDIT : parent ↔ parent, élève ↔ élève, direction ↔ élève, tout
 *   inter-écoles (l'interlocuteur doit avoir une membership ACTIVE dans
 *   l'école de l'expéditeur — le superadmin, sans membership, est exclu).
 *
 * Le rattachement d'un compte à l'école est lu dans UserSchoolMembership
 * (vérité des rattachements, W06) — pas dans User.schoolId (simple contexte
 * actif de session, qui peut pointer une AUTRE école du même compte).
 */

export type MessagingUser = { id: string; role: string; schoolId: number };

/** La « direction » au sens du §2.6.5. */
export const DIRECTION_ROLES = ["admin", "director"] as const;

/** Le « personnel » joignable par la direction (rôles d'espace du personnel). */
export const STAFF_ROLES = [
  "admin",
  "director",
  "teacher",
  "accountant",
  "supervisor",
] as const;

/** Rôles qui ont accès à la messagerie (tous les rôles école — pas superadmin). */
export const MESSAGING_ROLES = [
  ...STAFF_ROLES,
  "student",
  "parent",
] as const;

export const isMessagingRole = (role: string): boolean =>
  (MESSAGING_ROLES as readonly string[]).includes(role);

/** Toggle école : messagerie élève↔enseignant (§2.6.5, désactivée par défaut). */
export async function studentMessagingEnabled(
  schoolId: number
): Promise<boolean> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { studentMessagingEnabled: true },
  });
  return school?.studentMessagingEnabled ?? false;
}

/** Rôles ACTIFS d'un compte dans UNE école (vide = pas membre → inter-écoles). */
async function schoolRolesOf(
  userId: string,
  schoolId: number
): Promise<Set<string>> {
  const memberships = await prisma.userSchoolMembership.findMany({
    where: { userId, schoolId, active: true },
    select: { role: true },
  });
  return new Set(memberships.map((m) => m.role));
}

/** Année scolaire ACTIVE de l'école (null si aucune). */
async function activeYearId(schoolId: number): Promise<number | null> {
  const year = await prisma.schoolYear.findFirst({
    where: { schoolId, isActive: true },
    select: { id: true },
  });
  return year?.id ?? null;
}

/** Classes (année active) des enfants d'un parent — via StudentGuardian + Enrollment. */
async function parentChildrenClassIds(
  parentId: string,
  schoolId: number
): Promise<number[]> {
  const yearId = await activeYearId(schoolId);
  if (!yearId) return [];
  const enrollments = await prisma.enrollment.findMany({
    where: {
      schoolYearId: yearId,
      student: {
        schoolId,
        guardians: { some: { parentId } },
      },
    },
    select: { classId: true },
  });
  return [...new Set(enrollments.map((e) => e.classId))];
}

/** Le teacher enseigne-t-il (Lesson) dans l'une de ces classes ? */
async function teacherInClasses(
  teacherId: string,
  classIds: number[]
): Promise<boolean> {
  if (classIds.length === 0) return false;
  const lesson = await prisma.lesson.findFirst({
    where: { teacherId, classId: { in: classIds } },
    select: { id: true },
  });
  return !!lesson;
}

/** Classe de l'élève sur l'année active de l'école (null si non inscrit). */
async function studentClassId(
  studentId: string,
  schoolId: number
): Promise<number | null> {
  const yearId = await activeYearId(schoolId);
  if (!yearId) return null;
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      schoolYearId: yearId,
      student: { schoolId },
    },
    select: { classId: true },
  });
  return enrollment?.classId ?? null;
}

/** parent ↔ enseignant : le teacher enseigne dans la classe d'UN enfant du parent. */
async function parentTeacherLinked(
  parentId: string,
  teacherId: string,
  schoolId: number
): Promise<boolean> {
  const classIds = await parentChildrenClassIds(parentId, schoolId);
  return teacherInClasses(teacherId, classIds);
}

/** élève ↔ enseignant : le teacher enseigne dans LA classe de l'élève. */
async function studentTeacherLinked(
  studentId: string,
  teacherId: string,
  schoolId: number
): Promise<boolean> {
  const classId = await studentClassId(studentId, schoolId);
  if (classId == null) return false;
  return teacherInClasses(teacherId, [classId]);
}

/**
 * LE helper central : `sender` (id + rôle ACTIF + école de session) peut-il
 * écrire à `receiverId` ? Toute vérification est côté serveur ; les pages et
 * actions DOIVENT passer par ici avant tout envoi (et avant d'ouvrir un
 * nouveau fil).
 */
export async function canMessage(
  sender: MessagingUser,
  receiverId: string
): Promise<boolean> {
  if (!receiverId || receiverId === sender.id) return false;
  if (!isMessagingRole(sender.role)) return false; // superadmin & co : exclus

  // Inter-écoles STRICTEMENT interdit : l'interlocuteur doit être membre
  // actif de l'école de l'expéditeur (le superadmin n'a aucune membership).
  const roles = await schoolRolesOf(receiverId, sender.schoolId);
  if (roles.size === 0) return false;

  const isDirection = roles.has("admin") || roles.has("director");
  const isStaff = (STAFF_ROLES as readonly string[]).some((r) => roles.has(r));

  switch (sender.role) {
    // direction ↔ tout membre du personnel + parent ↔ direction.
    // (élève : PAS dans la matrice §2.6.5 → refus.)
    case "admin":
    case "director":
      return isStaff || roles.has("parent");

    // enseignant ↔ direction / enseignant (même école) ; parent d'un de SES
    // élèves ; élève de SA classe si l'école a activé le toggle.
    case "teacher": {
      if (isDirection || roles.has("teacher")) return true;
      if (
        roles.has("parent") &&
        (await parentTeacherLinked(receiverId, sender.id, sender.schoolId))
      ) {
        return true;
      }
      if (
        roles.has("student") &&
        (await studentMessagingEnabled(sender.schoolId)) &&
        (await studentTeacherLinked(receiverId, sender.id, sender.schoolId))
      ) {
        return true;
      }
      return false;
    }

    // personnel non-enseignant (comptable, surveillant) ↔ direction seulement.
    case "accountant":
    case "supervisor":
      return isDirection;

    // parent ↔ direction ; parent ↔ enseignant d'un de ses enfants.
    // parent ↔ parent INTERDIT (même si l'autre compte cumule d'autres rôles
    // non joignables).
    case "parent": {
      if (isDirection) return true;
      if (roles.has("teacher")) {
        return parentTeacherLinked(sender.id, receiverId, sender.schoolId);
      }
      return false;
    }

    // élève ↔ enseignant de sa classe, si le toggle école est actif.
    // élève ↔ élève INTERDIT.
    case "student": {
      if (!roles.has("teacher")) return false;
      if (!(await studentMessagingEnabled(sender.schoolId))) return false;
      return studentTeacherLinked(sender.id, receiverId, sender.schoolId);
    }

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Sélecteur de destinataires (« Nouveau message ») : liste AUTORISÉE construite
// server-side selon les mêmes règles — miroir de canMessage, en requêtes
// groupées (jamais un canMessage par candidat).
// ---------------------------------------------------------------------------

export type Correspondent = {
  id: string;
  name: string;
  /** Rôle affiché (libellé du rattachement qui justifie la mise en relation). */
  role: string;
};

/** Comptes membres de l'école ayant l'un de ces rôles (dédupliqués). */
async function membersWithRoles(
  schoolId: number,
  rolesWanted: readonly string[],
  excludeUserId: string
): Promise<Map<string, string>> {
  const memberships = await prisma.userSchoolMembership.findMany({
    where: {
      schoolId,
      active: true,
      role: { in: [...rolesWanted] },
      userId: { not: excludeUserId },
    },
    select: { userId: true, role: true },
  });
  // Un compte multi-rôles apparaît UNE fois, avec son rôle le plus « fort »
  // (ordre de rolesWanted).
  const byUser = new Map<string, string>();
  for (const role of rolesWanted) {
    for (const m of memberships) {
      if (m.role === role && !byUser.has(m.userId)) byUser.set(m.userId, role);
    }
  }
  return byUser;
}

/** Résout les noms des comptes et assemble la liste triée par rôle puis nom. */
async function toCorrespondents(
  byUser: Map<string, string>
): Promise<Correspondent[]> {
  if (byUser.size === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: [...byUser.keys()] } },
    select: { id: true, name: true },
  });
  const order = [...MESSAGING_ROLES] as string[];
  return users
    .map((u) => ({ id: u.id, name: u.name, role: byUser.get(u.id)! }))
    .sort(
      (a, b) =>
        order.indexOf(a.role) - order.indexOf(b.role) ||
        a.name.localeCompare(b.name, "fr")
    );
}

/**
 * Destinataires AUTORISÉS pour `sender` (bouton « Nouveau message ») :
 * - direction → personnel + parents de l'école ;
 * - enseignant → direction + collègues + parents de ses élèves (+ ses élèves
 *   si le toggle école est actif) ;
 * - comptable / surveillant → direction ;
 * - parent → direction + enseignants de ses enfants ;
 * - élève → enseignants de sa classe (si toggle), sinon rien.
 */
export async function allowedCorrespondents(
  sender: MessagingUser
): Promise<Correspondent[]> {
  const { id, role, schoolId } = sender;

  if (role === "admin" || role === "director") {
    return toCorrespondents(
      await membersWithRoles(schoolId, [...STAFF_ROLES, "parent"], id)
    );
  }

  if (role === "accountant" || role === "supervisor") {
    return toCorrespondents(await membersWithRoles(schoolId, DIRECTION_ROLES, id));
  }

  if (role === "teacher") {
    const byUser = await membersWithRoles(
      schoolId,
      [...DIRECTION_ROLES, "teacher"],
      id
    );

    // Les classes où il enseigne → élèves inscrits (année active) → tuteurs.
    const yearId = await activeYearId(schoolId);
    if (yearId) {
      const lessons = await prisma.lesson.findMany({
        where: { teacherId: id, class: { schoolId } },
        select: { classId: true },
      });
      const classIds = [...new Set(lessons.map((l) => l.classId))];
      if (classIds.length > 0) {
        const enrollments = await prisma.enrollment.findMany({
          where: { classId: { in: classIds }, schoolYearId: yearId },
          select: {
            studentId: true,
            student: { select: { guardians: { select: { parentId: true } } } },
          },
        });
        for (const e of enrollments) {
          for (const g of e.student.guardians) {
            if (g.parentId !== id && !byUser.has(g.parentId)) {
              byUser.set(g.parentId, "parent");
            }
          }
        }
        if (await studentMessagingEnabled(schoolId)) {
          for (const e of enrollments) {
            if (!byUser.has(e.studentId)) byUser.set(e.studentId, "student");
          }
        }
      }
    }
    return toCorrespondents(byUser);
  }

  if (role === "parent") {
    const byUser = await membersWithRoles(schoolId, DIRECTION_ROLES, id);
    const classIds = await parentChildrenClassIds(id, schoolId);
    if (classIds.length > 0) {
      const lessons = await prisma.lesson.findMany({
        where: { classId: { in: classIds } },
        select: { teacherId: true },
      });
      for (const l of lessons) {
        if (l.teacherId !== id && !byUser.has(l.teacherId)) {
          byUser.set(l.teacherId, "teacher");
        }
      }
    }
    return toCorrespondents(byUser);
  }

  if (role === "student") {
    if (!(await studentMessagingEnabled(schoolId))) return [];
    const classId = await studentClassId(id, schoolId);
    if (classId == null) return [];
    const lessons = await prisma.lesson.findMany({
      where: { classId },
      select: { teacherId: true },
    });
    const byUser = new Map<string, string>();
    for (const l of lessons) {
      if (l.teacherId !== id) byUser.set(l.teacherId, "teacher");
    }
    return toCorrespondents(byUser);
  }

  return [];
}

// ---------------------------------------------------------------------------
// Fils de discussion
// ---------------------------------------------------------------------------

export type ThreadSummary = {
  otherId: string;
  lastContent: string;
  lastAt: Date;
  lastFromMe: boolean;
  unread: number;
};

/**
 * Boîte de réception : un fil par correspondant, trié par dernier échange,
 * avec compteur de non-lus. Réduction en mémoire sur les messages du compte
 * (volumes V1 modestes ; les index couvrent les deux sens).
 */
export async function threadsFor(userId: string): Promise<ThreadSummary[]> {
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: "desc" },
    select: {
      senderId: true,
      receiverId: true,
      content: true,
      createdAt: true,
      readAt: true,
    },
  });

  const threads = new Map<string, ThreadSummary>();
  for (const m of messages) {
    const fromMe = m.senderId === userId;
    const otherId = fromMe ? m.receiverId : m.senderId;
    let t = threads.get(otherId);
    if (!t) {
      // messages triés desc → le premier rencontré est le dernier échange
      t = {
        otherId,
        lastContent: m.content,
        lastAt: m.createdAt,
        lastFromMe: fromMe,
        unread: 0,
      };
      threads.set(otherId, t);
    }
    if (!fromMe && m.readAt === null) t.unread += 1;
  }
  return [...threads.values()];
}

/**
 * Marquage lu automatique à l'ouverture du fil : tous les messages reçus de
 * `otherId` non lus. Retourne le nombre marqué.
 */
export async function markThreadRead(
  meId: string,
  otherId: string
): Promise<number> {
  const res = await prisma.message.updateMany({
    where: { senderId: otherId, receiverId: meId, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}
