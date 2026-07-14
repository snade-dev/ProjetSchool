"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getSessionInfo } from "../authGuard";
import { SPACE_ROLES } from "../membership";

/**
 * W06 — Bascule d'espace (§2.7.10) : change le CONTEXTE ACTIF de la session
 * (User.schoolId + User.role) vers une membership du compte connecté.
 *
 * Sécurité : la membership doit appartenir AU COMPTE CONNECTÉ, être active,
 * porter un rôle d'espace connu et viser une école active. La session
 * better-auth n'a PAS de cookie cache (session.cookieCache non configuré) :
 * chaque auth.api.getSession relit le User en base, le nouveau contexte est
 * donc visible dès la requête suivante, sans reconnexion. L'enforcement
 * d'abonnement (layout dashboard → getSchoolAccessState) s'applique à la
 * nouvelle école active comme à n'importe quelle requête.
 *
 * Utilisable en action de formulaire (`switchSpace.bind(null, id)`) comme
 * depuis un composant client. Les redirect() restent hors du try/catch
 * (NEXT_REDIRECT).
 */
export async function switchSpace(membershipId: number, _formData?: FormData) {
  let targetRole: string | null = null;

  try {
    const info = await getSessionInfo();
    if (!info || info.role === "superadmin") {
      redirect("/sign-in");
    }

    const membership = await prisma.userSchoolMembership.findFirst({
      where: {
        id: membershipId,
        userId: info.userId, // jamais la membership d'un autre compte
        active: true,
        role: { in: [...SPACE_ROLES] },
      },
      include: { school: { select: { active: true } } },
    });

    if (membership && membership.school.active) {
      await prisma.user.update({
        where: { id: info.userId },
        data: { schoolId: membership.schoolId, role: membership.role },
      });
      targetRole = membership.role;
    }
  } catch (error) {
    // NEXT_REDIRECT doit remonter (redirect() lève volontairement)
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("switchSpace:", error);
  }

  if (!targetRole) {
    redirect("/select-space?error=espace-indisponible");
  }

  // Tout le layout (menu, navbar, cloisonnement) doit refléter le nouveau contexte.
  revalidatePath("/", "layout");
  redirect(`/${targetRole}`);
}
