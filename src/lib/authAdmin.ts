import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";

// S19 — Wrappers admin better-auth côté SERVEUR.
// Les server actions utilisaient authClient (SDK navigateur) : ses fetchs
// partaient sans cookie de session (401) et ses méthodes retournent
// {data, error} sans lever d'exception — le code lisait user.id (undefined)
// et les catch avalaient tout. Ici : auth.api + session de la requête,
// et les erreurs remontent avec un message exploitable.

export type AuthRole = "admin" | "teacher" | "student" | "parent" | "user";

function extractMessage(err: any): string {
  return `${err?.body?.message ?? err?.message ?? err}`;
}

/** Crée un compte de connexion et retourne son id. Lève une Error(message FR) sinon. */
export async function createAuthUser(input: {
  email: string;
  password: string;
  name: string;
  role: AuthRole;
}): Promise<string> {
  try {
    const res = await auth.api.createUser({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
        role: input.role as any,
      },
      headers: await headers(),
    });
    // V02 — le compte créé hérite de l'école de l'admin qui le crée
    // (additionalField input:false → à poser côté serveur).
    const creator = await auth.api.getSession({ headers: await headers() });
    const creatorSchoolId = (creator?.user as { schoolId?: number | null })
      ?.schoolId;
    if (creatorSchoolId != null) {
      const { default: prisma } = await import("./prisma");
      const { ensureMembership } = await import("./membership");
      await prisma.user.update({
        where: { id: res.user.id },
        data: { schoolId: creatorSchoolId },
      });
      // W06 — la vérité des rattachements : membership école+rôle du compte
      await ensureMembership(res.user.id, creatorSchoolId, input.role);
    }
    return res.user.id;
  } catch (err: any) {
    const msg = extractMessage(err);
    if (/already exists|existing email/i.test(msg)) {
      throw new Error("Un compte existe déjà avec cette adresse e-mail.");
    }
    if (/password/i.test(msg)) {
      throw new Error("Mot de passe refusé : 8 caractères minimum.");
    }
    console.error("createAuthUser:", msg);
    throw new Error(`Création du compte impossible : ${msg}`);
  }
}

/** Change le mot de passe d'un compte (session admin requise). */
export async function setAuthUserPassword(userId: string, newPassword: string) {
  await auth.api.setUserPassword({
    body: { userId, newPassword },
    headers: await headers(),
  });
}

/**
 * Supprime un compte de connexion. Tolère uniquement « introuvable »
 * (entités seedées sans compte User) ; toute autre erreur remonte.
 */
export async function removeAuthUser(userId: string) {
  try {
    await auth.api.removeUser({
      body: { userId },
      headers: await headers(),
    });
  } catch (err: any) {
    const msg = extractMessage(err);
    if (/not found|introuvable|does not exist/i.test(msg)) {
      console.warn(`Compte better-auth ${userId} introuvable — suppression du compte ignorée.`);
      return;
    }
    throw err;
  }
}
