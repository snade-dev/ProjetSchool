# Story 09 — Dépenses & catégories

Écran : E34 `/list/expenses` · Dépend de : S03 · Branche : `story/09-expenses`

## Étapes

1. **Zod** : `expenseSchema` (label min 2, amount int positive, date coerce.date, categoryId coerce.number, supplier/notes/receiptImg optionnels, method enum) ; `expenseCategorySchema` (name min 2).
2. **Actions** : `src/lib/actions/expenseAction.ts` — CRUD Expense + CRUD ExpenseCategory, tous `requireRole(["admin"])`, année active auto à la création, `revalidatePath("/list/expenses")`. `deleteCategory` : catch P2003 (FK) → error avec message « Catégorie utilisée par des dépenses ».
3. **Form dépense** : `src/components/forms/ExpenseForm.tsx` — 2 colonnes ; upload justificatif : copier EXACTEMENT le bloc `CldUploadWidget` de `TeacherForms.tsx` (même preset Cloudinary), stocker `secure_url` dans `receiptImg`. Enregistrer `"expense"` (FormModal + FormContainer, relatedData : categories).
4. **Gestion catégories** : composant client `list/expenses/components/CategoryManager.tsx` — lien discret ouvrant un modal (liste + input d'ajout + suppression), branché sur les actions catégorie.
5. **Page** : `src/app/(dashboard)/list/expenses/page.tsx` — pattern announcements : filtres `month` (select 12 mois + année), `categoryId`, recherche sur label/supplier ; `$transaction([findMany include category, count])` + `aggregate({_sum:{amount}})` de la période pour la stat-tile « Total de la période ». Colonne justificatif : miniature `<Image>` cliquable (ouvre l'URL Cloudinary) ou « — ».
6. **Accès & menu** : `"/list/expenses": ["admin"]` ; item « Dépenses » (FINANCE, admin).
7. **Vérifs** : CRUD complet, upload visible, filtre mois exact, total exact, suppression catégorie utilisée bloquée proprement.

## Fichiers touchés
`src/lib/formsValidationSchema.ts`, `src/lib/actions/expenseAction.ts` (nouveau), `src/components/forms/ExpenseForm.tsx` (nouveau), `src/components/FormModal.tsx`, `FormContainer.tsx`, `src/app/(dashboard)/list/expenses/page.tsx` + `components/CategoryManager.tsx` (nouveaux), `src/lib/setting.ts`, `src/components/Menu.tsx`.

## Échecs probables → parade
- **Cloudinary domain non autorisé** pour `<Image>` : vérifier `next.config` (`images.remotePatterns`) — déjà configuré pour les photos profs ; sinon l'ajouter.
- **Filtre mois** : construire `gte: new Date(y, m-1, 1)` / `lt: new Date(y, m, 1)` — pas de comparaison de strings.
- **Preset Cloudinary absent en env** : l'upload échoue silencieusement → afficher le nom du preset utilisé par TeacherForms et réutiliser le même ; noter dans ledger si variable manquante.

## Done
Critères S09 de `stories.md` + capture liste remplie avec justificatif.

## Quand s'arrêter
Pas de budget prévisionnel, pas de validation multi-niveaux, pas d'export (S18).
