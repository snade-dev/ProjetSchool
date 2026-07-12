import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import Link from "next/link";
import { Bell, MessageSquare, Search } from "lucide-react";
import UserMenu from "./UserMenu";

const ROLE_LABELS: Record<string, string> = {
  admin: "administrateur",
  teacher: "enseignant",
  student: "étudiant",
  parent: "parent",
};

const Navbar = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const role = session?.user.role ?? "";

  // La recherche route vers la liste la plus utile selon le rôle.
  const searchTarget =
    role === "admin" || role === "teacher" ? "/list/students" : "/list/results";

  // Badge réel : annonces des 7 derniers jours.
  let recentAnnouncements = 0;
  try {
    // V03 — cloisonnement : annonces de l'école de la session
    const schoolId = (session?.user as { schoolId?: number | null })?.schoolId ?? -1;
    recentAnnouncements = await prisma.announcement.count({
      where: {
        schoolId,
        date: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
    });
  } catch {
    recentAnnouncements = 0;
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
            role === "admin" || role === "teacher"
              ? "Rechercher un élève…"
              : "Rechercher un résultat…"
          }
          className="w-[200px] p-2 bg-transparent outline-none"
        />
      </form>

      {/* Icônes et profil */}
      <div className="flex items-center gap-6 justify-end w-full">
        {["admin", "teacher", "student"].includes(role) && (
          <Link
            href="/list/reclamation"
            title="Réclamations et demandes"
            className="bg-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-lamaSkyLight transition"
          >
            <MessageSquare size={16} className="text-gray-600" />
          </Link>
        )}
        <Link
          href="/list/announcements"
          title="Annonces"
          className="bg-white rounded-full w-8 h-8 flex items-center justify-center relative text-xs hover:bg-lamaSkyLight transition"
        >
          <Bell size={16} className="text-gray-600" />
          {recentAnnouncements > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-[10px]">
              {recentAnnouncements > 9 ? "9+" : recentAnnouncements}
            </span>
          )}
        </Link>
        <UserMenu
          name={session?.user.name || "Utilisateur"}
          roleLabel={ROLE_LABELS[role] ?? role}
        />
      </div>
    </header>
  );
};
export default Navbar;
