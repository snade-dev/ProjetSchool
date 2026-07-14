/**
 * W12 — Types de notifications in-app (§2.6.1).
 *
 * Module PARTAGÉ client/serveur (pas de "server-only") : les libellés FR
 * servent aussi bien aux server components (page /list/notifications) qu'aux
 * client components (préférences dans /account, cloche de la navbar).
 *
 * HOMEWORK et MESSAGE sont déjà déclarés pour les stories W14 (devoirs) et
 * W16 (messagerie) : leurs actions appelleront notify() avec ces types.
 */

export const NOTIFICATION_TYPES = [
  "ABSENCE",
  "GRADE",
  "REPORT_CARD",
  "PAYMENT",
  "ANNOUNCEMENT",
  "HOMEWORK",
  "MESSAGE",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Libellés FR des types (filtres, badges, préférences). */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  ABSENCE: "Absences",
  GRADE: "Notes",
  REPORT_CARD: "Bulletins",
  PAYMENT: "Paiements & factures",
  ANNOUNCEMENT: "Annonces & événements",
  HOMEWORK: "Devoirs",
  MESSAGE: "Messages",
};

/** Description courte affichée sous chaque toggle de préférence. */
export const NOTIFICATION_TYPE_HINTS: Record<NotificationType, string> = {
  ABSENCE: "Quand un de vos enfants est noté absent à l'appel.",
  GRADE: "Quand des notes sont saisies ou modifiées.",
  REPORT_CARD: "Quand un bulletin est disponible ou régénéré.",
  PAYMENT: "Nouvelles factures et paiements reçus.",
  ANNOUNCEMENT: "Annonces et événements de l'école ou de la classe.",
  HOMEWORK: "Nouveaux devoirs à faire.",
  MESSAGE: "Nouveaux messages internes.",
};

export const isNotificationType = (v: string): v is NotificationType =>
  (NOTIFICATION_TYPES as readonly string[]).includes(v);

/**
 * W13 — types CRITIQUES doublés par email (§2.6.3, allégé) : seuls ces types
 * déclenchent un envoi SMTP (si l'école a un canal email résolu) ; les autres
 * restent in-app uniquement. Sert aussi à n'afficher le toggle « Email » de
 * /account que sur ces types.
 */
export const EMAIL_CRITICAL_TYPES = [
  "ABSENCE",
  "REPORT_CARD",
  "PAYMENT",
] as const satisfies readonly NotificationType[];

export const isEmailCriticalType = (
  v: string
): v is (typeof EMAIL_CRITICAL_TYPES)[number] =>
  (EMAIL_CRITICAL_TYPES as readonly string[]).includes(v);

/** Rétention (§ W12) : les notifications lues de plus de 90 jours sont purgées. */
export const NOTIFICATION_RETENTION_DAYS = 90;
