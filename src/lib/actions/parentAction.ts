"use server";

import { authClient } from '../auth-client';
import { ParentSchema } from '../formsValidationSchema';
import prisma from '../prisma';


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
        // use better-auth admin client instead of Clerk
        const existingParent = await prisma.parent.findFirst({
          where: {
            OR: [
              { username: data.username},
              { phone: data.phone },
              { id: data.id },
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

        let user: any = {}

        try {
          // create user through better-auth admin API
          user = await authClient.admin.createUser({
            name: data.username,
            email: data.email ?? "",
            password: data.password ?? "<PASSWORD>",
            role: "parent",
            data: {
              firstName: data.name,
              lastName: data.surname,
            }
          });

        } catch (err) {
          console.warn(`Failed to create user via better-auth. ${err}`);
          return {success: false, error: true, message: "Le nom d'utilisateur existe déjà"};
        }

        
        await prisma.parent.create({
          data: {
            id: user.id,
            username: data.username,
            name: data.name,
            surname: data.surname,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address,
          }
        });

        

        // revalidatePath("/list/teache");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: `${error}`};
    }
    
}

export const updateParent = async (currentState: CurrentState2 ,data: ParentSchema) => {
    try {
      if (!data.id) {
        return {success: false, error: true, message: ""}
      }

      try {
        // Update password only via admin API if provided
        if (data.password && data.password !== "") {
          await (authClient.admin as any).setUserPassword({
            userId: data.id,
            newPassword: data.password
          });
        }
        // Note: Better Auth doesn't provide admin updateUser for name/email.
        // User table fields are managed via Prisma below.
       } catch (err) {
        console.warn(`Utilisateur avec l'id ${data.id} introuvable dans better-auth. Ignoré.`);
       }


      await prisma.parent.update({
        where: {
          id: data.id
        },
        data: {
          ...(data.password !== "" && {password: data.password}),
          username: data.username,
          name: data.name,
          surname: data.surname,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address,
        },
      });

        // revalidatePath("/list/Parent");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: `${error}`};
    }
    
}

export const deleteParent = async (currentState: CurrentState ,data: FormData) => {
    const id = data.get("id") as string;
    try {
      try {
        // authClient.admin typings may not expose deleteUser; cast to any to call runtime API.
        await (authClient.admin as any).deleteUser({ userId: id });
        await prisma.parent.delete({
          where: {
            id: id
          }
        });
    } catch (err) {
        console.warn(`Utilisateur avec l'id ${id} introuvable dans better-auth. Suppression ignorée.`);
    }


        // revalidatePath("/list/Parent");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: ""};
    }
    
}
