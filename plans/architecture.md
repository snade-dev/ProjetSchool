# ARCHITECTURE — SaaS de gestion scolaire (v2 : Finance + Stats)

> Ce document est la source de vérité. L'exécutant (Opus) NE remet PAS en cause ces choix.
> Le projet EXISTE déjà (branche `pre-next16-upgrade`). On ÉTEND, on ne réécrit pas.
> Toute info manquante → hypothèse dans `plans/ledger.md`, et on continue.

## 0. Stack (imposée — c'est celle du boilerplate)

| Couche | Choix | Déjà en place |
|---|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) | ✅ |
| UI | React 19 + Tailwind CSS 3 (couleurs custom `lamaSky`, `lamaPurple`, `lamaYellow` + variantes `Light`) | ✅ |
| ORM / DB | Prisma 6 → PostgreSQL. Client généré dans `src/app/generated/prisma` | ✅ |
| Auth | better-auth (email/password + plugin admin), rôle dans `session.user.role` | ✅ |
| Validation | zod (`src/lib/formsValidationSchema.ts`) + react-hook-form + @hookform/resolvers | ✅ |
| Charts | recharts | ✅ |
| PDF | @react-pdf/renderer (`BulletinPDF.tsx`, `ReceipPdf.tsx` comme modèles) | ✅ |
| Upload images | next-cloudinary | ✅ |
| Toasts | react-toastify | ✅ |
| Package manager | pnpm | ✅ |

**Monnaie** : FCFA — tous les NOUVEAUX champs monétaires sont des `Int` (pas de centimes en FCFA). Les champs `Float` existants (`TuitionPayment.amount`) sont migrés (voir story-03).

## 1. Modules applicatifs (niveau domaine)

```
┌────────────────────────────────────────────────────────────┐
│ M1. SCOLARITÉ (existant, à durcir)                         │
│   élèves, parents, enseignants, classes, matières, leçons  │
├────────────────────────────────────────────────────────────┤
│ M2. ÉVALUATIONS (existant, à durcir)                       │
│   examens, notes (Result), moyennes, bulletins, rattrapage,│
│   quiz en ligne, corrections, réclamations                 │
├────────────────────────────────────────────────────────────┤
│ M3. VIE SCOLAIRE (existant)                                │
│   présences, événements, annonces, demandes d'attestation  │
├────────────────────────────────────────────────────────────┤
│ M4. FINANCE (NOUVEAU)                                      │
│   grille des frais, factures, paiements/encaissements,     │
│   impayés & relances, dépenses                             │
├────────────────────────────────────────────────────────────┤
│ M5. RH / PAIE (NOUVEAU)                                    │
│   employés (enseignants + staff), salaires, bulletins paie │
├────────────────────────────────────────────────────────────┤
│ M6. STATISTIQUES (NOUVEAU)                                 │
│   performance élèves, performance enseignants,             │
│   chiffre d'affaires / dépenses / résultat                 │
├────────────────────────────────────────────────────────────┤
│ M7. ADMINISTRATION & ACCÈS (transverse)                    │
│   auth, rôles, année scolaire, paramètres établissement    │
└────────────────────────────────────────────────────────────┘
```

## 2. Modèle de données — DOMAINE

### 2.1 Entités EXISTANTES (ne pas casser)

- **User/Session/Account/Verification** : better-auth. `User.role` ∈ `admin | teacher | student | parent`. L'`id` du User EST l'`id` du profil métier (Student/Teacher/Parent/Admin) — convention existante (`currentUserId` utilisé directement comme `studentId`/`teacherId`).
- **Admin, Student, Teacher, Parent** : profils métier. Student→Parent (N:1), Student→Class (N:1).
- **Class** (superviseur Teacher?), **Subject** (M:N Teacher, M:N Semester), **Lesson** (Subject+Class+Teacher+Day).
- **Semester**, **Exam** (Lesson+Semester), **Result** (`@@unique(semesterId, studentId, subjectId)`, `score` + `classScore`), **ResultAverage** (moyenne semestrielle/élève), **ExamAverage**.
- **Attendance** (Student+Class+Subject, `present`, `sessionDay MORNING|EVENING`).
- **Event, Announcement** (Class?).
- **Quiz → Question → StudentAnswer → QuizResult**, **ExamCorrection**, **Complaint** (réclamation sur quiz), **Attestation** (demande de document).
- **MakeupSession → MakeupExam** (rattrapage, lié à Result).
- **TuitionPayment** : paiement scolarité mensuel — **DÉPRÉCIÉ**, remplacé par Invoice+Payment (story-03/07), conservé le temps de la migration.

### 2.2 Entités NOUVELLES

```prisma
// ---- M7 Administration ----
model SchoolYear {
  id        Int      @id @default(autoincrement())
  name      String   @unique          // "2025-2026"
  startDate DateTime
  endDate   DateTime
  isActive  Boolean  @default(false)  // UNE seule active (invariant applicatif)
  invoices        Invoice[]
  expenses        Expense[]
  feeStructures   FeeStructure[]
  salaryPayments  SalaryPayment[]
}

model SchoolSettings {          // singleton (id = 1)
  id          Int     @id @default(1)
  name        String                  // nom de l'établissement (en-têtes PDF)
  address     String?
  phone       String?
  email       String?
  logo        String?                 // URL Cloudinary
  currency    String  @default("FCFA")
  legalFooter String?                 // pied de page factures/reçus
}

// ---- M4 Finance ----
enum FeePeriod { MONTHLY  YEARLY  ONE_TIME }

model FeeStructure {            // grille des frais par classe et année
  id           Int        @id @default(autoincrement())
  label        String                 // "Scolarité mensuelle", "Inscription"…
  amount       Int                    // FCFA
  period       FeePeriod
  classId      Int
  class        Class      @relation(fields: [classId], references: [id], onDelete: Cascade)
  schoolYearId Int
  schoolYear   SchoolYear @relation(fields: [schoolYearId], references: [id], onDelete: Cascade)
  lines        InvoiceLine[]
  @@unique([classId, schoolYearId, label])
}

enum InvoiceStatus { ISSUED  PARTIALLY_PAID  PAID  OVERDUE  CANCELLED }

model Invoice {
  id            String        @id @default(uuid())
  reference     String        @unique          // "FAC-2025-00042" (compteur, story-05)
  status        InvoiceStatus @default(ISSUED)
  issueDate     DateTime      @default(now())
  dueDate       DateTime
  month         Int?                           // 1-12 si facture mensuelle auto
  generationKey String?       @unique          // "auto-{studentId}-{schoolYearId}-{month}" → idempotence du batch
  total         Int                            // dénormalisé = somme des lignes (recalculé à chaque écriture)
  studentId     String
  student       Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  schoolYearId  Int
  schoolYear    SchoolYear    @relation(fields: [schoolYearId], references: [id])
  createdById   String                          // User.id (admin)
  createdAt     DateTime      @default(now())
  lines         InvoiceLine[]
  payments      Payment[]
  @@index([studentId]) @@index([status]) @@index([schoolYearId, month])
}

model InvoiceLine {
  id             Int           @id @default(autoincrement())
  label          String
  quantity       Int           @default(1)
  unitAmount     Int                             // FCFA
  invoiceId      String
  invoice        Invoice       @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  feeStructureId Int?
  feeStructure   FeeStructure? @relation(fields: [feeStructureId], references: [id], onDelete: SetNull)
}

enum PaymentMethod { CASH  MOBILE_MONEY  BANK_TRANSFER  CHEQUE }

model Payment {
  id           String        @id @default(uuid())
  amount       Int
  method       PaymentMethod @default(CASH)
  paidAt       DateTime      @default(now())
  reference    String?                          // n° transaction Mobile Money / chèque
  invoiceId    String
  invoice      Invoice       @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  receivedById String                           // User.id (admin caissier)
  createdAt    DateTime      @default(now())
  @@index([invoiceId]) @@index([paidAt])
}

model ExpenseCategory {
  id       Int       @id @default(autoincrement())
  name     String    @unique          // "Fournitures", "Électricité", "Loyer"…
  expenses Expense[]
}

model Expense {
  id           String          @id @default(uuid())
  label        String
  amount       Int
  date         DateTime
  supplier     String?
  receiptImg   String?                          // justificatif Cloudinary
  method       PaymentMethod   @default(CASH)
  notes        String?
  categoryId   Int
  category     ExpenseCategory @relation(fields: [categoryId], references: [id])
  schoolYearId Int
  schoolYear   SchoolYear      @relation(fields: [schoolYearId], references: [id])
  createdById  String
  createdAt    DateTime        @default(now())
  @@index([date]) @@index([categoryId])
}

// ---- M5 RH / Paie ----
model Employee {
  id         String    @id @default(uuid())
  teacherId  String?   @unique         // lien optionnel vers Teacher ; null = staff (gardien, secrétaire…)
  name       String
  surname    String
  position   String                    // "Enseignant", "Secrétaire", "Gardien"…
  phone      String?
  email      String?
  hireDate   DateTime
  baseSalary Int                       // salaire mensuel brut, FCFA
  active     Boolean   @default(true)
  salaries   SalaryPayment[]
}

enum SalaryStatus { PENDING  PAID }

model SalaryPayment {
  id           String        @id @default(uuid())
  month        Int                     // 1-12
  year         Int
  baseAmount   Int                     // copie du baseSalary au moment de la génération
  bonuses      Int           @default(0)
  deductions   Int           @default(0)
  netAmount    Int                     // base + bonuses - deductions (recalculé côté serveur)
  status       SalaryStatus  @default(PENDING)
  paidAt       DateTime?
  method       PaymentMethod @default(CASH)
  employeeId   String
  employee     Employee      @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  schoolYearId Int
  schoolYear   SchoolYear    @relation(fields: [schoolYearId], references: [id])
  @@unique([employeeId, month, year])
}
```

### 2.3 Relations clés (diagramme texte)

```
SchoolYear 1─N FeeStructure N─1 Class
SchoolYear 1─N Invoice N─1 Student ─N─1 Parent
Invoice 1─N InvoiceLine N─0..1 FeeStructure
Invoice 1─N Payment
SchoolYear 1─N Expense N─1 ExpenseCategory
Teacher 0..1─1 Employee 1─N SalaryPayment N─1 SchoolYear
Result / ResultAverage / Attendance  ──(agrégations)──▶ M6 Statistiques (pas de table dédiée : calculs Prisma groupBy/aggregate)
```

**Statuts de facture (machine d'état)** : `ISSUED → PARTIALLY_PAID → PAID` ; `ISSUED|PARTIALLY_PAID → OVERDUE` (si dueDate dépassée, calculé au vol + action de synchro) ; `→ CANCELLED` uniquement si aucun paiement. Le statut est TOUJOURS recalculé côté serveur après chaque Payment (jamais fourni par le client).

## 3. Arborescence des routes (cible)

```
src/app/
├─ page.tsx                      # landing → redirection selon rôle
├─ sign-in / sign-up             # existant (better-auth)
├─ api/auth/[...all]             # existant
├─ (dashboard)/
│  ├─ admin/page.tsx             # dashboard admin (refondu story-17, KPIs réels)
│  ├─ teacher/ | student/ | parent/   # dashboards par rôle (existants)
│  ├─ list/
│  │  ├─ teachers|students|parents|classes|subjects|lessons     # existants
│  │  ├─ exams | results | average | attendances | semester     # existants (durcis S12/S13)
│  │  ├─ events | announcements | demande | reclamation         # existants
│  │  ├─ makeupSession | tuitionPayment(déprécié→redirect S07)  # existants
│  │  ├─ fees/page.tsx                    # S04 grille des frais (admin)
│  │  ├─ invoices/page.tsx                # S05 liste factures (admin; student/parent = les leurs)
│  │  ├─ invoices/[id]/page.tsx           # S05/S07 détail + lignes + paiements + reçu PDF
│  │  ├─ expenses/page.tsx                # S09 dépenses (admin)
│  │  ├─ employees/page.tsx               # S10 employés (admin)
│  │  ├─ payroll/page.tsx                 # S11 paie du mois (admin)
│  │  └─ gradeEntry/page.tsx              # S12 saisie de notes en masse (teacher/admin)
│  ├─ stats/
│  │  ├─ students/page.tsx                # S14 (admin, teacher)
│  │  ├─ teachers/page.tsx                # S15 (admin)
│  │  └─ finance/page.tsx                 # S16 (admin)
│  ├─ settings/page.tsx                   # S01 année scolaire + établissement (admin)
│  └─ quiz/…                              # existant
└─ proxy.ts                       # garde d'accès Next 16 (routeAccessMap dans lib/setting.ts)
```

**routeAccessMap — entrées à AJOUTER** (`src/lib/setting.ts`) :

```ts
"/list/fees":      ["admin"],
"/list/invoices":  ["admin", "student", "parent"],
"/list/expenses":  ["admin"],
"/list/employees": ["admin"],
"/list/payroll":   ["admin"],
"/list/gradeEntry":["admin", "teacher"],
"/stats":          ["admin"],            // /stats/students ouvert aussi à teacher (géré en page)
"/settings":       ["admin"],
```

## 4. Modules applicatifs → fichiers (conventions du boilerplate)

| Besoin | Convention EXACTE à suivre |
|---|---|
| Page liste | `src/app/(dashboard)/list/<res>/page.tsx` : RSC async, `searchParams: Promise<…>` (await), `auth.api.getSession({headers: await headers()})`, `role = session?.user.role`, `prisma.$transaction([findMany, count])`, `ITEM_PER_PAGE`, composants `Table`/`TableSearch`/`Pagination`, colonnes conditionnelles au rôle. Modèle : `list/announcements/page.tsx` |
| Formulaire | zod schema dans `src/lib/formsValidationSchema.ts` (export type `XSchema = z.infer<…>`), composant `src/components/forms/<X>Form.tsx` (react-hook-form + `InputField`), enregistré dans `FormModal.tsx` (lazy) et `FormContainer.tsx` (relatedData) |
| Server action | `src/lib/actions/<x>Action.ts`, `"use server"`, signature `(currentState: {success,error}, data: XSchema)`, try/catch → `{success,error}` ; **nouveauté S02 : chaque action commence par `await requireRole([...])` et finit par `revalidatePath(...)`** |
| Accès routes | `routeAccessMap` + `src/proxy.ts` (défense en profondeur : re-check du rôle DANS chaque page/action) |
| PDF | composant `@react-pdf/renderer` dans `src/components/<X>Pdf.tsx` + bouton client `<X>Button.tsx` (modèles : `BulletinPDF`, `ReceipPdf`) |
| Charts | composant client recharts + wrapper RSC `<X>Container.tsx` qui fait la requête Prisma (modèle : `CountChart`/`CountChartContainer`) |
| Menu | ajouter les items dans `src/components/Menu.tsx` avec `visible: [roles]` |
| Seed | `prisma/seed.ts` (étendre, ne pas remplacer) |

## 5. Matrice d'accès (résumé domaine)

| Ressource | admin | teacher | student | parent |
|---|---|---|---|---|
| Élèves/Classes/Matières | CRUD | R (ses classes) | — | — |
| Notes/Examens | CRUD | CRU (ses matières) | R (les siennes) | R (ses enfants) |
| Présences | CRUD | CRU (ses classes) | R | R (enfants) |
| Bulletins | générer | R | R (le sien) | R (enfants) |
| Grille frais / Dépenses / Paie / Employés | CRUD | — | — | — |
| Factures & paiements | CRUD | — | R (les siennes) | R (enfants) |
| Stats élèves | R | R (ses classes) | — | — |
| Stats enseignants / finance | R | — | — | — |
| Paramètres / Année scolaire | CRUD | — | — | — |

## 6. Invariants métier (à faire respecter dans les actions)

1. Une seule `SchoolYear.isActive = true` (l'activation désactive les autres, en transaction).
2. `Invoice.total = Σ lines(quantity × unitAmount)` — recalculé serveur à chaque mutation de ligne.
3. `Σ payments.amount ≤ invoice.total` ; statut dérivé : 0 payé → ISSUED, partiel → PARTIALLY_PAID, tout → PAID.
4. `SalaryPayment.netAmount = baseAmount + bonuses − deductions ≥ 0` — recalculé serveur.
5. Génération auto de factures et de paie : **idempotente** (`generationKey` unique / `@@unique(employeeId, month, year)`), re-lancer ne duplique rien.
6. Montants toujours > 0 (zod `.int().positive()`).
7. Aucune server action de M4/M5/M7 sans `requireRole(["admin"])`.
