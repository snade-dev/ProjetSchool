"use client";

import {
  Home,
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  MessageCircle,
  Bell,
  User,
  Settings,
  FileText,
  CheckSquare,
  Edit,
  Award,
  Clipboard,
  File,
  FilePlus,
  FileText as FileTextIcon,
  Repeat,
  Wallet,
  Receipt,
  BarChart2,
} from "lucide-react";
import { LinKed } from "./LinKed";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: Home,
        label: "Acceuil",
        href: "/",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Users,
        label: "Enseignants",
        href: "/list/teachers",
        visible: ["admin", "teacher"],
      },
      {
        icon: Users,
        label: "Etudiants",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: Users,
        label: "Parents",
        href: "/list/parents",
        visible: ["admin", "teacher"],
      },
      {
        icon: BookOpen,
        label: "Matières",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: ClipboardList,
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: Clipboard,
        label: "Semestres",
        href: "/list/semester",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: BookOpen,
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "teacher"],
      },
      {
        icon: BookOpen,
        label: "cours en ligne",
        href: "https://meet.google.com/landing",
        visible: ["admin", "teacher"],
      },
      {
        icon: FileText,
        label: " Examens",
        href: "/list/exams",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: FileText,
        label: "Examens en Ligne",
        href: "/list/onlineExam",
        visible: ["admin", "teacher", "student"],
      },
      {
        icon: FileText,
        label: "Resultat de l'examens",
        href: "/list/resultExam",
        visible: ["admin", "teacher", "student"],
      },
      {
        icon: Edit,
        label: "Créer un Examen",
        href: "/quiz",
        visible: ["admin", "teacher"],
      },
      {
        icon: Award,
        label: "Resultats",
        href: "/list/results",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Edit,
        label: "Saisie des notes",
        href: "/list/gradeEntry",
        visible: ["admin", "teacher"],
      },
      {
        icon: CheckSquare,
        label: "Presence",
        href: "/list/attendances",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Calendar,
        label: "Evènements",
        href: "/list/events",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: FilePlus,
        label: "Reclamation",
        href: "/list/reclamation",
        visible: ["admin", "teacher", "student"],
      },
      // {
      //   icon: Repeat,
      //   label: "Session Rattrapage",
      //   href: "/list/makeupSession", 
      //   visible: ["admin", "teacher", "student"],
      // },
      {
        icon: File,
        label: "Demande",
        href: "/list/demande",
        visible: ["admin", "teacher", "student"],
      },
      {
        icon: MessageCircle,
        label: "Messages",
        href: "/list/messages",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Bell,
        label: "Annonces",
        href: "/list/announcements",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: Settings,
        label: "Paramètres",
        href: "/settings",
        visible: ["admin"],
      },
    ],
  },
  {
    title: "FINANCE",
    items: [
      {
        icon: Wallet,
        label: "Grille des frais",
        href: "/list/fees",
        visible: ["admin"],
      },
      {
        icon: FileText,
        label: "Factures",
        href: "/list/invoices",
        visible: ["admin"],
      },
      {
        icon: FileText,
        label: "Mes factures",
        href: "/list/invoices",
        visible: ["student", "parent"],
      },
      {
        icon: Receipt,
        label: "Dépenses",
        href: "/list/expenses",
        visible: ["admin"],
      },
      {
        icon: Users,
        label: "Employés",
        href: "/list/employees",
        visible: ["admin"],
      },
      {
        icon: Wallet,
        label: "Paie",
        href: "/list/payroll",
        visible: ["admin"],
      },
    ],
  },
  {
    title: "STATISTIQUES",
    items: [
      {
        icon: BarChart2,
        label: "Stats élèves",
        href: "/stats/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: BarChart2,
        label: "Stats enseignants",
        href: "/stats/teachers",
        visible: ["admin"],
      },
    ],
  },
  // {
  //   title: "Autres",
  //   items: [
  //     {
  //       icon: User,
  //       label: "Profil",
  //       href: "/profile",
  //       visible: ["admin", "teacher", "student", "parent"],
  //     },
  //     {
  //       icon: Settings,
  //       label: "Paramètre",
  //       href: "/settings",
  //       visible: ["admin", "teacher", "student", "parent"],
  //     },
  //   ],
  // },
];

const MenuComp = ({role} : {role: string}) => {
  return (
    <div className=" mt-4 text-sm">
      {menuItems.map((i) => (
        <div className=" flex flex-col gap-2" key={i.title}>
          <span className=" hidden lg:block text-gray-400 font-light my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (item.visible.includes(role)) {
              return (
                <LinKed
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  key={item.label}
                />
              );
            }
          })}
        </div>
      ))}
    </div>
  );
};
export default MenuComp;
