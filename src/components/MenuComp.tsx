"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  GraduationCap,
  UsersRound,
  BookOpen,
  ClipboardList,
  Calendar,
  CalendarDays,
  Bell,
  BellRing,
  Settings,
  FileText,
  CheckSquare,
  ClipboardCheck,
  Edit,
  Award,
  School,
  NotebookPen,
  MonitorPlay,
  Repeat,
  Wallet,
  Receipt,
  BarChart2,
  BadgeDollarSign,
  Briefcase,
  FilePlus,
  File,
  Video,
  ChevronDown,
  ArrowRightLeft,
  ScrollText,
  LucideIcon,
} from "lucide-react";
import { LinKed } from "./LinKed";

type MenuLink = {
  icon: LucideIcon;
  label: string;
  href: string;
  visible: string[];
  external?: boolean;
};

type MenuGroup = {
  icon: LucideIcon;
  label: string;
  visible: string[];
  items: MenuLink[];
};

type MenuEntry =
  | { kind: "link"; link: MenuLink }
  | { kind: "group"; group: MenuGroup };

// W07 — « ALL » couvre les rôles historiques + la direction (qui voit tout
// ce que voit l'admin hors paramètres). Comptable et surveillant ont des
// périmètres restreints, listés explicitement entrée par entrée.
const ALL = ["admin", "director", "teacher", "student", "parent"];

/** Accueil selon le rôle : le tableau de bord de chacun, pas la landing. */
const ROLE_HOME: Record<string, string> = {
  superadmin: "/platform",
  admin: "/admin",
  director: "/director",
  accountant: "/accountant",
  supervisor: "/supervisor",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

/**
 * Navigation regroupée par domaine (dropdowns) — refonte UI.
 * Chaque lien pointe vers une route EXISTANTE (les liens morts ont été retirés).
 * Le href "/" est résolu au rendu vers ROLE_HOME[role].
 */
const MENU: MenuEntry[] = [
  {
    kind: "link",
    link: { icon: Home, label: "Tableau de bord", href: "/", visible: ALL },
  },
  {
    kind: "group",
    group: {
      icon: School,
      label: "École",
      visible: ["admin", "director", "teacher", "supervisor"],
      items: [
        { icon: Users, label: "Enseignants", href: "/list/teachers", visible: ["admin", "director", "teacher"] },
        { icon: GraduationCap, label: "Étudiants", href: "/list/students", visible: ["admin", "director", "teacher", "supervisor"] },
        { icon: UsersRound, label: "Parents", href: "/list/parents", visible: ["admin", "director", "teacher"] },
        { icon: BookOpen, label: "Matières", href: "/list/subjects", visible: ["admin", "director"] },
        { icon: Award, label: "Niveaux", href: "/list/levels", visible: ["admin", "director"] },
        { icon: ClipboardList, label: "Classes", href: "/list/classes", visible: ["admin", "director", "teacher", "supervisor"] },
        { icon: CalendarDays, label: "Périodes d'évaluation", href: "/list/semester", visible: ["admin", "director", "teacher"] },
        { icon: ArrowRightLeft, label: "Passage d'année", href: "/settings/rollover", visible: ["admin"] },
        { icon: NotebookPen, label: "Leçons", href: "/list/lessons", visible: ["admin", "director", "teacher"] },
      ],
    },
  },
  {
    kind: "group",
    group: {
      icon: Award,
      label: "Notes & Examens",
      visible: ALL,
      items: [
        { icon: Edit, label: "Saisie des notes", href: "/list/gradeEntry", visible: ["admin", "director", "teacher"] },
        // Fusion : examens + résultats/bulletins sur une seule page à onglets
        { icon: FileText, label: "Examens & résultats", href: "/list/exams", visible: ALL },
        { icon: Repeat, label: "Rattrapage", href: "/list/makeupSession", visible: ["admin", "director", "teacher", "student"] },
        { icon: MonitorPlay, label: "Examens en ligne", href: "/list/onlineExam", visible: ["admin", "director", "teacher", "student"] },
        { icon: FileText, label: "Résultats en ligne", href: "/list/resultExam", visible: ["admin", "director", "teacher", "student"] },
        { icon: FilePlus, label: "Créer un examen", href: "/quiz", visible: ["admin", "director", "teacher"] },
      ],
    },
  },
  {
    kind: "group",
    group: {
      icon: CheckSquare,
      label: "Vie scolaire",
      visible: [...ALL, "supervisor", "accountant"],
      items: [
        // W14 — devoirs à faire (§2.3.8)
        { icon: NotebookPen, label: "Devoirs à faire", href: "/list/homeworks", visible: [...ALL, "supervisor"] },
        { icon: ClipboardCheck, label: "Faire l'appel", href: "/list/attendances/appel", visible: ["admin", "director", "teacher", "supervisor"] },
        { icon: CheckSquare, label: "Présences", href: "/list/attendances", visible: [...ALL, "supervisor"] },
        { icon: Calendar, label: "Événements", href: "/list/events", visible: ALL },
        { icon: Bell, label: "Annonces", href: "/list/announcements", visible: ALL },
        // W12 — mes notifications in-app (tous les rôles école)
        { icon: BellRing, label: "Notifications", href: "/list/notifications", visible: [...ALL, "supervisor", "accountant"] },
        { icon: FilePlus, label: "Réclamations", href: "/list/reclamation", visible: ["admin", "director", "teacher", "student"] },
        { icon: File, label: "Demandes", href: "/list/demande", visible: ["admin", "director", "teacher", "student"] },
        { icon: Video, label: "Cours en ligne", href: "https://meet.google.com/landing", visible: ["admin", "director", "teacher"], external: true },
      ],
    },
  },
  {
    kind: "group",
    group: {
      icon: Wallet,
      label: "Finance",
      visible: ["admin", "director", "accountant", "student", "parent"],
      items: [
        { icon: BadgeDollarSign, label: "Grille des frais", href: "/list/fees", visible: ["admin", "director", "accountant"] },
        { icon: FileText, label: "Factures", href: "/list/invoices", visible: ["admin", "director", "accountant"] },
        { icon: FileText, label: "Mes factures", href: "/list/invoices", visible: ["student", "parent"] },
        { icon: Receipt, label: "Dépenses", href: "/list/expenses", visible: ["admin", "director", "accountant"] },
      ],
    },
  },
  {
    kind: "group",
    group: {
      icon: Briefcase,
      label: "RH & Paie",
      visible: ["admin", "director", "accountant"],
      items: [
        { icon: Users, label: "Employés", href: "/list/employees", visible: ["admin", "director", "accountant"] },
        { icon: Wallet, label: "Paie", href: "/list/payroll", visible: ["admin", "director", "accountant"] },
      ],
    },
  },
  {
    kind: "group",
    group: {
      icon: BarChart2,
      label: "Statistiques",
      visible: ["admin", "director", "teacher", "accountant"],
      items: [
        { icon: BarChart2, label: "Stats élèves", href: "/stats/students", visible: ["admin", "director", "teacher"] },
        { icon: BarChart2, label: "Stats enseignants", href: "/stats/teachers", visible: ["admin", "director"] },
        { icon: BarChart2, label: "Stats finance", href: "/stats/finance", visible: ["admin", "director", "accountant"] },
      ],
    },
  },
  {
    kind: "link",
    // W10 — journal d'audit (§2.11.4) : admin + direction (leur école)
    link: { icon: ScrollText, label: "Journal d'audit", href: "/list/audit", visible: ["admin", "director"] },
  },
  {
    kind: "link",
    link: { icon: Settings, label: "Paramètres", href: "/settings", visible: ["admin"] },
  },
];

const ExternalLink = ({ link }: { link: MenuLink }) => (
  <a
    href={link.href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 rounded-md hover:bg-lamaSkyLight md:px-2 transition-colors"
  >
    <link.icon size={20} />
    <span className="hidden lg:block">{link.label}</span>
  </a>
);

const Group = ({ group, role }: { group: MenuGroup; role: string }) => {
  const pathname = usePathname();
  const items = group.items.filter((i) => i.visible.includes(role));
  const containsActive = items.some(
    (i) => !i.external && (pathname === i.href || pathname.startsWith(i.href + "/"))
  );
  const [open, setOpen] = useState(containsActive);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col">
      {/* En-tête du groupe (dropdown) — masqué en mobile (icônes à plat) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`hidden lg:flex items-center gap-3 w-full px-2 py-2 rounded-md text-left transition-colors hover:bg-lamaSkyLight ${
          containsActive ? "text-gray-800 font-semibold" : "text-gray-500"
        }`}
        aria-expanded={open}
      >
        <group.icon size={20} />
        <span className="flex-1">{group.label}</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Liens : toujours visibles en mobile, repliables en desktop */}
      <div
        className={`flex flex-col gap-1 lg:pl-4 lg:border-l lg:border-gray-100 lg:ml-4 ${
          open ? "" : "lg:hidden"
        }`}
      >
        {items.map((item) =>
          item.external ? (
            <ExternalLink key={item.label} link={item} />
          ) : (
            <LinKed
              key={item.label}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          )
        )}
      </div>
    </div>
  );
};

const MenuComp = ({ role }: { role: string }) => {
  return (
    <nav className="mt-4 text-sm flex flex-col gap-1">
      {MENU.map((entry) => {
        if (entry.kind === "link") {
          if (!entry.link.visible.includes(role)) return null;
          const href =
            entry.link.href === "/"
              ? ROLE_HOME[role] ?? "/"
              : entry.link.href;
          return (
            <LinKed
              key={entry.link.label}
              href={href}
              label={entry.link.label}
              icon={entry.link.icon}
            />
          );
        }
        if (!entry.group.visible.includes(role)) return null;
        return <Group key={entry.group.label} group={entry.group} role={role} />;
      })}
    </nav>
  );
};

export default MenuComp;
