export const ITEM_PER_PAGE = 10;

/**
 * Barème de notation (H03) : /20, seuil de réussite 10, mentions.
 * Un seul endroit à changer si le barème évolue.
 */
export const GRADE_SCALE = {
  max: 20,
  pass: 10,
  mentions: [
    { min: 16, label: "Excellent" },
    { min: 14, label: "Bien" },
    { min: 12, label: "Assez bien" },
    { min: 10, label: "Passable" },
    { min: 0, label: "Insuffisant" },
  ],
} as const;

/** Mention/appréciation automatique pour une note /20 (GRADE_SCALE, H03). */
export const getMention = (average: number): string =>
  GRADE_SCALE.mentions.find((m) => average >= m.min)?.label ?? "Insuffisant";

type RouteAccessMap = {
    [key: string]: string[];
  };
  
  export const routeAccessMap: RouteAccessMap = {
    "/platform": ["superadmin"], // V04 — espace plateforme (clé sans (.*) : le proxy matche par startsWith)
    "/suspended": ["admin", "teacher", "student", "parent", "user", "superadmin"], // V06
    "/account(.*)": ["admin", "teacher", "student", "parent", "user"],
    "/admin(.*)": ["admin"],
    "/student(.*)": ["student"],
    "/teacher(.*)": ["teacher"],
    "/parent(.*)": ["parent"],
    "/quiz(.*)": ["admin", "teacher", "student"],
    "/list/teachers": ["admin", "teacher"],
    "/list/students": ["admin", "teacher"],
    "/list/parents": ["admin", "teacher"],
    "/list/subjects": ["admin"],
    "/list/classes": ["admin", "teacher"],
    "/list/exams": ["admin", "teacher", "student", "parent"],
    "/list/tuitionPayment": ["admin", "teacher", "student", "parent"],
    "/list/onlineExam": ["admin", "teacher", "student"],
    "/list/resultExam": ["admin", "teacher", "student"],
    "/list/correction": ["admin", "teacher", "student"],
    "/list/results": ["admin", "teacher", "student", "parent"],
    "/list/gradeEntry": ["admin", "teacher"],
    "/list/attendance": ["admin", "teacher", "student", "parent"],
    "/list/reclamation": ["admin", "teacher", "student"],
    "/list/demande": ["admin", "teacher", "student"],
    "/list/events": ["admin", "teacher", "student", "parent"],
    "/list/announcements": ["admin", "teacher", "student", "parent"],
    "/list/semester": ["admin", "teacher", "student", "parent"],
    "/list/makeupSession": ["admin", "teacher", "student"],
    "/list/fees": ["admin"],
    "/list/invoices": ["admin", "student", "parent"],
    "/list/expenses": ["admin"],
    "/list/employees": ["admin"],
    "/list/payroll": ["admin"],
    "/settings": ["admin"],
    "/stats": ["admin", "teacher"],
  };