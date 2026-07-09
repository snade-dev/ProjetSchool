export const ITEM_PER_PAGE = 10;

type RouteAccessMap = {
    [key: string]: string[];
  };
  
  export const routeAccessMap: RouteAccessMap = {
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
    "/list/attendance": ["admin", "teacher", "student", "parent"],
    "/list/reclamation": ["admin", "teacher", "student"],
    "/list/demande": ["admin", "teacher", "student"],
    "/list/events": ["admin", "teacher", "student", "parent"],
    "/list/announcements": ["admin", "teacher", "student", "parent"],
    "/list/semester": ["admin", "teacher", "student", "parent"],
    "/list/makeupSession": ["admin", "teacher", "student"],
    "/list/fees": ["admin"],
    "/list/invoices": ["admin", "student", "parent"],
    "/settings": ["admin"],
  };