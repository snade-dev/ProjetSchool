# Story 03 — Schéma Prisma Finance/RH + migration + seed

Écran : aucun · Dépend de : S01 · Branche : `story/03-finance-schema`

## Étapes

1. **Schéma** : copier depuis `plans/architecture.md §2.2` dans `prisma/schema.prisma` : enums `FeePeriod`, `InvoiceStatus`, `PaymentMethod`, `SalaryStatus` ; modèles `FeeStructure`, `Invoice`, `InvoiceLine`, `Payment`, `ExpenseCategory`, `Expense`, `Employee`, `SalaryPayment`. Compléter `SchoolYear` (relations) et ajouter les back-relations sur `Class` (`feeStructures FeeStructure[]`) et `Student` (`invoices Invoice[]`). NE PAS toucher `TuitionPayment` (migré en S07).
2. **Migration** : `pnpm prisma migrate dev --name finance_hr_models` puis `pnpm prisma generate`. Vérifier que le client est bien régénéré dans `src/app/generated/prisma` (convention du repo).
3. **Seed** (`prisma/seed.ts`, étendre en fin de fichier, tout en `upsert`) :
   - 4 `ExpenseCategory` : Fournitures, Électricité & eau, Loyer, Divers.
   - Pour chaque Class existante du seed : 2 `FeeStructure` (« Scolarité mensuelle » MONTHLY 25 000 ; « Inscription » ONE_TIME 50 000) rattachées à l'année active (`getActiveSchoolYear` → dans le seed, `findFirst isActive`).
   - 3 `Employee` : 2 liés aux 2 premiers Teachers du seed (`position: "Enseignant"`, baseSalary 150 000), 1 staff (« Secrétaire », 80 000). Upsert : pour ceux liés, viser `teacherId` (unique) ; pour le staff, utiliser un id fixe (`"emp-staff-1"`).
   - Quelques `Expense` de démonstration sur 3 mois différents (utile aux stats S16).
4. **Vérifications** : `pnpm prisma db seed` deux fois de suite → aucune erreur d'unicité ; `pnpm prisma studio` : tables remplies ; `pnpm build` vert (aucun code app ne référence encore ces modèles).

## Fichiers touchés
`prisma/schema.prisma`, `prisma/seed.ts`, migration générée.

## Échecs probables → parade
- **Relations manquantes** : Prisma exige la back-relation des deux côtés — si `migrate` râle « missing opposite relation field », ajouter le champ tableau côté Class/Student/SchoolYear.
- **Seed CommonJS** : le seed tourne via `ts-node --compiler-options {"module":"CommonJS"}` (package.json) — garder les imports du style existant du fichier, ne pas passer en ESM.
- **`createMany` + upsert impossible** : `createMany({skipDuplicates:true})` est acceptable pour les catégories/frais ; sinon boucle d'`upsert` sur la clé unique.
- **Année active absente** (seed lancé sur base vierge sans S01) : le seed doit créer SchoolSettings + SchoolYear AVANT le bloc finance (ordre dans le fichier).

## Done
Critères S03 de `stories.md` ; joindre à la PR la sortie de `prisma migrate status` et un screenshot Prisma Studio.

## Quand s'arrêter
Aucune UI, aucune action, aucun menu dans cette story. Si une contrainte du schéma cible semble fausse à l'exécution (ex. unique trop strict), l'assouplir A MINIMA, documenter l'écart dans `ledger.md`, continuer.
