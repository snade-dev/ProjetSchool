import "server-only";
import prisma from "./prisma";
import { isEmailCriticalType, type NotificationType } from "./notificationTypes";
import {
  appBaseUrl,
  escapeHtml,
  renderEmail,
  resolveEmailConfig,
  sendWithConfig,
  type EmailAttachment,
} from "./email";

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
  /**
   * W13 — pièces jointes de l'email doublant la notification (types critiques
   * uniquement, ex. reçu de paiement PDF). Ignoré pour le canal in-app.
   */
  emailAttachments?: EmailAttachment[];
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
    const res =
      data.length > 0 ? await prisma.notification.createMany({ data }) : { count: 0 };

    // W13 — canal email pour les types critiques (ABSENCE, REPORT_CARD,
    // PAYMENT). Best-effort ASYNCHRONE : promesse volontairement non awaitée
    // (l'action métier répond sans attendre le SMTP) ; tout est try/catché à
    // l'intérieur, un rejet est donc impossible — le .catch est une ceinture.
    // Le filtre email (NotificationPreference.emailEnabled) est INDÉPENDANT du
    // filtre in-app `enabled` : on repart des lignes dédupliquées `unique`.
    void dispatchCriticalEmails(unique).catch((err) =>
      console.error("[email] dispatch inattendu:", err)
    );

    return res.count;
  } catch (err) {
    console.error("[notify] échec d'écriture des notifications:", err);
    return 0;
  }
}

/**
 * W13 — double par email les notifications de types critiques.
 * Ne lève jamais ; chaque étape est best-effort :
 *  (a) le destinataire doit avoir un email sur son User ;
 *  (b) il ne doit pas avoir coupé le canal email pour ce type
 *      (NotificationPreference.emailEnabled=false ; absence de ligne = actif) ;
 *  (c) l'école doit avoir un canal email résolu (école → plateforme, sinon
 *      abandon silencieux loggé par resolveEmailConfig/sendEmail).
 */
async function dispatchCriticalEmails(rows: NotificationInput[]): Promise<void> {
  try {
    const critical = rows.filter((r) => isEmailCriticalType(r.type));
    if (critical.length === 0) return;

    const userIds = [...new Set(critical.map((r) => r.userId))];
    const [users, disabled] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      }),
      prisma.notificationPreference.findMany({
        where: { userId: { in: userIds }, emailEnabled: false },
        select: { userId: true, type: true },
      }),
    ]);
    const emailOf = new Map(users.map((u) => [u.id, u.email]));
    const off = new Set(disabled.map((d) => `${d.userId}|${d.type}`));

    // Une résolution de config par école concernée (généralement une seule).
    const schoolIds = [...new Set(critical.map((r) => r.schoolId))];
    const configs = new Map(
      await Promise.all(
        schoolIds.map(
          async (id) => [id, await resolveEmailConfig(id)] as const
        )
      )
    );

    for (const row of critical) {
      const config = configs.get(row.schoolId);
      if (!config) continue; // école sans canal email : in-app seulement
      const to = emailOf.get(row.userId);
      if (!to) continue; // compte sans adresse email
      if (off.has(`${row.userId}|${row.type}`)) continue; // canal email coupé

      const link = row.link ? `${appBaseUrl()}${row.link}` : null;
      const html = renderEmail(
        row.title,
        `<p>${escapeHtml(row.body)}</p>` +
          (link
            ? `<p><a href="${link}" style="display:inline-block;background:#C3EBFA;color:#111;padding:8px 16px;border-radius:6px;text-decoration:none">Ouvrir dans l'application</a></p>`
            : ""),
        { name: config.schoolName }
      );
      // Envois séquentiels (volumes modestes) ; sendWithConfig ne lève jamais
      // (échec = console.error + AuditLog email.fail).
      await sendWithConfig(row.schoolId, config, {
        to,
        subject: row.title,
        html,
        attachments: row.emailAttachments,
      });
    }
  } catch (err) {
    console.error("[email] envoi des notifications critiques impossible:", err);
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
