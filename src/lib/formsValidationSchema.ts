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
});

export type ClassSchema = z.infer<typeof classSchema>;

export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
  .string()
  .min(3, { message: "Le nom d'utilisateur doit comporter au moins 3 caractères !" })
  .max(20, { message: "Le nom d'utilisateur doit comporter au maximum 20 caractères !" }),
  password: z
  .string()
  .min(4, { message: "Le mot de passe doit comporter au moins 8 caractères !" })
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
  parentUsername: z.string().min(1, { message: "L'identifiant du parent est requis !" }),
});

export type StudentSchema = z.infer<typeof studentSchema>;

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




export const parentSchema = z.object({
  id: z.string().optional(),
  username: z
  .string()
  .min(3, { message: "Le nom d'utilisateur doit comporter au moins 3 caractères !" })
  .max(20, { message: "Le nom d'utilisateur doit comporter au maximum 20 caractères !" }),
  password: z
  .string()
  .min(4, { message: "Le mot de passe doit comporter au moins 8 caractères !" })
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
  name: z.string().min(1, { message: "Le nom du semestre est requis !" }),
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
