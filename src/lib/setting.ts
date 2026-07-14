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
    "/list/onlineExam": ["admin", "director", "teacher", "student"],
    "/list/resultExam": ["admin", "director", "teacher", "student"],
    "/list/correction": ["admin", "director", "teacher", "student"],
    "/list/results": ["admin", "director", "teacher", "student", "parent"],
    "/list/gradeEntry": ["admin", "director", "teacher"],
    "/list/attendances": ["admin", "director", "teacher", "supervisor", "student", "parent"], // W07 — clé alignée sur la route réelle (match par segment)
    "/list/reclamation": ["admin", "director", "teacher", "student"],
    "/list/demande": ["admin", "director", "teacher", "student"],
    "/list/events": ["admin", "director", "teacher", "student", "parent"],
    // W14 — devoirs à faire (§2.3.8) : publication teacher/admin/director,
    // consultation student/parent/supervisor (gardes fines dans la page/action)
    "/list/homeworks": ["admin", "director", "teacher", "supervisor", "student", "parent"],
    // W15 — observations & discipline (§2.3.7) : vue école (les enseignants
    // saisissent depuis la fiche élève) ; justifications d'absence (§2.3.6) :
    // décision par la direction/le surveillant
    "/list/observations": ["admin", "director", "supervisor"],
    "/list/justifications": ["admin", "director", "supervisor"],
    "/list/announcements": ["admin", "director", "teacher", "student", "parent"],
    "/list/semester": ["admin", "director", "teacher", "student", "parent"],
    "/list/makeupSession": ["admin", "director", "teacher", "student"],
    "/list/fees": ["admin", "director", "accountant"],
    "/list/invoices": ["admin", "director", "accountant", "student", "parent"],
    "/list/expenses": ["admin", "director", "accountant"],
    "/list/employees": ["admin", "director", "accountant"],
    "/list/payroll": ["admin", "director", "accountant"],
    "/list/audit": ["admin", "director", "superadmin"], // W10 — journal d'audit (§2.11.4)
    // W12 — mes notifications : tous les rôles connectés (la page ne montre que les SIENNES)
    "/list/notifications": ["admin", "director", "teacher", "accountant", "supervisor", "student", "parent", "user", "superadmin"],
    // W16 — messagerie interne (§2.6.5) : tous les rôles école, PAS superadmin
    // (intra-école). Supervision (consultation tracée des fils) : direction.
    // NB : la clé supervision DOIT précéder la clé générale (le proxy s'arrête
    // au premier préfixe qui matche).
    "/list/messages/supervision": ["admin", "director"],
    "/list/messages": ["admin", "director", "teacher", "accountant", "supervisor", "student", "parent"],
    "/settings/rollover": ["admin"], // W04 — assistant de passage d'année (director exclu)
    "/settings": ["admin"], // W07 — paramètres structurants : admin uniquement
    "/stats": ["admin", "director", "teacher", "accountant"], // gardes par page : finance restreint en page
  };