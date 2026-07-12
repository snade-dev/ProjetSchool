import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import prisma from "@/lib/prisma";
import { getSessionInfo } from "@/lib/authGuard";
import { getSchoolAccessState, type SchoolAccessState } from "@/lib/subscription";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Tableau de Bord de Gestion de l'École LS_School",
  description: "Système de Gestion Scolaire",
};

export default async function DasboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Identité de l'établissement (logo + nom) — personnalisable dans /settings
  let school: { name: string; logo: string | null } | null = null;
  // V06 — état d'abonnement : suspendu → page dédiée, en retard → bandeau
  let access: SchoolAccessState | null = null;
  let isAdmin = false;
  try {
    // V03 — l'école de la session (plus de singleton id=1)
    const info = await getSessionInfo();
    isAdmin = info?.role === "admin";
    if (info?.schoolId != null && info.role !== "superadmin") {
      access = await getSchoolAccessState(info.schoolId);
    }
    school = await prisma.school.findUnique({
      where: { id: info?.schoolId ?? -1 },
      select: { name: true, logo: true },
    });
  } catch {
    school = null;
  }
  if (access?.blocked) {
    redirect("/suspended");
  }
  const fmtD = (d: Date) =>
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);

  return (
    <div className="flex">
      {/* Sidebar LEFT */}
      <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4 h-screen overflow-y-auto">
        <Link
          href="/"
          className="flex items-center justify-center lg:justify-start gap-2"
        >
          <Image
            src={school?.logo || "/logo.png"}
            alt="logo"
            width={32}
            height={32}
            className="rounded-full object-cover w-8 h-8"
          />
          <span className="hidden lg:block font-bold truncate">
            {school?.name || "LS_School"}
          </span>
        </Link>

        <Menu />
      </div>

      {/* MAIN RIGHT */}
      <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F8F7FA] overflow-y-scroll flex flex-col h-screen">
        <Navbar />
        {/* V06 — abonnement échu (grâce 15 j en cours) : alerte pour l'admin */}
        {access?.status === "PAST_DUE" && isAdmin && (
          <div className="mx-4 mt-2 flex items-start gap-2 rounded-md bg-lamaYellowLight px-4 py-3 text-xs leading-relaxed text-yellow-900 ring-1 ring-lamaYellow">
            <AlertTriangle size={15} className="mt-0.5 flex-none" />
            <span>
              <b>Abonnement échu</b>
              {access.deadline ? <> depuis le {fmtD(access.deadline)}</> : null}.
              Régularisez auprès de la plateforme avant la fin de la période de
              grâce (15 jours), sinon l&apos;accès de l&apos;établissement sera
              suspendu.
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
