import { title } from "process";
import { z } from "zod";
export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z
    .string()
    .min(1, {
    message: "Le nom du sujet est requis et doit être d'au moins 3 caractères",
    }),
  teachers: z.array(z.string())
  });

export type SubjectSchema = z.infer<typeof subjectSchema>;

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, {
    message:
      "Le nom de la classe est requis et doit être d'au moins 3 caractères",
  }),
  capacity: z.coerce.number().min(1, {
    message:
      "La capacité de la classe est requise et doit être d'au moins 3 caractères",
  }),
  supervisorId: z.coerce.string().optional(),
  // V01 — régime d'évaluation de la classe ; W09 — + COMBINED (§2.3.1 système 3 :
  // compositions mensuelles ET trimestres en parallèle)
  evaluationSystem: z.enum(["TRIMESTER", "MONTHLY", "COMBINED"], {
    message: "Choisissez le régime d'évaluation",
  }),
  // W09 — pondération devoirs vs composition (%, régimes TRIMESTER/COMBINED).
  // 50 = moyenne simple historique. Ignorée en régime MONTHLY.
  // Champ vide ou absent (régime MONTHLY : input masqué) → défaut 50.
  homeworkWeight: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce
      .number({ message: "La pondération doit être un nombre" })
      .int({ message: "La pondération doit être un entier" })
      .min(0, { message: "La pondération doit être entre 0 et 100" })
      .max(100, { message: "La pondération doit être entre 0 et 100" })
      .default(50)
  ),
  // W02 — niveau obligatoire à la saisie (nullable en base pour les classes historiques)
  levelId: z.coerce
    .number({ message: "Choisissez le niveau de la classe" })
    .int()
    .positive({ message: "Choisissez le niveau de la classe" }),
});

export type ClassSchema = z.infer<typeof classSchema>;

// W02 — niveau scolaire (§2.1.4) : « CP », « 6ème », « Terminale »…
export const levelSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Le nom du niveau est requis !" }),
  order: z.coerce
    .number({ message: "L'ordre hiérarchique est requis" })
    .int()
    .min(1, { message: "L'ordre doit être ≥ 1" }),
  cycle: z.string().optional(),
});

export type LevelSchema = z.infer<typeof levelSchema>;

export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
  .string()
  .min(3, { message: "Le nom d'utilisateur doit comporter au moins 3 caractères !" })
  .max(20, { message: "Le nom d'utilisateur doit comporter au maximum 20 caractères !" }),
  password: z
  .string()
  .min(8, { message: "Le mot de passe doit comporter au moins 8 caractères !" })
  .optional()
  .or(z.literal("")),
  name: z.string().min(1, { message: "Le prénom est requis !" }),
  surname: z.string().min(1, { message: "Le nom de famille est requis !" }),
  email: z
  .string()
  .email({ message: "Adresse e-mail invalide !" })
  .optional()
  .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().min(1, { message: "L'adresse est requise !" }),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Le groupe sanguin est requis !" }),
  birthday: z.coerce.date({ message: "La date de naissance est requise !" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Le sexe est requis !" }),
  subjects: z.array(z.string()).optional(), // subject ids
});

export type TeacherSchema = z.infer<typeof teacherSchema>;

export const studentSchema = z.object({
  id: z.string().optional(),
  username: z
  .string()
  .min(3, { message: "Le nom d'utilisateur doit comporter au moins 3 caractères !" })
  .max(20, { message: "Le nom d'utilisateur doit comporter au maximum 20 caractères !" }),
  password: z
  .string()
  .min(8, { message: "Le mot de passe doit comporter au moins 8 caractères !" })
  .optional()
  .or(z.literal("")),
  name: z.string().min(1, { message: "Le prénom est requis !" }),
  surname: z.string().min(1, { message: "Le nom de famille est requis !" }),
  email: z
  .string()
  .email({ message: "Adresse e-mail invalide !" })
  .optional()
  .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Le groupe sanguin est requis !" }),
  birthday: z.coerce.date({ message: "La date de naissance est requise !" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Le sexe est requis !" }),
  classId: z.coerce.number().min(1, { message: "La classe est requise !" }),
  // W05 — tuteur principal, requis à la CRÉATION seulement (crée la ligne
  // StudentGuardian) ; à la modification, les tuteurs se gèrent sur la fiche élève.
  parentUsername: z.string().optional(),
});

export type StudentSchema = z.infer<typeof studentSchema>;

// W05 — lien tuteur↔élève avec droits différenciés (§2.2.3)
export const guardianSchema = z.object({
  id: z.coerce.number().optional(),
  studentId: z.string().min(1, { message: "L'élève est requis !" }),
  parentId: z.string().min(1, { message: "Le tuteur est requis !" }),
  relationship: z
    .string()
    .min(1, { message: "Le lien de parenté est requis !" }),
  isLegal: z.coerce.boolean(),
  canPay: z.coerce.boolean(),
  canViewGrades: z.coerce.boolean(),
  canPickup: z.coerce.boolean(),
});

export type GuardianSchema = z.infer<typeof guardianSchema>;

// W08 — matière d'une classe avec son coefficient (§2.1.6)
export const classSubjectSchema = z.object({
  id: z.coerce.number().optional(),
  classId: z.coerce.number({ message: "La classe est requise !" }),
  subjectId: z.coerce.number({ message: "La matière est requise !" }),
  coefficient: z.coerce
    .number({ message: "Le coefficient est requis !" })
    .int({ message: "Le coefficient doit être un entier !" })
    .min(1, { message: "Le coefficient minimum est 1 !" })
    .max(20, { message: "Le coefficient maximum est 20 !" }),
});

export type ClassSubjectSchema = z.infer<typeof classSubjectSchema>;

export const examSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Le titre est requis !" }),
  startTime: z.coerce.date({ message: "L'heure de début est requise !" }),
  endTime: z.coerce.date({ message: "L'heure de fin est requise !" }),
  lessonId: z.coerce.number({ message: "La leçon est requise !" }),
  semesterId: z.coerce.number({ message: "Le semestre est requis !" }),
});

export type ExamSchema = z.infer<typeof examSchema>;

export const announceSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Le titre est requis !" }),
  description: z.string().min(1, { message: "Le titre est requis !" }),
  date: z.coerce.date({ message: "La date est requise !" }),
  classId: z.coerce.number().min(1, { message: "La classe est requise !" }),
});

export type AnnounceSchema = z.infer<typeof announceSchema>;

export const eventSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Le titre est requis !" }),
  description: z.string().min(1, { message: "Le titre est requis !" }),
  startTime: z.coerce.date({ message: "L'heure de début est requise !" }),
  endTime: z.coerce.date({ message: "L'heure de début est requise !" }),
  classId: z.coerce.number().min(1, { message: "La classe est requise !" }),
});

export type EventSchema = z.infer<typeof eventSchema>;

// ---- S01 : Année scolaire & paramètres établissement ----
export const schoolYearSchema = z
  .object({
    id: z.coerce.number().optional(),
    name: z
      .string()
      .min(4, { message: "Le nom de l'année scolaire est requis (ex : 2025-2026) !" }),
    startDate: z.coerce.date({ message: "La date de début est requise !" }),
    endDate: z.coerce.date({ message: "La date de fin est requise !" }),
    isActive: z.coerce.boolean().optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "La date de fin doit être postérieure à la date de début !",
    path: ["endDate"],
  });

export type SchoolYearSchema = z.infer<typeof schoolYearSchema>;

export const schoolSettingsSchema = z.object({
  id: z.coerce.number().optional(),
  name: z
    .string()
    .min(2, { message: "Le nom de l'établissement est requis !" }),
  address: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .email({ message: "Adresse e-mail invalide !" })
    .optional()
    .or(z.literal("")),
  logo: z.string().optional().or(z.literal("")),
  currency: z.string().optional().or(z.literal("")),
  legalFooter: z.string().optional().or(z.literal("")),
  themePrimary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { message: "Couleur invalide" })
    .optional()
    .or(z.literal("")),
  themeSecondary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { message: "Couleur invalide" })
    .optional()
    .or(z.literal("")),
  themeAccent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { message: "Couleur invalide" })
    .optional()
    .or(z.literal("")),
});

export type SchoolSettingsSchema = z.infer<typeof schoolSettingsSchema>;

// ---- S04 : Grille des frais de scolarité ----
export const feeStructureSchema = z.object({
  id: z.coerce.number().optional(),
  label: z
    .string()
    .min(2, { message: "Le libellé du frais est requis (min. 2 caractères) !" }),
  amount: z.coerce
    .number({ message: "Le montant est requis !" })
    .int({ message: "Le montant doit être un nombre entier !" })
    .positive({ message: "Le montant doit être supérieur à 0 !" }),
  period: z.enum(["MONTHLY", "YEARLY", "ONE_TIME"], {
    message: "La périodicité est requise !",
  }),
  classId: z.coerce.number().min(1, { message: "La classe est requise !" }),
});

export type FeeStructureSchema = z.infer<typeof feeStructureSchema>;

// ---- W11 : Échéancier d'un frais MONTHLY (§2.4.2) ----
// L'école choisit les mois payables et le montant de CHAQUE mois.
export const feeInstallmentsSchema = z.object({
  feeStructureId: z.coerce
    .number()
    .min(1, { message: "Le frais est requis !" }),
  installments: z
    .array(
      z.object({
        month: z.coerce
          .number({ message: "Le mois est requis !" })
          .int({ message: "Le mois doit être un entier !" })
          .min(1, { message: "Le mois doit être entre 1 et 12 !" })
          .max(12, { message: "Le mois doit être entre 1 et 12 !" }),
        amount: z.coerce
          .number({ message: "Le montant est requis !" })
          .int({ message: "Le montant doit être un nombre entier !" })
          .positive({ message: "Le montant doit être supérieur à 0 !" }),
      })
    )
    .min(1, { message: "Sélectionnez au moins un mois payable !" })
    .refine(
      (arr) => new Set(arr.map((i) => i.month)).size === arr.length,
      { message: "Chaque mois ne peut apparaître qu'une seule fois !" }
    ),
});

export type FeeInstallmentsSchema = z.infer<typeof feeInstallmentsSchema>;

// ---- S05 : Factures ----
export const invoiceLineSchema = z.object({
  label: z
    .string()
    .min(1, { message: "Le libellé de la ligne est requis !" }),
  quantity: z.coerce
    .number({ message: "La quantité est requise !" })
    .int({ message: "La quantité doit être un nombre entier !" })
    .positive({ message: "La quantité doit être supérieure à 0 !" }),
  unitAmount: z.coerce
    .number({ message: "Le prix unitaire est requis !" })
    .int({ message: "Le prix unitaire doit être un nombre entier !" })
    .positive({ message: "Le prix unitaire doit être supérieur à 0 !" }),
});

export type InvoiceLineSchema = z.infer<typeof invoiceLineSchema>;

export const invoiceSchema = z.object({
  studentId: z.string().min(1, { message: "L'élève est requis !" }),
  dueDate: z.coerce.date({ message: "L'échéance est requise !" }),
  lines: z
    .array(invoiceLineSchema)
    .min(1, { message: "Au moins une ligne est requise !" }),
});

export type InvoiceSchema = z.infer<typeof invoiceSchema>;

// ---- S07 : Encaissement (paiements) ----
export const paymentSchema = z.object({
  invoiceId: z.string().min(1, { message: "La facture est requise !" }),
  amount: z.coerce
    .number({ message: "Le montant est requis !" })
    .int({ message: "Le montant doit être un nombre entier !" })
    .positive({ message: "Le montant doit être supérieur à 0 !" }),
  method: z.enum(["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE"], {
    message: "La méthode de paiement est requise !",
  }),
  paidAt: z.coerce.date({ message: "La date de paiement est requise !" }),
  reference: z.string().optional().or(z.literal("")),
});

export type PaymentSchema = z.infer<typeof paymentSchema>;

// ---- S09 : Dépenses & catégories ----
export const expenseSchema = z.object({
  id: z.string().optional(),
  label: z
    .string()
    .min(2, { message: "Le libellé est requis (min. 2 caractères) !" }),
  amount: z.coerce
    .number({ message: "Le montant est requis !" })
    .int({ message: "Le montant doit être un nombre entier !" })
    .positive({ message: "Le montant doit être supérieur à 0 !" }),
  date: z.coerce.date({ message: "La date est requise !" }),
  categoryId: z.coerce
    .number({ message: "La catégorie est requise !" })
    .min(1, { message: "La catégorie est requise !" }),
  supplier: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  receiptImg: z.string().optional().or(z.literal("")),
  method: z.enum(["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE"], {
    message: "La méthode de paiement est requise !",
  }),
});

export type ExpenseSchema = z.infer<typeof expenseSchema>;

export const expenseCategorySchema = z.object({
  id: z.coerce.number().optional(),
  name: z
    .string()
    .min(2, { message: "Le nom de la catégorie est requis (min. 2 caractères) !" }),
});

export type ExpenseCategorySchema = z.infer<typeof expenseCategorySchema>;




// ---- S10 : Employés (enseignants + staff) ----
export const employeeSchema = z.object({
  id: z.string().optional(),
  // Lien optionnel vers un Teacher. Si fourni, name/surname/email/phone seront
  // écrasés côté serveur par ceux du Teacher (source de vérité).
  teacherId: z.string().optional().or(z.literal("")),
  name: z
    .string()
    .min(2, { message: "Le prénom est requis (min. 2 caractères) !" }),
  surname: z
    .string()
    .min(2, { message: "Le nom est requis (min. 2 caractères) !" }),
  position: z
    .string()
    .min(2, { message: "Le poste est requis (min. 2 caractères) !" }),
  phone: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .email({ message: "Adresse e-mail invalide !" })
    .optional()
    .or(z.literal("")),
  hireDate: z.coerce.date({ message: "La date d'embauche est requise !" }),
  baseSalary: z.coerce
    .number({ message: "Le salaire de base est requis !" })
    .int({ message: "Le salaire doit être un nombre entier !" })
    .positive({ message: "Le salaire doit être supérieur à 0 !" }),
  // Le <select> poste "true"/"false" (chaînes) : z.coerce.boolean() rendrait
  // "false" → true. On normalise explicitement (défaut true si absent).
  active: z.preprocess(
    (v) => (v === undefined || v === null ? true : v === "true" || v === true),
    z.boolean()
  ),
});

export type EmployeeSchema = z.infer<typeof employeeSchema>;

// ---- S11 : Paie mensuelle ----
export const payrollGenerateSchema = z.object({
  month: z.coerce
    .number({ message: "Le mois est requis !" })
    .int()
    .min(1, { message: "Mois invalide (1-12) !" })
    .max(12, { message: "Mois invalide (1-12) !" }),
  year: z.coerce
    .number({ message: "L'année est requise !" })
    .int()
    .min(2020, { message: "Année invalide (2020-2100) !" })
    .max(2100, { message: "Année invalide (2020-2100) !" }),
});

export type PayrollGenerateSchema = z.infer<typeof payrollGenerateSchema>;

export const salaryAdjustSchema = z.object({
  id: z.string().min(1, { message: "Identifiant manquant !" }),
  bonuses: z.coerce
    .number({ message: "Les primes sont requises !" })
    .int({ message: "Les primes doivent être un nombre entier !" })
    .min(0, { message: "Les primes ne peuvent pas être négatives !" }),
  deductions: z.coerce
    .number({ message: "Les retenues sont requises !" })
    .int({ message: "Les retenues doivent être un nombre entier !" })
    .min(0, { message: "Les retenues ne peuvent pas être négatives !" }),
});

export type SalaryAdjustSchema = z.infer<typeof salaryAdjustSchema>;

export const markPaidSchema = z.object({
  id: z.string().min(1, { message: "Identifiant manquant !" }),
  method: z.enum(["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE"], {
    message: "La méthode de paiement est requise !",
  }),
  paidAt: z.coerce.date({ message: "La date de paiement est requise !" }),
});

export type MarkPaidSchema = z.infer<typeof markPaidSchema>;

export const parentSchema = z.object({
  id: z.string().optional(),
  username: z
  .string()
  .min(3, { message: "Le nom d'utilisateur doit comporter au moins 3 caractères !" })
  .max(20, { message: "Le nom d'utilisateur doit comporter au maximum 20 caractères !" }),
  password: z
  .string()
  .min(8, { message: "Le mot de passe doit comporter au moins 8 caractères !" })
  .optional()
  .or(z.literal("")),
  name: z.string().min(1, { message: "Le prénom est requis !" }),
  surname: z.string().min(1, { message: "Le nom de famille est requis !" }),
  email: z
  .string()
  .email({ message: "Adresse e-mail invalide !" })
  .optional()
  .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().min(1, { message: "L'adresse est requise !" }),
  });

export type ParentSchema = z.infer<typeof parentSchema>;


export const lessonSchema = z.object({
  id: z.number().optional(),
  name: z
    .string()
    .min(3, { message: "Le nom d'utilisateur doit comporter au moins 3 caractères !" })
    .max(20, { message: "Le nom d'utilisateur doit comporter au maximum 20 caractères !" }),
  day: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
  ], { message: "Le jour est requis !" }),
  subjectId: z.coerce.number().min(1, { message: "La classe est requise !" }),
  classId: z.coerce.number().min(1, { message: "La classe est requise !" }),
  teacherUsername: z.string().min(1, { message: "La classe est requise !" }),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "Heure de début requise (HH:MM) !" }),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "Heure de fin requise (HH:MM) !" }),
});

export type LessonSchema = z.infer<typeof lessonSchema>;

export const resultMSchema = z.object({
  id: z.coerce.number().optional(),
  average: z.coerce.number().min(1, {message: "La moyenne est requise"}),
  studentUsername: z.string().min(1, { message: "L'etudiant est requise !" }),
  examId: z.coerce.number().min(1, { message: "L'exame est requise !" }),
});

export type ResultMSchema = z.infer<typeof resultMSchema>;

export const resultSchema = z.object({
  id: z.coerce.number().optional(),
  score: z.coerce.number().min(1, { message: "La moyenne est requise" }),
  studentUsername: z.string().min(1, { message: "L'etudiant est requise !" }),
  subjectId: z.coerce.number().min(1, { message: "Le sujet est requise !" }),
  semesterId: z.coerce.number().min(1, { message: "Le semestre est requise !" }),
  classScore: z.coerce.number().optional()
});

export type ResultSchema = z.infer<typeof resultSchema>;

// ---- S12 : Saisie de notes en masse (gradeEntry) ----
export const gradeEntrySchema = z.object({
  classId: z.coerce.number().min(1, { message: "La classe est requise !" }),
  subjectId: z.coerce.number().min(1, { message: "La matière est requise !" }),
  semesterId: z.coerce.number().min(1, { message: "Le semestre est requis !" }),
  grades: z.array(
    z.object({
      studentId: z.string().min(1, { message: "L'élève est requis !" }),
      score: z.coerce
        .number()
        .min(0, { message: "La note doit être ≥ 0 !" })
        .max(20, { message: "La note doit être ≤ 20 !" })
        .optional(),
      classScore: z.coerce
        .number()
        .min(0, { message: "La note de classe doit être ≥ 0 !" })
        .max(20, { message: "La note de classe doit être ≤ 20 !" })
        .optional(),
    })
  ),
});

export type GradeEntrySchema = z.infer<typeof gradeEntrySchema>;

export const answerOptionSchema = z.object({
  id: z.coerce.string().optional(),
  answerText: z.string().min(1, "la réponse est requis"),
  isCorrect: z.boolean(),
});

export type AnswerOptionSchema = z.infer<typeof answerOptionSchema>;


export const questionSchema = z.object({
  id: z.coerce.string().optional(),
  questionText: z.string().min(1, "Question text is required"),
  createdBy: z.string().min(1, "L'enseignant doit être ensignant")
});

export type QuestionSchema = z.infer<typeof questionSchema>;

export const quizSchema = z.object({
  id: z.coerce.string().optional(),
  title: z.string().min(1, "Le titre est oblicatoire"),
  date: z.coerce.date({ message: "La date est requise !" }),
  duration: z.coerce.number(),
  questions: z
    .array(questionSchema)
    .optional(),
  subjectId: z.string().min(1, "la matiere doit etre entrer"),
  classId: z.string().min(1, "la class doit etre entrer"),
  teacherUsername: z.string().min(1, "l'enseignant doit être renseigner")
});

export type QuizSchema = z.infer<typeof quizSchema>;

export const makeupSessionSchema = z.object({
  id: z.coerce.string().optional(),
  title: z.string().min(1, "Le titre est oblicatoire"),
  startTime: z.coerce.date({ message: "La date est requise !" }),
  endTime: z.coerce.date({ message: "La date est requise !" }),
  semesterId: z.string().min(1, "le semestre doit etre entrer"),
});

export type MakeupSessionSchema = z.infer<typeof makeupSessionSchema>;

export const makeupExamSchema = z.object({
  id: z.coerce.string().optional(),
  subjectId: z.coerce.number().min(1, { message: "La matière est requise !" }),
});

export type MakeupExamSchema = z.infer<typeof makeupExamSchema>;


export const attendanceSchema = z.object({
  id: z.coerce.number().optional(),
  date: z.coerce.date({ message: "La date est requise !" }),
  present: z.string(), // Si vous souhaitez un booléen, vous pouvez utiliser z.boolean()
  session: z.enum(["MORNING", "EVENING"], { message: "La session doit être spécifiée (MORNING ou EVENING)" }),
  studentUsername: z.string().min(1, "L'étudiant doit être renseigné"),
  subjectId: z.coerce.number({ message: "La leçon est requise !" }),
  classId: z.coerce.number({ message: "La leçon est requise !" }),
});

export type Attendancechema = z.infer<typeof attendanceSchema>;


export const studentAnswerSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      answerText: z.string().min(1, 'Answer is required'),
    })
  ),
});

export type StudentAnswerschema = z.infer<typeof studentAnswerSchema>;

export const teacherResponsSchema = z.object({
  answers: z.array(
    z.object({
      score: z.coerce.number(),
    })
  ),
});

export type TeacherResponsschema = z.infer<typeof teacherResponsSchema>;

export const complainSchema = z.object({
  title: z.string().min(1, { message: "Le titre est requis !" }),
  description: z.string().min(1, { message: "La description est requis !" }),
});

export type ComplainSchema = z.infer<typeof complainSchema>;

export const attestationSchema = z.object({
  title: z.string().min(1, { message: "Le titre est requis !" }),
  description: z.string().min(1, { message: "La description est requis !" }),
});

export type AttestationSchema = z.infer<typeof attestationSchema>;


export const schemas = z.object({
  amont: z.number().min(2, "Le texte est requis")

})

export type Schemas = z.infer<typeof schemas>;

export const semesterSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Le nom de la période est requis !" }),
  // V01 — régime de la période + ordre chronologique + libellé bulletin
  system: z.enum(["TRIMESTER", "MONTHLY"], {
    message: "Choisissez le régime de la période",
  }),
  order: z.coerce.number().int().min(1, { message: "L'ordre doit être ≥ 1" }),
  label: z.string().optional(),
  subjects: z
    .array(z.coerce.number()) // Assure que subjects est bien un tableau de nombres
    .min(1, { message: "Sélectionnez au moins une matière" }),
});


export type SemesterSchema = z.infer<typeof semesterSchema>;

export const resultFormSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      score: z.number().min(0).max(20),
      classscore: z.number().min(0).max(20) // Ajouté ici
    })
  )
});

export type ResultFormSchema = z.infer<typeof resultFormSchema>;


export const makeupExamFormSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    score: z.coerce.number(),
  })),
});

export type MakeupExamFormSchema = z.infer<typeof makeupExamFormSchema>;
