import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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
  try {
    school = await prisma.schoolSettings.findUnique({
      where: { id: 1 },
      select: { name: true, logo: true },
    });
  } catch {
    school = null;
  }

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
        {children}
      </div>
    </div>
  );
}
