import "server-only";
import { headers } from "next/headers";
import prisma from "./prisma";
import { getSessionInfo } from "./authGuard";
import type { Prisma } from "@/app/generated/prisma";

/**
 * W10 — Journal d'audit append-only (§2.11).
 *
 * Le journal n'expose QUE la création : aucune fonction d'update/delete
 * n'existe (et ne doit exister) sur AuditLog — cf. commentaire du schéma.
 *
 * RÈGLE ABSOLUE : l'audit ne fait JAMAIS échouer l'action métier. Tout est
 * enveloppé dans un try/catch interne (console.error en cas d'échec) ; les
 * appelants n'ont pas à se protéger.
 *
 * before/after : passer UNIQUEMENT les champs pertinents (de préférence les
 * champs modifiés) — jamais l'objet Prisma complet. `auditDiff()` aide à
 * construire ce couple compact.
 */

export type AuditSession = {
  userId: string | null;
  role: string | null;
  schoolId: number | null;
};

export type AuditOptions = {
  /** Ancienne valeur — champs pertinents seulement. */
  before?: unknown;
  /** Nouvelle valeur — champs pertinents seulement. */
  after?: unknown;
  /** Motif (obligatoire pour certaines actions sensibles, §2.11.3). */
  reason?: string | null;
  /**
   * École CIBLE de l'action quand elle diffère de celle de la session —
   * indispensable pour les actions plateforme (superadmin : schoolId null en
   * session) qui touchent une école : §2.11.5, l'accès plateforme aux données
   * d'une école est journalisé avec le schoolId de l'école concernée.
   */
  schoolId?: number | null;
};

/** IP du client (best effort — null hors requête ou sans proxy). */
async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}

/** JSON Prisma : undefined → colonne NULL (jamais d'objet volumineux). */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  // Sérialisation/désérialisation : normalise Dates/BigInt et coupe toute
  // référence circulaire éventuelle avant l'écriture JSONB.
  try {
    return JSON.parse(
      JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
    ) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

/**
 * Écrit une entrée d'audit avec une session DÉJÀ chargée (transactions,
 * actions qui ont déjà fait requireSchool/requireRole).
 * Ne lève jamais : échec → console.error.
 */
export async function auditWithSession(
  session: AuditSession | null,
  action: string,
  entity: string,
  { before, after, reason, schoolId }: AuditOptions = {}
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: session?.userId ?? null,
        role: session?.role ?? null,
        // école cible explicite (actions plateforme) sinon école de la session
        schoolId: schoolId !== undefined ? schoolId : session?.schoolId ?? null,
        action,
        entity,
        before: toJson(before),
        after: toJson(after),
        reason: reason?.trim() ? reason.trim() : null,
        ip: await clientIp(),
      },
    });
  } catch (err) {
    console.error(`[audit] échec d'écriture ${action} ${entity}:`, err);
  }
}

/**
 * Écrit une entrée d'audit en lisant la session courante toute seule.
 * `audit(action, entity, { before, after, reason })` — signature du plan §6.
 * Ne lève jamais : sans session lisible, l'entrée est écrite anonyme (null).
 */
export async function audit(
  action: string,
  entity: string,
  options: AuditOptions = {}
): Promise<void> {
  let session: AuditSession | null = null;
  try {
    session = (await getSessionInfo()) ?? null;
  } catch {
    session = null;
  }
  await auditWithSession(session, action, entity, options);
}

/**
 * Construit un couple before/after COMPACT limité aux champs réellement
 * modifiés. `changed` = false si rien ne diffère (l'appelant peut alors
 * s'abstenir de journaliser).
 */
export function auditDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  changed: boolean;
} {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    const normalize = (v: unknown) =>
      JSON.stringify(v instanceof Date ? v.toISOString() : v ?? null);
    if (normalize(before[key]) !== normalize(after[key])) {
      b[key] = before[key] instanceof Date ? (before[key] as Date).toISOString() : before[key] ?? null;
      a[key] = after[key] instanceof Date ? (after[key] as Date).toISOString() : after[key] ?? null;
    }
  }
  return { before: b, after: a, changed: Object.keys(a).length > 0 };
}
