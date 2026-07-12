import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin  } from "better-auth/plugins"
import prisma from "./prisma";
import { nextCookies } from "better-auth/next-js";
import { ac, admin, parent, student, teacher, user } from './permission';
 
export const auth = betterAuth({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
    trustedOrigins: [process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"],
    emailAndPassword: {
        enabled: true
    },
    // V02 — école de rattachement du compte (null = superadmin plateforme).
    // input:false : jamais accepté depuis un formulaire public, posé côté serveur.
    user: {
        additionalFields: {
            schoolId: {
                type: "number",
                required: false,
                input: false,
            },
        },
    },

    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
    plugins: [
        adminPlugin ({
            ac,
            roles: {
                admin,
                user,
                teacher,
                student,
                parent
            }

        }),
        nextCookies()
    ]
});


