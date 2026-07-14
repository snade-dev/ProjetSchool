/**
 * W07 — Tableau de bord de la DIRECTION (§2.7.4).
 * Même cockpit que l'admin (cartes de stats, présence du jour, finance en
 * lecture) : on RÉUTILISE la page admin telle quelle — zéro duplication de
 * logique. La différence de périmètre (pas de /settings, pas de gestion des
 * comptes, finance en lecture) est portée par routeAccessMap et les gardes
 * des server actions, pas par ce dashboard.
 */
export { default } from "../admin/page";
