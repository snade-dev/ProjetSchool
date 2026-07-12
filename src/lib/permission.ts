import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";
 
/**
 * make sure to use `as const` so typescript can infer the type correctly
 */
const statement = { 
    ...defaultStatements,
    project: ["create", "share", "update", "delete"], 
} as const; 
 
export const ac = createAccessControl(statement);  

export const user = ac.newRole({ 
    project: ["create"], 
    ...userAc.statements
}); 
 
export const admin = ac.newRole({ 
    project: ["create", "update"], 
    ...adminAc.statements
}); 

// V04 — superadmin plateforme : mêmes pouvoirs better-auth que l'admin
// (création de comptes) + accès exclusif à /platform via routeAccessMap.
export const superadmin = ac.newRole({
    project: ["create", "share", "update", "delete"],
    ...adminAc.statements
});


export const teacher = ac.newRole({
     project: ["create", "update"]
});
export const parent = ac.newRole({
     project: ["create", "update"]
}); 
export const student = ac.newRole({
     project: ["create", "update"]
});
