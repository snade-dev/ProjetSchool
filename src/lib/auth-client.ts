import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"
import { ac, admin, parent, student, teacher, user } from './permission';
export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
    plugins: [
        adminClient({
            ac,
            roles: {
                admin,
                user,
                teacher,
                parent,
                student
            }
        })
    ]
})