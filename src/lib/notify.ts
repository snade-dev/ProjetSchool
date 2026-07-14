import "server-only";
import prisma from "./prisma";
import type { NotificationType } from "./notificationTypes";

/**
 * W12 — Helper d'émission des notifications in-app (§2.6.1).
 *
 * RÈGLE ABSOLUE (même pattern que audit.ts) : notifier ne fait JAMAIS échouer
 * l'action métier. Tout est enveloppé dans un try/catch interne
 * (console.error en cas d'échec) ; les appelants n'ont pas à se protéger.
 *
 * - Le destinataire est un COMPTE (User.id). Convention du repo : les entités
 *   métier Teacher/Student/Parent partagent l'id de leur User (authAdmin.ts),
 *   donc un studentId/parentId/teacherId EST un userId. Une entité seedée
 *   sans compte reçoit une ligne inerte (jamais affichée) — sans gravité.
 * - Préférences : NotificationPreference(userId, type, enabled=false) coupe
 *   le type ; ABSENCE de ligne = activé par défaut.
 * - Déduplication : un même userId ne reçoit qu'une fois la même notification
 *   au sein d'un appel (tuteur de plusieurs enfants concernés, cumul de rôles).
 * - Volume : tout part en UN createMany (annonce globale = un seul insert),
 *   jamais de boucle d'inserts.
 */

export type NotifyPayload = {
  schoolId: number;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
};

export type NotificationInput = NotifyPayload & { userId: string };

/**
 * Cœur : dédoublonne, retire les destinataires ayant désactivé le type,
 * puis écrit en UN createMany. Ne lève jamais ; retourne le nombre créé.
 * À utiliser directement quand le texte varie par destinataire (batch de
 * factures…) ; sinon passer par notify()/notifyGuardians().
 */
export async function createNotifications(
  rows: NotificationInput[]
): Promise<number> {
  try {
    // Dédup : un destinataire ne reçoit qu'une fois le même message.
    const seen = new Set<string>();
    const unique = rows.filter((r) => {
      const key = `${r.userId}|${r.type}|${r.title}|${r.body}|${r.link ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (unique.length === 0) return 0;

    // Préférences désactivées (absence de ligne = activé) — UNE requête.
    const userIds = [...new Set(unique.map((r) => r.userId))];
    const disabled = await prisma.notificationPreference.findMany({
      where: { userId: { in: userIds }, enabled: false },
      select: { userId: true, type: true },
    });
    const off = new Set(disabled.map((d) => `${d.userId}|${d.type}`));

    const data = unique
      .filter((r) => !off.has(`${r.userId}|${r.type}`))
      .map((r) => ({
        userId: r.userId,
        schoolId: r.schoolId,
        type: r.type,
        title: r.title,
        body: r.body,
        link: r.link ?? null,
      }));
    if (data.length === 0) return 0;

    const res = await prisma.notification.createMany({ data });
    return res.count;
  } catch (err) {
    console.error("[notify] échec d'écriture des notifications:", err);
    return 0;
  }
}

/**
 * `notify(userIds, { schoolId, type, title, body, link })` — même message
 * pour tous les destinataires. Ids null/undefined tolérés (filtrés), dédup
 * incluse. Ne lève jamais.
 */
export async function notify(
  userIds: (string | null | undefined)[],
  payload: NotifyPayload
): Promise<number> {
  const ids = userIds.filter((id): id is string => !!id);
  return createNotifications(ids.map((userId) => ({ userId, ...payload })));
}

/** Droit StudentGuardian utilisé pour filtrer les tuteurs destinataires. */
export type GuardianRight = "canPay" | "canViewGrades";

/**
 * Tuteurs (StudentGuardian, W05) des élèves donnés — dédupliqués (un tuteur
 * de plusieurs enfants concernés ne revient qu'une fois), filtrés par droit
 * éventuel (canViewGrades pour les notes/bulletins, canPay pour la finance).
 * Parent.id EST le User.id du compte parent. Ne lève jamais ([] en cas d'échec).
 */
export async function guardianUserIds(
  studentIds: string[],
  right?: GuardianRight
): Promise<string[]> {
  try {
    if (studentIds.length === 0) return [];
    const rows = await prisma.studentGuardian.findMany({
      where: {
        studentId: { in: [...new Set(studentIds)] },
        ...(right ? { [right]: true } : {}),
      },
      select: { parentId: true },
    });
    return [...new Set(rows.map((r) => r.parentId))];
  } catch (err) {
    console.error("[notify] résolution des tuteurs impossible:", err);
    return [];
  }
}

/**
 * Variante : notifie les TUTEURS des élèves donnés (même message pour tous).
 * `right` restreint aux tuteurs ayant le droit correspondant.
 */
export async function notifyGuardians(
  studentIds: string[],
  payload: NotifyPayload,
  right?: GuardianRight
): Promise<number> {
  return notify(await guardianUserIds(studentIds, right), payload);
}

/**
 * Audience d'une annonce / d'un événement (§2.6.1) :
 * - classe précisée → élèves inscrits de la classe + leurs tuteurs (tous
 *   droits) + le professeur principal (Class.supervisorId) ;
 * - pas de classe (annonce globale) → TOUS les comptes rattachés à l'école
 *   (memberships actives W06 — la vérité des rattachements).
 * Dédupliquée ; ne lève jamais ([] en cas d'échec).
 */
export async function announcementAudience(
  schoolId: number,
  classId: number | null | undefined
): Promise<string[]> {
  try {
    if (!classId) {
      const members = await prisma.userSchoolMembership.findMany({
        where: { schoolId, active: true },
        select: { userId: true },
      });
      return [...new Set(members.map((m) => m.userId))];
    }
    const klass = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        supervisorId: true,
        enrollments: { select: { studentId: true } },
      },
    });
    if (!klass) return [];
    const studentIds = klass.enrollments.map((e) => e.studentId);
    const guardians = await guardianUserIds(studentIds);
    return [
      ...new Set([
        ...studentIds,
        ...guardians,
        ...(klass.supervisorId ? [klass.supervisorId] : []),
      ]),
    ];
  } catch (err) {
    console.error("[notify] résolution de l'audience impossible:", err);
    return [];
  }
}
