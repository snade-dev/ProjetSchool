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
  
  // W07 — rôles prédéfinis élargis (§2.7.4, §2.7.6) :
  // - director : tout ce que voit l'admin SAUF /settings (paramètres école,
  //   années scolaires, rollover) et la gestion des comptes ; finance en lecture.
  // - accountant : uniquement finance (+ /list/employees en lecture).
  // - supervisor : présences/discipline + élèves et classes en lecture.
  export const routeAccessMap: RouteAccessMap = {
    "/platform": ["superadmin"], // V04 — espace plateforme (clé sans (.*) : le proxy matche par startsWith)
    "/suspended": ["admin", "director", "teacher", "accountant", "supervisor", "student", "parent", "user", "superadmin"], // V06
    "/select-space": ["admin", "director", "teacher", "accountant", "supervisor", "student", "parent", "user", "superadmin"], // W06 — sélecteur d'espace
    "/account(.*)": ["admin", "director", "teacher", "accountant", "supervisor", "student", "parent", "user", "superadmin"],
    "/admin(.*)": ["admin"],
    "/director(.*)": ["director"], // W07
    "/accountant(.*)": ["accountant"], // W07
    "/supervisor(.*)": ["supervisor"], // W07
    "/student(.*)": ["student"],
    "/teacher(.*)": ["teacher"],
    "/parent(.*)": ["parent"],
    "/quiz(.*)": ["admin", "director", "teacher", "student"],
    "/list/teachers": ["admin", "director", "teacher"],
    "/list/students": ["admin", "director", "teacher", "supervisor"],
    "/list/parents": ["admin", "director", "teacher"],
    "/list/subjects": ["admin", "director"],
    "/list/levels": ["admin", "director"], // W02 — niveaux scolaires
    "/list/classes": ["admin", "director", "teacher", "supervisor"],
    "/list/exams": ["admin", "director", "teacher", "student", "parent"],
    "/list/tuitionPayment": ["admin", "director", "teacher", "accountant", "student", "parent"],
    "/list/onlineExam": ["admin", "director", "teacher", "student"],
    "/list/resultExam": ["admin", "director", "teacher", "student"],
    "/list/correction": ["admin", "director", "teacher", "student"],
    "/list/results": ["admin", "director", "teacher", "student", "parent"],
    "/list/gradeEntry": ["admin", "director", "teacher"],
    "/list/attendances": ["admin", "director", "teacher", "supervisor", "student", "parent"], // W07 — clé alignée sur la route réelle (match par segment)
    "/list/reclamation": ["admin", "director", "teacher", "student"],
    "/list/demande": ["admin", "director", "teacher", "student"],
    "/list/events": ["admin", "director", "teacher", "student", "parent"],
    "/list/announcements": ["admin", "director", "teacher", "student", "parent"],
    "/list/semester": ["admin", "director", "teacher", "student", "parent"],
    "/list/makeupSession": ["admin", "director", "teacher", "student"],
    "/list/fees": ["admin", "director", "accountant"],
    "/list/invoices": ["admin", "director", "accountant", "student", "parent"],
    "/list/expenses": ["admin", "director", "accountant"],
    "/list/employees": ["admin", "director", "accountant"],
    "/list/payroll": ["admin", "director", "accountant"],
    "/settings/rollover": ["admin"], // W04 — assistant de passage d'année (director exclu)
    "/settings": ["admin"], // W07 — paramètres structurants : admin uniquement
    "/stats": ["admin", "director", "teacher", "accountant"], // gardes par page : finance restreint en page
  };