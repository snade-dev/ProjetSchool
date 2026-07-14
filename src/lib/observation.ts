/**
 * W15 — Observations & discipline (§2.3.7) : constantes PARTAGÉES
 * client/serveur (pas de "server-only" : utilisées par les pages liste,
 * les formulaires client, la fiche élève et le bulletin PDF).
 *
 * `Observation.kind` est une String libre en base ; ses valeurs vivent ICI
 * (même convention que Notification.type / notificationTypes.ts).
 */

export const OBSERVATION_KINDS = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

export type ObservationKind = (typeof OBSERVATION_KINDS)[number];

export const isObservationKind = (v: string): v is ObservationKind =>
  (OBSERVATION_KINDS as readonly string[]).includes(v);

/** Libellés FR (filtres, badges, bulletin). */
export const OBSERVATION_KIND_LABELS: Record<ObservationKind, string> = {
  POSITIVE: "Positive",
  NEUTRAL: "Neutre",
  NEGATIVE: "Négative",
};

/** Classes Tailwind du badge de type. */
export const OBSERVATION_KIND_BADGES: Record<ObservationKind, string> = {
  POSITIVE: "bg-green-100 text-green-700",
  NEUTRAL: "bg-gray-100 text-gray-600",
  NEGATIVE: "bg-red-100 text-red-700",
};

/** Libellé sûr pour une valeur venue de la base. */
export const observationKindLabel = (kind: string): string =>
  isObservationKind(kind) ? OBSERVATION_KIND_LABELS[kind] : kind;

export const observationKindBadge = (kind: string): string =>
  isObservationKind(kind)
    ? OBSERVATION_KIND_BADGES[kind]
    : OBSERVATION_KIND_BADGES.NEUTRAL;

/** Nombre max d'observations partagées reprises sur le bulletin (§2.3.7). */
export const REPORT_CARD_OBSERVATION_LIMIT = 3;

/**
 * W15 — statuts d'une justification d'absence (§2.3.6). L'enum RequestStatus
 * existante est réutilisée : PENDING (déposée), COMPLETED (acceptée),
 * REJECTED (refusée) — PROCESSING n'est pas utilisé par ce flux.
 */
export const JUSTIFICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PROCESSING: "En traitement",
  COMPLETED: "Acceptée",
  REJECTED: "Refusée",
};

export const JUSTIFICATION_STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};
