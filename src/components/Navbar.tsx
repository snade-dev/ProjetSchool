import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import UserMenu from "./UserMenu";
import SpaceSwitcher, { type SwitcherSpace } from "./SpaceSwitcher";
import NotificationBell, { type BellNotification } from "./NotificationBell";
import { getSelectableMemberships, SPACE_ROLE_LABELS } from "@/lib/membership";

const ROLE_LABELS: Record<string, string> = {
  admin: "administrateur",
  director: "direction", // W07
  teacher: "enseignant",
  accountant: "comptable", // W07
  supervisor: "surveillant général", // W07
  student: "étudiant",
  parent: "parent",
};

const Navbar = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role ?? "";

  // La recherche route vers la liste la plus utile selon le rôle.
  const searchStudents = ["admin", "director", "teacher", "supervisor"].includes(role);
  const searchTarget = searchStudents ? "/list/students" : "/list/results";

  // W12 — cloche : compteur de non-lus + 8 dernières notifications DU compte
  // (remplace l'ancien badge « annonces des 7 derniers jours »).
  let unreadCount = 0;
  let bellItems: BellNotification[] = [];
  if (session) {
    try {
      const [unread, items] = await prisma.$transaction([
        prisma.notification.count({
          where: { userId: session.user.id, readAt: null },
        }),
        prisma.notification.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            link: true,
            readAt: true,
            createdAt: true,
          },
        }),
      ]);
      unreadCount = unread;
      bellItems = items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        unread: n.readAt === null,
        createdAt: n.createdAt.toISOString(),
      }));
    } catch {
      unreadCount = 0;
      bellItems = [];
    }
  }

  // W06 — bascule d'espace : proposée seulement si le compte a PLUSIEURS
  // memberships sélectionnables (le superadmin n'en a aucune).
  let switcherSpaces: SwitcherSpace[] = [];
  if (session && role !== "superadmin") {
    try {
      const activeSchoolId =
        (session.user as { schoolId?: number | null }).schoolId ?? null;
      const spaces = await getSelectableMemberships(session.user.id);
      if (spaces.length > 1) {
        switcherSpaces = spaces.map((s) => ({
          id: s.id,
          schoolName: s.schoolName,
          role: s.role,
          roleLabel: SPACE_ROLE_LABELS[s.role] ?? s.role,
          isCurrent: s.schoolId === activeSchoolId && s.role === role,
        }));
      }
    } catch {
      switcherSpaces = [];
    }
  }

  return (
    <header className="flex items-center justify-between p-4">
      {/* Barre de recherche fonctionnelle (GET → liste filtrée) */}
      <form
        action={searchTarget}
        className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2 bg-white"
      >
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          name="search"
          placeholder={
            searchStudents ? "Rechercher un élève…" : "Rechercher un résultat…"
          }
          className="w-[200px] p-2 bg-transparent outline-none"
        />
      </form>

      {/* Icônes et profil */}
      <div className="flex items-center gap-6 justify-end w-full">
        {/* W06 — bascule d'espace (multi-écoles / multi-rôles) */}
        <SpaceSwitcher spaces={switcherSpaces} />
        {["admin", "director", "teacher", "student"].includes(role) && (
          <Link
            href="/list/reclamation"
            title="Réclamations et demandes"
            className="bg-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-lamaSkyLight transition"
          >
            <MessageSquare size={16} className="text-gray-600" />
          </Link>
        )}
        {/* W12 — cloche des notifications in-app (compteur + dropdown) */}
        <NotificationBell unreadCount={unreadCount} items={bellItems} />
        <UserMenu
          name={session?.user.name || "Utilisateur"}
          roleLabel={ROLE_LABELS[role] ?? role}
        />
      </div>
    </header>
  );
};
export default Navbar;
