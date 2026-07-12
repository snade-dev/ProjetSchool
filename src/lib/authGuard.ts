import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";

export async function getSessionInfo() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return {
    userId: session.user.id,
    role: session.user.role ?? "guest",
    // V02 — école de rattachement (additionalField better-auth ; null = superadmin)
    schoolId: (session.user as { schoolId?: number | null }).schoolId ?? null,
  };
}

export async function requireRole(roles: string[]) {
  const info = await getSessionInfo();
  if (!info || !roles.includes(info.role)) throw new Error("FORBIDDEN");
  return info;
}

/**
 * V02 — garde multi-établissements : session + rôle + école obligatoire.
 * À utiliser par toutes les listes/actions scopées (V03) ; le superadmin
 * (schoolId null) n'a PAS accès aux écrans d'école, il a son espace /platform.
 */
export async function requireSchool(roles?: string[]) {
  const info = await getSessionInfo();
  if (!info || (roles && !roles.includes(info.role))) throw new Error("FORBIDDEN");
  if (info.schoolId == null) throw new Error("NO_SCHOOL");
  return { ...info, schoolId: info.schoolId };
}
