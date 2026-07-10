# Story 10 — Employés (enseignants + staff)

Écran : E35 `/list/employees` · Dépend de : S03 · Branche : `story/10-employees`

## Étapes

1. **Zod** : `employeeSchema` : id optionnel, `teacherId` optionnel (string), name/surname min 2, position min 2, phone/email optionnels, `hireDate coerce.date`, `baseSalary int positive`, `active boolean default true`. Refine : si `teacherId` fourni, name/surname seront écrasés côté serveur par ceux du Teacher (source de vérité).
2. **Actions** : `src/lib/actions/employeeAction.ts` (`requireRole(["admin"])`) :
   - `createEmployee` : si teacherId → charger le Teacher, copier name/surname/email/phone ; catch P2002 sur teacherId (déjà employé).
   - `updateEmployee` (baseSalary, position, contacts, active) ; `deleteEmployee` : refuser si `salaries.length>0` → message « Désactivez plutôt cet employé » ; sinon delete.
   - `revalidatePath("/list/employees")`.
3. **Form** : `src/components/forms/EmployeeForm.tsx` : toggle « Lier à un enseignant » → select des teachers SANS Employee (relatedData : `prisma.teacher.findMany({where:{/* pas de relation inverse ? voir parade */}})`) ; champs verrouillés (disabled) quand lié. Enregistrer `"employee"` dans FormModal/FormContainer.
4. **Page** : `src/app/(dashboard)/list/employees/page.tsx` — pattern announcements : recherche nom, filtre actif/inactif, colonnes du brief E35 ; badge « Enseignant » = `Link` vers `/list/teachers/[teacherId]`.
5. **Accès & menu** : `"/list/employees": ["admin"]` ; item « Employés » (FINANCE, admin).
6. **Vérifs** : création liée (2e liaison au même teacher → erreur propre), création staff, désactivation, suppression bloquée si paie existante (testable après S11 — ici tester le chemin delete simple).

## Fichiers touchés
`prisma/schema.prisma` (ajouter la back-relation `employee Employee?` sur Teacher si absente + micro-migration), `src/lib/formsValidationSchema.ts`, `src/lib/actions/employeeAction.ts` (nouveau), `src/components/forms/EmployeeForm.tsx` (nouveau), `FormModal.tsx`, `FormContainer.tsx`, `src/app/(dashboard)/list/employees/page.tsx` (nouveau), `src/lib/setting.ts`, `src/components/Menu.tsx`.

## Échecs probables → parade
- **Teachers « sans Employee »** : nécessite la relation inverse `Teacher.employee Employee?` → si S03 ne l'a pas créée, l'ajouter ici (migration vide de données, sans risque) ; requête : `findMany({where:{employee: null}})`.
- **Select disabled non soumis** : les inputs `disabled` ne postent pas leur valeur — utiliser `readOnly` + style grisé, ou réinjecter les valeurs côté action (choisi : l'action copie depuis Teacher, donc peu importe).
- **E-mail dupliqué** entre staff et user : Employee.email n'est pas unique — OK, ne pas ajouter de contrainte.

## Done
Critères S10 de `stories.md` + capture avec un employé lié et un staff.

## Quand s'arrêter
Pas de contrats/documents RH, pas d'historique de salaire (le baseSalary courant suffit ; l'historique vit dans SalaryPayment.baseAmount), pas de comptes de connexion pour le staff (H18).
