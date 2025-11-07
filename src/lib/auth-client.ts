import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"
import { ac, admin, parent, student, teacher, user } from './permission';
export const authClient = createAuthClient({
    baseURL: "http://localhost:3000", // the base url of your auth server
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