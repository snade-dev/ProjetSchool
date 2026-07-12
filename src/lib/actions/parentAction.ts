"use server";

import { ParentSchema } from '../formsValidationSchema';
import prisma from '../prisma';
import { requireRole, requireSchool } from "../authGuard";
import { createAuthUser, removeAuthUser, setAuthUserPassword } from '../authAdmin';
import { revalidatePath } from 'next/cache';


type CurrentState = {
    success: boolean,
    error: boolean,
}

type CurrentState2 = {
    success: boolean,
    error: boolean,
    message: string
}

// Parent
export const createParent = async (currentState: CurrentState2 ,data: ParentSchema) => {

    try {
        await requireRole(["admin"]);

        // L'e-mail est l'identifiant de connexion et le mot de passe est
        // nécessaire à la création du compte (S19 : plus de défaut littéral).
        if (!data.email) {
          return { success: false, error: true, message: "L'adresse e-mail est requise (identifiant de connexion)." };
        }
        if (!data.password || data.password.length < 8) {
          return { success: false, error: true, message: "Le mot de passe est requis (8 caractères minimum)." };
        }

        const existingParent = await prisma.parent.findFirst({
          where: {
            OR: [
              { username: data.username},
              { phone: data.phone },
              { email: data.email }
            ]
          }
        });

        // Déterminer le champ dupliqué pour un message d'erreur spécifique
    if (existingParent) {
      if (existingParent.phone === data.phone) {
        return { success: false, error: true, message: "Le numéro de téléphone existe déjà." };
      }
      if (existingParent.email === data.email) {
        return { success: false, error: true, message: "L'adresse e-mail existe déjà." };
      }
      if (existingParent.username === data.username) {
        return { success: false, error: true, message: "L'identifiant existe déjà." };
      }
    }

        let userId: string;
        try {
          userId = await createAuthUser({
            email: data.email,
            password: data.password,
            name: data.username,
            role: "parent",
          });
        } catch (err: any) {
          return { success: false, error: true, message: err.message };
        }

        try {
          const { schoolId } = await requireSchool(["admin"]); // V03
          await prisma.parent.create({
            data: {
              schoolId,
              id: userId,
              username: data.username,
              name: data.name,
              surname: data.surname,
              email: data.email || null,
              phone: data.phone || null,
              address: data.address,
            }
          });
        } catch (err) {
          // compensation : ne pas laisser un compte de connexion orphelin
          await removeAuthUser(userId);
          throw err;
        }

        revalidatePath("/list/parents");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: `${error}`};
    }

}

export const updateParent = async (currentState: CurrentState2 ,data: ParentSchema) => {
    try {
      await requireRole(["admin"]);
      // V03 — le parent doit appartenir à l'école de la session
      const { schoolId: sidP } = await requireSchool(["admin"]);
      const ownedP = await prisma.parent.findFirst({
        where: { id: data.id, schoolId: sidP }, select: { id: true },
      });
      if (!ownedP) return { success: false, error: true, message: "Parent introuvable dans votre établissement." };
      if (!data.id) {
        return {success: false, error: true, message: ""}
      }

      // Compte de connexion : nom/email dans User, mot de passe via l'API
      // admin. Toléré si le parent (seedé) n'a pas de compte.
      try {
        await prisma.user.update({
          where: { id: data.id },
          data: {
            name: data.username,
            ...(data.email && { email: data.email }),
          },
        });
        if (data.password && data.password !== "") {
          await setAuthUserPassword(data.id, data.password);
        }
      } catch (err) {
        console.warn(`Compte better-auth ${data.id} non mis à jour (probablement inexistant) : ${err}`);
      }

      await prisma.parent.update({
        where: {
          id: data.id
        },
        data: {
          // le modèle Parent n'a PAS de colonne password
          // (mot de passe géré par better-auth ci-dessus).
          username: data.username,
          name: data.name,
          surname: data.surname,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address,
        },
      });

        revalidatePath("/list/parents");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: `${error}`};
    }

}

export const deleteParent = async (currentState: CurrentState ,data: FormData) => {
    const id = data.get("id") as string;
    try {
      await requireRole(["admin"]);
      // V03 — cloisonnement
      const { schoolId: sidPD } = await requireSchool(["admin"]);
      const ownedPD = await prisma.parent.findFirst({
        where: { id, schoolId: sidPD }, select: { id: true },
      });
      if (!ownedPD) return { success: false, error: true };

      // Les élèves du parent sont supprimés en cascade (schema) : retenir
      // leurs ids pour supprimer aussi leurs comptes de connexion.
      const students = await prisma.student.findMany({
        where: { parentId: id },
        select: { id: true },
      });

      // Prisma d'abord : si la suppression échoue (contrainte FK…), on ne
      // touche à aucun compte et on remonte une vraie erreur (S19).
      await prisma.parent.delete({
        where: { id },
      });

      await removeAuthUser(id);
      for (const s of students) {
        await removeAuthUser(s.id);
      }

        revalidatePath("/list/parents");
        return {success: true, error: false, message: ""};
    } catch (error: any) {
        console.log(error);
        const message =
          error?.code === "P2003"
            ? "Impossible : des données (quiz, réponses…) référencent encore ce parent ou ses enfants."
            : `${error?.message ?? error}`;
        return {success: false, error: true, message};
    }

}
