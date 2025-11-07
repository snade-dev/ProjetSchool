import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin  } from "better-auth/plugins"
import prisma from "./prisma";
import { nextCookies } from "better-auth/next-js";
import { ac, admin, parent, student, teacher, user } from './permission';
 
export const auth = betterAuth({
    emailAndPassword: {  
        enabled: true
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


