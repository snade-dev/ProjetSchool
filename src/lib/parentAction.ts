"use server";

import { clerkClient } from '@clerk/nextjs/server';
import { ParentSchema } from './formsValidationSchema';
import prisma from './prisma';

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
        const client = await clerkClient();

        
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
          user = await client.users.createUser({
            username: data.username,
            emailAddress: [`${data.email}`],
            password: data.password,
            firstName: data.name,
            lastName: data.surname,
            publicMetadata: {role: "parent"}
          });

        } catch (clerkError) {
          console.warn(`L'un des utilisateurs existe déjà dans Clerk. Creation ignorée dans Clerk. ${clerkError}`);
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
      const client = await clerkClient();

      if (!data.id) {
        return {success: false, error: true, message: ""}
      }

      try {
        const user = await client.users.updateUser(data.id, {
          username: data.username,
          ...(data.password !== "" && {password: data.password}),
          firstName: data.name,
          lastName: data.surname,
          publicMetadata: {role: "Parent"}
        })
       } catch (clerkError) {
        console.warn(`Utilisateur avec l'id ${data.id} introuvable dans Clerk. Suppression ignorée dans Clerk.`);
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

      const client = await clerkClient();
      try {
        await client.users.deleteUser(id);
        await prisma.parent.delete({
          where: {
            id: id
          }
        });
    } catch (clerkError) {
        console.warn(`Utilisateur avec l'id ${id} introuvable dans Clerk. Suppression ignorée dans Clerk.`);
    }


        // revalidatePath("/list/Parent");
        return {success: true, error: false, message: ""};
    } catch (error) {
        console.log(error);
        return {success: false, error: true, message: ""};
    }
    
}
